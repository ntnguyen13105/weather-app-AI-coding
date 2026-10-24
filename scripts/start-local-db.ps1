#Requires -Version 7.4
param(
    [string]$PgBin = 'C:\Program Files\PostgreSQL\18\bin',
    [ValidateRange(1024, 65535)][int]$Port = 55432
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$localDir = Join-Path $projectRoot '.local'
$dataDir = Join-Path $localDir 'postgres'
$credentialsPath = Join-Path $localDir 'db-credentials.json'
$envPath = Join-Path $projectRoot '.env'
$pgCtl = Join-Path $PgBin 'pg_ctl.exe'
if (-not (Test-Path -LiteralPath $pgCtl)) { throw "Không tìm thấy PostgreSQL tại $PgBin" }
New-Item -ItemType Directory -Path $localDir -Force | Out-Null

if (-not (Test-Path -LiteralPath $credentialsPath)) {
    if ((Test-Path -LiteralPath $dataDir) -or (Test-Path -LiteralPath $envPath)) {
        throw 'Đã có dữ liệu hoặc .env. Không tự tạo đè thông tin kết nối; hãy cấu hình PostgreSQL thủ công.'
    }
    $credentials = @{
        adminPassword = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
        appPassword = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
        port = $Port
    }
    $credentials | ConvertTo-Json | Set-Content -LiteralPath $credentialsPath -Encoding utf8
}
$credentials = Get-Content -LiteralPath $credentialsPath -Raw | ConvertFrom-Json
if ($credentials.port -ne $Port) { throw 'Port khác cấu hình đã tạo. Dùng lại port trong .local/db-credentials.json.' }
if ($credentials.appPassword -notmatch '^[A-F0-9]{64}$' -or $credentials.adminPassword -notmatch '^[A-F0-9]{64}$') {
    throw 'Thông tin mật khẩu local không hợp lệ.'
}

if ((Test-Path -LiteralPath (Join-Path $dataDir 'PG_VERSION')) -and -not (Test-Path -LiteralPath (Join-Path $dataDir 'global/pg_control'))) {
    throw 'Cluster đang khởi tạo dở. Giữ lại thư mục để kiểm tra trước khi khởi tạo lại; không tự xóa dữ liệu.'
}
if (-not (Test-Path -LiteralPath (Join-Path $dataDir 'PG_VERSION'))) {
    $passwordFile = Join-Path $localDir 'init-password.tmp'
    try {
        Set-Content -LiteralPath $passwordFile -Value $credentials.adminPassword -Encoding ascii
        & (Join-Path $PgBin 'initdb.exe') -D $dataDir -U weather_admin --auth=scram-sha-256 --encoding=UTF8 --locale=C "--pwfile=$passwordFile"
        if ($LASTEXITCODE -ne 0) { throw 'initdb thất bại; kiểm tra output trước khi tiếp tục.' }
    } finally {
        if (Test-Path -LiteralPath $passwordFile) { Remove-Item -LiteralPath $passwordFile }
    }
}

& $pgCtl status -D $dataDir *> $null
if ($LASTEXITCODE -ne 0) {
    $serverLog = Join-Path $localDir 'postgres.log'
    # Wait for pg_ctl only; Start-Process -Wait also waits for its long-lived server child.
    $start = Start-Process -FilePath $pgCtl -ArgumentList @('start', '-D', "`"$dataDir`"", '-l', "`"$serverLog`"", '-o', "`"-h 127.0.0.1 -p $Port`"", '-w', '-t', '20') -WindowStyle Hidden -PassThru
    $start.WaitForExit()
    if ($start.ExitCode -ne 0) { throw "PostgreSQL chưa khởi động được. Xem $serverLog" }
}

# A separate project cluster avoids touching the PostgreSQL Windows service.
$previousPassword = $env:PGPASSWORD
try {
    $env:PGPASSWORD = $credentials.adminPassword
    $sql = @"
SELECT 'CREATE ROLE weather_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD ''$($credentials.appPassword)'''
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'weather_app')
\gexec
SELECT 'CREATE DATABASE weather_app OWNER weather_app'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'weather_app')
\gexec
"@
    $sql | & (Join-Path $PgBin 'psql.exe') -X -q -h 127.0.0.1 -p $Port -U weather_admin -d postgres -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw 'Không thể tạo role/database riêng cho Weather App.' }
} finally {
    $env:PGPASSWORD = $previousPassword
}

if (-not (Test-Path -LiteralPath $envPath)) {
    $template = Get-Content -LiteralPath (Join-Path $projectRoot '.env.example') -Raw
    $template = $template.Replace('REPLACE_WITH_YOUR_PASSWORD', $credentials.appPassword).Replace(':55432/', ":$Port/")
    Set-Content -LiteralPath $envPath -Value $template -Encoding utf8
}
Write-Host "PostgreSQL của dự án đã sẵn sàng tại 127.0.0.1:$Port; database weather_app."
Write-Host 'Thông tin kết nối nằm trong .env (đã được ignore). Không gửi nội dung file này vào chat.'
