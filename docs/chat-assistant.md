# Chatbot: phiên riêng tư, RAG và đặt tour có xác nhận

Triển khai ngày 11/10/2026, tái sử dụng PgVector, embedding cục bộ, Gemini REST, BookingService và flow thanh toán hiện có. Không thêm dependency. Không sửa `.env`, không gọi Gemini/VNPAY thật, không chạy migration hoặc tạo booking thật trong đợt phát triển này.

## Chuẩn bị chạy

1. Sao lưu DB và xem `docs/sql/chat-assistant.sql`. Hai bảng mới `chat_sessions` và `chat_booking_drafts` dùng DB hiện có để bảo vệ phiên và chống tạo trùng qua nhiều request/instance. Script chưa chạy. Nếu hệ thống đang dùng `ddl-auto: update`, Hibernate có thể tự tạo bảng khi khởi động; kiểm tra schema trước khi áp dụng SQL. `CREATE TABLE IF NOT EXISTS` không bổ sung constraint còn thiếu vào bảng đã có.
2. Khởi động lại backend/frontend. Không cần biến môi trường mới; giữ cấu hình Gemini và các biến thanh toán/khai báo hiện có. Model phải hỗ trợ function calling trên GenerateContent. Chưa kiểm tra model/quota/credentials thực tế; kiểm thử mock không xác nhận chúng hoạt động.
3. Admin đồng bộ tour vào kho tri thức một lần nữa. Từ bản nâng cấp 15/10/2026, document tour có `content_version` và `content_fingerprint` SHA-256 của nội dung tour, thông số hành trình, lịch trình và trang bị. Không còn chỉ dựa vào `tour.updatedAt`: sửa bảng con cũng làm bản nạp cũ mất hiệu lực. Bản tour thiếu metadata mới, đã ẩn/xóa hoặc không xác minh được sẽ bị bỏ qua và có notice, kể cả khi vẫn tìm thấy TXT. Giá/chỗ/lịch mở bán lấy từ DB hiện tại. TXT nhập tay không có liên kết tour tự động nên vẫn cần kiểm tra nội dung thủ công; ngày nạp không chứng minh tính cập nhật.
4. Tạo cuộc trò chuyện mới. Phiên cũ chỉ có sessionId không còn được endpoint chat mới chấp nhận. Không tự nhận quyền sở hữu lịch sử cũ.

## Luồng thực hiện

- `POST /api/chat/sessions`: công khai; tạo UUID và bí mật ngẫu nhiên, lưu SHA-256 của bí mật; người đăng nhập được gắn userId từ principal. Thời hạn phiên 24 giờ.
- `POST /api/chat/history`: `{sessionId, sessionToken}`; kiểm tra cả bí mật và userId, trả tối đa 40 tin gần nhất; token không nằm trên URL.
- `POST /api/chat`: `{sessionId, sessionToken, message}`. Khóa phiên ngắn trong DB để cấp lượt; request cùng phiên đang chạy nhận 409; không giữ transaction trong lúc gọi Gemini. Chỉ lưu cặp USER/BOT khi trả lời thành công và lượt còn hợp lệ. Lease có revision để response cũ không ghi vào lượt mới.
- Truy xuất tối đa 6 đoạn với ngưỡng tương đồng 0,55. Có chia câu hỏi nhiều ý theo dấu câu, bổ sung câu USER gần nhất cho một số cách hỏi tiếp. Retrieval có timeout 4 giây; lỗi hiển thị dưới dạng notice, không tự coi là có căn cứ.
- Prompt tách `systemInstruction` khỏi dữ liệu; giữ tối đa 6 tin, giới hạn độ dài các phần, giới hạn serialized contents 60.000 ký tự và output 4.096 token. Đây là giới hạn tài nguyên thực dụng, không phải bộ đếm token chính xác của model.
- Gemini được cấp đúng hai tool **chỉ đọc/đề xuất**: `search_tours`, `propose_booking`. Giữ nguyên model content/thought signatures trong lượt tiếp. Tối đa 3 lượt model và 3 tool call/lượt; cuối vòng đặt mode NONE. Retry HTTP hiện có vẫn được dùng; timeout toàn phần xử lý AI 90 giây.
- `search_tours` lọc trong DB: active, OPEN, còn chỗ, ngày tương lai, điểm đến, ngày đi, số ngày, ngân sách, độ khó và giới hạn hành trình nếu có. Giới hạn 10 lịch sau lọc/xếp hạng. Booking COMPLETED của đúng tài khoản chỉ làm tour xếp sau; CANCELLED không tính. COMPLETED chưa chứng minh người đặt trực tiếp tham gia.
- Thẻ tour và giá trên UI lấy từ kết quả backend, không phân tích text của model để tạo giá/ID. Lựa chọn mặc định ban đầu không hiển thị như khuyến nghị nếu model chưa gọi search. `propose_booking` không lưu đơn, không giữ chỗ và không có tool thanh toán.
- `POST /api/chat/booking-drafts`: cần đăng nhập, `{requestId: UUID, scheduleId, people}`. Trả tóm tắt và liên hệ từ hồ sơ, hiệu lực 10 phút. Giá luôn đọc DB. RequestId tái sử dụng cho cùng lựa chọn; không tự thay đổi một draft cũ.
- `POST /api/chat/booking-drafts/{id}/confirm`: cần đăng nhập và `{confirmed: true, contactName, contactEmail, contactPhone}`. Khóa draft → tour → lịch; kiểm tra chủ sở hữu, hết hạn, giá, phiên bản tour, ngày/điểm đón và chỗ. Giá/thông tin đổi trả 409 để khách lấy báo giá mới. Gọi BookingService trong cùng transaction; bookingId được lưu ngay trên draft. Gửi lại cùng xác nhận trả booking cũ kể cả draft đã hết hạn, không trừ chỗ lần hai. Payload khác trên draft đã tạo đơn bị từ chối.
- Sau tạo đơn, UI chuyển khách sang `/my-bookings/{id}` để khai báo tham gia, admin xem xét, rồi khách chủ động thanh toán. Thông tin liên hệ ở form riêng không gửi vào Gemini. Bấm nút xác nhận không có nghĩa đã thanh toán hay tour đã được xác nhận thành công.

## Giới hạn cần hiểu

- Có kiểm tra tên tool, schema, ID lịch, mã nguồn `[Sx]`; chưa có bộ kiểm chứng ngữ nghĩa tự động cho từng phát biểu của LLM. Prompt injection không được coi là đã giải quyết tuyệt đối. Không cấp công cụ ghi dữ liệu hay truy vấn tùy ý cho model.
- Điều kiện trong câu nói được model chuyển thành tham số; không bảo đảm model luôn trích đủ nhu cầu. UI cho kiểm tra lịch/số khách/giá trước xác nhận. Cần bộ đánh giá tiếng Việt trực tiếp với model trước khi công bố chất lượng TH1–TH11.
- Query reformulation hiện là quy tắc hỏi tiếp, chưa có tóm tắt hội thoại dài hoặc bộ phân loại chủ đề riêng. Khi thiếu ngữ cảnh phải hỏi lại. Nguồn có ngày nạp nhưng ngày nạp không chứng minh nội dung còn đúng; mâu thuẫn cần người xác nhận.
- Có thể không có tài liệu đủ liên quan sau ngưỡng 0,55; cần hiệu chỉnh ngưỡng bằng bộ câu hỏi thật, không mặc định coi ngưỡng là tối ưu.
- Giới hạn tài nguyên: 4 lượt AI và 2 truy xuất cùng lúc/instance; hạn mức theo IP thực tế của servlet trong một phút, không tin X-Forwarded-For do client gửi. Triển khai sau reverse proxy cần cấu hình trusted proxy; rate limit chưa dùng chung giữa các instance. Session lease và idempotency draft được lưu DB.
- Browser chỉ lưu credentials phiên trong sessionStorage; đổi tài khoản/logout xóa phiên trên UI. Reload khôi phục tối đa 40 tin dạng text, không phục dựng các form booking cũ. Khi mất phản hồi tạo đơn, form khóa thay đổi thông tin và tiếp tục dùng cùng draft để retry; nếu reload giữa bước đó, kiểm tra My bookings trước khi tạo yêu cầu mới. Không deduplicate hai draft có requestId khác nhau vì có thể là hai đơn khách thực sự muốn đặt.
- Các bảng phiên/draft và chat_messages chưa có tác vụ xóa định kỳ. Phiên hết hạn không đọc được nhưng dữ liệu vẫn nằm DB; cần chính sách lưu trữ trước vận hành thật. Booking đã tạo vẫn dùng quy trình lưu trữ/khai báo hiện có.
- Chưa chạy migration trên PostgreSQL, kiểm thử cạnh tranh transaction trên DB thật, hoặc gọi Gemini/VNPAY thật. Không xem các test mock là bằng chứng cho các bước này.

## Bộ câu hỏi nghiệm thu trực tiếp

| TH | Cách kiểm tra | Điều kiện đạt |
|---|---|---|
| 1 | Hỏi trang bị có trong TXT | Nội dung đúng và nguồn `[Sx]` tồn tại |
| 2 | Hỏi chính sách chưa nạp | Nói chưa biết, không tự tạo chính sách |
| 3 | Hỏi tour A rồi “tour đó cần mang gì?” | Đúng A hoặc hỏi lại khi chưa rõ |
| 4–5 | Hỏi lịch, trang bị và thông tin không tồn tại | Trả lời đủ từng ý; nêu phần thiếu |
| 6 | Hỏi tên địa điểm sai chính tả | Sửa ý rõ ràng hoặc hỏi lại, không chọn ngầm tour khác |
| 7–8 | Hỏi mơ hồ rồi chuyển điểm đến | Hỏi lại; không áp đặt điểm đến cũ |
| 9 | Nạp hai TXT mâu thuẫn | Nêu mâu thuẫn, không tự coi tài liệu mới là đúng |
| 10 | Đổi giá/lịch rồi hỏi lại | Thẻ tour dùng DB hiện tại |
| 11 | Nêu ngân sách, ngày, thể lực | Bộ lọc tool khớp; không gợi ý tour ngoài điều kiện |
| 12 | Mô phỏng retrieval/model lỗi | Notice rõ, hết thời gian hữu hạn, không lưu câu lỗi như câu trả lời |
| 13 | Tài khoản có COMPLETED và CANCELLED | Chỉ COMPLETED ảnh hưởng thứ tự; tài khoản khác không thấy lịch sử |
| 14 | Lấy quote, đổi giá/hết chỗ, gửi confirm hai lần | 409 khi thay đổi; cùng draft chỉ tạo một đơn |

## Kết quả kiểm tra ngày 11/10/2026

- Backend: 421 kiểm thử đạt, không lỗi. Lệnh chạy loại trừ `ChatLiveSmokeTest` và `BackendApplicationTests` để không gọi dịch vụ hoặc khởi động ứng dụng với DB thật.
- Sau chỉnh sửa cuối về ngữ cảnh hướng dẫn viên, truy xuất nhiều ý và mô tả trang bị: chạy lại 20 kiểm thử liên quan, đều đạt; Maven báo `BUILD SUCCESS`.
- Frontend: 11 kiểm thử hợp đồng API đạt; 80 kiểm tra giao diện trên Chrome với API giả lập đạt, không ghi nhận lỗi runtime; Vite production build thành công.
- Chưa chạy SQL, kiểm thử transaction trên PostgreSQL thật hoặc đánh giá câu trả lời từ Gemini thật. Các kết quả trên không thay thế bộ nghiệm thu TH1–TH14.

Các kiểm tra tự động sử dụng mock provider/repository và API fixture; không dùng dữ liệu sức khỏe hay credentials thật trong kiểm thử.
