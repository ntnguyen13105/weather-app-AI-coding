# Giai đoạn 5 — Frontend

Ngày thực hiện: 25/10/2026. React JavaScript, CSS thuần; không thay đổi stack.

**Cập nhật sau Giai đoạn 6:** kết quả 11 unit/2 E2E bên dưới là bằng chứng tại thời điểm Giai đoạn 5. Bộ hiện tại có 12 unit/5 E2E; Playwright tự khởi động server riêng 3001/5174 và không cần server 3000/5173 đang chạy. Xem `phase-6.md` cho lệnh và điều kiện hiện tại; ảnh test mới ghi vào thư mục `test-results/`, không ghi đè ảnh báo cáo này.

## 1. Công việc đã triển khai

- Dashboard kính mờ tiếng Việt, nền thay đổi theo dữ liệu thời tiết, responsive; icon SVG nhất quán, focus bàn phím và reduced motion.
- Tìm kiếm 400 ms debounce, tối thiểu 2 ký tự; hủy request cũ, bỏ phản hồi lỗi thời, chọn bằng phím mũi tên/Enter. Trạng thái loading, lỗi và rỗng rõ ràng.
- Thời tiết hiện tại, chỉ số, giờ mặt trời theo UTC offset địa điểm; dự báo mỗi 3 giờ, biểu đồ, danh sách ngày có đánh dấu thiếu mốc. Mặc định 16 mốc, có nút xem toàn bộ dữ liệu nguồn.
- C/F chuyển từ Celsius gốc. Khách chỉ lưu lựa chọn đơn vị trong localStorage; tài khoản lưu lựa chọn qua backend. Không lưu token trong localStorage.
- Đăng ký, đăng nhập, đăng xuất, hồ sơ, đổi mật khẩu; cookie HttpOnly, CSRF và refresh dùng API hiện có. Chống refresh trùng trong tab; Web Locks phối hợp các tab trên trình duyệt hỗ trợ.
- Yêu thích, lịch sử cá nhân đọc/ghi PostgreSQL qua REST; xóa từng mục và xác nhận xóa toàn bộ lịch sử. Lỗi lưu không được giả là thành công.
- Cảnh báo ghi rõ nguồn chưa hỗ trợ; không tạo cảnh báo hoặc dữ liệu thời tiết giả.

Mỗi trang tải theo route để chia bundle. `api.js` gom timeout, CSRF, refresh và lỗi; component không tự xử lý token. `use-resource.js` gắn dữ liệu với request để không ghép thời tiết cũ với địa điểm mới.

## 2. File tạo hoặc thay đổi

- `frontend/src/app/`: provider phiên/tùy chọn/địa điểm, layout và routes; test phản hồi phiên đến muộn.
- `frontend/src/pages/`: DashboardPage, AuthPage, AccountPage; bỏ SetupPage cũ.
- `frontend/src/components/`: tìm kiếm, chỉ số, biểu đồ/dự báo, danh sách cá nhân, form, thông báo, icon và đổi đơn vị.
- `frontend/src/lib/`: REST client, định dạng, validation form và hook tải tài nguyên; test API và định dạng.
- `frontend/src/main.jsx`, `styles.css`, `package.json`, `package-lock.json`, `eslint.config.js`.
- `frontend/vitest.config.js`, `src/test-setup.js`, `playwright.config.js`, `e2e/`.
- `backend/test/cleanup-ui-user.mjs`: chỉ xóa email kiểm thử ngẫu nhiên đúng mẫu trên database local `weather_app:55432`; cascade xóa dữ liệu liên quan.
- `.prettierignore`, `README.md`, tài liệu này và `docs/screenshots/phase-5-*.png`.

## 3. Lệnh chạy trong PowerShell

Từ `C:\FullStack-Learning\weatherApp`, nếu thiếu thư viện chạy `npm ci --prefix backend` và `npm ci --prefix frontend`. Không cần cài lại ở mỗi lần chạy.

```powershell
pwsh -File .\scripts\start-local-db.ps1
npm --prefix .\backend run build
npm --prefix .\backend run start
```

Giữ terminal backend mở, mở terminal thứ hai:

```powershell
npm --prefix .\frontend run dev
```

Truy cập http://127.0.0.1:5173. `.env` cần OpenWeather key hợp lệ, APP_ORIGIN khớp địa chỉ này. Không gửi nội dung `.env` lên chat/Git.

## 4. Cách kiểm thử và kết quả

```powershell
npm --prefix .\frontend test
npm --prefix .\frontend run lint
npm --prefix .\frontend run format:check
npm --prefix .\frontend run build
npm --prefix .\frontend run test:e2e
```

Vitest/Testing Library kiểm tra debounce, dữ liệu tìm kiếm lỗi thời, rỗng/lỗi, bàn phím, chuyển đơn vị, lỗi lưu đơn vị, refresh đồng thời, không lặp mutation khi mất mạng, lỗi dịch vụ không tự đăng xuất và phiên cũ không ghi đè phiên mới. Dùng mock trong unit test để kiểm tra lỗi có chủ đích; ứng dụng chạy thật không dùng mock.

Playwright cần Google Chrome đã cài, hai server đang chạy, PostgreSQL và OpenWeather hoạt động. Hai bài test dùng API thật: tìm Hà Nội, đổi C/F, kiểm tra không tràn trang ở 1440/768/360/320 px; đăng ký, lưu/xóa yêu thích, lịch sử, cập nhật tên, đơn vị được giữ sau đăng nhập lại, đổi mật khẩu. Tài khoản `weather-e2e-<uuid>@example.invalid` được dọn trong `finally`; không reset database hoặc xóa tài khoản người dùng. Bài test có sử dụng quota OpenWeather (cache có thể giảm số lượt gọi).

Bằng chứng đã chạy: 11 unit/component test và 2 E2E đạt. Đã xem ảnh desktop và mobile; E2E không ghi nhận lỗi JavaScript trong luồng thời tiết. Ảnh chụp lưu 4 kích thước, chỉ chứa dữ liệu thời tiết công khai. Luồng tài khoản đã xác minh dữ liệu tồn tại qua đăng xuất/đăng nhập lại.

Kiểm tra cuối: frontend lint, format:check và production build đạt; backend lint đạt sau khi thêm helper dọn dữ liệu E2E. Không chạy lại toàn bộ backend test trong Giai đoạn 5 vì không đổi mã nghiệp vụ backend; kết quả Giai đoạn 4 được ghi riêng trong báo cáo trước. Bundle chính khoảng 492 kB (151 kB gzip); đây là số liệu build, chưa phải đo hiệu năng người dùng thực tế.

## 5. Kết quả mong đợi

Không có thời tiết giả khi chưa chọn địa điểm. Chọn kết quả tìm kiếm hiển thị dữ liệu thật; đổi đơn vị áp dụng đồng bộ. Khách được xem thời tiết, tài khoản được lưu dữ liệu riêng. Khi đăng xuất, danh sách cá nhân biến mất. Cảnh báo nói rõ giới hạn gói Free.

## 6. Lỗi đã gặp và xử lý

- `ERR_CONNECTION_REFUSED`: server chưa chạy; mở backend và Vite ở hai terminal.
- `ERR_MODULE_NOT_FOUND` với reflect-metadata: thư viện backend thiếu; khôi phục bằng `npm ci --prefix backend` từ file khóa, không đổi phiên bản tùy tiện.
- Tràn ngang do chữ hỗ trợ trình đọc màn hình trong timeline: đặt vùng định vị tại timeline để phần tử bị giới hạn trong khu vực cuộn. Đã kiểm tra lại 4 độ rộng.
- Sau đăng ký bị điều hướng nhầm trang tài khoản: tách đích điều hướng của phiên vừa đăng nhập khỏi trường hợp đã đăng nhập từ trước. E2E tài khoản đã đạt sau sửa.
- HTTP 429: chờ thời gian Retry-After; không chạy lặp liên tục hoặc tắt rate limiting để test đạt. Đăng ký bị giới hạn 5 lần/giờ/IP.
- Weather 503/401 từ nhà cung cấp: kiểm tra key trong `.env`, thời gian kích hoạt và quyền gói Free; không dùng dữ liệu giả để thay thế.

## 7. Tiêu chí kết thúc và phạm vi còn lại

Giai đoạn 5 có giao diện kết nối thật, unit/component test và E2E nghiệp vụ chính đạt, đã kiểm tra bố cục desktop/mobile. Đây chưa phải nghiệm thu production.

Giai đoạn 6 cần kiểm thử mở rộng lỗi mạng/database, phiên nhiều tab, tài khoản A/B qua giao diện, các route trên mobile, rà soát accessibility/độ tương phản và hiệu năng cơ bản. Chưa tuyên bố kiểm thử mọi trình duyệt hoặc đạt WCAG toàn diện. Docker/cloud/CI và bàn giao cuối ở Giai đoạn 7.
