# REST API contract v1

Trạng thái 25/10/2026: 21 thao tác dưới đây đã triển khai trong Giai đoạn 4; xem [bằng chứng kiểm thử](phase-4.md). Frontend nghiệp vụ chưa tích hợp, thuộc Giai đoạn 5. Base `/api/v1`, JSON UTF-8; timestamp ISO 8601 UTC; field camelCase; enum UPPER_SNAKE_CASE (đơn vị C/F). Schema ký hiệu `?` là optional input; `| null` là trường output luôn xuất hiện nhưng có thể thiếu giá trị. Trường output khác đều bắt buộc.

## 1. Envelope, validation và errors

Thành công 200/201: `{ "data": <schema>, "meta": { "requestId": "uuid" } }`. Danh sách phân trang thêm `meta.pagination: {page:number, pageSize:number, totalItems:number, totalPages:number}`; danh sách rỗng totalPages=0. 204 không có body. Header X-Request-Id do server sinh, không phản chiếu tùy ý dữ liệu client.

Lỗi: `{ "error": { "code": "VALIDATION_ERROR", "message": "Dữ liệu không hợp lệ.", "fields": [{"field":"email","message":"Email không hợp lệ."}] }, "meta": {"requestId":"uuid"} }`. `fields` chỉ xuất hiện cho validation, không chứa giá trị mật khẩu/token đã nhập. Không trả stack, SQL, URL chứa key hoặc lỗi nguyên văn provider.

| HTTP | Code ví dụ | Ý nghĩa |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Body/query/id sai định dạng, trường thừa |
| 401 | AUTH_REQUIRED, ACCESS_EXPIRED, SESSION_INVALID, INVALID_CREDENTIALS, REFRESH_INVALID | Thiếu/hết/sai xác thực; login sai email/password dùng cùng thông báo |
| 403 | CSRF_INVALID, ORIGIN_FORBIDDEN | Chống CSRF thất bại |
| 404 | NOT_FOUND | Không có tài nguyên hoặc không thuộc người dùng |
| 409 | EMAIL_ALREADY_EXISTS, FAVORITE_EXISTS, FAVORITE_LIMIT_REACHED | Xung đột; đăng ký cho biết email đã được dùng là đánh đổi UX được ghi nhận |
| 413 | PAYLOAD_TOO_LARGE | Body vượt 16 KiB |
| 415 | UNSUPPORTED_MEDIA_TYPE | Mutation có body không dùng application/json |
| 429 | RATE_LIMITED | Limiter ứng dụng; Retry-After số giây |
| 502 | WEATHER_INVALID_RESPONSE, WEATHER_UPSTREAM_ERROR | Provider trả dữ liệu hỏng/5xx |
| 503 | DATABASE_UNAVAILABLE, WEATHER_UNAVAILABLE, WEATHER_QUOTA_EXCEEDED | DB lỗi, provider 401/403, DNS/network/429 hoặc ngân sách upstream hết |
| 504 | WEATHER_TIMEOUT | Provider vượt timeout |
| 500 | INTERNAL_ERROR | Lỗi ngoài dự kiến, thông báo chung |

Provider trả 401 không biến thành 401 ứng dụng (tránh frontend refresh sai). Provider 404/400 bất ngờ sau validation trở thành 502, không giả là kết quả tìm kiếm rỗng. Search thành công mảng rỗng vẫn 200. Missing API key phải báo cấu hình khi khởi động môi trường yêu cầu weather, không tạo payload demo.

Global ValidationPipe: transform có kiểm soát, whitelist và forbidNonWhitelisted. Parse UUID cho `:id`; query số phải finite; không chấp nhận chuỗi rỗng thành 0. DTO class-validator/class-transformer; output mapper allowlist riêng, không serialize Prisma User thẳng.

Pagination input: `page` integer 1–1.000.000 default 1, `pageSize` integer >=1 default 20; favorites max50, history max20. page vượt dữ liệu trả mảng rỗng. Search/forecast không phân trang vì số mốc/kết quả cố định từ nguồn và UI cần toàn bộ dải thời gian.

## 2. Schema dùng chung

| Schema | Trường |
| --- | --- |
| User | id:UUID, email:string, displayName:string, preferredTemperatureUnit:C\|F, createdAt:ISO, updatedAt:ISO |
| AuthResult | user:User, csrfToken:string, accessExpiresAt:ISO, sessionExpiresAt:ISO; token đăng nhập chỉ qua Set-Cookie |
| Location | locationKey:string, name:string, country:string(2), state:string\|null, latitude:number, longitude:number |
| LocationInput | name:string(1–160), country:2 chữ cái uppercase, state?:string(1–160)\|null, latitude:number[-90,90], longitude:number[-180,180] |
| Favorite | id:UUID, location:Location, createdAt:ISO |
| HistoryItem | id:UUID, location:Location, searchedAt:ISO |
| Condition | code:integer, description:string tiếng Việt, icon:string enum nội bộ |
| WeatherSource | provider:OPENWEATHER, product:CURRENT\|FORECAST_5_DAY, fetchedAt:ISO, cached:boolean |
| WeatherLocation | latitude:number, longitude:number, name:string\|null, country:string\|null, utcOffsetSeconds:integer, timeZone:null |

LocationInput trim name/state, chuẩn hóa tọa độ và locationKey như architecture. Cấm `id`, `userId`, `locationKey`, `createdAt` trong body tạo. Name dùng để hiển thị, không phải dữ liệu được xác minh. WeatherLocation.name của provider có thể khác tên geocoding; tiêu đề UI giữ địa điểm người dùng đã chọn.

Condition.icon enum: CLEAR_DAY, CLEAR_NIGHT, PARTLY_CLOUDY_DAY, PARTLY_CLOUDY_NIGHT, CLOUDY, RAIN, THUNDERSTORM, SNOW, MIST, UNKNOWN. Không trả URL icon tùy ý. Mô tả dùng lang=vi của provider hoặc mapping tiếng Việt từ code; code lạ mô tả “Chưa xác định”.

## 3. Authentication và Users

Mọi POST/PATCH/DELETE phải có Origin hợp lệ và `X-CSRF-Token`, kể cả trước đăng nhập. Access cookie bắt buộc trừ các ngoại lệ ở bảng. Response cá nhân và auth đều no-store.

| Method / path | Input / xác thực | Thành công | Lỗi riêng ngoài lỗi chung |
| --- | --- | --- | --- |
| GET /auth/csrf | Không body; public, có thể dùng refresh hiện hành để bind Session | 200 `{csrfToken:string, expiresAt:ISO}` + cookie ký | 503 nếu cần DB mà DB lỗi |
| POST /auth/register | `{email, password, displayName}`; anonymous CSRF hoặc CSRF phiên hiện tại | 201 AuthResult, tạo User + Session transaction | 409 email trùng |
| POST /auth/login | `{email, password}`; CSRF | 200 AuthResult | 401 INVALID_CREDENTIALS |
| POST /auth/refresh | Không body; refresh cookie, CSRF phiên | 200 AuthResult, xoay cookie | 401 REFRESH_INVALID |
| POST /auth/logout | Không body; access hoặc refresh hiện hành; vẫn idempotent nếu không còn phiên | 204, revoke và clear cookie | 503 nếu không thể xác nhận revoke do DB lỗi |
| GET /auth/me | Access cookie | 200 User | 401 |
| PATCH /users/me | `{displayName?, preferredTemperatureUnit?}`, ít nhất 1 field; Access | 200 User | 400 nếu body rỗng/field lạ |
| PATCH /users/me/password | `{currentPassword, newPassword}`; Access | 204, thu hồi mọi phiên, clear cookie | 400 CURRENT_PASSWORD_INVALID, PASSWORD_UNCHANGED |

Email valid <=254 ký tự, trim/lowercase. displayName 1–80 sau trim. Register/newPassword 12–128 ký tự; login/currentPassword 1–128 (không cắt/trim). preferredTemperatureUnit chỉ C/F. Không cho đổi email vì chưa có xác minh email. Logout không yêu cầu body `{userId}`. Khi đang login mà login/register thành công tài khoản khác, thu hồi phiên hiện tại trước khi thay cookie trong cùng transaction.

Refresh CAS, thời hạn tuyệt đối, CSRF binding và cookie flags được quy định tại [kiến trúc](architecture.md#6-luồng-xác-thực-và-csrf). Không expose endpoint quản lý phiên khác trong MVP.

## 4. Weather

Các endpoint public; không cần cookie. `lat` number [-90,90], `lon` number [-180,180], bắt buộc cho current/forecast. Không nhận units để giữ một nguồn metric; frontend đổi từ Celsius gốc. Query không nhận tên địa điểm hoặc URL nhà cung cấp.

| Method / path | Query | data |
| --- | --- | --- |
| GET /weather/search | `q` trim 2–100 ký tự; `country?` ISO alpha-2 uppercase | Location[] tối đa5 |
| GET /weather/current | `lat`, `lon` | CurrentWeather |
| GET /weather/forecast | `lat`, `lon` | Forecast |
| GET /weather/alerts | Không query trong bản Free | AlertAvailability |

Country search lọc quốc gia theo lựa chọn người dùng, không mặc định chỉ Việt Nam. Query Unicode normalize NFC, collapse whitespace cho key cache; không tự bỏ dấu tiếng Việt. Country được nối đúng định dạng geocoding, params URL encode.

### CurrentWeather

| Trường | Kiểu / ý nghĩa |
| --- | --- |
| location | WeatherLocation |
| observedAt | ISO: thời gian dữ liệu nguồn |
| temperatureC, feelsLikeC | number |
| areaMinC, areaMaxC | number\|null, min/max tại thời điểm hiện tại trong vùng, không phải ngày |
| condition | Condition |
| humidityPercent | number [0,100]\|null |
| windSpeedMs | number >=0\|null |
| windDirectionDegrees | number [0,360]\|null |
| pressureHpa | number >0\|null |
| visibilityM | number >=0\|null |
| sunriseAt, sunsetAt | ISO\|null |
| source | WeatherSource product CURRENT |

### Forecast

| Trường | Kiểu / ý nghĩa |
| --- | --- |
| location | WeatherLocation |
| intervalHours | literal 3 |
| rangeStartAt, rangeEndAt | ISO\|null: mốc đầu/cuối; null nếu không có mốc |
| slots | ForecastSlot[] sắp theo timestamp tăng dần, không duplicate |
| days | ForecastDay[] sắp ngày tăng; chỉ ngày có mốc thật |
| source | WeatherSource product FORECAST_5_DAY |

ForecastSlot: `{at:ISO, temperatureC:number, feelsLikeC:number|null, condition:Condition, precipitationProbability:number|null, humidityPercent:number|null, windSpeedMs:number|null}`. Probability [0,1]; không chuyển thành phần trăm hai lần. Missing optional metric → null.

ForecastDay: `{date:"YYYY-MM-DD", sampleMinC:number, sampleMaxC:number, representativeCondition:Condition, representativeAt:ISO, slotCount:integer, isPartial:boolean}`. Cực trị tính từ nhiệt độ các mốc, condition đại diện gần trưa; quy tắc tại architecture. Không có slot trả `days:[]`; không tạo ngày placeholder. Sai schema bắt buộc của slot trả lỗi toàn forecast thay vì âm thầm đổi thành dữ liệu rỗng.

### AlertAvailability

Bản Free trả chính xác cấu trúc năng lực, không gọi provider:

```json
{
  "data": {
    "status": "UNSUPPORTED",
    "reason": "FREE_PLAN",
    "message": "Gói dữ liệu hiện tại chưa hỗ trợ cảnh báo thời tiết.",
    "alerts": []
  },
  "meta": { "requestId": "00000000-0000-4000-8000-000000000001" }
}
```

Chưa thiết kế/triển khai response AVAILABLE hay dịch vụ cảnh báo khác. Nếu mở rộng phải bổ sung query tọa độ, schema alert và xác minh nguồn trước. Frontend không suy diễn `alerts:[]` là không có cảnh báo khi status UNSUPPORTED.

## 5. Favorites và Search history

Access guard và CSRF cho mutations. Không route nào nhận userId.

| Method / path | Input | Thành công | Lỗi riêng |
| --- | --- | --- | --- |
| GET /favorites | page?, pageSize? | 200 Favorite[], pagination; createdAt DESC, id DESC | — |
| POST /favorites | LocationInput | 201 Favorite | 409 FAVORITE_EXISTS / FAVORITE_LIMIT_REACHED |
| DELETE /favorites/:id | UUID path | 204 | 404 nếu không có/không sở hữu |
| GET /search-history | page?, pageSize? | 200 HistoryItem[], pagination; searchedAt DESC, id DESC | — |
| POST /search-history | LocationInput | 200 HistoryItem (upsert và cắt còn20) | — |
| DELETE /search-history/:id | UUID path | 204 | 404 nếu không có/không sở hữu |
| DELETE /search-history | Không body/query | 204, chỉ user hiện tại | — |

POST history luôn 200 vì nghiệp vụ “ghi nhận lần chọn”, cả tạo mới và cập nhật; frontend không phụ thuộc cách DB thực hiện. Không phân trang vượt giới hạn tuyệt đối20/50.

## 6. Health và tài liệu

| Method / path | Auth | Thành công | Khi lỗi |
| --- | --- | --- | --- |
| GET /health/live | public | 200 `{status:"ok"}` | Tiến trình không đáp ứng |
| GET /health/ready | public | 200 `{status:"ready"}` nếu DB SELECT1 trong2s | 503 DATABASE_UNAVAILABLE |

Vẫn dùng envelope như các route khác. Health không gọi weather để tránh tiêu quota. Swagger UI `/api/docs`, JSON `/api/docs-json` (không phải nghiệp vụ versioned); bật khi NODE_ENV=development, tắt ở môi trường khác. Swagger đã có request/response schema cho đủ 21 thao tác. Khi thử mutation ở local, mở qua Vite proxy `http://127.0.0.1:5173/api/docs/` để đúng Origin, lấy CSRF rồi nhập vào header; không cố sửa Origin bị trình duyệt quản lý.

## 7. Rate limit và retry

| Phạm vi | Giới hạn khởi điểm một instance |
| --- | --- |
| Global business API | 120 request/phút/IP; loại trừ probe health nội bộ |
| Login | 10/phút/IP + 5/15 phút theo HMAC(email chuẩn hóa), kể cả email không tồn tại |
| Register | 5/giờ/IP |
| Refresh / CSRF | 30/phút/IP mỗi endpoint |
| Search | 30/phút/IP |
| Current + forecast | Tổng 60/phút/IP |
| Mutations cá nhân | Tổng 30/phút/user |

Limiter IP không đủ bảo vệ quota provider: áp thêm limiter upstream dùng chung theo architecture. Key limiter bounded, expired entry dọn; key email HMAC không log raw email. Reverse proxy chỉ trust địa chỉ/hop cấu hình. Giá trị sẽ được benchmark trước public launch, không có bảo đảm chống DDoS phân tán.

GET an toàn để người dùng thử lại. Không tự retry mọi lỗi. POST register/login/refresh không an toàn để gửi lại sau network timeout: trạng thái server có thể đã thay đổi. POST favorites lặp trả409, history lặp cập nhật thời gian (không nhân bản nhưng có tác dụng phụ). PATCH password không retry; DELETE cùng id lần hai404, xóa toàn history lần hai204. MVP không nhận Idempotency-Key hoặc hứa exactly-once. 401 từ guard trước controller có thể được client replay một lần sau refresh.

## 8. Ví dụ contract (fixture minh họa; không phải dữ liệu trả về tại thời điểm hiện tại)

Request đăng ký sau khi đã lấy CSRF:

```http
POST /api/v1/auth/register
Origin: http://localhost:5173
Content-Type: application/json
X-CSRF-Token: <token-tu-auth-csrf>

{"email":"learner@example.com","password":"<mat-khau-tu-chon-12-128-ky-tu>","displayName":"Người học"}
```

Response 201: `data` là AuthResult. Cookie được Set-Cookie ở header, không JSON. Ví dụ bỏ nội dung cookie bí mật:

```json
{
  "data": {
    "user": {
      "id": "00000000-0000-4000-8000-000000000002",
      "email": "learner@example.com",
      "displayName": "Người học",
      "preferredTemperatureUnit": "C",
      "createdAt": "2026-10-24T03:00:00.000Z",
      "updatedAt": "2026-10-24T03:00:00.000Z"
    },
    "csrfToken": "<csrf-token-moi-gan-voi-phien>",
    "accessExpiresAt": "2026-10-24T03:15:00.000Z",
    "sessionExpiresAt": "2026-10-31T03:00:00.000Z"
  },
  "meta": {"requestId":"00000000-0000-4000-8000-000000000001"}
}
```

Request tìm kiếm: `GET /api/v1/weather/search?q=Ha%20Noi&country=VN`. Ví dụ rỗng hợp lệ: `{"data":[],"meta":{"requestId":"00000000-0000-4000-8000-000000000001"}}`.

Request current: `GET /api/v1/weather/current?lat=21.0285&lon=105.8542`. Các số dưới đây chỉ minh họa schema, tuyệt đối không dùng làm fallback giao diện:

```json
{
  "data": {
    "location": {"latitude":21.0285,"longitude":105.8542,"name":"Hà Nội","country":"VN","utcOffsetSeconds":25200,"timeZone":null},
    "observedAt":"2026-10-24T03:00:00.000Z",
    "temperatureC":28,"feelsLikeC":30,"areaMinC":null,"areaMaxC":null,
    "condition":{"code":803,"description":"Nhiều mây","icon":"CLOUDY"},
    "humidityPercent":75,"windSpeedMs":2.5,"windDirectionDegrees":90,
    "pressureHpa":1010,"visibilityM":10000,"sunriseAt":null,"sunsetAt":null,
    "source":{"provider":"OPENWEATHER","product":"CURRENT","fetchedAt":"2026-10-24T03:01:00.000Z","cached":false}
  },
  "meta":{"requestId":"00000000-0000-4000-8000-000000000001"}
}
```

Request lưu yêu thích (sau login, có Origin/CSRF/cookie):

```http
POST /api/v1/favorites
Content-Type: application/json

{"name":"Hà Nội","country":"VN","state":null,"latitude":21.0285,"longitude":105.8542}
```

Response201: `{"data":{"id":"00000000-0000-4000-8000-000000000003","location":{"locationKey":"ow:21.0285:105.8542","name":"Hà Nội","country":"VN","state":null,"latitude":21.0285,"longitude":105.8542},"createdAt":"2026-10-24T03:02:00.000Z"},"meta":{"requestId":"00000000-0000-4000-8000-000000000001"}}`.

Request cùng location lần hai:409 FAVORITE_EXISTS. GET `/favorites?page=1&pageSize=20` trả mảng Favorite theo schema và pagination. DELETE id thuộc tài khoản khác trả404 NOT_FOUND giống id không tồn tại.
