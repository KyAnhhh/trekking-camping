# Đợt sửa luồng hiện có

## Cập nhật 08/10/2026 — Tour Summary và khai báo người tham gia

Đã bổ sung tổng quan hành trình (biểu đồ và số liệu có nguồn), form quản trị/import tương ứng, giờ/điểm đón theo lịch. Booking mới có khai báo riêng theo từng người và admin xem xét trước thanh toán. Nội dung khai báo lưu mã hóa AES-GCM, có kiểm soát quyền sở hữu, revision, nhật ký truy cập, giữ chỗ có hạn và xóa nội dung theo thời hạn lưu. Planner có thêm bộ lọc giới hạn quãng đường, vận động và ước tính tiếp cận y tế; không dùng bệnh sử booking để gửi AI.

**Cần cấu hình `HEALTH_DATA_KEY` và chuẩn bị schema trước khi sử dụng luồng mới.** Khóa thiếu sẽ chặn gửi khai báo, vì vậy đơn mới chưa thể thanh toán. Không đọc hoặc chỉnh `.env`, không tạo khóa tự động, không chạy SQL trên database trong đợt sửa này. Booking lịch sử giữ flow cũ; dữ liệu `medical_conditions` cũ chưa được tự chuyển đổi hoặc mã hóa.

Hướng dẫn chi tiết và phạm vi giới hạn: [tour-summary-participation.md](tour-summary-participation.md). Script mới: [sql/tour-summary-participation.sql](sql/tour-summary-participation.sql), khác với script planner/reviews của đợt trước.

Kiểm thử backend: 394 ca thành công, loại trừ context/live; frontend: 10 ca API contract và 78 kiểm tra giao diện thành công, không có runtime error; production build thành công. Đã kiểm tra ảnh chụp Tour Summary trên desktop/320px và khai báo trên điện thoại, sửa xung đột CSS với thẻ tour cũ. Không kiểm chứng database, Gemini hoặc VNPAY thật trong đợt này.

## Cập nhật 07/10/2026

Đã bổ sung hồ sơ cá nhân/đổi mật khẩu, tạo và lưu lịch trình AI, hoàn tất chuyến đi và đánh giá sau tour, sửa thông tin tour và quản lý lịch khởi hành. API admin và quyền sở hữu dữ liệu đã có kiểm thử. Các luồng booking/VNPAY được giữ lại; fixture kiểm thử giao diện đã chuyển sang VNPAY.

Chi tiết sử dụng, API, giới hạn và cập nhật database: [feature-completion.md](feature-completion.md). Có bảng mới `saved_plans` và ràng buộc duy nhất cho đánh giá theo booking; chưa chạy script SQL hoặc khởi động backend để cập nhật database trong đợt sửa này.

Kết quả kiểm tra: 360 ca backend thành công (loại trừ test context/live), 9 ca API contract frontend thành công, 72 kiểm tra giao diện bằng Chrome thành công và không có runtime error; production build thành công. Kiểm thử backend dùng mock và Hibernate metamodel không kết nối database, kiểm tra trình duyệt dùng API fixture; chưa xác nhận PostgreSQL/Gemini/SMTP/VNPAY trên môi trường thật.

Các mục bên dưới là ghi chú từ những đợt sửa trước, bao gồm giai đoạn còn dùng MoMo.

## Lịch sử sửa luồng

Đã đồng bộ auth, đọc tour, booking, quản lý tri thức và hội thoại giữa trang chat/cửa sổ chat.
Đợt mới bổ sung vòng đời booking và MoMo sandbox trên bảng payment_transactions đã có.
Không chạy migration hoặc sửa dữ liệu thật. Xem [hướng dẫn booking và MoMo](booking-momo-sandbox.md).

## Cấu hình trước khi chạy

- Backend đọc `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` như trước.
- `JWT_SECRET`: chuỗi bí mật ngẫu nhiên ít nhất 32 byte. Nếu bỏ trống, Backend tạo khóa tạm trong bộ nhớ; đăng nhập cũ hết hiệu lực sau mỗi lần khởi động. Cần khóa cố định khi triển khai nhiều instance.
- `GEMINI_API_KEY`: khóa Gemini hợp lệ, chỉ đặt trong môi trường hoặc `backend/.env`.
- `GEMINI_MODELS`: tùy chọn; mặc định hiện tại là `gemini-3.5-flash`, dự phòng `gemini-3.8-flash`. Có thể phân cách nhiều model bằng dấu phẩy; chấp nhận tiền tố `models/`. Cấu hình tường minh được ưu tiên. Xem kết quả kiểm thử và cơ chế thử lại trong [chat-and-guides.md](chat-and-guides.md).
- Frontend dùng `VITE_API_BASE_URL`, mặc định `http://localhost:8080`.
- Thay thế/thu hồi các khóa bí mật từng được ghi trong source khi triển khai.

Không ghi khóa thật vào tài liệu hoặc commit `.env`. Thay đổi khóa JWT làm token cũ mất hiệu lực.

## Kiểm tra không truy cập database thật

Từ `backend`:

```powershell
mvn "-Dtest=AuthContractTest,BookingServiceTest,SecurityRegressionTest,KnowledgeServiceTest" test
```

Từ `frontend`:

```powershell
node --test tests/api-contracts.test.mjs
node node_modules/vite/bin/vite.js build
```

Các test Backend trên dùng Mockito và MVC slice. Không chạy `BackendApplicationTests.contextLoads` trong đợt kiểm tra này: test đó cần cấu hình ứng dụng thật và có thể kích hoạt schema update.

## Kiểm tra tích hợp tiếp theo trên DB thử nghiệm

1. Đăng ký, đăng nhập, mở chi tiết tour theo slug.
2. Chọn lịch OPEN trong tương lai và đặt chỗ; kiểm tra đơn PENDING trong Chuyến đi của tôi.
3. Hai khách cùng đặt số chỗ cuối: xác nhận không vượt số chỗ, request sau nhận 409.
4. User thường bị từ chối API quản trị; admin có thể nạp/xóa tài liệu TXT UTF-8 tối đa 1 MB.
5. Nạp lại tài liệu trên 50 chunk; xác nhận không còn chunk cũ. Thử lỗi embedding để kiểm tra rollback giao dịch PostgreSQL.
6. Gửi hai câu hỏi nối tiếp giữa widget và trang chat: cùng session; kiểm tra Gemini bằng cấu hình thật.

## Sửa lỗi chat 503 do cấu hình model

ChatService trước đây từ chối request khi GEMINI_MODELS thiếu, kể cả đã có API key.
GeminiProperties hiện cung cấp model mặc định cho trường hợp thiếu/rỗng và bind được
cả chuỗi phân cách dấu phẩy lẫn danh sách YAML. Nếu thiếu khóa hoặc tên model không
hợp lệ, backend ghi tên biến cấu hình cần kiểm tra, không ghi giá trị credential.

Sau khi cập nhật code, khởi động lại backend. LocalEnvironment tìm .env trong thư mục
đang chạy, rồi thử backend/.env nếu không có. Biến môi trường/JVM có sẵn được ưu tiên.
Không cần thay đổi SecurityConfig để sửa lỗi này.

Chạy kiểm tra cấu hình và request Gemini mô phỏng, không gọi Google hay database:

```powershell
mvn "-Dtest=ChatConfigurationTest" test
```

Ở đợt sửa trước, model mặc định là `gemini-3.8-flash`, thay cho alias
`gemini-flash-latest` của bản sửa trước. Model này đã xuất hiện trong kết quả
ListModels của lần kiểm tra được cho phép. Phép thử generateContent tối thiểu được
người dùng cho phép đã trả HTTP 200, có nội dung hiển thị, finishReason STOP.
Tham khảo [tài liệu model Gemini](https://ai.google.dev/gemini-api/docs/models).
Phép thử đó không xác nhận toàn bộ luồng RAG/database trong ứng dụng đang chạy.

## Phân biệt lỗi sinh câu trả lời

ChatService không còn trả HTTP 200 cùng câu báo lỗi chung "Hệ thống AI hiện đang quá tải".
Lỗi Gemini được chuyển sang ApiResponse lỗi, với thông báo riêng cho các trường hợp:

- Google HTTP 429: quota hoặc rate limit; ứng dụng trả 503.
- Google HTTP 401/403: credential hoặc quyền dự án; ứng dụng trả 503 để không kích hoạt đăng xuất ở frontend.
- Google HTTP 404: model không khả dụng; ứng dụng trả 503.
- Timeout kết nối/đọc: ứng dụng trả 504.
- Phản hồi rỗng hoặc không đọc được: ứng dụng trả 502.
- Phản hồi bị chặn: ứng dụng trả 422, không thử model khác để vượt chặn.

Chỉ lưu cặp USER/BOT sau khi có nội dung trả lời hợp lệ. Nội dung phản hồi gồm
các phần text hiển thị, bỏ qua phần thought. Câu báo lỗi dự phòng do phiên bản
cũ lưu được bỏ qua khi dựng prompt; không xóa dữ liệu cũ.

Chạy kiểm thử hồi quy bằng Gemini mô phỏng:

```powershell
mvn "-Dtest=ChatConfigurationTest,ChatFailureTest" test
```

HTTP 200 của ListModels không chứng minh generateContent có quota hay quyền sử dụng.
Muốn chẩn đoán môi trường thật cần dòng log HTTP từ backend hoặc một yêu cầu
generateContent tối thiểu đã được cho phép. Xem
[mã lỗi của Gemini](https://ai.google.dev/gemini-api/docs/generate-content/api-errors).

Chưa có kiểm chứng tích hợp PostgreSQL/pgvector hoặc toàn bộ luồng chat thật. Chat chỉ giữ hội thoại trong bộ nhớ trình duyệt khi chuyển trang; reload bắt đầu hội thoại mới. Kiểm soát quyền sở hữu phiên chat khách và đồng bộ vector tour vẫn cần phát triển tiếp. Booking hủy/xác nhận và MoMo sandbox đã có code và test mô phỏng; thanh toán sandbox thực tế cần cấu hình merchant và IPN công khai.
