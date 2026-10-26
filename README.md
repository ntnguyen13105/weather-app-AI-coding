# Weather App

Ứng dụng thời tiết tiếng Việt dùng React/JavaScript, NestJS/TypeScript, Prisma và PostgreSQL, phát triển theo từng giai đoạn để học và làm portfolio.

**Trạng thái ngày 26/10/2026: đã bàn giao Giai đoạn 7 trong phạm vi local/Docker.** Dashboard tiếng Việt kết nối NestJS, PostgreSQL và OpenWeather thật; có tìm kiếm, dự báo, đổi đơn vị, tài khoản, yêu thích và lịch sử. Docker và HTTPS local production-mode đã kiểm thử. Có hướng dẫn cloud/GitHub; chưa deploy cloud hoặc push GitHub. Không có số liệu thời tiết demo.

![Dashboard với dữ liệu OpenWeather thật](docs/screenshots/phase-5-1440.png)

## Những gì đã có

- Frontend React + Vite + React Router, JavaScript/JSX: dashboard responsive, tìm kiếm debounce và bàn phím, biểu đồ dự báo, tài khoản và route không tồn tại.
- Backend NestJS chia Auth/Users/Weather/Favorites/SearchHistory/Health; Swagger cho 21 thao tác, DTO validation, envelope thống nhất, Helmet, giới hạn body và rate limiting.
- Đăng ký/đăng nhập/refresh/logout, hồ sơ, đổi mật khẩu; Argon2id, JWT 15 phút, session PostgreSQL tối đa 7 ngày, cookie HttpOnly và CSRF gắn phiên.
- OpenWeather Free: tìm địa điểm, thời tiết hiện tại, dự báo 5 ngày/mốc 3 giờ, cache và timeout. Cảnh báo trả `UNSUPPORTED`.
- Yêu thích tối đa 50, lịch sử tối đa 20/tài khoản, chống trùng và kiểm tra quyền sở hữu. Đã áp dụng migration bốn bảng với khóa ngoại, unique, index và CHECK tọa độ.
- PostgreSQL 18 chạy trong cluster riêng `.local/postgres` trên cổng 55432; tài khoản ứng dụng không có quyền superuser/createdb/createrole.
- ESLint, Prettier, package-lock, kiểm tra cấu hình môi trường; 41 unit/HTTP test và 12 integration test PostgreSQL thật đã đạt.
- Docker multi-stage, Caddy reverse proxy cùng origin, health checks, migration job, volume PostgreSQL và hướng dẫn backup/restore.

## Phiên bản đã chạy

| Công nghệ | Phiên bản |
| --- | --- |
| Node.js / npm | 24.21.0 / 11.19.0 |
| PowerShell / PostgreSQL | 7.6.5 / 18.6 |
| React / React DOM | 19.3.1 |
| Vite / React Router | 8.3.5 / 7.18.4 |
| NestJS / TypeScript | 12.2.0 / 6.0.3 |
| Prisma CLI / Client / adapter-pg | 7.10.1 |
| ESLint / Prettier / Vitest | 10.13.0 / 3.9.10 / 5.0.5 |
| jose / argon2 / cookie | 6.2.13 / 0.45.1 / 2.0.1 |

Người dùng đã đồng ý dùng PostgreSQL 18 có sẵn thay cho 17 trong thiết kế ban đầu. Docker đã kiểm tra với Engine 29.9.2, Compose 5.6.1, PostgreSQL 18.6 và Caddy 2.11.7. Base image được khóa digest. Review bản vá và chạy lại kiểm thử trước mỗi lần public launch; không nâng major theo thông báo npm/Prisma tự động.

## Chạy nhanh bằng Docker

Cần Docker Desktop Linux Engine đang chạy. Từ thư mục repository:

```powershell
node scripts/init-docker-env.mjs
# Điền OpenWeather key vào .env.docker nếu chưa có key trong .env local
docker compose --env-file .env.docker up -d --build --wait
```

Mở **http://localhost:8080**. Script init chỉ chạy lần đầu và từ chối ghi đè file secret đã có. Docker dùng database/volume riêng, không đụng cluster local 55432. Xem [hướng dẫn Docker/cloud](docs/deployment.md) cho migration, HTTPS, sao lưu và xử lý lỗi. Dừng bằng `docker compose --env-file .env.docker down`, không thêm `-v` nếu muốn giữ dữ liệu.

## Chạy local trên Windows

Yêu cầu Node 24 LTS (>=24.15), npm 11, **PowerShell 7.4 trở lên** và bộ binary PostgreSQL 18. Các công cụ này đã được kiểm tra trên máy hiện tại; máy khác cần cài từ nhà cung cấp chính thức trước. Script không cài dịch vụ Windows và không tác động cluster mặc định cổng 5432.

### 1. Khởi động database riêng

Mở PowerShell 7 tại repository:

```powershell
Set-Location 'C:\FullStack-Learning\weatherApp'
pwsh -File .\scripts\start-local-db.ps1
```

Lần đầu, script tạo cluster, mật khẩu ngẫu nhiên, role `weather_app`, database `weather_app` và `.env` ở gốc. **Không copy `.env.example` trước khi dùng script tự tạo này.** Lần sau script khởi động lại cluster và giữ nguyên dữ liệu/thông tin đăng nhập. PostgreSQL cài ở chỗ khác thì truyền `-PgBin 'D:\PostgreSQL\18\bin'`.

Trên máy hiện tại database và `.env` đã tạo, không cần tạo lại. `.local/` và `.env` được Git ignore; không chia sẻ hoặc commit nội dung. Backup `.local/postgres` theo quy trình PostgreSQL nếu cần giữ dữ liệu về sau; đừng xóa thư mục để xử lý lỗi tùy tiện.

Nếu tự quản lý PostgreSQL thay vì script, tạo role/database riêng rồi copy `.env.example` thành `.env` và đặt DATABASE_URL đúng. Mật khẩu có ký tự đặc biệt phải URL-encode. Khi `.env` đã tồn tại nhưng không có thông tin cluster local, script cố ý dừng để tránh ghi đè cấu hình.

### 2. Cài dependency từ lockfile (máy mới hoặc sau khi dependency thay đổi)

```powershell
npm --prefix .\backend ci
npm --prefix .\frontend ci
```

Máy hiện tại đã được cài. Không dùng `npm audit fix --force`; kiểm tra ảnh hưởng trước mỗi nâng cấp. Backend cho phép script cài đặt Prisma và Argon2 đã duyệt, chặn script telemetry Scarf.

Khởi tạo secret và áp dụng migration sau khi cài backend:

```powershell
node .\scripts\init-auth-secrets.mjs
npm --prefix .\backend run migrate:deploy
```

Script chỉ sinh JWT_SECRET/CSRF_SECRET còn trống, không thay secret đã có. Điền `OPENWEATHER_API_KEY` vào **`.env`**, không vào `.env.example`, rồi khởi động lại backend. Không gửi key vào chat. Trên máy hiện tại các bước này đã hoàn tất và key Free đã gọi thành công ba endpoint.

### 3. Chạy backend và frontend ở hai terminal

Terminal A, tại gốc repository:

```powershell
npm --prefix .\backend run dev
```

Terminal B, cùng thư mục:

```powershell
npm --prefix .\frontend run dev
```

- Giao diện: [http://127.0.0.1:5173](http://127.0.0.1:5173).
- Swagger cùng origin: [http://127.0.0.1:5173/api/docs/](http://127.0.0.1:5173/api/docs/). Khi thử mutation, dùng trang này để Origin khớp APP_ORIGIN; lấy CSRF qua `/auth/csrf`, copy `data.csrfToken` vào header của thao tác cần chạy. Sau login/refresh dùng CSRF mới trả về.
- Tìm “Hà Nội”, chọn kết quả; dashboard hiển thị thời tiết hiện tại và dự báo. Đăng ký tài khoản để lưu địa điểm và lịch sử.

Backend đọc `.env` ở gốc. Vite proxy `/api` theo BACKEND_URL; không đưa DATABASE_URL hoặc secret vào biến `VITE_*`. JWT/CSRF secret bắt buộc ở mọi môi trường. Local thiếu OpenWeather key vẫn chạy auth/health, nhưng weather trả 503; production yêu cầu cả key và APP_ORIGIN HTTPS. Docker dùng `.env.docker` riêng. Chưa triển khai public.

Ctrl+C trong mỗi terminal dừng server tương ứng. Dừng database riêng khi không dùng:

```powershell
pwsh -File .\scripts\stop-local-db.ps1
```

### 4. Kiểm tra chất lượng

```powershell
npm --prefix .\backend run lint
npm --prefix .\backend run format:check
npm --prefix .\backend test
npm --prefix .\backend run test:integration
npm --prefix .\backend run prisma:validate
npm --prefix .\backend run db:check
npm --prefix .\frontend run lint
npm --prefix .\frontend run format:check
npm --prefix .\frontend run build
npm --prefix .\frontend test
```

`backend test` tự build rồi chạy 41 test, mock OpenWeather và DB khi phù hợp. `test:integration` tự tạo database **weather_app_test** trên cluster riêng cổng 55432, áp dụng migration, chạy 12 test và xóa user test do chính lượt chạy tạo; không dùng database ứng dụng. Runner này chỉ hỗ trợ thiết lập local bằng script hiện có. `db:check` chỉ SELECT 1. Frontend có 12 test Vitest/Testing Library và 5 bài Playwright trên Chrome; xem điều kiện chạy, phân biệt mock/live và giới hạn ở [Giai đoạn 6](docs/phase-6.md). E2E có nghỉ 60 giây trước bài thời tiết để tránh sử dụng hết quota IP bởi các bài tài khoản; không tắt rate limiting. Smoke container: `node frontend/e2e/docker-smoke.mjs`.

`npm --prefix .\frontend run test:e2e` tự build backend và bật/tắt server test riêng 3001/5174, giữ nguyên rate limit; cần Chrome, PostgreSQL đang chạy và OpenWeather key hợp lệ. Có thể chờ tối đa một phút theo Retry-After. Muốn kiểm tra dừng/khởi động lại database thật, xem cờ `PHASE6_DB_OUTAGE` trong báo cáo Giai đoạn 6.

Kiểm tra tùy chọn với OpenWeather thật (tốn 3 request Free; không tự chạy trong unit test):

```powershell
npm --prefix .\backend run test:weather-live
```

Kiểm tra API qua proxy:

```powershell
Invoke-RestMethod 'http://127.0.0.1:5173/api/v1/health/live'
Invoke-RestMethod 'http://127.0.0.1:5173/api/v1/health/ready'
```

Khi PostgreSQL ngừng chạy: live vẫn 200, ready trả 503 với `DATABASE_UNAVAILABLE`. Đã kiểm thử dừng cluster thật, giao diện báo lỗi dịch vụ và phục hồi tài khoản qua “Thử lại” sau khi khởi động lại database.

## Phạm vi sản phẩm đã chốt

OpenWeather **Free**: thời tiết hiện tại, tìm kiếm geocoding và dự báo 5 ngày theo mốc 3 giờ. Backend đã triển khai phạm vi này; key đã xác minh ngày 25/10/2026. Dự báo có thể chạm 6 ngày lịch với ngày đầu/cuối thiếu mốc. Khách được đọc weather API; người đăng nhập có dữ liệu riêng và tùy chọn C/F. API luôn trả Celsius gốc; giao diện chuyển đổi đồng bộ từ giá trị gốc. Cảnh báo hiển thị nguồn chưa hỗ trợ, không giả là “không có cảnh báo”.

## Tài liệu và bước tiếp theo

- [Báo cáo Giai đoạn 3, lỗi thường gặp và bằng chứng kiểm tra](docs/phase-3.md).
- [Báo cáo Giai đoạn 4, lệnh kiểm thử và giới hạn](docs/phase-4.md).
- [Báo cáo Giai đoạn 5, kiểm thử giao diện và ảnh chụp](docs/phase-5.md).
- [Báo cáo Giai đoạn 6, lỗi đã sửa và giới hạn nghiệm thu](docs/phase-6.md).
- [Báo cáo Giai đoạn 7 và checklist nghiệm thu](docs/phase-7.md).
- [Docker, cloud, backup và rollback](docs/deployment.md).
- [Chuẩn bị GitHub và nội dung portfolio](docs/github-handoff.md).
- [Quy tắc đóng góp](CONTRIBUTING.md).
- [Kiến trúc và ERD](docs/architecture.md).
- [API contract](docs/api-contract.md) — request/response, CSRF, pagination và lỗi.
- [Wireframe và quy tắc giao diện](docs/ui-design.md) — dashboard thuộc Giai đoạn 5.

Git local dùng `main`, `develop`, `feature/*`; bản bàn giao ở `feature/deployment`, kế thừa `feature/integration-testing`. Theo lựa chọn người dùng, chỉ chuẩn bị local và hướng dẫn push; chưa tạo GitHub remote, chưa push và chưa deploy cloud. Xem hướng dẫn GitHub để review/fast-forward vào nhánh ổn định trước khi công bố.
