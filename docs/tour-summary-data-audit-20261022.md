# Rà soát dữ liệu Tour Summary — 22/10/2026

## Kết quả DB thật

Đã đọc trực tiếp PostgreSQL qua cấu hình hiện có, không in credential. Backend HTTP localhost:8080 chưa chạy lúc kiểm tra. Không sửa `.env`, không khởi động ứng dụng hoặc gọi AI.

| ID | Tour | Kết quả |
|---|---|---|
| 1 | Tà Năng – Phan Dũng 3N2Đ | Giữ nguyên: mô tả quá ngắn, chưa xác định nhà tổ chức/tuyến; không lấy số liệu 2N1Đ thay thế |
| 2 | Trạ Ang | Bổ sung điểm tập kết, ghi chú đón khách, nguồn, ngày đối chiếu |
| 3 | Ma Đa | Bổ sung điểm tập kết, ghi chú đón khoảng 08:00, nguồn, ngày đối chiếu |
| 4 | Hang Hổ | Bổ sung điểm tập kết, ghi chú đón khoảng 08:00, nguồn, ngày đối chiếu |
| 5 | Bạch Mã mạo hiểm | Bổ sung điểm tập kết, ghi chú đón 07:30–08:00 tại trung tâm Huế, nguồn, ngày đối chiếu |
| 6–7 | Bidoup, Lảo Thẩn | Giữ nguyên, có 2/5 chỉ số radar |
| 8 | K50 | Chủ website xác nhận 3332 m / 3.5 giờ vận động / 2.5 giờ tiếp cận y tế là kiểm thử. Đưa 3 trường về NULL, bổ sung ghi chú lý do. Giữ nguyên ngày xác minh nguồn cũ |

Sau cập nhật: tour 1–5 có 0/5 chỉ số radar; tour 6–8 có 2/5. Chưa tour nào đủ dữ liệu radar đã xác minh. Không thay đổi component để lấp chỗ thiếu bằng 0.

## Nguồn nhà tổ chức

- https://junglebosstours.com/vi/tour/kham-pha-tra-ang-1n
- https://junglebosstours.com/vi/tour/cam-trai-thung-lung-ma-da-2n1d
- https://junglebosstours.com/vi/tour/kham-pha-he-thong-hang-ho-3n2d
- https://junglebosstours.com/vi/tour/kham-pha-bach-ma-1-ngay

Các số 600 m bơi hang, gần 7 km hệ thống hang, 130 m cầu treo hoặc 85 m zipline không được ánh xạ thành tổng quãng đường trekking. Giờ đón/giờ kết thúc cũng không phải số giờ vận động. Trang nguồn chưa cho đủ 5 chỉ số cùng định nghĩa. Đã lưu ghi chú tham khảo đồ án, không thay lịch đón cụ thể trong tour_schedules.

## Cách thực hiện và bằng chứng

- Script: `docs/sql/tour-summary-source-repair-20261022.sql`; script dữ liệu một lần, không phải migration tự chạy.
- Dry run thực thi đủ kiểm tra và cập nhật trong transaction rồi rollback thành công.
- Apply: khóa tours/tour_schedules/bookings trong transaction ngắn, lock timeout 5 giây, statement timeout 20 giây; kiểm tra lại booking đúng quy tắc backend. Không có booking chặn tại thời điểm apply.
- Kiểm tra đúng ID/slug/giá trị cũ; kỳ vọng 4 profile bổ sung và 1 K50 sửa. Sai bất kỳ điều kiện nào thì rollback toàn bộ.
- Lưu before/after image trước commit; đọc lại bằng kết nối độc lập sau commit xác nhận 5 hàng thay đổi đúng mục tiêu.
- Không thay giá, sức chứa, lịch, booking, thanh toán hoặc yêu cầu sức khỏe.
- Bản sao lâu dài ngoài Git: `%LOCALAPPDATA%/TrekkingCamping/backups/tour-summary-20261022/{before,after}.json`. Bản phụ trong backend/target có thể mất khi clean.
- Khôi phục cần đối chiếu after-image với bản ghi hiện tại trước, chỉ phục hồi trường thuộc script; không ghi đè thay đổi mới hoặc booking phát sinh.

## Phần chưa hoàn thành

- Chưa có thông số thực địa/nguồn đủ cho toàn bộ radar; cần tuyến chính xác, tổng trekking, độ cao tối đa, leo tích lũy, giờ vận động/ngày và phương án tiếp cận y tế có điều kiện áp dụng.
- Chưa kiểm tra UI qua backend đang chạy. Chưa đồng bộ lại vector store. Khi backend chạy, dùng Admin → Kho tri thức → Đồng bộ tour cho AI. Fingerprint hiện có bao gồm profile nên bản chụp tour cũ không được coi là nguồn hiện hành.
- Không coi ngày đối chiếu trang web là ngày xác minh thực địa. Không dùng dữ liệu mô phỏng để tư vấn chuyến đi thật.
