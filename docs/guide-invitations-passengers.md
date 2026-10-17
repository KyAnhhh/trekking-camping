# Lời mời hướng dẫn viên và hành khách theo từng booking

## Kích hoạt

1. Sao lưu và xem script [guide-invitations-passengers.sql](sql/guide-invitations-passengers.sql), áp dụng trên database kiểm thử trước. Cần có schema của [notifications-guide-workspace.sql](sql/notifications-guide-workspace.sql). Script mới thêm `guide_invitations`, `booking_passengers`, `passenger_attendance_audit` và `bookings.passenger_revision`; không sửa dữ liệu tour, thanh toán hoặc khai báo sức khỏe. Không tự chạy trong quá trình triển khai code.
2. Cấu hình SMTP hiện có bằng environment: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`, `APP_FRONTEND_URL`. Không đưa giá trị thật vào Git. Frontend URL phải HTTPS, hoặc HTTP localhost khi phát triển. Khởi động lại backend/frontend sau khi cập nhật schema/code.
3. Lời mời do admin bấm gửi là email giao dịch trực tiếp, độc lập với cờ `NOTIFICATION_EMAIL_ENABLED` của thông báo tự động. SMTP thiếu cấu hình/gửi lỗi trả 503; UI không báo gửi thành công. Không có email hoặc tài khoản thật được tạo trong quá trình kiểm thử tự động.

Backend có `RoleInitializer` thêm role chuẩn còn thiếu khi khởi động. Tên bảng trong entity là `roles`; giá trị đúng là `ROLE_GUIDE` (chữ hoa, không xuống dòng). Có thể kiểm tra bằng `SELECT id, name FROM roles ORDER BY id;`. Chỉ có bản ghi role chưa đủ để hướng dẫn viên đăng nhập vào workspace: cần liên kết `guides.user_id` qua **Hướng dẫn viên → Tài khoản đăng nhập**, hoặc chấp nhận lời mời. Luồng này cấp role cho đúng user và thu hồi phiên đăng nhập cũ; không đổi trực tiếp `users.role_id` theo một ID giả định.

Nếu role từng được thêm với ID thủ công, bộ đếm ID có thể thấp hơn `MAX(id)`, gây lỗi `roles_pkey` dù tên role chưa tồn tại. `RoleInitializer` khóa bảng trong transaction, tìm sequence SERIAL/IDENTITY thực tế và tăng điểm bắt đầu lên `MAX(id) + 1` khi cần trước khi seed. Sequence đang đi trước được giữ nguyên; ID và liên kết user không đổi. Dùng `ALTER SEQUENCE ... RESTART` để việc sửa bộ đếm cùng rollback với transaction nếu seed lỗi ([PostgreSQL](https://www.postgresql.org/docs/16/sql-altersequence.html)). Tài khoản database chạy ứng dụng cần quyền sửa sequence do schema ứng dụng sở hữu. Không sửa tay ID role hoặc xóa bản ghi để tránh lỗi này.

## Admin mời hướng dẫn viên

- Vào **Hướng dẫn viên → Tài khoản đăng nhập → Chưa có tài khoản? Gửi lời mời**. Nhập email mới, xác nhận đúng người rồi gửi. Nếu email đã có tài khoản (kể cả khác chữ hoa/thường), dùng phần **Liên kết tài khoản** hiện có; lời mời không đổi mật khẩu tài khoản cũ.
- Người nhận mở email → `/guide-invitation#token=...` → xem hồ sơ/email → đặt và xác nhận mật khẩu → chấp nhận → đăng nhập. Hệ thống tạo tài khoản hoạt động với `ROLE_GUIDE`, gắn đúng hồ sơ và giữ nguyên phân công.
- Lời mời có hiệu lực 24 giờ, dùng một lần. Admin xem trạng thái, gửi lại hoặc thu hồi. Gửi lại thay thế liên kết trước, cách nhau ít nhất 60 giây, tối đa 5 lần/giờ/hồ sơ.
- Token ngẫu nhiên 32 byte, DB chỉ lưu SHA-256. Không trả token hoặc hash về admin. Frontend đọc token từ fragment, xóa khỏi thanh địa chỉ và chỉ gửi trong POST body; không lưu vào localStorage. Không log mật khẩu/token. Không tự đăng nhập sau khi chấp nhận.
- Khóa hàng guide tuần tự hóa gửi/gửi lại/thu hồi/chấp nhận/liên kết thủ công. Kiểm tra lại token sau khi lấy khóa. Hồ sơ ngừng hoạt động/đã liên kết và email vừa được đăng ký đều bị chặn. Liên kết hoặc gỡ liên kết thủ công thu hồi lời mời đang chờ.
- Giới hạn public preview/accept dùng bộ giới hạn trong bộ nhớ hiện có, 30 request/phút/IP. Giới hạn này theo instance; triển khai nhiều instance cần giới hạn chung ở proxy hoặc kho lưu trữ dùng chung.
- SMTP gửi trong transaction lời mời có timeout, không nằm trong transaction booking/payment. SMTP không giao dịch cùng DB: nếu SMTP nhận thư rồi commit DB thất bại, liên kết trong thư có thể không dùng được; admin gửi lại. Không cam kết đã vào inbox hoặc exactly-once.

## Danh sách hành khách

- Khách mở **Chuyến đi của tôi → Chi tiết đơn → Danh sách hành khách → Nhập / sửa hành khách**. Admin có biểu mẫu tương ứng trong chi tiết booking.
- Nhập đúng số tên bằng số chỗ của booking, tối đa 150 ký tự/tên (tối đa 500 người mỗi danh sách). Cho phép trùng tên vì hai người có thể cùng họ tên. Không tự đoán tên từ người liên hệ hoặc đọc blob khai báo sức khỏe.
- Chủ booking sửa trước ngày khởi hành; admin hỗ trợ đến hết ngày kết thúc. Chỉ booking PENDING/CONFIRMED và lịch không hủy được sửa. Sau lần điểm danh đầu tiên, tên bị khóa kể cả khi hướng dẫn viên trả trạng thái về Chưa điểm danh, để giữ đúng danh tính trong lịch sử. Chưa có quy trình thay hành khách sau điểm danh.
- Số chỗ/giá/trạng thái booking không thay đổi. Không tự coi danh sách này thay cho khai báo tham gia riêng tư. Danh sách lưu họ tên, thứ tự và điểm danh; không chứa ngày sinh, giấy tờ, email hay sức khỏe từng khách.
- PUT danh sách gửi `revision`; backend khóa booking → schedule, từ chối 409 nếu phiên bản cũ hoặc danh sách đã điểm danh.

## Hướng dẫn viên điểm danh

- **Lịch dẫn đoàn → Chuyến được phân công → Xem hành khách**. Chỉ guide đang hoạt động, tài khoản còn quyền và còn liên kết/phân công mới xem được danh sách/histories của booking CONFIRMED/COMPLETED trong đoàn đó.
- Điểm danh từng người: Chưa điểm danh / Có mặt / Vắng mặt, có hộp thoại xác nhận. Chỉ được ghi khi booking CONFIRMED, danh sách đủ số người, lịch OPEN/FULL/CLOSED và từ ngày trước khởi hành đến hết ngày kết thúc theo Asia/Ho_Chi_Minh.
- Mỗi thay đổi thực sự lưu trạng thái trước/sau, người thực hiện, thời điểm và phiên bản. Gửi cùng trạng thái với phiên bản hiện tại không tạo bản ghi trùng. Phiên bản cũ trả 409. Khóa booking → schedule → guide và kiểm tra lại quyền/phân công sau khi chờ khóa.
- Khách chỉ xem lịch sử booking của mình; admin xem qua API admin; guide chỉ xem đoàn của mình. Lịch sử phân trang 20 mục, giữ lại các lần sửa điểm danh; chưa có quy trình xóa/lưu trữ định kỳ.
- Dữ liệu `booking_attendance` cũ được giữ. Nếu chưa có tên, UI ghi rõ đó là tổng số cũ, không gán trạng thái cho người cụ thể. Khi đã có danh sách, tổng hiện tại được tính từ hành khách; API điểm danh tổng số cũ trả 409 để không ghi đè dữ liệu mới. Giao diện hướng dẫn viên dùng điểm danh theo tên.

## API mới

| Quyền | Method | Endpoint |
|---|---|---|
| ADMIN | GET / POST / DELETE | `/api/admin/guides/{id}/invitation` |
| Public, có token lời mời | POST | `/api/guide-invitations/preview`, `/api/guide-invitations/accept` |
| Chủ booking | GET / PUT | `/api/bookings/{id}/passengers` |
| ADMIN | GET / PUT | `/api/admin/bookings/{id}/passengers` |
| Chủ booking / ADMIN | GET | Các đường dẫn trên + `/history?page=0` |
| GUIDE được phân công | GET | `/api/guide-workspace/trips/{scheduleId}/bookings/{id}/passengers` |
| GUIDE được phân công | PUT | Đường dẫn trên + `/{passengerId}/attendance` |
| GUIDE được phân công | GET | Đường dẫn danh sách + `/history?page=0` |

Payload gửi lời mời `{email}`; preview `{token}`; accept `{token,password}`; danh sách `{fullNames:[...],revision}`; điểm danh `{status,revision}`. Tất cả phản hồi giữ `ApiResponse`.

## Kiểm thử

- `GuideInvitationTest`: hash, thời hạn, token dùng một lần, đổi token khi chờ khóa, email tồn tại, guide ngừng hoạt động/đã liên kết, SMTP lỗi, hạn mức, thu hồi, quyền và validation mật khẩu.
- `PassengerServiceTest`: chủ sở hữu, đúng số người, revision, giới hạn ngày, guide không được phân công, quyền bị thu hồi trong lúc chờ, lịch sử, chống đổi tên sau điểm danh và DTO tối thiểu.
- `GuideWorkspaceTest`, `GuideQueryTest`, `UserDependenciesTest`, `PasswordResetMailerTest`, `ApiAuthorizationMatrixTest`: tương thích luồng cũ, mapping/HQL, liên kết tài khoản, đường dẫn bảo vệ và fragment email.
- Frontend API contracts và UI smoke dùng fixture, bao gồm SMTP 503, gửi/thu hồi/chấp nhận/replay lời mời, nhập tên, stale revision, lịch sử và mobile.
- Chưa gửi SMTP thật và chưa chạy SQL/database thật. Kiểm thử chấp nhận trực tiếp trên môi trường riêng sau khi áp dụng schema: mời một email do bạn kiểm soát, đặt mật khẩu, phân công vào lịch có booking kiểm thử, nhập tên rồi thử điểm danh/lịch sử bằng hai phiên trình duyệt.
