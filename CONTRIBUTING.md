# Đóng góp vào Weather App

Đây là dự án học Full-stack có backend/database thật. Giữ React JavaScript ở frontend và NestJS TypeScript ở backend. Trao đổi trước khi đổi stack hoặc thêm dịch vụ trả phí.

## Thiết lập

Đọc README; dùng Node 24 LTS tương thích `engines`, npm và PostgreSQL 18 hoặc Docker Desktop chạy Linux containers. Dùng `npm ci` theo package-lock. Không giả định đã có `.env`; khởi tạo theo hướng dẫn. Không commit secret, dump database, token, ảnh chụp chứa dữ liệu cá nhân hoặc file trong `.local`.

## Nhánh và commit

- `main`: bản ổn định đã kiểm thử.
- `develop`: tích hợp tính năng.
- `feature/*`, `fix/*`, `docs/*`: thay đổi có phạm vi rõ ràng.
- Commit Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`. Tách thay đổi logic khỏi chỉnh sửa tài liệu không liên quan.

Trước khi bắt đầu, xem `git status` và giữ nguyên công việc chưa commit của người khác. Không force push nhánh chia sẻ. Không dùng `git reset --hard`, `prisma migrate reset`, hoặc xóa volume để xử lý lỗi thông thường.

## Quy tắc mã nguồn

Controller nhận request; service xử lý nghiệp vụ; Prisma truy cập DB. DTO kiểm tra input tại backend; không tin `userId` từ client. Luôn lọc dữ liệu cá nhân theo tài khoản từ guard. Mọi mutation dùng cookie/CSRF qua API client. Không tự đổi cấu hình SameSite/CORS để sửa lỗi origin.

Giữ dữ liệu Celsius gốc, biểu diễn thiếu dữ liệu bằng null, không tạo ngày dự báo hoặc cảnh báo giả. Chỉ backend gọi OpenWeather bằng key. Frontend phải có loading, lỗi, rỗng và dùng được bằng bàn phím.

## Kiểm tra trước PR

```powershell
npm --prefix backend run lint
npm --prefix backend run format:check
npm --prefix backend test
npm --prefix backend run test:integration
npm --prefix frontend run lint
npm --prefix frontend run format:check
npm --prefix frontend test
npm --prefix frontend run build
npm --prefix frontend run test:e2e
git diff --check
```

Integration và E2E cần database local đã khởi động. E2E còn cần Chrome và OpenWeather key thật; có sử dụng quota. Lỗi 429 phải tôn trọng Retry-After. Không đổi ngưỡng test/validation hoặc tắt bảo mật để làm test xanh. Với Docker, chạy smoke test trong hướng dẫn triển khai.

Thay đổi schema dùng Prisma Migrate, commit schema và migration cùng nhau; review SQL trước khi áp dụng. Migration đã áp dụng không được sửa nội dung. Production dùng `migrate deploy`, không `db push` hoặc `migrate dev`.

PR cần mô tả vấn đề, hành vi sau thay đổi, lệnh test thực sự đã chạy và giới hạn còn lại. Đính kèm ảnh desktop/mobile khi đổi giao diện, không đính kèm cookie/API key. README và API contract phải phản ánh đúng tính năng đã triển khai. Chưa có CI cloud được chạy; người đóng góp phải chạy các kiểm tra local và ghi kết quả.

## Báo lỗi

Ghi bước tái hiện, kết quả mong đợi/thực tế, phiên bản Node/npm, mã lỗi và requestId nếu có. Xóa email, cookie, Authorization, DATABASE_URL và API key khỏi log trước khi chia sẻ. Với lỗi bảo mật, không đăng chi tiết khai thác kèm secret lên issue public.
