# Yêu cầu đổi lịch / hủy booking

## Phạm vi đã triển khai

- Khách gửi yêu cầu, lý do, lịch cùng tour và tổng tiền xác nhận. Một đơn tối đa một yêu cầu PENDING.
- Admin thấy danh sách chờ tại trang Đơn đặt tour; xử lý trong chi tiết đơn, bắt buộc ghi chú.
- Duyệt khóa booking trước, rồi khóa các lịch theo thứ tự ID; kiểm tra lại trạng thái, ngày đi, giá, ngày/giờ/điểm đón và số chỗ. Gửi yêu cầu không giữ chỗ mới.
- Duyệt lặp cùng quyết định trả kết quả cũ, không hoàn/giữ chỗ lần hai. Quyết định trái ngược trả 409.
- Hủy đơn có SUCCESS chuyển giao dịch sang REFUND_REQUIRED. Không gọi refund gateway, không ghi đã hoàn tiền. Giao dịch PENDING chặn duyệt để admin đối soát trước.
- Đổi lịch đơn đã thanh toán chỉ hỗ trợ tổng tiền bằng tiền đơn cũ và không có REFUND_REQUIRED. Chênh lệch phải xử lý riêng; chưa có luồng thu thêm/hoàn phần chênh lệch.
- Đơn chưa thanh toán đổi lịch phải xác nhận lại khai báo tham gia, không gia hạn thời hạn giữ chỗ. Đơn đã thanh toán giữ phê duyệt cùng tour vì luồng khai báo hiện tại khóa sửa sau thanh toán. Thời điểm xóa khai báo điều chỉnh theo ngày kết thúc mới +31 ngày.
- Hủy trực tiếp cũ vẫn hoạt động cho đơn chưa thanh toán. Nếu đơn bị hủy/hết hạn khi yêu cầu còn chờ, admin chỉ có thể từ chối yêu cầu; không thể duyệt thay đổi đơn đã kết thúc.
- Thông báo dùng outbox hiện có. Không thực hiện gửi thử email thật.

## API

| Method | Endpoint | Quyền |
|---|---|---|
| GET/POST | `/api/bookings/{id}/change-requests` | Chủ booking |
| GET | `/api/admin/booking-change-requests?page=0` | Admin, hàng đợi PENDING |
| GET | `/api/admin/bookings/{id}/change-requests` | Admin, lịch sử |
| PUT | `/api/admin/bookings/{id}/change-requests/{requestId}` | Admin, `{decision: APPROVED hoặc REJECTED, note}` |

POST: `{type: CANCEL hoặc RESCHEDULE, reason, targetScheduleId, expectedAmount}`. Hai trường cuối chỉ dùng khi đổi lịch; server tự tính lại tiền từ DB.

## Database và bằng chứng 23/10/2026

`docs/sql/booking-change-requests.sql` đã áp dụng vào DB dự án cấu hình hiện tại: tạo bảng/index mới, 0 yêu cầu. Không sửa booking/payment hiện có. Không thay `.env`.

Trước khi apply: chạy SQL trên schema tổng hợp riêng, kiểm tra chạy lại migration, unique một yêu cầu PENDING và cho gửi mới sau khi từ chối; rollback toàn bộ schema tổng hợp. Đây là kiểm chứng DDL/constraint PostgreSQL, không phải concurrency toàn service.

- Backend: **499 tests đạt**, 0 skipped (456 security,18 booking change service,25 booking lifecycle). Repository/service dependency dùng mock; không cộng lượt chạy trước vào tổng.
- Frontend build đạt. Chrome **8 checks với API stub**: form trống, lý do bắt buộc, chặn form khi đang chờ, ghi chú duyệt bắt buộc, phản hồi admin/khách, chọn lịch/amount, mobile.
- Chưa nghiệm thu hai tài khoản qua full backend + DB thật, chưa kiểm thử concurrent approve/payment callback trên PostgreSQL thật. Không gọi VNPAY/AI thật.

## Kiểm tra thủ công

1. Restart backend từ thư mục `backend`: `mvn spring-boot:run`. Frontend từ `frontend`: `npm run dev`.
2. Nếu token cũ trả 401 sau restart, đăng nhập lại. Không chia sẻ token.
3. Dùng booking thử trước ngày đi. Khách vào **Chuyến đi của tôi → chi tiết → Yêu cầu đổi lịch / hủy đơn**. Gửi lý do; reload vẫn thấy PENDING, không gửi yêu cầu thứ hai.
4. Admin mở **Đơn đặt tour → Yêu cầu đổi lịch / hủy chờ duyệt → Xem và xử lý**. Từ chối kèm lý do; khách reload thấy lý do và có thể gửi mới.
5. Khách chọn đổi lịch cùng tour đủ chỗ, kiểm tra tổng tiền/chênh lệch rồi gửi. Admin duyệt: lịch cũ trả đúng số khách, lịch mới trừ đúng số khách. Đơn chưa thanh toán khai báo lại trước khi thanh toán.
6. Với dữ liệu test, làm lịch mới hết chỗ hoặc đổi giá trước khi duyệt: server trả 409 và không đổi booking. Có giao dịch PENDING cũng phải chặn duyệt.
7. Hủy booking test đã thanh toán: trạng thái CANCELLED, payment REFUND_REQUIRED; không được hiển thị đã hoàn tiền.
8. Tài khoản khác không đọc/gửi yêu cầu cho booking của bạn; client không truy cập API admin. Gửi lặp quyết định đã duyệt không tác động chỗ thêm lần nữa.

Không thử hủy/đổi trên đơn khách thật để nghiệm thu.

Chạy lại test: `mvn -o "-Dmaven.repo.local=C:/Users/thong/.m2/repository" "-Dtest=BookingChangeServiceTest,BookingLifecycleTest,ApiAuthorizationMatrixTest" test` trong backend. Build: `node node_modules/vite/bin/vite.js build` trong frontend. Browser script `frontend/tests/booking-changes-ui.mjs` cần Chrome test CDP port9224 và frontend; mặc định localhost5173, có thể đặt `UI_BASE_URL`.
