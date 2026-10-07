# VNPAY Sandbox trong luồng booking hiện có

Không đổi entity/bảng Booking, PaymentTransaction hoặc logic giữ/trả chỗ. Giao dịch mới dùng `paymentMethod=VNPAY_SANDBOX`. `MomoPaymentStore` giữ tên để tương thích, bổ sung lựa chọn gateway và dùng chung xử lý khóa đơn, đối chiếu tiền, idempotency, xác nhận booking và trạng thái `REFUND_REQUIRED`. Code MoMo và trang return cũ vẫn phục vụ giao dịch cũ.

## Cấu hình

Backend đọc qua `vnpay.*` trong `application.yaml`:

- `VNPAY_TMN_CODE`: mã merchant Sandbox đã được cấp.
- `VNPAY_HASH_SECRET`: secret của chính merchant đó, chỉ ở backend.
- `VNPAY_PAYMENT_URL`: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`.
- `VNPAY_RETURN_URL`: mặc định `http://localhost:8080/api/payments/vnpay/return`.
- `APP_FRONTEND_URL`: mặc định `http://localhost:5173`.

Frontend chỉ cần `VITE_API_BASE_URL=http://localhost:8080`. Không đặt hash secret vào biến `VITE_*`. LocalEnvironment hiện có đọc `.env` ở thư mục chạy hoặc `backend/.env`; nếu đặt file ở `environment/.env`, cần nạp các biến vào môi trường chạy IDE.

## API và flow

1. Người dùng đã đăng nhập gọi `POST /api/payments/vnpay/start`, body `{"bookingId":123}`. Backend kiểm tra chủ đơn, trạng thái và ngày khởi hành, lấy số tiền từ DB.
2. Trả `ApiResponse` với `data={bookingId,orderId,status,paymentUrl}`. Frontend kiểm tra URL Sandbox và chuyển bằng `window.location.href`.
3. Ký tham số được sort tăng dần, URL encode đúng một lần, dùng HMAC-SHA512; `vnp_Amount` bằng số tiền VND nhân 100. Không nhận amount từ client. Các trường bắt buộc gồm version 2.1.0, command pay, TmnCode, currency VND, locale vn, OrderType, IP, ReturnUrl, CreateDate, ExpireDate và TxnRef duy nhất.
4. `GET /api/payments/vnpay/return` public để trình duyệt quay về không cần JWT. Backend kiểm tra HMAC, TmnCode, định dạng tham số, TxnRef tồn tại, gateway, amount và OrderInfo. Số tiền phải khớp cả giao dịch và booking.
5. Thành công cần cả `vnp_ResponseCode=00` và `vnp_TransactionStatus=00`; cập nhật `SUCCESS/CONFIRMED` dưới khóa đơn. Nếu đơn đã hủy, hết điều kiện hoặc đã có giao dịch khác ghi nhận tiền, ghi `REFUND_REQUIRED` theo logic sẵn có. Callback lặp lại không ghi nhận tiền lần hai.
6. Return hợp lệ chuyển HTTP 303 về `/payment/vnpay/return?orderId=...` trên frontend. Sai chữ ký/dữ liệu trả lỗi 400, không cập nhật đơn.
7. Trang kết quả và nút kiểm tra thanh toán gọi `POST /api/payments/vnpay/{orderId}/refresh` có JWT. Chỉ chủ đơn hoặc admin được gọi. Nếu giao dịch còn `PENDING`, backend gọi querydr tới VNPAY và kiểm tra chữ ký, merchant, mã giao dịch, loại giao dịch và số tiền trước khi cập nhật. `GET /api/payments/vnpay/{orderId}/status` vẫn chỉ đọc DB. Không lấy trạng thái từ query URL trên frontend.

## Cách thử

1. Khởi động lại backend và Vite sau khi cấu hình; giữ hostname `localhost` nhất quán để còn phiên đăng nhập khi quay về.
2. Đăng nhập, tạo booking cho lịch tương lai còn nhận khách, mở chi tiết và chọn **Thanh toán VNPAY Sandbox**.
3. Chọn ngân hàng NCB, dùng bộ thẻ thành công công khai trong [trang demo VNPAY](https://sandbox.vnpayment.vn/apis/vnpay-demo/). Không dùng thẻ thật.
4. Hoàn tất OTP và để cổng chuyển về website. Trang kết quả phải hiển thị đã thanh toán, đơn thành `CONFIRMED`, payment thành `SUCCESS`.
5. Thử lại với đơn mới rồi hủy trên cổng: callback thất bại cuối cùng hợp lệ làm payment `FAILED`, booking giữ `PENDING` để thanh toán lại. Các kết quả chưa rõ/đang xử lý giữ `PENDING`.
6. Thử sửa amount/hash trong URL return: backend phải từ chối; reload URL return hợp lệ không tạo thêm thanh toán.

Phiên URL có hạn 15 phút; timestamp nằm trong mã giao dịch để nhiều lần bấm cùng đơn không kéo dài phiên hoặc tạo giao dịch mới. Khi bấm thanh toán với phiên cũ hết hạn, backend truy vấn VNPAY trước. Kết quả đã thanh toán sẽ xác nhận đơn thay vì tạo URL mới. Trạng thái giao dịch `02` (lỗi) hoặc `11` (hủy) chuyển thành `FAILED`; `08` (quá thời gian thanh toán) chuyển thành `EXPIRED`, cho phép tạo phiên mới. Trạng thái `01` (chưa hoàn tất) vẫn giữ `PENDING`. Mã phản hồi truy vấn `91` (không tìm thấy) chỉ cho hết hạn sau thời hạn URL và thêm một phút chờ. Chỉ hết thời gian tại máy chủ không đủ để đánh dấu hết hạn. Phản hồi có PayDate/TransactionNo không đồng nghĩa với đã thanh toán: vẫn phải kiểm tra TransactionStatus.

Lỗi kết nối/chữ ký hoặc trạng thái còn xử lý/nghi ngờ giữ nguyên giao dịch và chặn tạo phiên mới. Mã 94 báo giới hạn truy vấn lặp: chờ vài phút, không bấm kiểm tra liên tục. HTTP querydr chạy ngoài transaction DB; ghi kết quả dưới khóa booking và kiểm tra lại trạng thái. Callback thành công đến muộn vẫn được ghi nhận; nếu booking đã hủy hoặc đã có thanh toán khác thì chuyển `REFUND_REQUIRED` để quản trị viên xử lý, không tự hoàn tiền. Chưa triển khai IPN nền.

Đơn có giao dịch MoMo `PENDING` vẫn cần đối soát trước khi chuyển gateway. Không đổi schema hoặc tự sửa dữ liệu hiện có. Kiểm thử tự động bao gồm khôi phục phiên hết hạn, kiểm tra chữ ký/số tiền, lỗi truy vấn, chống ghi đè giao dịch đã thành công và callback đến muộn. Cần tiếp tục thử trọn luồng thanh toán trên trình duyệt với merchant Sandbox.

Tài liệu giao thức: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html

Tài liệu querydr: https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr&refund.html

Bảng đầy đủ TransactionStatus, mục 2.5.7.2: https://sandbox.vnpayment.vn/apis/files/VNPAY%20Payment%20Gateway_Techspec%20Post%20method%202.1.0-VN.pdf
