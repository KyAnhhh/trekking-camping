# Booking và MoMo sandbox

## Cấu hình

Đặt các biến sau trong môi trường chạy backend hoặc `backend/.env`, không đặt trong frontend và không gửi giá trị bí mật qua chat:

| Biến | Nội dung |
| --- | --- |
| MOMO_PARTNER_CODE | Partner code của merchant thử nghiệm |
| MOMO_ACCESS_KEY | Access key của merchant thử nghiệm |
| MOMO_SECRET_KEY | Secret key của merchant thử nghiệm |
| MOMO_REDIRECT_URL | URL frontend `/payment/momo/return`; mặc định `http://localhost:5173/payment/momo/return` |
| MOMO_IPN_URL | URL HTTPS công khai trỏ đến backend `/api/payments/momo/ipn` |

Khởi động lại backend sau khi đặt biến. Gateway được cố định ở `https://test-payment.momo.vn`.
Chưa có credential merchant MoMo trong môi trường được kiểm tra, chưa gọi MoMo thật.
Không tự khởi tạo tunnel hoặc xuất bản backend. IPN cần cấu hình URL công khai do người triển khai quản lý;
nếu dùng frontend port khác, cấu hình redirect và CORS tương ứng.

## Luồng và API

1. Đăng nhập, chọn lịch OPEN từ ngày mai, nhập thông tin, tạo đơn. Server tính giá và giữ chỗ dưới khóa lịch khởi hành.
2. Chuyển đến `/my-bookings/:id`, bấm MoMo sandbox. Backend kiểm tra chủ đơn, số tiền, lịch và trạng thái.
3. Commit giao dịch PENDING trước khi gọi MoMo; dùng cùng orderId/requestId khi thử lại giao dịch đang chờ.
4. MoMo trả payUrl sandbox; trình duyệt chuyển sang trang thanh toán.
5. Callback IPN được xác thực HMAC-SHA256, đối chiếu partner/order/request/amount/orderInfo rồi trả HTTP 204.
6. Trang return chỉ lấy orderId; backend truy vấn MoMo để đối soát, không tin resultCode/amount từ trình duyệt.
7. Kết quả thành công xác nhận booking, không trừ chỗ lần nữa. Callback lặp không xác nhận/trừ chỗ lần hai.

| Method | API | Quyền |
| --- | --- | --- |
| GET | /api/bookings/{id} | Chủ đơn |
| POST | /api/bookings/{id}/cancel | Chủ đơn |
| GET | /api/admin/bookings | Admin |
| GET | /api/admin/bookings/{id} | Admin |
| POST | /api/admin/bookings/{id}/cancel | Admin |
| POST | /api/admin/bookings/{id}/confirm | Admin, đơn đã đủ tiền hoặc tổng tiền 0 |
| POST | /api/payments/momo/start | Chủ đơn, JSON `{ "bookingId": 1 }` |
| POST | /api/payments/momo/{orderId}/refresh | Chủ đơn hoặc admin |
| POST | /api/payments/momo/ipn | Public ở security chain; bắt buộc chữ ký hợp lệ trong service |

API ứng dụng dùng ApiResponse; IPN dùng HTTP 204 theo giao thức MoMo.
Giao dịch chỉ lưu amount do backend tính. TransactionCode là mã order duy nhất ngẫu nhiên UUID trong ứng dụng;
chưa bổ sung unique constraint trong database vì không chạy migration.

## Trạng thái và giới hạn

- Booking: PENDING → CONFIRMED sau thanh toán; PENDING/CONFIRMED chưa thu tiền → CANCELLED nếu trước ngày khởi hành và không còn giao dịch PENDING.
- Thanh toán: PENDING, SUCCESS, FAILED, REFUND_REQUIRED. Mã 0 hoặc 9000 được xử lý thành công cho cấu hình một bước autoCapture=true; mã lỗi cuối cùng theo danh sách MoMo được đánh dấu FAILED.
- Lỗi mạng, timeout, mã không biết hoặc đang xử lý giữ PENDING để tránh thu tiền hai lần. Người dùng/admin có thể bấm kiểm tra kết quả.
- Tiền về sau khi đơn bị hủy, lịch ngừng hoạt động hoặc đã có thanh toán khác: REFUND_REQUIRED; không tự mở lại đơn hay tự tuyên bố đã hoàn tiền.
- Đơn có tiền đã thu cần quy trình hoàn tiền riêng trước khi hủy. **Chưa có API hoàn tiền tự động**, job đối soát định kỳ, hết hạn giữ chỗ hay phân trang admin.
- Nếu mất payUrl và MoMo trả trùng requestId/orderId, hệ thống chuyển sang đối soát. Có thể phải đợi giao dịch hết hạn rồi kiểm tra lại trước khi tạo lần thanh toán mới.
- Tour phải khởi hành sau ngày hiện tại theo Asia/Ho_Chi_Minh. Trước đây có thể tạo đơn ngay ngày khởi hành; đã đồng bộ lại điều kiện frontend/backend vì không còn thời gian hoàn thành thanh toán.
- Số tiền MoMo từ 1.000 đến 50.000.000 VND, phải là số nguyên. Đơn ngoài khoảng được báo lỗi rõ, không tạo giao dịch.
- Không thay đổi entity/schema; chưa kiểm thử khóa/concurrency trên PostgreSQL thật. Test duplicate là tuần tự; cần test nhiều request đồng thời trên DB thử nghiệm trước triển khai.

## Kiểm thử

Từ backend (không chạy contextLoads hoặc kết nối DB thật):

```powershell
mvn "-Dtest=LocalEnvironmentTest,BookingLifecycleTest,MomoGatewayTest,MomoPaymentServiceTest,ChatConfigurationTest,ChatFailureTest,BookingServiceTest,ApiAuthorizationMatrixTest,SecurityRegressionTest,AuthContractTest,KnowledgeServiceTest" test
```

Từ frontend:

```powershell
node --test tests/api-contracts.test.mjs
node node_modules/vite/bin/vite.js build
```

`tests/ui-smoke.mjs` dùng Chrome CDP tại localhost:9222 và frontend tại localhost:5174;
tất cả request `/api/` đều được chặn và trả fixture, không ghi dữ liệu thật.

Kết quả kiểm tra đợt này: 165 trường hợp backend trong các nhóm trên (chạy theo nhóm khi sửa),
6 test hợp đồng frontend, build Vite thành công, 43 kiểm tra trình duyệt không có lỗi JavaScript.
Bao gồm truy cập trái chủ đơn, admin/user/public, callback lặp, chữ ký giả, sai số tiền,
thanh toán đến muộn, lỗi 503 không làm đăng xuất và màn hình 320px.

Sau khi có merchant thử nghiệm: thử thanh toán thành công, người dùng hủy, URL hết hạn,
đóng trình duyệt trước redirect và callback lặp; xác nhận trạng thái booking và payment_transactions khớp.

Tài liệu giao thức:
[Tạo thanh toán](https://developers.momo.vn/v3/docs/payment/api/wallet/onetime/),
[Truy vấn](https://developers.momo.vn/v3/docs/payment/api/payment-api/query/),
[IPN](https://developers.momo.vn/v3/docs/payment/api/result-handling/notification/),
[Mã kết quả](https://developers.momo.vn/v3/docs/payment/api/result-handling/resultcode/).
