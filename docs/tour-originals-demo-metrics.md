# Bổ sung radar cho tour ID 1–8 — 22/10/2026

Theo yêu cầu tiếp theo của người dùng, đã điền các chỉ số còn thiếu bằng số mô phỏng và gắn nhãn `[MÔ PHỎNG]` trực tiếp trên các tour ID 1–8. Đây là cập nhật sau đợt tạo bản sao ID 9–16; các báo cáo trước mô tả trạng thái lịch sử.

| ID | Quãng đường km | Độ cao m | Tổng leo m | Vận động giờ/ngày | Tiếp cận y tế giờ |
|---|---:|---:|---:|---:|---:|
| 1 | 30 | 1200 | 900 | 6 | 3 |
| 2 | 4 | 200 | 150 | 3 | 1 |
| 3 | 12 | 400 | 450 | 4.5 | 2 |
| 4 | 22 | 600 | 1100 | 7 | 4 |
| 5 | 8 | 1400 | 600 | 5 | 1.5 |
| 6 | 27 | 2287 | 1400 | 7 | 4 |
| 7 | 14 | 2860 | 1000 | 6 | 3 |
| 8 | 9 | 1064 | 500 | 4 | 2 |

ID 1–5: cả 5 chỉ số tổng hợp. ID 6–8: quãng đường và độ cao giữ nguyên dữ liệu tham khảo; chỉ 3 chỉ số còn lại tổng hợp. Không dùng các số này như dữ liệu thực địa hoặc thời gian cứu hộ. Tên, summary, description, sourceNote và medicalAccessNotes đều ghi rõ mô phỏng; ngày xác minh chỉ là ngày kiểm tra demo.

- Script: `docs/sql/tour-originals-demo-metrics-20261022.sql`, chạy một lần có transaction, timeout và khóa ngắn.
- Dry run thành công rồi rollback; khi apply kiểm tra lại không có booking chặn theo quy tắc backend, đúng ID/slug và trường dự kiến vẫn trống.
- Before/after JSON: `%LOCALAPPDATA%/TrekkingCamping/backups/tour-original-demo-metrics-20261022/`. Giữ ngoài Git và thư mục build.
- Kết nối độc lập sau commit xác nhận ID 1–16 đều đủ 5 chỉ số. So sánh before/after xác nhận chỉ các trường radar/nhãn/ghi chú/ngày cập nhật thay đổi.
- Không đổi giá, slug, sức chứa, lịch, booking hoặc bản sao ID 9–16. Lịch cũ của ID 1–8 được giữ nguyên; chỉ phục vụ đồ án/sandbox, không có xác nhận mở bán thật.
- Không sửa ứng dụng, chưa kiểm tra UI runtime hoặc đồng bộ vector store. Backend đọc DB hiện có khi chạy; không cần chạy script lại. Nạp lại trang chi tiết; nếu dùng chatbot thì đồng bộ tri thức và giữ nhãn mô phỏng.

Khôi phục cần đối chiếu after-image và booking hiện tại trước khi phục hồi các trường bị đổi từ before-image; không ghi đè thay đổi mới.
