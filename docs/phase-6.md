# Giai đoạn 6 — Tích hợp và kiểm thử

Thực hiện ngày 25/10/2026. Phạm vi: kiểm thử local toàn hệ thống, sửa lỗi phát hiện được, rà soát bảo mật và hiệu năng cơ bản. Chưa triển khai cloud.

## 1. Những gì đã hoàn thành

| Nhóm | Bằng chứng kiểm tra |
| --- | --- |
| Backend | 38 unit/HTTP test: validation, JWT hết hạn/chỉnh sửa, CSRF, mật khẩu, cookie production, lỗi thời tiết, cache, rate limit và Swagger |
| PostgreSQL | 12 integration test trên `weather_app_test`: quyền A/B, refresh rotation, đổi mật khẩu, unique, giới hạn favorites/history đồng thời, CHECK và cascade |
| Frontend | 12 unit/component test: debounce, dữ liệu cũ, lỗi API, đổi đơn vị, refresh, phản hồi phiên đến muộn và đồng bộ đăng xuất đa tab |
| E2E | 5 bài: tài khoản, thời tiết, lỗi/phục hồi, route/form mobile, hai tài khoản và nhiều tab; xem kết quả chạy cuối trong phần nghiệm thu |
| Sự cố thật | Dừng cluster PostgreSQL riêng của dự án rồi khởi động lại; live 200, ready 503, lỗi tài khoản rõ ràng và thử lại phục hồi |
| Dependency | npm audit `--omit=dev` của frontend và backend đều báo 0 lỗ hổng tại thời điểm kiểm tra |
| Chất lượng | Backend/frontend lint và format:check đạt; build backend và frontend đạt |

Đã kiểm tra thực tế: tài khoản B không xóa được favorite/history của A khi thay ID; B không thấy dữ liệu A trên giao diện. Hai tab cùng thiếu access cookie chỉ tạo **một** POST refresh, sau đó đều giữ tài khoản hợp lệ. Đây là thử nghiệm thiếu access cookie; JWT thật hết hạn được kiểm tra riêng trong backend test, không đợi 15 phút trong E2E.

Database outage là thật, chỉ tác động cluster `.local/postgres:55432`. Các test thời tiết timeout và mất mạng tìm kiếm dùng Playwright route để tạo lỗi có kiểm soát; sau bỏ route, “Thử lại” lấy dữ liệu OpenWeather thật. Session khách trong hai bài resilience được mô phỏng, xác thực thật nằm ở hai bài account/security. Không dùng dữ liệu giả trong mã ứng dụng.

## 2. Lỗi đã sửa

1. **Tab khác còn danh sách cá nhân sau đăng xuất:** phụ thuộc sự kiện focus chưa đủ. Thêm `BroadcastChannel` gửi duy nhất chuỗi `changed` hoặc `logout`, không gửi token, email hay user object. Tab nhận logout xóa session/history error ngay; changed tải lại `/auth/me`. Vẫn kiểm tra backend cho mọi request, có dọn channel khi unmount. Trình duyệt không hỗ trợ channel vẫn có kiểm tra khi focus/request.
2. **Liên kết tài khoản thiếu tên truy cập trên mobile:** chữ bị ẩn theo CSS ở 320 px. Thêm `aria-label` theo trạng thái tài khoản. Kiểm tra bằng cây accessibility của Chrome và locator tên liên kết.
3. **Test phụ thuộc quota server phát triển:** Playwright hiện tự khởi động backend 3001 và Vite 5174 riêng, giữ nguyên rate limiting. Khi cả suite dùng hết ngân sách IP trong một phút, bài weather chờ đúng `Retry-After` tối đa 60 giây rồi bắt đầu; không bỏ assertion hoặc tắt giới hạn. Tài khoản cho bài phân quyền dùng fixture local với mật khẩu Argon2; bài account vẫn đăng ký qua UI thật.
4. **Test ghi đè ảnh báo cáo cũ:** ảnh runtime nay ghi vào `frontend/test-results/` được Git ignore; ảnh Giai đoạn 5 được giữ nguyên.

## 3. File tạo/thay đổi

- `frontend/src/app/AppProvider.jsx`, `AppProvider.test.jsx`: đồng bộ và kiểm thử phiên giữa các tab.
- `frontend/src/app/Layout.jsx`: tên truy cập cho liên kết tài khoản.
- `frontend/e2e/security.spec.js`: A/B, refresh nhiều tab, logout khi quay lại tab, database outage tùy chọn và phục hồi.
- `frontend/e2e/resilience.spec.js`: lỗi thời tiết/mạng, retry, route/form, keyboard và mobile.
- `frontend/e2e/weather.spec.js`: chờ quota hợp lệ; chuyển ảnh test ra thư mục ignore.
- `frontend/playwright.config.js`, `package.json`: server test riêng; tự build backend trước E2E.
- `backend/test/create-ui-user.mjs`: fixture chỉ cho email `weather-e2e-<uuid>@example.invalid` trên database local dự án; nhận mật khẩu qua stdin, không ghi log. Dọn bằng helper cleanup đã có.
- `frontend/e2e/runtime-check.mjs`, `docs/phase-6-runtime.json`: kiểm tra bản build và ghi số đo.
- `docs/screenshots/phase-6-register-mobile.png`, báo cáo này, README và cập nhật hướng dẫn Giai đoạn 5.

## 4. Lệnh và cách kiểm thử

Từ thư mục dự án trong PowerShell. Cần Node/npm đúng phiên bản README, Google Chrome, `.env` hợp lệ và PostgreSQL 18 của dự án. Nếu vừa clone cần cài thư viện theo README trước.

```powershell
pwsh -File .\scripts\start-local-db.ps1
npm --prefix .\backend test
npm --prefix .\backend run test:integration
npm --prefix .\frontend test
npm --prefix .\frontend run test:e2e
```

E2E tự build backend và tự bật/tắt server ở 3001/5174; không cần dừng server phát triển 3000/5173. Hai cổng test phải trống. Test sử dụng `weather_app` nhưng chỉ tạo/xóa tài khoản ngẫu nhiên do lượt chạy sở hữu; không reset dữ liệu. Integration backend dùng `weather_app_test` riêng. Không chạy hai suite E2E đồng thời.

Chủ động kiểm thử mất database (gây gián đoạn tạm thời cho ứng dụng local cùng cluster):

```powershell
try {
    $env:PHASE6_DB_OUTAGE = '1'
    npm --prefix .\frontend run test:e2e
} finally {
    Remove-Item Env:PHASE6_DB_OUTAGE -ErrorAction SilentlyContinue
}
```

Test khởi động lại PostgreSQL trong `finally` khi lỗi. Nếu tiến trình bị buộc tắt hoặc máy mất điện, chạy lại `start-local-db.ps1` trước khi tiếp tục. Không bật cờ này với người khác đang sử dụng database local.

Kiểm tra định dạng/lint và đo bản build:

```powershell
npm --prefix .\frontend run lint
npm --prefix .\backend run lint
npm --prefix .\frontend run format:check
npm --prefix .\backend run format:check
npm --prefix .\frontend run build
npm --prefix .\frontend run preview -- --port 4173 --strictPort
```

Giữ preview mở, từ terminal khác chạy `node .\frontend\e2e\runtime-check.mjs`. Preview dùng để đo trang khách, không phải xác nhận cookie/HTTPS production. Dừng preview bằng Ctrl+C sau khi đo.

## 5. Kết quả mong đợi và số đo

- Chạy các test đạt; đăng xuất ở tab này xóa dữ liệu cá nhân hiển thị ở tab khác mà không cần reload.
- Database lỗi không biến thành dữ liệu rỗng thành công hoặc tự báo sai mật khẩu. Khi phục hồi, người dùng có thể thử lại.
- Trang không tràn ngang ở các độ rộng test: dashboard 320/360/768/1440; các trang đăng nhập, đăng ký, 404 và tài khoản ở 320/768.
- Đã xem ảnh form đăng ký ở 320 px; đã kiểm tra skip link, focus trường lỗi và tên điều khiển trang khách bằng accessibility tree ở 320/1440.
- Ba cặp màu cơ bản đạt tỷ lệ tương phản 12.37, 7.75 và 10.73. Chưa đo tất cả tổ hợp màu, gradient, trạng thái và trang; không tuyên bố chứng nhận WCAG.
- Bản build cuối: bundle chính 491.96 kB, gzip 151.18 kB. Ba lượt Chrome headless local cho thời điểm quan sát trang sẵn sàng 164/168/170 ms (trung vị 168 ms), DOMContentLoaded 62–63 ms. Số đo phụ thuộc máy, không giới hạn CPU/mạng, không phải Core Web Vitals thực địa hoặc load test. Dữ liệu gốc ở `phase-6-runtime.json`.

## 6. Lỗi môi trường và giới hạn cần nhớ

- EACCES localhost: một lượt HTTP test ban đầu bị môi trường chặn kết nối; sau khi có quyền localhost, 38 test đạt. Không sửa logic để né lỗi môi trường.
- 429: luôn tôn trọng Retry-After. Lượt đầu dùng server phát triển đã chạm giới hạn đăng ký 5/giờ; không xem đó là lỗi xác thực. Server test riêng loại bỏ phụ thuộc vào lịch sử thao tác thủ công, nhưng vẫn áp dụng đầy đủ giới hạn trong mỗi lượt.
- Cổng 3001/5174 bận: dừng đúng tiến trình test cũ hoặc chọn thời điểm cổng trống; không giết tiến trình không xác định.
- OpenWeather lỗi hoặc hết quota: bài kiểm tra thời tiết thật có thể thất bại; kiểm tra trạng thái/key, không đổi sang mock để tuyên bố kết nối thật đạt.
- Cache/rate limit hiện nằm trong bộ nhớ mỗi backend. Phù hợp local và triển khai một instance; khi mở rộng nhiều instance phải thiết kế kho chia sẻ/ngân sách provider chung, không coi hạn mức hiện tại là toàn cụm.
- HTTPS, reverse proxy, header cho frontend static, cookie Secure trên domain triển khai và Docker chưa được kiểm tra thực tế; thuộc Giai đoạn 7. Backend test có kiểm tra cấu hình cookie production, không thay thế smoke test trên HTTPS thật.
- Chưa test Firefox/Safari, điện thoại thật, screen reader thật, tải đồng thời quy mô lớn hoặc audit bảo mật độc lập.

## 7. Tiêu chí kết thúc

Hoàn tất khi các suite quan trọng đạt trên mã cuối, hai lỗi giao diện/phiên đã có kiểm thử hồi quy, database đã phục hồi, tài khoản fixture đã dọn, bằng chứng và giới hạn được ghi lại. Không phát hiện lỗi nghiêm trọng còn mở trong phạm vi kiểm tra này. Giai đoạn tiếp theo: Docker, hướng dẫn cloud, CONTRIBUTING và checklist bàn giao; chưa tự triển khai production.

**Kết quả lượt cuối:** 5/5 E2E đạt trong 16.0 giây với `PHASE6_DB_OUTAGE=1`; 12/12 frontend unit/component, 38/38 backend unit/HTTP và 12/12 PostgreSQL integration đạt. Hai code fix có kiểm thử hồi quy. Đã so sánh nội dung build frontend với API key/JWT secret/CSRF secret trong `.env`: không tìm thấy các giá trị này trong build, không in secret ra log.

Kiểm tra sau suite: số tài khoản `weather-e2e-*` còn lại là **0**; readiness qua server phát triển trả `ready`. Preview đo hiệu năng đã dừng; không thay đổi dịch vụ PostgreSQL mặc định ngoài cluster của dự án.
