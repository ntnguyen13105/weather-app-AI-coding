#Requires -Version 7.4
param([string]$PgBin = 'C:\Program Files\PostgreSQL\18\bin')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$dataDir = Join-Path $projectRoot '.local/postgres'
if (-not (Test-Path -LiteralPath (Join-Path $dataDir 'PG_VERSION'))) {
    throw 'Không tìm thấy cluster PostgreSQL của dự án.'
}
& (Join-Path $PgBin 'pg_ctl.exe') stop -D $dataDir -m fast -w -t 20
if ($LASTEXITCODE -ne 0) { throw 'Không dừng được cluster PostgreSQL của dự án.' }
