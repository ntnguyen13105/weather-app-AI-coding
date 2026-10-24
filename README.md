# Weather App

Ứng dụng thời tiết tiếng Việt dùng React/JavaScript, NestJS/TypeScript, Prisma và PostgreSQL, phát triển theo từng giai đoạn để học và làm portfolio.

**Trạng thái ngày 24/10/2026: đã khởi tạo và kiểm tra Giai đoạn 3.** React gọi backend thật; readiness kiểm tra PostgreSQL qua Prisma. Chưa triển khai dữ liệu thời tiết, tài khoản, yêu thích hoặc lịch sử. Không có số liệu thời tiết demo.

![Trang kiểm tra kết nối Giai đoạn 3](docs/screenshots/phase-3-connection.png)

## Những gì đã có

- Frontend React + Vite + React Router, JavaScript/JSX, trang kiểm tra kết nối tiếng Việt và route không tồn tại.
- Backend NestJS, `/api/v1/health/live`, `/api/v1/health/ready`, Swagger cho hai endpoint này, Helmet, ValidationPipe và response/error envelope nền tảng.
- Prisma schema bốn model theo thiết kế, generate client thành công; **chưa tạo hoặc áp dụng migration**.
- PostgreSQL 18 chạy trong cluster riêng `.local/postgres` trên cổng 55432; tài khoản ứng dụng không có quyền superuser/createdb/createrole.
- ESLint, Prettier, package-lock, kiểm tra cấu hình môi trường, 15 test backend và hướng dẫn PowerShell.

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

Người dùng đã đồng ý dùng PostgreSQL 18 có sẵn thay cho 17 trong thiết kế ban đầu. Node 24.21.0 đáp ứng dependency, nhưng cần cập nhật bản vá LTS trước public launch. Docker chưa được cài/kiểm chứng; Compose đầy đủ thuộc Giai đoạn 7.

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

Máy hiện tại đã được cài. Không dùng `npm audit fix --force`; kiểm tra ảnh hưởng trước mỗi nâng cấp. Backend cho phép script cài đặt Prisma đã duyệt, chặn script telemetry Scarf.

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
- Swagger: [http://127.0.0.1:3000/api/docs](http://127.0.0.1:3000/api/docs).
- Nhấn **Kiểm tra kết nối**; kết quả mong đợi: “React đã kết nối NestJS. PostgreSQL đã sẵn sàng.”

Backend đọc `.env` ở gốc. Vite proxy `/api` theo BACKEND_URL; không đưa DATABASE_URL hoặc secret vào biến `VITE_*`. Chưa cần OpenWeather key, JWT secret hoặc CSRF secret trong Giai đoạn 3; không tạo chức năng giả khi các biến này trống. Giai đoạn 4 sẽ cấu hình/kiểm tra chúng. Với production, validator yêu cầu HTTPS và các secret; đây chưa phải bản sẵn sàng public.

Ctrl+C trong mỗi terminal dừng server tương ứng. Dừng database riêng khi không dùng:

```powershell
pwsh -File .\scripts\stop-local-db.ps1
```

### 4. Kiểm tra chất lượng

```powershell
npm --prefix .\backend run lint
npm --prefix .\backend run format:check
npm --prefix .\backend test
npm --prefix .\backend run prisma:validate
npm --prefix .\backend run db:check
npm --prefix .\frontend run lint
npm --prefix .\frontend run format:check
npm --prefix .\frontend run build
```

`backend test` tự build rồi chạy 15 test (environment + health HTTP mock DB). `db:check` dùng PostgreSQL thật nhưng chỉ SELECT 1, không chạy migration. Các test không gọi OpenWeather. Chưa có bộ test frontend tự động; Giai đoạn 3 đã kiểm tra thao tác trên trình duyệt thật.

Kiểm tra API qua proxy:

```powershell
Invoke-RestMethod 'http://127.0.0.1:5173/api/v1/health/live'
Invoke-RestMethod 'http://127.0.0.1:5173/api/v1/health/ready'
```

Khi PostgreSQL ngừng chạy: live vẫn 200, ready trả 503 với `DATABASE_UNAVAILABLE`; frontend hiển thị lỗi và cho thử lại. Khởi động lại database rồi kiểm tra phải phục hồi 200.

## Phạm vi sản phẩm đã chốt

OpenWeather **Free**: thời tiết hiện tại, tìm kiếm geocoding và dự báo 5 ngày theo mốc 3 giờ. Khách được xem thời tiết; người đăng nhập lưu 50 yêu thích/20 lịch sử, chọn C/F. Cookie HttpOnly, JWT 15 phút và phiên tối đa 7 ngày được thiết kế cho Giai đoạn 4. Cảnh báo sẽ ghi nguồn chưa hỗ trợ, không giả là “không có cảnh báo”. Quyền API key tài khoản mới chưa được kiểm tra; không gửi key vào chat.

## Tài liệu và bước tiếp theo

- [Báo cáo Giai đoạn 3, lỗi thường gặp và bằng chứng kiểm tra](docs/phase-3.md).
- [Kiến trúc và ERD](docs/architecture.md).
- [API contract](docs/api-contract.md) — phân biệt thiết kế với hai route đã chạy.
- [Wireframe và quy tắc giao diện](docs/ui-design.md) — dashboard thuộc Giai đoạn 5.

Git local dùng `main`, `develop`, `feature/*`; công việc khởi tạo ở `feature/project-setup`. Chưa tạo GitHub remote hoặc push. Giai đoạn 4 tiếp theo: giải thích migration, tạo bảng/ràng buộc, triển khai auth và tích hợp OpenWeather. Docker, hướng dẫn cloud và CONTRIBUTING đầy đủ sẽ hoàn thiện ở Giai đoạn 7.
