# Báo cáo Giai đoạn 3 — Khởi tạo

Ngày: 24/10/2026. Trạng thái: hoàn thành khởi tạo và các kiểm tra local được liệt kê dưới đây. Đây chưa phải nghiệm thu toàn bộ Weather App.

## 1. Công việc hoàn thành

- Khóa phiên bản React/Vite/Router và NestJS/TypeScript/Prisma; hai package-lock độc lập. Frontend giữ JavaScript.
- Backend ESM, decorators TypeScript, ESLint 10 và Prettier. Test chạy trên output đã biên dịch để giữ decorator metadata của Nest.
- User xác nhận PostgreSQL 18 thay cho 17. Dùng binary 18.6 đã cài, tạo cluster riêng của dự án, chỉ nghe 127.0.0.1:55432; không thay đổi dữ liệu/dịch vụ PostgreSQL cổng 5432.
- Database weather_app và role không superuser; mật khẩu ngẫu nhiên trong `.env` và `.local/db-credentials.json` đã ignore. Đây là cấu hình phát triển local, không phải mô hình cấp quyền production.
- Prisma schema có User/Favorite/SearchHistory/Session. Validate/generate đạt. Chưa có bảng nghiệp vụ, CHECK constraint SQL hoặc migration; triển khai ở Giai đoạn 4.
- Health kiểm tra thật PostgreSQL; live hoạt động khi DB dừng. Swagger chỉ chứa hai health endpoint. ValidationPipe là nền tảng, chưa có DTO nghiệp vụ auth/weather.
- Trang React khởi tạo, route 404, Vite proxy; hiển thị kết quả kết nối thật và xử lý lỗi. Chưa xây dashboard hoàn chỉnh.
- Git ignore và nhánh main/develop/feature; không push GitHub hoặc tạo remote.

## 2. File tạo hoặc thay đổi

| Nhóm | File chính |
| --- | --- |
| Frontend | `frontend/package.json`, `package-lock.json`, `index.html`, `vite.config.js`, `eslint.config.js`, `.npmrc`, `src/main.jsx`, `src/pages/SetupPage.jsx`, `src/styles.css` |
| Backend | `backend/package.json`, `package-lock.json`, `nest-cli.json`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.mjs`, `.npmrc` |
| API nền tảng | `backend/src/main.ts`, `app.module.ts`, `configure-app.ts`, `common/http.ts`, `config/environment.ts`, `modules/health/*` |
| Prisma | `backend/prisma.config.ts`, `prisma/schema.prisma`, `src/prisma/*`; generated client được ignore |
| Test | `backend/test/environment.test.mjs`, `backend/test/health.test.mjs` |
| Local setup | `scripts/start-local-db.ps1`, `scripts/stop-local-db.ps1`, `.env.example` |
| Repository | `.gitignore`, `.gitattributes`, `.editorconfig`, `.prettierrc.json`, `.prettierignore`, README và docs cập nhật |
| Bằng chứng UI | `docs/screenshots/phase-3-connection.png` |

Không commit `.env`, `.local/`, node_modules, dist hoặc Prisma generated client.

## 3. Lệnh chạy

Chi tiết từng terminal trong [README](../README.md). Chạy từ gốc repository, PowerShell 7.4+:

```powershell
pwsh -File .\scripts\start-local-db.ps1
npm --prefix .\backend ci
npm --prefix .\frontend ci
npm --prefix .\backend run dev
# Terminal khác:
npm --prefix .\frontend run dev
```

Database và dependency đã có trên máy hiện tại, không cần cài lại mỗi lần. Script start chạy lại không tạo trùng role/database, không ghi đè `.env`.

## 4. Kiểm tra đã thực hiện và kết quả

| Kiểm tra | Kết quả thực tế |
| --- | --- |
| React lint/build/format | Đạt |
| Nest build/lint/format | Đạt |
| Vitest environment | 11 test đạt: cấu hình local, port lỗi, URL DB lỗi, placeholder, origin, production thiếu cấu hình, không lộ secret trong lỗi |
| Vitest + Supertest health | 4 test đạt: live không query DB, ready thành công, lỗi DB 503 được làm sạch, 404 envelope |
| Prisma validate/generate | Đạt với 7.10.1 |
| PostgreSQL thật qua Prisma | SELECT 1 thành công bằng role weather_app |
| Health qua Vite proxy | `/api/v1/health/ready` trả 200/data.status=ready |
| Swagger JSON | Đọc được, chỉ có `/api/v1/health/live` và `/api/v1/health/ready` |
| Trình duyệt thật | Click nút kết nối hiện thành công; ảnh được lưu, không dùng dữ liệu thời tiết mẫu |
| DB ngừng chạy | Dừng cluster riêng; live 200, ready 503/DATABASE_UNAVAILABLE; browser hiện lỗi |
| DB phục hồi | Start lại cluster; ready 200 và browser báo thành công trở lại |
| npm audit sau sửa dependency | Frontend 0, backend 0 vulnerability tại thời điểm cài/kiểm tra |
| Git ignore | Đã kiểm tra `.env`, credentials `.local`, node_modules, dist và generated client được ignore |

Các test HTTP/kết nối database cần quyền mạng localhost. Trong môi trường chạy công cụ hạn chế, lần đầu bị EACCES; chạy lại với quyền kết nối local được duyệt đã đạt. Không thay mock để giả kết nối database thật.

## 5. Kết quả mong đợi

- Mở http://127.0.0.1:5173 và nhấn Kiểm tra kết nối: “React đã kết nối NestJS. PostgreSQL đã sẵn sàng.”
- API trả envelope `{data, meta:{requestId}}`; lỗi health/404 có `{error, meta}`; request ID cũng có ở header.
- Database mới tạo để kết nối; chưa có dữ liệu người dùng/thời tiết.
- Chưa có đăng nhập/đăng ký hoặc OpenWeather fetch. Không ghi các endpoint chưa tồn tại là đã hoàn thành.

## 6. Lỗi gặp và cách xử lý

| Triệu chứng | Nguyên nhân / xử lý |
| --- | --- |
| `docker` không nhận diện | Dùng PostgreSQL 18 local theo quyết định user; chưa cài Docker. Không tuyên bố đã kiểm thử Compose |
| Registry ENOTFOUND trong công cụ | Cần quyền mạng truy cập npm. Không đổi sang nguồn package không chính thức |
| EACCES localhost | Cần quyền mạng local cho test/server trong công cụ; terminal thông thường có thể chạy trực tiếp |
| initdb kẹt khi thăm dò shared memory | Môi trường hạn chế tiến trình. Giữ bản dở trong `.local/postgres-incomplete-phase3`, tạo lại với quyền phù hợp; không xóa cluster có dữ liệu |
| Script start chờ dù DB ready | Windows Start-Process -Wait chờ cả server con; đổi sang WaitForExit chỉ cho pg_ctl, đã kiểm tra stop/start |
| SQL bootstrap in mật khẩu | Đã sửa cách dùng psql gexec và thay mới mật khẩu local; giá trị xuất hiện trong output trước đó không còn hiệu lực |
| ESLint 9 hết hỗ trợ | Chuyển ESLint 10, xác minh tương thích typescript-eslint và React hooks |
| Audit cảnh báo Multer | Nest kéo Multer 2.4; override 2.5.0. Không downgrade Nest hoặc dùng audit fix --force; kiểm tra lại khi nâng Nest |
| Backend ready 503 | Kiểm tra start-local-db, port 55432 và DATABASE_URL; live 200 chỉ chứng minh tiến trình còn sống |
| Cổng 3000/5173 đang dùng | Dừng đúng dev server cũ hoặc cấu hình port/proxy nhất quán; không kill tiến trình khác tùy tiện |
| `.env` tồn tại nhưng chưa có credentials local | Không ghi đè; dùng database thủ công đã cấu hình hoặc kiểm tra thứ tự setup |
| PowerShell thiếu GetBytes/ToHexString | Dùng PowerShell 7.4+, không Windows PowerShell 5.1; script có #Requires |

## 7. Tiêu chí hoàn tất và giới hạn

Giai đoạn 3 đạt khi frontend/backend build, lint và format đạt; cấu hình lỗi bị từ chối; Prisma schema hợp lệ; SELECT 1 qua PostgreSQL thật thành công; UI gọi API thật và phục hồi sau DB lỗi. Những kiểm tra này đã thực hiện.

Chưa kiểm chứng: npm ci trên máy hoàn toàn mới, Docker/Compose, migration, quyền key OpenWeather, auth/CSRF/rate limit nghiệp vụ, dashboard đa kích thước, cloud. Không suy rộng 15 test nền tảng thành chứng nhận bảo mật toàn ứng dụng. Node 24.21.0 tương thích nhưng cần cập nhật bản vá LTS trước public launch.

Giai đoạn 4 sẽ trình bày migration trước khi áp dụng, tạo các ràng buộc SQL chưa thể hiện đầy đủ trong Prisma schema, bổ sung nghiệp vụ và test quyền sở hữu. Không gọi One Call hoặc giả dữ liệu để thay thế OpenWeather Free.

Nguồn đã đối chiếu: [NestJS Prisma](https://docs.nestjs.com/recipes/prisma), [Prisma 7 connection pool](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections/connection-pool), [Vite](https://vite.dev/guide/), [PostgreSQL 18 initdb](https://www.postgresql.org/docs/18/app-initdb.html), [PostgreSQL 18 pg_ctl](https://www.postgresql.org/docs/18/app-pg-ctl.html).
