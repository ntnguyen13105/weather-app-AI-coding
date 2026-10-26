# Chuẩn bị GitHub và bàn giao portfolio

Theo lựa chọn của người dùng, chỉ chuẩn bị repository local; chưa tạo remote, chưa push hoặc publish. Nhánh `feature/deployment` chứa toàn bộ chuỗi triển khai. Không mô tả đây là sản phẩm đã vận hành cloud hay kinh nghiệm thương mại.

## Trước khi push

1. Xem `git status` và `git diff`; xử lý riêng thay đổi cá nhân chưa commit. Không gộp nội dung chưa review vào commit bàn giao.
2. Chạy checklist trong `phase-7.md`. Xác nhận `.env`, `.env.docker`, `.env.cloud`, `.local`, token, dump và node_modules không được track:

```powershell
git check-ignore .env .env.docker .env.cloud .local
git ls-files
git log --oneline --decorate -10
```

3. Kiểm tra cả lịch sử trước khi public, không chỉ working tree. Nếu secret từng được push, thu hồi/đổi secret trước; xóa file ở commit mới không xóa secret trong lịch sử. Kiểm tra ảnh và log test có thông tin cá nhân.
4. Tạo một repository rỗng trên GitHub khi bạn sẵn sàng; chọn public/private theo ý muốn, không chọn tạo README sẵn để tránh hai lịch sử khác nhau. Chọn license rõ ràng trước khi cho phép tái sử dụng; dự án chưa tự áp dụng license thay bạn.

## Tích hợp nhánh và push thủ công

Chỉ chạy sau khi working tree sạch và thay đổi đã được review. Các nhánh hiện tại cùng gốc; nếu fast-forward thất bại, dừng và xem khác biệt, không force push/reset.

```powershell
git switch develop
git merge --ff-only feature/deployment
git switch main
git merge --ff-only develop
# Thay URL bên dưới bằng repository của chính bạn
git remote add origin https://github.com/YOUR_ACCOUNT/weather-app.git
git push -u origin main
git push -u origin develop
```

Nếu đã có origin, kiểm tra `git remote -v` trước; không tự ghi đè URL. Dùng đăng nhập Git Credential Manager/GitHub CLI, không nhúng token vào remote URL. Chưa có workflow CI được chạy trên GitHub; test hiện là bằng chứng local, không tạo badge CI xanh giả.

## Nội dung portfolio có thể dùng

“Weather App — dự án cá nhân học Full-stack: React/JavaScript, NestJS/TypeScript, Prisma/PostgreSQL; tích hợp OpenWeather Free, cookie HttpOnly/CSRF, dữ liệu cá nhân và kiểm thử phân quyền. Có Docker Compose, health check, migration và hướng dẫn triển khai. Đã kiểm thử local; chưa vận hành cloud production.”

README có ảnh thật, ERD, sơ đồ kiến trúc, giới hạn API và lệnh chạy. Khi phỏng vấn, giải thích vì sao forecast là mốc 3 giờ, ngày thiếu mốc không được bù dữ liệu, vì sao dùng cùng origin và cách kiểm tra A/B. Các giới hạn về multi-instance, monitoring, đa trình duyệt được ghi rõ trong báo cáo, không giấu đi.
