# Weather App

Ứng dụng thời tiết tiếng Việt phục vụ học tập và portfolio Full-stack Developer.

**Trạng thái ngày 24/10/2026: đã bàn giao bản thiết kế Giai đoạn 2 và kiểm tra tĩnh tài liệu. Chưa có ứng dụng chạy được.** Repository hiện chỉ chứa tài liệu; chưa cài package, tạo migration hoặc chạy test ứng dụng.

## Những quyết định đã được người dùng xác nhận

- React + JavaScript + Vite, React Router, CSS thuần/CSS Modules.
- NestJS + TypeScript, REST `/api/v1`, Prisma và PostgreSQL.
- OpenWeather Free: hiện tại, dự báo 5 ngày theo mốc 3 giờ và Direct Geocoding.
- Khách được xem thời tiết. Tài khoản lưu yêu thích, lịch sử và đơn vị nhiệt độ.
- Cookie HttpOnly; access JWT 15 phút, phiên refresh tối đa 7 ngày; triển khai cùng origin.
- Giới hạn 20 địa điểm lịch sử và 50 địa điểm yêu thích mỗi tài khoản.
- Gói Free chưa hỗ trợ cảnh báo trong thiết kế này. Không hiển thị thành “không có cảnh báo”.

Người dùng đã tạo tài khoản OpenWeather; gói và quyền API key chưa được kiểm tra trực tiếp. Không gửi API key vào chat hoặc Git.

## Đọc tài liệu theo thứ tự

1. [Kiến trúc, database, bảo mật và kế hoạch kiểm tra](docs/architecture.md).
2. [API contract: request, response, validation và lỗi](docs/api-contract.md).
3. [Wireframe, luồng thao tác và quy tắc giao diện](docs/ui-design.md).

Các tài liệu mô tả **thiết kế cần triển khai**, không chứng nhận chức năng đã hoạt động. Ví dụ JSON là fixture minh họa contract, không phải dữ liệu thời tiết thực.

## Môi trường đã kiểm tra

| Công cụ | Kết quả kiểm tra trong Giai đoạn 1 |
| --- | --- |
| Node.js | 24.21.0 |
| npm | 11.19.0 |
| Git | 2.51.0.windows.1 |
| Docker / Compose | Terminal chưa nhận diện lệnh; chưa xác định nguyên nhân |

```powershell
Set-Location 'C:\FullStack-Learning\weatherApp'
node --version
npm --version
git --version
docker --version
docker compose version
```

Chưa có `package.json`, nên **chưa chạy** `npm install`, `npm run dev` hoặc `npm test`. Hướng dẫn cài đặt, `.env.example`, Swagger, Docker Compose và CONTRIBUTING sẽ được bổ sung cùng các giai đoạn tương ứng. Chưa có ảnh giao diện thật hoặc bản triển khai cloud.

## Bước tiếp theo

Giai đoạn 3 khởi tạo từng thành phần, khóa phiên bản dependency và xác minh build/kết nối. Chỉ chuyển giai đoạn sau khi các tiêu chí hiện tại được kiểm tra. Không tự đăng ký One Call, thay stack hoặc tạo dữ liệu giả để lấp chỗ thiếu.

## Báo cáo Giai đoạn 2

1. **Hoàn thành thiết kế:** cấu trúc thư mục, ERD 4 bảng, chính sách chống trùng/giới hạn/transaction, 21 endpoint, luồng cookie/CSRF/refresh, wireframe và trạng thái giao diện.
2. **File đã tạo:** README này và 3 tài liệu trong docs. Không tạo source frontend/backend, secret hoặc migration.
3. **Lệnh cần chạy:** chưa cần cài đặt. Đọc tài liệu bằng `Get-Content -Encoding utf8 .\docs\architecture.md` từ thư mục dự án; kiểm tra Docker bằng các lệnh môi trường phía trên trước Giai đoạn 3.
4. **Kiểm tra đã chạy:** đọc 4 file UTF-8, kiểm tra cặp code fence; parse 3 khối JSON bằng Node; kiểm tra 4 liên kết file nội bộ; phát hiện 21 endpoint không trùng. Đã rà tĩnh hướng phụ thuộc module, owner filtering, refresh CAS và phân biệt dự báo/cảnh báo. Không render Mermaid hoặc kiểm tra contrast trực quan.
5. **Kết quả:** các kiểm tra cú pháp/liên kết trên đều đạt. Runtime, kết nối API key, PostgreSQL và UI chưa được kiểm chứng.
6. **Lỗi/giới hạn:** công cụ nạp ngữ cảnh Impeccable thiếu engine và không ghi được thư mục cache của công cụ; đã tiếp tục dựa trên brief đầy đủ của người dùng, không coi đó là kiểm chứng thị giác. Docker chưa được terminal nhận diện ở Giai đoạn 1; cần phân biệt thiếu cài đặt với thiếu PATH/daemon.
7. **Tiêu chí chuyển tiếp:** bản thiết kế có đầy đủ các đầu ra Giai đoạn 2 và đã qua kiểm tra tĩnh; không còn quyết định về chi phí/stack cần hỏi lại. Giai đoạn 3 phải xác minh công cụ và dependency thật, không suy từ thiết kế rằng chúng đã hoạt động.
