# Tour mô phỏng đủ radar — 22/10/2026

Người dùng duyệt tạo bản sao mô phỏng riêng trong DB hiện tại, không thêm số giả vào tour gốc.

Đã tạo 8 tour ID 9–16 tương ứng tour gốc 1–8. Tên bắt đầu `[MÔ PHỎNG]`, slug bắt đầu `mo-phong-radar-`. Các bản sao active để xem ở danh sách/chi tiết. Không tạo lịch khởi hành, không sao chép booking, phân công guide hoặc ảnh dùng chung.

| ID demo | Tour tham khảo | Km giả lập | Độ cao giả lập (m) | Tổng leo giả lập (m) | Giờ vận động giả lập/ngày | Giờ tiếp cận y tế giả lập |
|---|---|---:|---:|---:|---:|---:|
| 9 | Tà Năng 3N2Đ | 30 | 1200 | 900 | 6 | 3 |
| 10 | Trạ Ang | 4 | 200 | 150 | 3 | 1 |
| 11 | Ma Đa | 12 | 400 | 450 | 4.5 | 2 |
| 12 | Hang Hổ | 22 | 600 | 1100 | 7 | 4 |
| 13 | Bạch Mã | 8 | 1400 | 600 | 5 | 1.5 |
| 14 | Bidoup | 24 | 2200 | 1400 | 7 | 4 |
| 15 | Lảo Thẩn | 16 | 2800 | 1000 | 6 | 3 |
| 16 | K50 | 10 | 1000 | 500 | 4 | 2 |

**Toàn bộ số liệu trên là tổng hợp để demo phần mềm, không phải thông số thực địa hoặc phương án cứu hộ.** Giá/mức độ khó/sức chứa/lịch trình/trang bị được sao chép chỉ để trình diễn; không phải dịch vụ mở bán. Nhãn và giải thích nằm trong title, summary, description, sourceNote, medicalAccessNotes và participationRequirements. Không có ngày khởi hành nên không đặt được qua flow booking bình thường.

## Kiểm chứng

- Script `docs/sql/tour-radar-demo-copies-20261022.sql` chạy trong transaction có khóa và timeout; không tự chạy khi backend khởi động.
- Kiểm tra đúng ID/slug gốc; chặn nếu slug demo đã có. Bản gốc được so sánh before/after trong transaction và không thay đổi.
- Kết nối DB độc lập xác nhận 8 tour active, đủ 5 chỉ số hữu hạn, mỗi tour 0 lịch khởi hành.
- Backup ngoài Git: `%LOCALAPPDATA%/TrekkingCamping/backups/tour-demo-copies-20261022/original-tours-before.json` và `created-demo-tours.json`.
- Chưa kiểm tra giao diện đang chạy; không gọi AI hoặc đồng bộ vector store. Nếu nạp tour demo vào tri thức, cần giữ nhãn mô phỏng; chúng không phải nguồn tư vấn thực địa.

## Cách xem

Khởi động backend/frontend kết nối cùng database, tìm “MÔ PHỎNG” ở danh sách tour rồi mở chi tiết → Tổng quan hành trình. Ví dụ `/tours/mo-phong-radar-trekking-ta-nang-phan-dung-3n2d`.

Để ẩn demo về sau, ngừng hoạt động các tour ID 9–16 trong admin sau khi kiểm tra đúng slug. Không xóa hoặc sửa các tour gốc ID 1–8.
