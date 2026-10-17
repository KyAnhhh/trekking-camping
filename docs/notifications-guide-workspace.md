# Thông báo, email tự động và không gian hướng dẫn viên

> Cập nhật 16/10/2026: đã bổ sung [lời mời tạo tài khoản và danh sách hành khách/điểm danh từng người](guide-invitations-passengers.md). Áp dụng thêm SQL trong tài liệu mới. Phần điểm danh theo tổng số bên dưới mô tả luồng cũ, được giữ cho dữ liệu chưa có tên; giao diện mới sử dụng điểm danh theo từng hành khách.

Bổ sung ngày 15/10/2026. Dùng lại Booking, Payment, phân công `schedule_guides`, tài khoản và SMTP hiện có. Không tự gửi email thật hoặc áp dụng SQL trong đợt triển khai.

## Chuẩn bị database và bật tính năng

1. Sao lưu, xem rồi áp dụng thủ công `docs/sql/notifications-guide-workspace.sql` ở database thử trước. Script bổ sung `notifications`, `booking_attendance`, `guides.user_id` và quyền `ROLE_GUIDE`. Không sửa booking/payment hiện có. `CREATE TABLE IF NOT EXISTS` không sửa cấu trúc bảng đã tồn tại sai; cần đối chiếu nếu từng tự tạo bảng cùng tên.
2. Khởi động lại backend. `RoleInitializer` tự thêm các bản ghi còn thiếu `ROLE_USER`, `ROLE_ADMIN`, `ROLE_GUIDE` sau khi Hibernate khởi tạo schema; không sửa ID hoặc quyền của tài khoản hiện có. Hibernate `ddl-auto=update` tự nó chỉ tạo/cập nhật cấu trúc, không seed role. SQL thủ công vẫn được giữ cho triển khai schema, nhưng không cần chạy toàn bộ migration chỉ để thêm `ROLE_GUIDE`. Không tự chuyển cấu hình DB production.
3. Thông báo trong website hoạt động mặc định. Header có chuông, số chưa đọc và trang `/notifications`; mỗi tài khoản chỉ xem thông báo của chính mình, tối đa 20/trang. Chuông cập nhật mỗi phút khi tab đang hiển thị và sau khi đọc thông báo.
4. Gửi email tự động mặc định **tắt**. Sau khi cấu hình SMTP thử, đặt `NOTIFICATION_EMAIL_ENABLED=true` trong environment backend và khởi động lại. Các biến SMTP dùng chung với khôi phục mật khẩu: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`, `APP_FRONTEND_URL`. Không đưa giá trị thật vào Git. URL frontend phải HTTPS hoặc HTTP localhost; đường dẫn email chỉ thuộc các trang được cho phép.
5. Khi tắt email, sự kiện mới vẫn lưu thông báo nhưng email mang trạng thái SKIPPED; bật lại không gửi hàng loạt các thông báo đã SKIPPED. Không sửa `.env` hay bí mật trong đợt triển khai này.

## Sự kiện được triển khai

| Sự kiện | Người nhận | Hành vi |
|---|---|---|
| Tạo booking | Chủ tài khoản và admin hoạt động | Tiếp nhận đơn, hướng dẫn hoàn tất khai báo; chưa khẳng định đã trả tiền |
| Gửi lại khai báo tham gia | Admin hoạt động | Nhắc vào đơn để duyệt |
| Admin duyệt/cần bổ sung/chưa đáp ứng | Chủ tài khoản | Chỉ báo có kết quả; không đưa nội dung sức khỏe/ghi chú riêng vào email |
| Thanh toán thành công hoặc admin xác nhận | Chủ tài khoản | Một sự kiện CONFIRMED cho đơn; callback lặp không sinh bản mới |
| Giao dịch FAILED/EXPIRED đã xác minh | Chủ tài khoản | Hướng dẫn kiểm tra đơn; không tự tạo giao dịch khác |
| REFUND_REQUIRED | Chủ tài khoản và admin | Báo cần xử lý, không tuyên bố đã hoàn tiền |
| Hủy/hết hạn giữ chỗ | Chủ tài khoản | Thông báo đơn hủy, không lặp giữa hai đường hủy |
| Hoàn thành | Chủ tài khoản | Mời xem đơn và đánh giá |
| Ngày mai khởi hành | Chủ tài khoản của booking CONFIRMED | Nhắc kiểm tra điểm đón/trang bị, theo ngày Việt Nam |
| Liên kết tài khoản HDV | Tài khoản được liên kết | Yêu cầu đăng nhập lại để dùng quyền mới |
| Thêm/đổi vai trò/gỡ phân công HDV | Tài khoản liên kết của HDV | Báo cập nhật lịch phân công, dẫn về danh sách lịch hiện tại |

Quy tắc sửa lịch có booking hiện tại vẫn được giữ: không đổi ngày/giờ/điểm đón âm thầm. Chưa mở luồng đổi lịch có khách, do đó chưa có email xác nhận đổi lịch cho khách. Các trạng thái cũ trước triển khai không được backfill thành thông báo mới.

## Hàng đợi email và tính nhất quán

- `NotificationService.emit` ghi thông báo/email chờ **trong cùng transaction** nghiệp vụ bằng PostgreSQL `INSERT ... ON CONFLICT DO NOTHING`. Unique `(user_id,event_key)` chống tạo trùng cùng sự kiện. Không gửi SMTP trong transaction booking.
- `NotificationDelivery` chạy riêng, lấy một hàng bằng `FOR UPDATE SKIP LOCKED`; chỉ khóa hàng thông báo trong lúc gửi SMTP. Worker khác không gửi đồng thời cùng hàng. Tác vụ email dùng scheduler riêng, không chiếm scheduler bảo trì khai báo.
- Tối đa 10 email mỗi lượt, kiểm tra mỗi 30 giây, chờ khởi động 60 giây. Retry có giãn cách, tối đa 5 lần rồi FAILED; thư trong website vẫn đọc được. Tài khoản bị khóa được SKIPPED. Lỗi log chỉ có notification ID và số lần, không in phản hồi SMTP/địa chỉ/secret.
- SMTP không bảo đảm exactly-once: nếu nhà cung cấp đã nhận email nhưng timeout hoặc tiến trình chết trước commit SENT, retry vẫn có thể gửi trùng. Không xem idempotency của event trong DB là cam kết email không bao giờ trùng. Muốn bảo đảm tốt hơn cần provider hỗ trợ idempotency/delivery receipt.
- Nhắc khởi hành quét 100 booking mỗi lượt theo ID và kiểm tra lại dưới khóa; key gồm booking và ngày nên nhiều instance/lần quét không tạo thông báo trùng. Không giữ email/điện thoại liên hệ khách khác trong thông báo; email gửi tới email tài khoản hiện tại.
- Theo dõi vận hành bằng truy vấn chỉ đọc: `SELECT email_status, count(*) FROM notifications GROUP BY email_status;`. Chưa có UI retry thư FAILED hay lịch sử giao nhận SMTP; không tự reset trạng thái hàng loạt. Thông báo chưa có chính sách xóa định kỳ.

## Liên kết tài khoản hướng dẫn viên

1. Hướng dẫn viên đăng ký tài khoản khách bình thường hoặc dùng tài khoản USER đang có.
2. Admin mở **Hướng dẫn viên → Tài khoản đăng nhập** ở hồ sơ tương ứng, nhập email tài khoản và xác nhận cấp quyền.
3. Mỗi hồ sơ chỉ liên kết một tài khoản và mỗi tài khoản chỉ thuộc một hồ sơ. Không tự liên kết theo email liên hệ hồ sơ; không cho đổi tài khoản ADMIN thành GUIDE. Muốn thay tài khoản phải gỡ liên kết cũ trước.
4. Cấp quyền ROLE_GUIDE và tăng `authVersion` để thu hồi phiên cũ. Người dùng đăng nhập lại sẽ vào `/guide-workspace`; menu tài khoản có **Lịch dẫn đoàn**.
5. Admin phân công hồ sơ vào lịch khởi hành bằng giao diện phân công hiện có. HDV chỉ thấy lịch được phân công; ngừng hoạt động, gỡ phân công hoặc gỡ liên kết khiến các request tiếp theo bị từ chối.
6. Gỡ liên kết trả ROLE_GUIDE về ROLE_USER và thu hồi các phiên; không xóa hồ sơ, phân công hoặc lịch sử điểm danh. Quyền admin hiện có không bị hạ nếu tài khoản đã được đổi quyền bằng quy trình khác.

## Danh sách khách và điểm danh

- `/guide-workspace`: lịch và vai trò trưởng đoàn/hỗ trợ, ngày đi/về, giờ/điểm đón; phân trang 20 lịch.
- `/guide-workspace/{scheduleId}`: các đơn CONFIRMED/COMPLETED của lịch được phân công, đại diện liên hệ, số khách và kết quả điểm danh. Không cung cấp số tiền, email, khai báo sức khỏe, liên hệ khẩn cấp hay ghi chú riêng tư.
- Số điện thoại liên hệ và quyền ghi điểm danh chỉ mở từ ngày trước khởi hành đến hết ngày kết thúc (giờ Việt Nam), lịch không hủy. Chỉ đơn CONFIRMED được ghi điểm danh.
- Điểm danh **theo số người trong đơn**, không phải danh sách định danh từng người. Đây là lựa chọn tránh trích danh sách khách từ blob khai báo sức khỏe. Nếu cần tên từng khách/điểm danh từng người, cần module danh sách hành khách riêng có quyền và chính sách lưu trữ phù hợp.
- Giới hạn 0..số khách, có xác nhận UI; backend khóa booking → lịch → guide và kiểm tra lại phân công. `revision` chặn ghi đè từ màn hình cũ (409). Lưu người điểm danh và thời điểm cập nhật gần nhất, chưa có lịch sử mọi lần chỉnh sửa. Điểm danh không tự thay đổi tiền, chỗ hoặc trạng thái booking.

## API

| Quyền | Method | Endpoint |
|---|---|---|
| Đã đăng nhập | GET | `/api/notifications?page=0`, `/api/notifications/unread-count` |
| Đã đăng nhập | PUT | `/api/notifications/{id}/read`, `/api/notifications/read-all` |
| ADMIN | GET/PUT | `/api/admin/guides/{id}/account`; PUT `{email}` hoặc `{email:null}` để gỡ |
| GUIDE | GET | `/api/guide-workspace/trips?page=0` |
| GUIDE được phân công | GET | `/api/guide-workspace/trips/{id}?page=0` |
| GUIDE được phân công | PUT | `/api/guide-workspace/trips/{id}/bookings/{bookingId}/attendance`; `{presentCount,revision}` |

API dùng ApiResponse hiện có, owner/role xác định ở backend. Không nhận userId hoặc guideId từ frontend để quyết định quyền. Đọc thông báo người khác trả no-op, không tiết lộ bản ghi tồn tại hay chưa đọc.

## Nghiệm thu trước khi bật email thật

- Dùng DB thử, bật SMTP mail catcher hoặc tài khoản thử. Tạo booking → duyệt → callback thanh toán thử → nhắc khởi hành; kiểm tra website/email tương ứng.
- Làm nghiệp vụ rollback sau khi ghi sự kiện: notification phải rollback cùng. Gửi callback thành công hai lần: một sự kiện CONFIRMED/người nhận.
- Cho SMTP lỗi: booking vẫn thành công, email RETRY rồi FAILED. Hai worker chạy đồng thời: cùng hàng không bị xử lý song song. Kiểm tra kịch bản crash quanh SMTP/commit và hiểu giới hạn gửi trùng.
- Hai guide ở hai đoàn: không đọc/điểm danh đoàn của nhau. USER không gọi API GUIDE; GUIDE không gọi API ADMIN. Gỡ phân công, gỡ tài khoản hoặc khóa tài khoản rồi thử token cũ.
- Mở hai tab điểm danh: tab cũ nhận 409, không ghi đè. Thử số âm/quá số khách, lịch đã hủy/quá hạn và booking của lịch khác.
- Kiểm tra dashboard/header mobile và trạng thái 0 thông báo, lỗi mạng, lỗi gửi email. Mock/unit/browser fixture không thay thế kiểm thử PostgreSQL lock/transaction hoặc SMTP thật.

## Kết quả kiểm tra 15/10/2026

- Backend: 579 test đạt, không lỗi/skipped; loại `ChatLiveSmokeTest` và `BackendApplicationTests` khỏi lệnh chạy để không gọi dịch vụ hoặc khởi động DB thật. Có kiểm tra mapping/HQL với Hibernate metamodel, bốn vai trò trong ma trận quyền, callback lặp, quyền theo đoàn, revision điểm danh, SMTP lỗi và retry.
- Frontend: 16 kiểm thử API/theme đạt; Vite production build thành công.
- Chrome headless dùng API fixture: 154 kiểm tra đạt, không lỗi runtime. Kiểm tra chuông/header từ 320px, xác nhận liên kết tài khoản, đánh dấu thông báo đã đọc, danh sách đoàn và xung đột điểm danh.
- SQL, transaction/lock trên PostgreSQL thật và gửi SMTP thật chưa chạy. Cần hoàn tất các bước chuẩn bị/ nghiệm thu môi trường thử phía trên trước khi bật sử dụng thật.
