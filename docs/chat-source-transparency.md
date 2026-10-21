# Nguồn trong câu trả lời chatbot

## Hành vi

- `[S1]` trong văn bản mở đoạn trích tương ứng; không chuyển đổi mã trong code hoặc liên kết markdown có sẵn.
- Phân biệt nguồn AI dẫn với tài liệu chỉ được truy xuất. Mã nguồn hợp lệ không chứng minh nhận định được tài liệu hỗ trợ về ngữ nghĩa.
- Thẻ tour là kết quả truy vấn hệ thống; giá/chỗ được kiểm tra lại khi đặt. Đoạn trích TOUR_INFO là bản chụp đã qua kiểm tra fingerprint, không phải nguồn giá/chỗ thời gian thực.
- Nguồn lưu cùng câu trả lời và được khôi phục qua API history. Lịch sử là bản chụp tại thời điểm trả lời, không tự tái xác minh khi reload. Tin nhắn cũ không có metadata vẫn đọc được, không tự tạo nguồn cho lịch sử cũ.
- Ngày hiển thị là ngày nạp vào kho, không phải ngày tác giả cập nhật tài liệu.

## Công khai tài liệu

Admin → Kho tri thức → chọn TXT → bật “Cho phép khách xem tên tài liệu và đoạn trích nguồn” nếu được phép. Multipart `publicExcerpt` mặc định false; metadata PUBLIC mới cho hiển thị tên và tối đa 1.800 ký tự mỗi đoạn, đúng phần được gửi cho model. Tour đang hoạt động có snapshot hợp lệ được phép hiển thị đoạn trích. Đường dẫn nguồn được rút thành tên file.

TXT cũ và CONTEXT_ONLY không công khai đoạn trích nhưng vẫn được dùng làm ngữ cảnh cho AI. Đây **không phải** cơ chế giữ bí mật nội dung: chỉ nạp thông tin được phép tư vấn khách. Metadata PRIVATE bị loại khỏi ngữ cảnh. Không đưa tài liệu mật vào kho công khai. Nguồn đã gửi được lưu trong lịch sử; xóa/thay thế TXT không thu hồi bản chụp đã gửi.

## Triển khai

Áp dụng `docs/sql/chat-source-metadata.sql` trên DB kiểm thử trước, sau đó triển khai theo quy trình backup/migration của dự án. Script chỉ thêm cột TEXT nullable vào `chat_messages`, không ghi lại tin nhắn cũ. Không dùng Hibernate update thay migration. Lượt này chưa chạy script hoặc kiểm chứng persistence PostgreSQL thật.

## Nghiệm thu ngày 22/10/2026

- Backend: đợt đầu 483 tests pass; đợt sau 443 tests pass có nhiều ca chạy lại. Không cộng hai số thành tổng tests độc lập. Log `backend/target/source-transparency-tests.log` và `source-followup-tests.log`.
- Browser: 21 checks pass, API stub, 0 runtime errors; có mở nguồn/escape HTML/reload/mobile. Không chứng minh DB/provider thật. File `frontend/tests/ai-models-ui.mjs`.
- Frontend API contracts: 15 pass. Vite production build pass.
- Ca opt-in xuất bản đoạn trích: KnowledgeServiceTest 3 pass (`source-publication-tests.log`). Hợp các ca backend đã chạy trong lượt này: 487 ca độc lập đạt, không skipped; các lần chạy lại không cộng thêm. Đây là kiểm thử mock/unit/MVC, không phải PostgreSQL/provider thật.
- Không gọi AI thật. Chưa đánh giá độ đúng ngữ nghĩa của trích dẫn hay chất lượng câu trả lời.

## Tự kiểm tra sau migration

1. Nạp TXT tổng hợp, bật công khai đoạn trích; đồng bộ tour nếu dữ liệu tour thay đổi.
2. Chọn model, hỏi nội dung đã nạp. Nếu model dẫn `[S1]`, bấm và đối chiếu nhận định với đoạn trích. Không mặc định mọi model đều dẫn nguồn đúng.
3. Reload: nguồn và nhãn bản chụp lịch sử còn hiển thị. Tin nhắn cũ không có nguồn vẫn mở được.
4. Nạp TXT không bật công khai: phần xem nguồn không hiển thị nội dung/tên riêng của tài liệu. AI vẫn có thể diễn giải tài liệu theo chính sách nêu trên.
5. Kiểm chứng ngữ nghĩa với provider thật cần một lượt nghiệm thu được duyệt riêng; bước UI này không thay thế việc đó.
