# Giai đoạn 4 — Backend

Hoàn tất và kiểm tra ngày **25/10/2026**. Phạm vi lượt này là backend; frontend vẫn là trang kết nối của Giai đoạn 3.

## 1. Đã hoàn thành

- Migration Prisma tạo User, Session, Favorite, SearchHistory. Unique email và `(userId, locationKey)`, index cho danh sách/phiên, cascade khi xóa user, CHECK tọa độ/quốc gia/email/tên/hạn phiên. Không lưu thời tiết bên ngoài vào DB.
- AuthModule: đăng ký, đăng nhập, me, CSRF, refresh, logout. Argon2id memory 19 MiB/2 iterations/parallelism 1; JWT HS256 kiểm tra issuer/audience/expiry; refresh ngẫu nhiên 256 bit chỉ lưu SHA-256. Access 15 phút, phiên tuyệt đối 7 ngày, tối đa 5 phiên đang hoạt động. Dọn phiên hết hạn/thu hồi mỗi giờ khi backend chạy.
- Cookie HttpOnly, SameSite=Lax; production thêm Secure và prefix `__Host-`, không Domain. CSRF HMAC gắn session/anonymous, so sánh an toàn thời gian, kiểm tra Origin; logout/password change thu hồi phiên trong DB.
- UsersModule: sửa tên, đơn vị C/F, đổi mật khẩu và thu hồi mọi phiên. Không cho đổi email hay nhận userId tùy ý.
- FavoritesModule/SearchHistoryModule: phân trang; 50 yêu thích/20 lịch sử; chuẩn hóa tọa độ 4 chữ số; khóa hàng User trong transaction để giới hạn không bị vượt khi ghi đồng thời. Truy vấn xóa có cả owner; ID của người khác trả 404.
- WeatherModule: OpenWeather Geocoding, Current, Forecast 5 ngày/3 giờ; chuẩn hóa response, optional thiếu thành null, tổng hợp ngày từ mốc thật. Cảnh báo `UNSUPPORTED`, không gọi One Call.
- Provider: HTTPS host cố định, không redirect, timeout 5 giây, body tối đa 1 MiB, kiểm tra cấu trúc, cache 500 mục có TTL, gộp request trùng; không cache lỗi. Tối đa 40 request/phút và 4 request đồng thời tới provider trong một instance.
- HTTP: envelope, lỗi không lộ SQL/stack/key, body JSON tối đa 16 KiB, validation trường thừa, rate limit IP/email/user, Retry-After. Swagger có request DTO và response schema cho đủ **21 thao tác**.

## 2. File tạo hoặc thay đổi

| Nhóm | File/thư mục |
| --- | --- |
| Database | `backend/prisma/migrations/202610240001_initial/migration.sql`, `migration_lock.toml` |
| Nghiệp vụ | `backend/src/modules/auth/`, `users/`, `favorites/`, `search-history/`, `weather/` |
| Biên HTTP/config | `backend/src/common/{api-error,http,location,rate-limit.service,openapi}.ts`, `configure-app.ts`, `main.ts`, `app.module.ts`, `config/environment.ts` |
| Test | `backend/test/` (unit/HTTP/integration/live smoke), `vitest.integration.config.mjs` |
| Thiết lập | `scripts/init-auth-secrets.mjs`, `backend/package.json`, lockfile, `.env.example` |
| Tài liệu | `README.md`, `docs/api-contract.md`, `docs/architecture.md`, tài liệu này |

Dependency mới khóa phiên bản: jose 6.2.13 (JWT), argon2 0.45.1 (password), cookie 2.0.1 (parse cookie). Dùng Fetch tích hợp Node, không cần thêm thư viện HTTP/cache hoặc generic repository. Frontend giữ JavaScript.

## 3. Lệnh cần chạy — PowerShell 7

Máy hiện tại đã cài package, tạo secret và migrate; các lệnh sau để tái lập:

```powershell
Set-Location 'C:\FullStack-Learning\weatherApp'
pwsh -File .\scripts\start-local-db.ps1
npm --prefix .\backend ci
node .\scripts\init-auth-secrets.mjs
npm --prefix .\backend run migrate:deploy
npm --prefix .\backend run dev
```

Terminal thứ hai:

```powershell
Set-Location 'C:\FullStack-Learning\weatherApp'
npm --prefix .\frontend run dev
```

OpenWeather key chỉ đặt trong `.env` ở gốc, không đặt trong `.env.example` hoặc biến `VITE_*`. JWT/CSRF cần secret khác nhau, ít nhất 43 ký tự; script sinh 48 byte ngẫu nhiên và giữ nguyên giá trị đã có. Sau sửa `.env`, khởi động lại backend.

Swagger qua cùng origin: [http://127.0.0.1:5173/api/docs/](http://127.0.0.1:5173/api/docs/). GET `/auth/csrf`, copy `data.csrfToken` vào X-CSRF-Token khi thử POST/PATCH/DELETE; browser tự gửi cookie. Sau register/login/refresh lấy token mới từ response. Mở Swagger trực tiếp cổng 3000 chỉ phù hợp xem tài liệu; mutation sẽ bị Origin check khi APP_ORIGIN là cổng 5173.

## 4. Kiểm thử và bằng chứng

```powershell
npm --prefix .\backend run lint
npm --prefix .\backend run format:check
npm --prefix .\backend test
npm --prefix .\backend run test:integration
npm --prefix .\backend run prisma:validate
npm --prefix .\backend run migrate:status
npm --prefix .\backend audit
# Tùy chọn, dùng key thật, khoảng 3 request Free:
npm --prefix .\backend run test:weather-live
```

| Kiểm tra thực sự đã chạy | Kết quả |
| --- | --- |
| Build, ESLint, Prettier | Đạt |
| 38 unit/HTTP test | Đạt: config, health, Argon2/JWT/CSRF, cookie production flags, rate limit, normalization, provider lỗi/timeout/cache, DTO và Swagger |
| 12 integration test PostgreSQL | Đạt: đăng ký/login/đổi mật khẩu/logout, refresh cũ và refresh đồng thời, rate limit, hai tài khoản cách ly, favorites đồng thời/giới hạn 50, history giữ 20, CHECK và cascade |
| Prisma validate, migrate deploy/status | Đạt; migration đã áp dụng DB ứng dụng và DB test từ trạng thái trống |
| npm audit backend | 0 vulnerability được công cụ báo tại thời điểm kiểm tra |
| Live OpenWeather lúc 11:41 ngày 25/10/2026 (UTC+7) | Geocoding Hà Nội 1 kết quả; current 31,63°C, observedAt 04:39:24Z; forecast 40 mốc/3 giờ chạm 6 ngày lịch; cache hit; alerts UNSUPPORTED |
| HTTP thật qua Vite proxy cổng 5173 | ready 200; current 200; forecast 40 mốc; Swagger UI và JSON 200 |
| Database không kết nối được | Probe live vẫn 200; ready và GET auth/me có JWT hợp lệ trả 503 DATABASE_UNAVAILABLE, không lộ chi tiết kết nối |

Các con số thời tiết trên chỉ là bằng chứng tại thời điểm gọi, không phải dữ liệu mặc định. Unit test dùng fixture ghi rõ, không gọi provider thật. Integration dùng `weather_app_test` trên cluster cổng 55432; không xóa/truncate database ứng dụng. Runner xóa user do chính lượt test tạo, cascade dọn dữ liệu phụ thuộc; database test và migration được giữ cho lần chạy sau.

Không khẳng định đã chạy `npm ci` trên máy sạch, Docker, trình duyệt mobile/responsive, benchmark tải, hoặc E2E giao diện nghiệp vụ. Những việc này thuộc các giai đoạn tiếp theo.

## 5. Kết quả mong đợi khi dùng API

- Request hợp lệ trả `{data, meta:{requestId}}`; danh sách có `meta.pagination`. 204 không body. Lỗi có code/message, validation có tên field nhưng không phản chiếu giá trị nhập.
- Khách xem thời tiết được; `/auth/me`, `/favorites`, `/search-history` yêu cầu phiên hợp lệ.
- Đăng nhập đặt cookie HttpOnly, không trả access/refresh token trong JSON. Chỉ CSRF token được trả JSON để giữ trong bộ nhớ phía frontend.
- Cùng tọa độ chuẩn hóa không tạo hai favorites của cùng user. Chọn lại lịch sử cập nhật thời gian, không nhân bản.
- Tìm không thấy địa điểm trả mảng rỗng. Provider lỗi trả lỗi rõ ràng; không dùng số liệu thay thế.
- Ngày dự báo thiếu mốc có `isPartial=true`; min/max là cực trị trong các mốc, không phải nhiệt độ cực trị đo được của cả ngày.

## 6. Lỗi thường gặp và cách xử lý

| Hiện tượng | Cách xử lý |
| --- | --- |
| Thiếu JWT_SECRET/CSRF_SECRET | Chạy script init-auth-secrets, không gửi nội dung `.env` lên chat/log |
| 503 DATABASE_UNAVAILABLE | Chạy start-local-db, kiểm tra DATABASE_URL local cổng 55432; không sửa cluster mặc định 5432 |
| Bảng chưa tồn tại | Chạy migrate:deploy; không dùng db push thay lịch sử migration |
| 403 ORIGIN_FORBIDDEN | Dùng đúng `127.0.0.1:5173` như APP_ORIGIN, Swagger qua proxy; không trộn localhost và 127.0.0.1 |
| 403 CSRF_INVALID | GET auth/csrf để lấy cookie/token khớp phiên; sau login/refresh dùng token mới; không lưu token lâu trong localStorage |
| 401 ACCESS_EXPIRED/AUTH_REQUIRED | Frontend Giai đoạn 5 sẽ refresh một lần; dùng refresh cookie và CSRF hiện hành. Phiên đã bị thu hồi/hết hạn phải login lại |
| 503 WEATHER_UNAVAILABLE | Kiểm tra key trong `.env`, trạng thái kích hoạt/quyền Free; restart backend. Không tự đăng ký One Call |
| 503 WEATHER_QUOTA_EXCEEDED / 429 RATE_LIMITED | Chờ Retry-After, kiểm tra quota và cache; không retry dồn dập |
| 504 WEATHER_TIMEOUT hoặc 502 WEATHER_* | Cho phép người dùng thử lại sau; không giả lập thời tiết |
| Native Argon2 không tải trên máy khác | Kiểm tra Node LTS/platform hỗ trợ, chạy npm ci theo lockfile; một số platform cần toolchain native |

Lỗi đã phát hiện và sửa trong lượt này: DTO hồ sơ rỗng vẫn có key `undefined`; import kiểu Swagger phải dùng export công khai; lint script Node cần import globals; rate limit chuẩn hóa chữ hoa/thường và dấu `/` cuối theo cách Express khớp route. API key từng được nhập nhầm vào `.env.example`, đã chuyển sang `.env` và xóa khỏi file mẫu trước khi commit, không in key ra output. Quét 88 file dự kiến thuộc Git và lịch sử các nhánh không tìm thấy API key hoặc các secret cục bộ hiện hành.

Không chạy rollback phá dữ liệu tự động. Migration đầu tiên là additive trên DB trống; nếu đã có dữ liệu thật, backup và dùng migration sửa tiến về phía trước hoặc khôi phục backup được kiểm chứng. Không sửa migration đã áp dụng, không chạy migrate reset trên DB ứng dụng.

## 7. Tiêu chí hoàn tất và giới hạn

Các tiêu chí Giai đoạn 4 đã đạt: migration, các module backend, quyền sở hữu, unit/API integration PostgreSQL, Swagger, live Free smoke test và lỗi provider giả lập. Có thể chuyển sang Giai đoạn 5 theo yêu cầu người dùng.

Giới hạn được giữ rõ: cache/rate limiter nằm trong một tiến trình, mất khi restart; tối đa 40/phút không bảo đảm quota tháng nếu key dùng nơi khác. Production nhiều instance cần kho chia sẻ; topology reverse proxy/trust proxy sẽ cấu hình ở Giai đoạn 7, hiện không tin X-Forwarded-For. Chu kỳ dọn session chỉ chạy khi server hoạt động, guard vẫn từ chối phiên hết hạn ngay lập tức.

Refresh dùng CAS một hash hiện hành, không hứa phát hiện replay cả token family. CSRF hết hạn hoặc credential cũ không xác định được phiên có thể trả 403 trước bước xác thực; client lấy CSRF mới, rồi login lại nếu phiên không còn. Không có quên mật khẩu/xác minh email/OAuth trong MVP.

Gói Free đã xác minh: [Pricing](https://openweathermap.org/price), [Current](https://openweathermap.org/api/current), [Forecast 5 ngày/3 giờ](https://openweathermap.org/api/forecast5), [Geocoding](https://openweathermap.org/api/geocoding-api). Không có cảnh báo thật hoặc dự báo từng giờ/7 ngày trong bản này. Offset timezone cố định có giới hạn khi DST thay đổi; `timeZone:null`.

Giai đoạn 5: frontend Glassmorphism tiếng Việt, tìm kiếm debounce/hủy request, dashboard thật, biểu đồ/đơn vị đồng bộ, tài khoản, favorites/history và kiểm thử responsive. Chưa triển khai phần đó trong Giai đoạn 4.
