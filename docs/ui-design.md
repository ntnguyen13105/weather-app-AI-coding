# Wireframe và quy tắc giao diện

Giai đoạn2, bản đề xuất bố cục để triển khai sau. Chưa có screenshot, HTML/CSS hoặc prototype chạy. Bám yêu cầu glassmorphism và dashboard thời tiết tiếng Việt; không thêm bước chọn thương hiệu hoặc thay thẩm mỹ đã được người dùng chỉ định.

## 1. Người dùng, nhiệm vụ và cấu trúc trang

Người dùng mở ứng dụng để tìm một địa điểm, đọc thời tiết hiện tại và kế hoạch vài ngày tới. Chế độ thiết kế: Operate — ưu tiên thao tác và đọc dữ liệu. Dữ kiện cốt lõi: forecast Free cách3 giờ, tổng hợp ngày có thể thiếu, cảnh báo không được hỗ trợ.

| Route | Nội dung | Truy cập |
| --- | --- | --- |
| `/` | Dashboard, tìm kiếm và panel cá nhân | Public |
| `/dang-nhap` | Email, mật khẩu, liên kết đăng ký | Public |
| `/dang-ky` | Tên hiển thị, email, mật khẩu, xác nhận mật khẩu phía UI | Public |
| `/tai-khoan` | Tên hiển thị, đơn vị, đổi mật khẩu, đăng xuất | Bảo vệ |
| `*` | Trang không tồn tại, quay về dashboard | Public |

Sau login chỉ cho returnTo là route nội bộ allowlist, không redirect tới URL tùy ý. Đang kiểm tra phiên hiển thị loading, không chớp form đăng nhập. Khi phiên hết hạn, giữ địa điểm đang xem, xóa cache dữ liệu cá nhân và yêu cầu đăng nhập lại cho thao tác riêng tư.

Mở lần đầu: ô tìm kiếm + lời nhắc “Tìm thành phố để xem thời tiết”, không có số giả hoặc tự hỏi quyền vị trí. Chưa lưu địa điểm cuối cùng vào storage trong MVP. Chọn nơi khác cập nhật toàn bộ panel theo cùng selection; không để forecast thành phố cũ đi cùng current thành phố mới.

## 2. Wireframe desktop

```text
┌──────────────────────────────────────────────────────────────────┐
│ Weather App    [ Tìm thành phố…                       ] °C °F  👤 │
├─────────────────────────────────────────────┬────────────────────┤
│ Tên thành phố, quốc gia          [Yêu thích]│ Địa điểm yêu thích │
│ [Icon]  Nhiệt độ · Mô tả                    │ Danh sách / CTA    │
│ Cảm nhận · thời điểm dữ liệu · UTC offset   │ đăng nhập          │
├─────────────────────────────────────────────┤                    │
│ Ẩm        Gió       Áp suất      Tầm nhìn   ├────────────────────┤
│ Bình minh           Hoàng hôn               │ Tìm kiếm gần đây   │
├─────────────────────────────────────────────┤ [Xóa lịch sử]      │
│ Dự báo mỗi 3 giờ                           │ danh sách + xóa mục│
│ [mốc] [mốc] [mốc] …                        │                    │
│ Biểu đồ nhiệt độ + dữ liệu dạng danh sách  │                    │
├─────────────────────────────────────────────┴────────────────────┤
│ Dự báo theo ngày — tổng hợp từ các mốc 3 giờ                     │
│ Ngày · biểu tượng đại diện · khoảng nhiệt độ · nhãn thiếu giờ   │
├──────────────────────────────────────────────────────────────────┤
│ Cảnh báo: Gói dữ liệu hiện tại chưa hỗ trợ cảnh báo thời tiết.   │
├──────────────────────────────────────────────────────────────────┤
│ Nguồn OpenWeather · Phạm vi dữ liệu · Weather App                │
└──────────────────────────────────────────────────────────────────┘
```

Nhiệt độ và tên địa điểm là điểm nhìn đầu tiên; tìm kiếm là hành động chính. Sidebar không gọi thời tiết cho mọi thành phố đã lưu. Biểu tượng wireframe chỉ mô tả vị trí, không phải bộ icon cuối cùng.

## 3. Responsive

- Desktop >=1100px: nội dung tối đa1280px, cột chính co giãn và sidebar300px; gap24px.
- Tablet 768–1099px: header tìm kiếm dòng riêng; hero/full forecast toàn chiều rộng; favorites/history hai cột phía dưới.
- Mobile <768px: một cột; thứ tự tìm kiếm → hiện tại → chỉ số → mốc3 giờ → theo ngày → yêu thích → lịch sử → thông tin cảnh báo → footer. Chỉ khu forecast mốc giờ được cuộn ngang có nhãn.
- Kiểm tra360,768,1440px; hỗ trợ320px và zoom200%. Dùng min-width:0, text wrap; tên thành phố/state dài không làm tràn trang. Nội dung đủ lớn để đọc không cắt bằng ellipsis ở tiêu đề chính.
- Vùng thao tác tối thiểu44×44px; nút xóa có tên truy cập nêu rõ địa điểm. Form không dùng placeholder thay label.

## 4. Hệ thống thị giác dự kiến

- System font có tiếng Việt: `system-ui, -apple-system, "Segoe UI", sans-serif`; không tải font bên ngoài trong MVP.
- Nền trung tính xanh đậm khi chưa có dữ liệu. Trời quang: chuyển sắc xanh lam; mưa/mây: slate; ban đêm: xanh navy. Chỉ đổi nền dựa điều kiện current thật, không suy đoán từ giờ máy khách.
- Card nền tối bán trong suốt, viền trắng nhẹ, blur khoảng12px; có nền đặc fallback khi không hỗ trợ backdrop-filter. Không blur lồng nhau hoặc nền chuyển động liên tục.
- Chữ chính gần trắng, chữ phụ slate nhạt; CTA cyan với chữ tối. Contrast phải đo trên tất cả nền trước nghiệm thu; target WCAG AA 4.5:1 cho chữ thường,3:1 cho chữ lớn và thành phần giao diện.
- Typography: nhiệt độ48–72px tùy màn hình, tiêu đề24–32px, nội dung16px, nhãn14px; line-height thoáng. Khoảng cách theo bội4/8; radius card20px, input/button12px.
- Hover/focus/active/disabled rõ; focus ring tương phản, không chỉ đổi màu. Transition120–180ms opacity/color; tôn trọng prefers-reduced-motion, tắt shimmer/animation không cần thiết.
- Icon thời tiết theo bộ mapping nội bộ nhất quán; icon trang trí aria-hidden, mô tả condition bằng text. Không tải ảnh/icon URL do client/provider tùy ý cung cấp.

## 5. Thành phần và hành vi

| Thành phần | Quy tắc |
| --- | --- |
| LocationSearch | Combobox; debounce400ms, tối thiểu2 ký tự; ArrowUp/Down, Enter, Escape; aria-expanded/activedescendant; đóng không mất input |
| CurrentWeather | Nhiệt độ lớn; timestamp nguồn riêng fetchedAt; thiếu metric “Chưa có dữ liệu”; area min/max ghi “Khoảng nhiệt độ hiện tại trong khu vực” |
| Details | Đơn vị cố định: %, m/s, hPa, km; gió có8 hướng tiếng Việt tính từ degrees; null không thành0 |
| ForecastTimeline | Mốc3 giờ với ngày/giờ địa điểm; khoảng xác suất mưa chuyển sang%; không hiển thị “theo giờ” |
| TemperatureChart | Chỉ hiện khi >=2 mốc; trục C/F đồng bộ; đường hở ở gap, danh sách dữ liệu thay thế cho screen reader |
| DailyForecast | Nhãn tổng hợp, sampleMin/sampleMax; thiếu8 khung ghi “Chưa đủ dữ liệu cả ngày”; condition ghi đại diện gần trưa |
| Favorites | Button toggle theo locationKey; disable lúc lưu;409 trùng làm mới danh sách; không báo thành công nếu lưu thất bại |
| SearchHistory | Chọn lại để xem; xóa từng mục trực tiếp; “Xóa toàn bộ” có xác nhận tại UI, không ảnh hưởng favorites |
| UnitSwitch | Hai nút radio C/F, aria-checked; mọi nhiệt độ đổi từ Celsius gốc, làm tròn lúc render |
| AlertsPanel | UNSUPPORTED dùng thông tin trung tính, không màu xanh báo an toàn; không dựng cảnh báo từ thời tiết |

`temperatureF = temperatureC * 9/5 + 32`; state giữ số gốc, không chuyển F→C từ số đã làm tròn. Guest lưu unit trong localStorage; login lấy preference server làm chuẩn. User đổi unit gọi PATCH profile; nếu lỗi giữ UI theo giá trị server cũ và báo chưa lưu. Logout giữ lựa chọn hiển thị hiện hành cho guest, xóa dữ liệu cá nhân.

Các panel cá nhân thất bại không chặn thời tiết. Lưu history thất bại hiển thị thông báo nhẹ và cho thử lại; không coi việc xem weather thất bại. Lỗi tìm kiếm chỉ áp dụng request mới nhất; abort không hiện như lỗi mạng.

## 6. Ma trận trạng thái

| Tình huống | UI / hành động |
| --- | --- |
| Chưa chọn địa điểm | Lời nhắc tìm kiếm; không phát request weather |
| Đang tìm | Loading trong combobox, aria-live polite, giữ input |
| Không có kết quả | “Không tìm thấy địa điểm. Thử tên khác hoặc thêm quốc gia.” |
| Đang tải nơi mới | Skeleton current/forecast; không giữ số nơi cũ dưới tiêu đề mới |
| Chỉ forecast lỗi | Current vẫn hiển thị, panel forecast có nút thử lại riêng |
| Upstream timeout/quota | Thông báo tiếng Việt và thời gian thử lại nếu có; không tự lặp request |
| Nguồn thiếu metric | Chưa có dữ liệu; không suy ra0/không mưa |
| Chưa đăng nhập | CTA lưu địa điểm bằng tài khoản, không báo lỗi401 ra màn hình |
| Đang submit | Disable nút hành động, giữ label rõ, không cho gửi trùng |
| Form validation | Lỗi tại field, summary nếu nhiều lỗi, focus field đầu sai |
| Hết phiên | Thông báo đăng nhập lại; không mất địa điểm công khai đang xem |
| DB không khả dụng | Không tự logout vì503; giữ form, báo dịch vụ tài khoản tạm gián đoạn |
| Favorites/history rỗng | Hướng dẫn hành động đầu tiên, không dựng nội dung mẫu |

## 7. Đăng nhập, đăng ký và tài khoản

Form đăng nhập có label email/password, nút hiện mật khẩu có accessible name, autocomplete đúng email/current-password. Đăng ký thêm tên và xác nhận mật khẩu (chỉ kiểm tra frontend, không gửi confirmPassword lên API), autocomplete new-password. Cho phép paste/password manager. Không có liên kết “Quên mật khẩu” vì chưa triển khai.

Trang tài khoản chia hai form độc lập: hồ sơ/đơn vị và đổi mật khẩu. Email chỉ đọc. Đổi mật khẩu báo trước sẽ đăng xuất mọi phiên; thành công chuyển về đăng nhập với thông báo. Không đưa thuật ngữ JWT/Prisma/quota kỹ thuật vào luồng thông thường.

## 8. Checklist cần kiểm tra khi có giao diện

- Tab qua search, listbox, unit, account và thao tác xóa; Escape đóng gợi ý, không trap focus.
- Chuyển nhanh A→B và response A đến sau: chỉ hiển thị B.
- Mọi con số nhiệt độ/card/chart đổi đồng bộ C/F; kiểm tra số âm,0 và null.
- Độ tương phản thực tế trên nền clear/rain/night; zoom200%, reduced motion.
- Không scroll ngang toàn trang ở320/360/768/1440px; tên dài và lỗi nhiều dòng vẫn đọc được.
- Form autofill,401/403/429/503; delete confirm, history rỗng,50 favorites.
- Không có dữ liệu giả, icon lỗi, tuyên bố cảnh báo không có hoặc ngày dự báo API không cung cấp.

Đây là checklist tương lai, chưa có mục runtime nào được đánh dấu đạt.
