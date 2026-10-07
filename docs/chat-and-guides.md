# Chatbot và hướng dẫn viên

## Sửa lỗi chatbot 503

Kiểm tra ngày 30/09/2026 bằng dữ liệu tổng hợp: Gemini 3.8 Flash trả HTTP 503 với câu thử tối thiểu; Gemini 3.5 Flash trả HTTP 200 và nội dung. Danh sách model trả về không bảo đảm từng model sinh nội dung được: hai model 2.5 thử nghiệm trả 404.

- Mặc định mới: `gemini-3.5-flash`, dự phòng `gemini-3.8-flash`.
- `GEMINI_MODELS` nếu đã đặt trong môi trường chạy sẽ ghi đè danh sách mặc định. Không thêm key vào source code.
- Tối đa 3 lượt gọi: ưu tiên model dự phòng trước khi thử lại model bị 429/5xx hoặc lỗi kết nối, có khoảng chờ tăng dần và jitter. Dừng ngay với lỗi xác thực 401/403, yêu cầu 400 hoặc nội dung bị chặn. Không lưu lỗi thành câu trả lời.
- Connect timeout 5 giây; read timeout 25 giây mỗi lượt; frontend chờ tối đa 100 giây. Thời gian tìm kiếm vector/DB còn phụ thuộc hạ tầng.
- Giới hạn nội dung tài liệu và lịch sử đưa vào prompt. Khi tất cả nhà cung cấp/model đều lỗi, API vẫn trả lỗi thật; không tạo câu trả lời giả để che lỗi.
- Cần khởi động lại backend đang chạy để áp dụng. Nếu IDE có `GEMINI_MODELS` riêng, kiểm tra cấu hình đó; không chỉ sửa `.env`.
- `ChatLiveSmokeTest` mặc định bị bỏ qua; chỉ chạy với `-Dgemini.live=true`. Dùng câu chào tổng hợp, mock DB/kho tri thức, không gửi dữ liệu tour/khách hàng. Test này dùng model mặc định trong code.

Google hướng dẫn xử lý lỗi tạm thời và backoff: https://ai.google.dev/gemini-api/docs/troubleshooting

## Phạm vi hướng dẫn viên đã triển khai

1. Admin → Hướng dẫn viên: tạo/sửa hồ sơ, mã cố định, chuyên môn, ngôn ngữ, năm bắt đầu, bật/tắt nhận chuyến, upload ảnh JPEG/PNG tối đa 5 MB / 16 MP. Ảnh được kiểm tra và mã hóa lại; lưu mặc định tại `uploads/guides` (có thể đổi `GUIDE_UPLOAD_DIR`).
2. Admin → Tour → Lịch khởi hành → Phân công hướng dẫn viên: chọn đúng một trưởng đoàn khi có đội, tối đa 9 người hỗ trợ. Có thể gỡ cả đội cho chuyến chưa khởi hành.
3. Client: mỗi lịch khởi hành hiện đội riêng, liên kết hồ sơ; chi tiết booking hiện đội hiện tại. Điện thoại chỉ có ở booking đã xác nhận thuộc chính người dùng hoặc trang admin. Email không trả trong hồ sơ công khai.
4. Không sửa phân công chuyến đã khởi hành hoặc đã hủy; không xóa hồ sơ. Muốn ngừng hoạt động phải chuyển các phân công chưa kết thúc trước.
5. Giao ngày đầu/cuối được coi là trùng lịch. Mọi trạng thái ngoài `CANCELLED`, kể cả `FULL`, đều chiếm lịch. Dùng khóa hàng lịch và khóa các hướng dẫn viên theo ID tăng dần; refresh entity sau khi có khóa rồi kiểm tra xung đột trong transaction.
6. Không có API sửa ngày khởi hành trong phạm vi này. Nếu bổ sung sau, phải khóa đội và kiểm tra lại xung đột trước khi đổi ngày.

## API

Tất cả JSON dùng `ApiResponse {code,message,data}`. Ảnh trả JPEG.

| Method | URL | Quyền |
|---|---|---|
| GET, POST | /api/admin/guides | ADMIN |
| POST multipart file | /api/admin/guides/import | ADMIN, import JSON; xem [hướng dẫn](guide-import.md) |
| PUT | /api/admin/guides/{id} | ADMIN |
| POST multipart file | /api/admin/guides/{id}/avatar | ADMIN |
| GET, PUT | /api/admin/schedules/{id}/guides | ADMIN |
| GET | /api/guides/{id} | Public, hồ sơ không có liên hệ riêng |
| GET | /api/media/guides/{filename} | Public |
| GET | /api/bookings/{id}/guides | Chủ booking |
| GET | /api/admin/bookings/{id}/guides | ADMIN |

`GET /api/tours/{id}/schedules` dùng DTO, giữ id/ngày/số chỗ/status/guideName, bổ sung `guides: [{guide: publicProfile, role}]`, bỏ `guidePhone` và entity tour lồng nhau.

PUT phân công nhận mảng, ví dụ:

```json
[{"guideCode":"HDV_001","role":"LEAD"},{"guideCode":"HDV_002","role":"ASSISTANT"}]
```

Import JSON tour nhận thêm `guideAssignments` cùng cấu trúc trong mỗi schedule. Mã phải tồn tại, đang hoạt động và không trùng ngày. Không tự tạo hồ sơ từ file import. Lỗi phân công làm rollback toàn bộ đợt import. Mẫu tải từ UI để mảng rỗng cho đến khi có mã thật.

## Dữ liệu cũ và AI

- Không tự gộp người trùng tên. Giữ `guideName`/`guidePhone` cũ; admin chủ động chọn hồ sơ để thay thế. Chuyến chưa ánh xạ hiển thị tên cũ hoặc thông báo cập nhật.
- Cấu hình hiện tại `ddl-auto=update` tạo bảng mới khi backend khởi động. Chưa khởi động backend vào DB thực trong đợt sửa. Script `docs/sql/guides.sql` là lựa chọn triển khai thủ công, chưa được chạy; có thêm unique index trưởng đoàn và index tra cứu người.
- Chatbot nhận dữ liệu phân công trực tiếp từ DB cho câu hỏi có từ khóa hướng dẫn viên/trưởng đoàn/guide/chuyên gia/dẫn đoàn, tối đa 30 phân công sắp tới trên tour đang hoạt động. Không gửi điện thoại/email. Dữ liệu này không bị tồn đọng trong vector store, không cần nạp lại tri thức sau đổi phân công.
- Hiện chưa có tìm kiếm toàn bộ lịch phân công theo hội thoại nhiều lượt: câu hỏi nối tiếp không chứa từ khóa có thể không kích hoạt truy vấn. Không coi 30 kết quả là toàn bộ danh sách.
- Chứng chỉ/xác minh chuyên gia, tài khoản GUIDE riêng, đánh giá hướng dẫn viên và nhật ký thay đổi phân công là giai đoạn mở rộng; chưa triển khai. Nội dung chuyên môn hiện do admin nhập, không có nhãn chứng nhận tự động.

## Kiểm thử

Unit/MVC: model fallback, retry budget, phân quyền, kiểm tra ngày/phân công, giữ dữ liệu khi lỗi, thứ tự khóa/refresh, DTO không lộ liên hệ, quyền xem booking và ngữ cảnh AI. Browser smoke dùng API fixtures, không ghi DB. Chưa có kiểm thử transaction đồng thời trên PostgreSQL thật; cần chạy trên DB thử nghiệm trước triển khai nhiều admin.
