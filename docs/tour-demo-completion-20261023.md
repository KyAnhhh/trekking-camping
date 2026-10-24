# Hoàn thiện nội dung 16 tour — 23/10/2026

## Điều chỉnh ảnh theo yêu cầu chủ website

Đã gỡ 16 bản ghi `/images/tours/demo-overview.svg` của tour 1–16 khỏi DB thật. Kiểm tra trong transaction xác nhận toàn bộ bản ghi tours (bao gồm ảnh bìa) và các ảnh khác giữ nguyên; sau commit còn 0 ảnh demo trong phạm vi này. Bản sao các dòng đã gỡ: `backend/target/tour-completion/image-backup-1792747093682.json` (không đưa vào Git). Script bổ sung dữ liệu cũng đã bỏ bước chèn ảnh demo. Trang chi tiết tiếp tục dùng ảnh bìa; thư viện sẽ có ảnh khi chủ website upload. Các số liệu ảnh bên dưới là bằng chứng lịch sử trước điều chỉnh này.

Người dùng duyệt bổ sung dữ liệu mô phỏng có nhãn rõ, không coi là lịch mở bán thật. Đã cập nhật **DB thật đang cấu hình**, không phải chỉ tạo file import.

## Kết quả

- ID1–16: bổ sung yêu cầu tham gia/checklist có marker `[DEMO-20261023]`; giữ nội dung cũ rồi thêm phần mô phỏng. Không đặt tiêu chuẩn chẩn đoán hoặc xác nhận đủ sức khỏe.
- Điền tháng, tỷ lệ hỗ trợ, điểm tập kết/ghi chú đón còn trống bằng giá trị demo; nguồn ghi rõ các trường đó chưa xác minh thực địa.
- ID1 và9: thêm ngày2–3 còn thiếu, tổng4 bản ghi lịch trình. Không sửa lịch trình cũ.
- Thêm20 lịch: tour1,9–16 thêm2; tour2–3 thêm1. ID4–8 đã có2 lịch phù hợp nên không thêm. Lịch mới ngày07/11 và21/11/2026 tùy tour, số chỗ thử nghiệm không vượt sức chứa, ngày về đúng thời lượng. Thông tin điểm đón ghi rõ mô phỏng, không đến địa điểm này để tham gia thật.
- Thêm16 bản ghi ảnh trỏ tới `/images/tours/demo-overview.svg`: hình minh họa đồ họa có nhãn, không phải ảnh địa điểm thật. Asset nằm trong `frontend/public/images/tours/` và được Vite phục vụ/đưa vào build.
- Không sửa giá, slug, thời lượng, sức chứa, trạng thái active, lịch cũ, booking hoặc tài khoản. Không tự gán hướng dẫn viên thật, không tạo số điện thoại liên hệ hay hồ sơ người giả.

## Bằng chứng DB

Kiểm kê trước:16 tour;5 tour thiếu yêu cầu;2 tour thiếu ngày;9 tour không có lịch tương lai mở;16 tour thiếu ảnh. Không có booking chưa kết thúc chặn thay đổi.

Chạy SQL trong transaction có timeout và khóa bảng ngắn; kiểm tra lại booking trước sửa. Dry-run đạt rồi rollback. Lần apply kiểm tra lại và commit. Kết nối đọc độc lập sau commit xác nhận:

-16/16 tour không còn thiếu các cột nội dung được kiểm kê (không coi hotline là trường phải bịa để điền).
-16/16 có lịch trình đủ ngày và2 lịch OPEN tương lai còn chỗ tại thời điểm23/10/2026.
-16/16 có ảnh minh họa.
- So sánh snapshot: toàn bộ bản ghi lịch/lịch trình/ảnh cũ nguyên vẹn; chỉ thêm20/4/16 tương ứng.
- Kiểm tra chuỗi tiếng Việt UTF-8 của yêu cầu mô phỏng đạt.

Script đã thực thi: `docs/sql/tour-demo-completion-20261023.sql`. Script yêu cầu transaction ngoài, không tự chạy khi backend start. Không cần chạy lại.

Backup UTF-8 ngoài Git:
`%LOCALAPPDATA%/TrekkingCamping/backups/tour-completion-20261023/1792725394743/before.json` và `after.json`.
Dry-run có backup thư mục `1792725351302`. Snapshot không bao gồm dữ liệu user/booking và đã loại guide_phone khỏi schedules. Dry-run có thể để khoảng trống sequence ID (bình thường với PostgreSQL).

Khôi phục phải đối chiếu snapshot và trạng thái hiện tại: không xóa lịch đã phát sinh booking hoặc ghi đè các cập nhật mới. Không phục hồi mù toàn bảng.

## Kiểm tra trên website

1. F5 `/tours`, mở từng tour; ảnh phải hiện nhãn mô phỏng. Backend không cần restart để đọc dữ liệu DB mới.
2. Xem **Tổng quan hành trình → Yêu cầu tham gia & hỗ trợ**, trang bị và lịch trình. Tà Năng (ID1,9) có đủ3 ngày.
3. Xem lịch khởi hành: mỗi tour có ít nhất2 lịch phù hợp tại thời điểm cập nhật. Lịch mới có thông tin đón gắn `[DEMO-20261023]`.
4. Chọn2–3 tour → `/compare`: yêu cầu, trang bị và lịch đã có dữ liệu. Bấm tải lại nếu trang đang mở từ trước cập nhật.
5. Nếu kiểm thử đặt tour, chỉ dùng luồng đồ án/sandbox. Không hiểu trạng thái OPEN là xác nhận nhà tổ chức mở bán thực tế.

Chưa nghiệm thu booking/UI thật sau lần dữ liệu này. Không gọi AI hoặc gửi email. Chatbot dùng snapshot tri thức có fingerprint: dữ liệu cũ có thể bị bỏ qua; dùng chức năng đồng bộ kho tour trong quản trị để cập nhật trước khi nghiệm thu RAG. Chưa chạy đồng bộ vector store trong lượt này.

Ảnh thực tế, hướng dẫn viên được phân công, lịch mở bán và xác nhận điều kiện tham gia từ nhà tổ chức vẫn cần bổ sung nếu chuyển sang vận hành thật. Không đánh dấu các phần đó là đã được xác minh.
