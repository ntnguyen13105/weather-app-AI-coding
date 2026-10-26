# Giai đoạn 7 — Đóng gói và bàn giao

Ngày kiểm tra: 26/10/2026. Phạm vi được xác nhận: hoàn thiện local/Docker và hướng dẫn GitHub/cloud, **không tạo remote hoặc push GitHub**.

## 1. Công việc đã hoàn thành

- Dockerfile multi-stage cho React và NestJS; runtime NestJS chạy UID 1000, không mang Prisma CLI/dev dependencies vào runtime.
- Compose local: PostgreSQL 18, migration job, NestJS, Caddy/React. Health check, dependency readiness, volume riêng; chỉ frontend bind loopback.
- Caddy reverse proxy cùng origin, SPA fallback, cache asset có hash, CSP và headers; HTTPS/HSTS khi bật chế độ HTTPS.
- Secret môi trường Docker riêng được tạo bằng script không ghi đè. Tài khoản DB ứng dụng không phải superuser. Image Node/Caddy/PostgreSQL khóa digest từ image đã chạy.
- Compose cloud dành cho một VM và PostgreSQL managed; tài liệu DNS, TLS, cookie, CORS, migration, backup/restore, rollback và kiểm tra sau triển khai.
- CONTRIBUTING, hướng dẫn GitHub, checklist nghiệm thu và README cập nhật đúng trạng thái.

## 2. File tạo/thay đổi

`backend/Dockerfile`, `frontend/Dockerfile`, `.dockerignore`, `.gitattributes`, `docker-compose.yml`, `docker-compose.cloud.yml`, `docker/Caddyfile`, `docker/postgres/init-app.sh`, `docker/.env.example`, `docker/cloud.env.example`, `docker/compose.https-test.yml`, `scripts/init-docker-env.mjs`.

`backend/src/config/environment.ts`, `backend/src/configure-app.ts`, `backend/test/proxy.test.mjs`, `.env.example`: cấu hình trust proxy chính xác và kiểm thử chống giả mạo IP.

`frontend/src/pages/AccountPage.jsx`, `frontend/e2e/account.spec.js`, `frontend/e2e/docker-smoke.mjs`, `frontend/e2e/weather.spec.js`: điều hướng logout nhất quán, smoke test container và lịch chạy test tôn trọng quota.

`README.md`, `CONTRIBUTING.md`, `docs/deployment.md`, `docs/github-handoff.md`, báo cáo này. Không đưa thay đổi cá nhân có sẵn trong `docs/phase-5.md` vào commit bàn giao.

## 3. Lệnh chạy

```powershell
node scripts/init-docker-env.mjs
docker compose --env-file .env.docker config --quiet
docker compose --env-file .env.docker up -d --build --wait
node frontend/e2e/docker-smoke.mjs
```

Script init chỉ chạy lần đầu. Mở http://localhost:8080. Nếu đã có `.env.docker`, dùng lại và kiểm tra key trong file. Dừng bằng `docker compose --env-file .env.docker down` (không thêm `-v`). Lệnh HTTPS local, cloud, migration và backup đầy đủ nằm trong `deployment.md`.

## 4. Cách kiểm thử và bằng chứng

| Kiểm tra | Kết quả thực tế |
| --- | --- |
| Docker Engine/Compose | 29.9.2 / 5.6.1, Linux Engine trên Docker Desktop |
| Node/PostgreSQL/Caddy container | Node 24.21.0, PostgreSQL 18.6, Caddy 2.11.7 |
| Build image | Frontend, runtime backend và migrate thành công |
| Khởi động/health | DB, backend, frontend healthy; migrate Exited(0) |
| Migration | 1 migration, schema up to date; chạy lại không áp dụng trùng |
| HTTP Docker | Register → weather thật/forecast → favorite → reload → logout đạt, không lỗi JS |
| HTTPS local production | Cùng luồng đạt; cookie __Host-/Secure/HttpOnly/SameSite=Lax; HSTS/CSP; Swagger 404 |
| Backup/restore | pg_dump custom, pg_restore vào DB kiểm thử mới; đủ 5 bảng; DB restore test đã xóa |
| Backend | 41 unit/HTTP test đạt, bao gồm 3 test proxy mới |
| PostgreSQL local | 12 integration test đạt sau khi khởi động cluster local |
| Frontend | 12 unit/component test đạt |
| E2E cuối | 5/5 đạt trong khoảng 1.2 phút, gồm cửa sổ nghỉ quota 60 giây |
| Lint/format | Backend và frontend đạt; không hạ ngưỡng kiểm tra |
| Secret | Không tìm thấy giá trị secret đang cấu hình trong file dự kiến track hoặc Git history; image runtime không có `.env` hoặc weather key baked-in |
| Cloud manifest | `config --quiet` đạt với placeholder; chưa deploy managed DB/domain |

Kiểm tra secret ở đây đối chiếu các giá trị đang cấu hình, không phải công cụ phát hiện mọi loại secret. Kiểm tra HTTPS local chấp nhận CA nội bộ trong test browser, không xác minh CA public. Backup được giữ trong `.local/backups` (Git ignore). Sau kiểm tra, stack được trả về HTTP local bình thường.

## 5. Kết quả mong đợi

Người khác có thể clone, điền key, chạy local hoặc Docker theo tài liệu. Dữ liệu không mất khi recreate container vì nằm ở volume. Frontend chỉ gọi `/api` cùng origin. Không có key trong frontend build; DB/backend không public port. Cloud production bắt buộc APP_ORIGIN HTTPS và key hợp lệ, dùng cookie Secure. GitHub chỉ được push khi người dùng chủ động thực hiện hướng dẫn.

## 6. Lỗi đã gặp và xử lý

- Docker Engine chưa chạy: khởi động Desktop rồi xác nhận Server trước build.
- PostgreSQL local 55432 đang tắt sau phiên trước: bật bằng script hiện có rồi chạy integration lại; không đổi sang database Docker để làm test đạt.
- Logout có hai đích điều hướng cạnh tranh: bỏ điều hướng về dashboard trong form, để guard dẫn tới đăng nhập; đã thêm assertion vào E2E và smoke test.
- Chạy toàn suite nhanh có thể dùng hết quota IP sau tìm kiếm nhưng trước forecast. Bài weather chờ một cửa sổ 60 giây trước khi bắt đầu; vẫn giữ mọi assertion và rate limit. Tổng thời gian suite có thể hơn một phút, không phải frontend tải chậm.
- Caddy báo directive X-Forwarded-For là dư thừa; cấu hình vẫn validate đạt, directive được giữ tường minh. Không tắt xác thực hoặc header bảo mật để bỏ warning.
- Không đổi sang Prisma 8/npm 12 theo thông báo update: dự án giữ phiên bản đã kiểm tra và lockfile.

## 7. Checklist nghiệm thu

- [x] React kết nối NestJS và dữ liệu OpenWeather thật.
- [x] Tài khoản, yêu thích và lịch sử dùng PostgreSQL; phân quyền A/B được kiểm thử.
- [x] Forecast 3 giờ/5 ngày trong quyền Free, không bù ngày hoặc cảnh báo giả.
- [x] C/F, responsive, loading/lỗi/rỗng, đa tab có kiểm thử.
- [x] Local và Docker khởi động được; migration và health check hoạt động.
- [x] HTTP container và HTTPS local production-mode được kiểm tra thực tế.
- [x] README, CONTRIBUTING, Swagger local, ERD/kiến trúc, hướng dẫn test/cloud/GitHub đã có.
- [x] Backup/restore thử thành công; secret không đưa vào Git hoặc build context.
- [ ] Public cloud/domain/managed DB: chưa triển khai, cần tài khoản/domain và lần nghiệm thu sau deploy.
- [ ] GitHub remote/push: không thực hiện theo lựa chọn người dùng.
- [ ] Kiểm thử Safari/Firefox, thiết bị thật, audit WCAG toàn diện, load test và CI cloud: ngoài bằng chứng hiện có, không tuyên bố đã đạt.

Bàn giao đạt phạm vi local/Docker và tài liệu triển khai. Không đồng nghĩa đã vận hành production public. Giới hạn còn lại: cache/rate limit mỗi instance, chưa có monitoring tự động, chưa có CI GitHub chạy thật; phải xử lý nếu mở rộng vượt dự án portfolio một instance.
