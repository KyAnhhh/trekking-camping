# Bộ chức năng trải nghiệm chuyến đi — 23/10/2026

Mục 1 (đổi lịch/hủy booking) được mô tả riêng tại `booking-change-requests.md`. Tài liệu này mô tả mục 2–6, dùng lại booking, notification outbox, guide assignments, review và chatbot hiện có.

## 2. Checklist chuẩn bị

Chi tiết booking của khách có **Chuẩn bị chuyến đi**: giờ/điểm đón, lịch trình, tên guide đã nhận đoàn, yêu cầu tham gia, đồ khách tự mang từ `tour_gears` và `required_gear`. Không tự tạo danh sách đồ khi tour thiếu nguồn. Các mục nguồn giữ key ổn định; mục riêng tối đa50 mục, 500 ký tự/mục. Tick lưu trên DB, chỉ chủ booking được đọc/ghi.

API `/api/bookings/{id}/preparation`: GET xem; POST `{label}` thêm riêng; PUT `/{key}` `{checked}`; DELETE `/{key}` chỉ xóa mục riêng. Mục nguồn tự cập nhật khi nội dung tour thay đổi, không sửa dữ liệu tour từ checklist.

## 3. Thông báo/email

Giữ nhắc khởi hành ngày mai hiện có. Thêm nhắc chuẩn bị trước3 ngày cho CONFIRMED và nhắc thiếu danh sách tên hành khách trong3 ngày trước khởi hành. Loại booking/lịch bị hủy hoặc ngoài thời gian. Quét tối đa100 booking/lượt và dùng khóa booking khi kiểm tra lại; event key cố định theo booking/lịch/ngày để unique outbox chống trùng. Không đưa tên, bệnh sử hoặc liên hệ riêng vào email.

Trang thông báo có tùy chọn email GET/PUT `/api/notifications/preferences`, body `{emailEnabled}`. Tắt email không xóa thông báo trong website và không tắt email khôi phục mật khẩu. Worker kiểm tra tùy chọn cả với email đang xếp hàng. Không thể thu hồi email đã gửi hoặc đã bắt đầu gửi trước khi đổi tùy chọn. SMTP vẫn cần cấu hình thật và `NOTIFICATION_EMAIL_ENABLED`; không bật tự động trong đợt này.

## 4. Báo cáo hướng dẫn viên

Guide có phân công ACCEPTED/LEGACY được gửi một báo cáo cho mỗi lịch sau ngày kết thúc, lịch không CANCELLED. Ghi tình hình đoàn, sự cố và đề xuất. Không ghi bệnh án/thông tin nhận diện nhạy cảm trong báo cáo. Báo cáo đã gửi không ghi đè; admin ghi phản hồi một lần. Người gửi và admin đọc được, guide khác/client/khách vãng lai không đọc được. Lịch sử riêng đã gửi vẫn đọc được khi phân công bị gỡ (nếu tài khoản guide còn hoạt động).

Guide: GET/POST `/api/guide-workspace/trips/{id}/report`.
Admin: GET `/api/admin/guide-reports?page=0`, PUT `/{id}` `{note}`. Giao diện quản trị **Báo cáo chuyến đi**; guide mở **Lịch dẫn đoàn** và xem chuyến đã kết thúc. Admin nhận thông báo mới; guide xem phản hồi trong báo cáo. Nội dung báo cáo không đưa vào RAG hoặc tool AI.

## 5. Ảnh đánh giá

Khách có đánh giá thuộc booking COMPLETED và đã qua ngày kết thúc có thể thêm tối đa5 ảnh JPEG/PNG, mỗi ảnh≤5MB,≤16 megapixel. Backend đọc định dạng thật và tái mã hóa JPEG, loại metadata. File riêng ở `REVIEW_UPLOAD_DIR` (mặc định `uploads/reviews`), không lưu secret trong frontend.

Mỗi ảnh mặc định chưa duyệt. Chủ ảnh và admin xem preview bằng request có JWT; public chỉ xem khi ảnh được duyệt, đánh giá hiển thị và tour active. Media kiểm tra điều kiện mỗi lần, `Cache-Control: no-store`. Khi ẩn review/tour, không được truy cập công khai ảnh bằng URL cũ. Upload rollback dọn file, xóa ảnh sau commit. Không dùng URL tour upload public cho ảnh chưa duyệt.

- GET `/api/reviews/{id}/photos`: ảnh công khai đã duyệt.
- GET/POST `/api/me/reviews/{id}/photos`: chủ đánh giá xem/upload; DELETE `/{photo}` xóa.
- GET `/api/admin/reviews/{id}/photos`, PUT `/{photo}` `{approved}`: admin duyệt/ẩn.
- GET `/api/media/reviews/{name}`: kiểm tra quyền trước khi trả ảnh.

Khách mở phần đánh giá trong chi tiết booking đã hoàn thành. Admin dùng trang **Đánh giá**; trạng thái duyệt ảnh độc lập với trạng thái hiển thị nội dung đánh giá.

## 6. AI hỗ trợ trước chuyến đi

Nút **Hỏi AI về chuyến này** điền nháp chứa booking ID và mở `/chat`; chưa gửi tự động. Khách chọn model rồi gửi. Tool `get_my_trip_preparation` chỉ nhận `bookingId`, lấy owner từ phiên đã xác thực; không cho model truyền user ID. Tool đọc DB hiện tại: tour, ngày đi/về, trạng thái booking, điểm/giờ đón, yêu cầu, checklist nguồn, lịch trình (tối đa30 ngày, mô tả3000 ký tự/ngày), guide đã nhận đoàn (tối đa20).

Không gửi khai báo sức khỏe, thông tin liên hệ hành khách, checklist riêng hoặc báo cáo guide. Trường thiếu giữ null/rỗng; nguồn ghi `Database booking #...`, không tự gán mã RAG `[Sx]`. Không có quyền sửa đơn, xác nhận thanh toán hoặc đặt thêm booking trong tool này. Chưa có bằng chứng chất lượng tư vấn từ provider thật; phải nghiệm thu opt-in riêng.

## Migration

`docs/sql/trip-experience.sql` đã chạy trên DB dự án. Thêm4 bảng: booking_checklist, notification_preferences, guide_trip_reports, review_photos; số dòng sau khi apply đều0. Không sửa booking/payment/tour hiện có.

Trước apply, kiểm tra migration/chạy lại/insert/unique báo cáo/ảnh mặc định ẩn trên schema PostgreSQL tổng hợp rồi rollback toàn bộ. Đây là bằng chứng DDL/SQL, không phải full-app HTTP integration. Không dùng Hibernate update để thay migration JDBC.

## Hướng dẫn kiểm thử thủ công sau restart

Backend: `cd backend` rồi `mvn spring-boot:run`. Frontend: `cd frontend` rồi `npm run dev`; truy cập `http://localhost:5173`. Đăng nhập lại nếu token cũ không còn hợp lệ sau backend restart.

1. **Checklist:** mở booking thử của khách; tick/thêm mục, reload, kiểm tra vẫn còn; tài khoản khác phải không đọc được API booking đó.
2. **Nhắc lịch:** dùng dữ liệu test có lịch sau1 hoặc3 ngày, thiếu tên hành khách. Chờ job, kiểm tra thông báo chỉ tạo một lần cho cùng event. Tắt email ở trang thông báo; thông báo trong app vẫn còn. Chỉ test SMTP trên môi trường có hộp thư thử và được cho phép.
3. **Báo cáo:** guide có tài khoản liên kết và đã nhận lịch kết thúc ngày trước; gửi đủ3 trường. Admin mở Báo cáo chuyến đi, ghi phản hồi; guide reload xem phản hồi. Guide khác không được gửi cho lịch không thuộc mình.
4. **Ảnh:** booking thử COMPLETED, có đánh giá. Upload PNG/JPEG; trước duyệt chỉ chủ ảnh/admin thấy. Admin duyệt, kiểm tra trang tour; admin ẩn ảnh/review rồi kiểm tra URL public bị từ chối. Thử file sai loại/>5MB/ảnh thứ6 phải bị chặn.
5. **AI:** bấm nút trong checklist, xác nhận nháp đúng booking. Kiểm tra bằng provider giả lập trước; kiểm chứng chất lượng thật chỉ sau khi duyệt ngân sách API. Hỏi booking tài khoản khác phải bị từ chối, không có giá/chỗ hoặc khai báo sức khỏe bị bịa/lộ.
6. Chạy lại luồng đổi/hủy trong `booking-change-requests.md` cùng booking test, tránh thay đổi đơn thật chỉ để nghiệm thu.

## Giới hạn bằng chứng

Kết quả nghiệm thu tự động: **616 backend tests đạt, 0 skipped** (mock repositories/provider, security chain thật trong MockMvc). Frontend build đạt. Browser: **12 checks** cho mục2–6 và **8 checks** regression đổi/hủy; đều dùng API stub. Ảnh preview trong browser dùng PNG tổng hợp; backend riêng đã kiểm tra ảnh được tái mã hóa và dọn file khi rollback. Không cộng các lượt chạy lại vào tổng. Test fixture ban đầu sai preflight ảnh và selector ô chat đã được sửa theo contract thực tế.

Lệnh backend: `mvn -o "-Dmaven.repo.local=C:/Users/thong/.m2/repository" "-Dtest=TripPreparationTest,ReviewPhotoTest,GuideReportTest,PreparationRemindersTest,NotificationTest,ChatAssistantTest,ReviewServiceTest,BookingChangeServiceTest,BookingLifecycleTest,ApiAuthorizationMatrixTest" test`. Logs trong `backend/target/trip-experience-tests.log`. Kiểm tra chatbot lại sau chỉnh prompt: `backend/target/trip-assistant-final.log` (trùng bộ test, không cộng thêm).

Browser scripts: `frontend/tests/trip-experience-ui.mjs` và `frontend/tests/booking-changes-ui.mjs`, cần frontend + Chrome CDP9224 riêng; `UI_BASE_URL` nếu không dùng localhost5173. Tiến trình browser/Vite test đã dừng. Build: `node node_modules/vite/bin/vite.js build` trong frontend.

Không gửi email, thanh toán, refund hoặc gọi AI thật trong đợt triển khai. Tests dùng JUnit/Mockito và browser API stub không được tính là full-app DB integration. Migration đã kiểm chứng trên PostgreSQL thật. Kết quả cuối được ghi trong `progress.md`; không cộng những lượt chạy lặp thành test mới.
