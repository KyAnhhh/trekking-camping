# Quản trị nghiệp vụ và đối soát

Bổ sung 15/10/2026, dùng lại bảng và luồng booking/payment/review hiện có; không cần migration riêng cho đợt này.

## Sử dụng

1. Khởi động lại backend và frontend. Đăng nhập tài khoản ADMIN đang hoạt động.
2. `/admin`: tổng đơn theo trạng thái, booking PENDING cần duyệt tham gia, giao dịch PENDING, giao dịch REFUND_REQUIRED, tổng tiền SUCCESS, số đánh giá hiển thị/ẩn. Số liệu **toàn kỳ**; không phải lợi nhuận, tiền đã quyết toán hay số dư ngân hàng. REFUND_REQUIRED thống kê riêng và chưa chứng minh đã hoàn tiền.
3. `/admin/bookings?queue=REVIEW_REQUIRED`: danh sách chờ duyệt khai báo tham gia, mở chi tiết để dùng các thao tác duyệt/xác nhận/hủy/hoàn thành hiện có. Bộ lọc PENDING cho toàn bộ đơn chờ xác nhận. Duyệt tham gia không đồng nghĩa đã trả tiền.
4. `/admin/payments`: mặc định PENDING. “Phiên mở cổng đã hết hạn” chỉ dựa vào thời hạn VNPAY; giao dịch chưa có kết quả cuối vẫn cần đối soát. Bấm **Đối soát với cổng thanh toán**, xác nhận **Kiểm tra giao dịch**. Mở danh sách không tự gọi cổng.
5. `/admin/reviews`: lọc đang hiển thị/đã ẩn. Xác nhận ẩn hoặc hiển thị lại; backend khóa hàng, kiểm tra trạng thái mà quản trị viên đang xem. Nếu 409, tải lại trước khi xử lý. Không sửa nội dung/số sao. Truy vấn review công khai vốn chỉ tính bản đã duyệt nên điểm trung bình và danh sách công khai phản ánh thay đổi ở lần tải tiếp theo.

## API (ADMIN, JWT)

| Method | Endpoint | Dữ liệu |
|---|---|---|
| GET | `/api/admin/operations/overview` | Tổng quan nghiệp vụ |
| GET | `/api/admin/operations/bookings?queue=REVIEW_REQUIRED&page=0` | ALL, REVIEW_REQUIRED, PENDING, CONFIRMED, COMPLETED, CANCELLED |
| GET | `/api/admin/operations/payments?status=PENDING&page=0` | ALL, PENDING, SUCCESS, FAILED, EXPIRED, REFUND_REQUIRED |
| POST | `/api/admin/operations/payments/{id}/reconcile` | Không nhận amount/provider/trạng thái do client chỉ định |
| GET | `/api/admin/operations/reviews?visibility=ALL&page=0` | ALL, VISIBLE, HIDDEN |
| PUT | `/api/admin/operations/reviews/{id}/visibility` | `{ "expectedApproved": true, "approved": false }` |

Envelope ApiResponse hiện có. Danh sách trả `data: {items, page, totalPages, totalElements}`, 20 bản ghi/trang, mới nhất theo ID; page bắt đầu 0. Sai bộ lọc/trang trả 400. Guest 401, người dùng thường 403. Service kiểm tra thêm vai trò và trạng thái tài khoản trong DB.

## Quy tắc thanh toán

- Backend đọc phương thức/mã giao dịch từ DB; tái sử dụng `VnpayPaymentService.refresh` hoặc `MomoPaymentService.refresh` cho giao dịch legacy. Không tạo thanh toán mới và không có nút đánh dấu thành công thủ công.
- Chữ ký, số tiền, mã tham chiếu và điều kiện cập nhật tiếp tục do gateway/store hiện có xác minh; các cập nhật tiền/chỗ giữ nguyên khóa/transaction hiện có.
- Nếu cổng chưa có kết quả cuối: giữ PENDING. Lỗi cổng: hiện thông báo, không tự thành SUCCESS/FAILED. Giao dịch đã kết thúc hoặc phương thức không hỗ trợ trả 409 khi yêu cầu đối soát qua endpoint mới.
- REFUND_REQUIRED: theo dõi để xử lý với cổng/merchant. Chưa thêm API hoàn tiền, thao tác ghi nhận hoàn tiền hay công cụ kết sổ. Chưa thêm IPN nâng cao và tác vụ đối soát định kỳ.
- Tính năng review giữ hành vi xuất bản hiện có khi khách gửi; “đã ẩn” không phải hàng chờ duyệt mới. Chưa lưu lịch sử kiểm duyệt/người ẩn/lý do trong DB, nên không dùng màn hình này như sổ audit.

## Kiểm tra trực tiếp ở môi trường thử

- Guest/USER không mở được API quản trị; ADMIN inactive bị từ chối.
- Tạo đơn thử cần duyệt, kiểm tra dashboard và bộ lọc, duyệt trong chi tiết rồi tải lại danh sách.
- Với giao dịch PENDING thử, mô phỏng query SUCCESS/FAILED/EXPIRED/PENDING và lỗi chữ ký/số tiền qua test backend; chỉ kết quả hợp lệ được store áp dụng. Không dùng DB thật cho mô phỏng.
- Hai admin mở cùng review: người thứ nhất ẩn, người thứ hai gửi thao tác cũ nhận 409. Kiểm tra danh sách và điểm tour công khai sau khi tải lại.
- Kiểm tra 0 kết quả, nhiều hơn 20 kết quả, chuyển trang, lỗi mạng, mobile và bàn phím.

Test tự động dùng mock và browser fixture, không chứng minh cổng thanh toán thật hoặc truy vấn PostgreSQL đã chạy. Cần nghiệm thu trên DB thử và sandbox đã cấu hình trước vận hành.

## Kết quả xác minh 15/10/2026

- Maven `clean test` (loại `ChatLiveSmokeTest`, `BackendApplicationTests`): 451 test đạt, không lỗi, không skipped. Clean build loại bỏ các class kiểm thử cũ không còn trong source.
- Node: 15 test hợp đồng API/theme đạt.
- Chrome headless với API fixture: 147 kiểm tra đạt, không lỗi runtime; gồm desktop/mobile, đối soát lỗi rồi PENDING, ẩn/hiện đánh giá có xác nhận và các flow hiện có.
- Vite production build đạt bằng `node node_modules/vite/bin/vite.js build`. Wrapper `npm run build` trên môi trường này thoát mã 1 không có lỗi chi tiết; gọi trực tiếp đúng Vite CLI hiện có build thành công.
- Không sửa secret, không chạy migration, không ghi database hoặc gọi Gemini/cổng thanh toán thật. Browser thử đã đóng sau kiểm tra.
