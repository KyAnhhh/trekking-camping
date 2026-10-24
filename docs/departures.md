# Lịch khởi hành — 23/10/2026

Trang public `/departures`, liên kết **Lịch khởi hành** trên header. Không cần migration và không thay dữ liệu DB.

## Chức năng

- Danh sách và lịch tháng; mặc định tháng hiện tại theo Asia/Ho_Chi_Minh.
- Lọc khoảng ngày (tối đa93 ngày), địa điểm, độ khó và số người.
- Mặc định chỉ lịch OPEN, sau hôm nay và còn đủ chỗ. Bỏ checkbox để xem cả lịch đóng/hủy/hết chỗ trong khoảng ngày.
- Nhãn mô phỏng dựa vào title/summary/source/pickup hiện có; không coi đây là chứng nhận dữ liệu thực địa.
- Chọn đúng lịch và số người sang booking. Booking vẫn kiểm tra lại trạng thái/chỗ/giá như trước.
- So sánh tour từ thẻ lịch; thanh chọn chỉ hiện ở trang duyệt tour, không phủ checkout.
- Chuyển lịch tháng sẽ đặt khoảng ngày bằng toàn bộ tháng đang chọn, giữ các bộ lọc khác. Chế độ này có bảng cuộn ngang và danh sách chi tiết phía dưới.
- Tối đa500 bản ghi mỗi truy vấn, có thông báo nếu bị giới hạn để người dùng thu hẹp bộ lọc.

## API

`GET /api/tours/departures?from=2026-11-01&to=2026-11-30&people=2&availableOnly=true`

Tham số tùy chọn: `location`, `difficulty` (1–3). `people`1–1000. Khoảng ngày bao gồm hai đầu, tối đa93 ngày.

`ApiResponse.data = {items, truncated, timezone}`. Mỗi item gồm tour công khai, schedule ID, ngày đi/về, chỗ, status, simulated. Không xuất số điện thoại hướng dẫn viên, khách hoặc booking. GET được public bởi security hiện có; không mở endpoint ghi public.

## Chạy và test

Khởi động lại backend để nạp controller mới (không cần chạy SQL):

```powershell
cd backend
mvn spring-boot:run "-Dspring-boot.run.arguments=--spring.jpa.hibernate.ddl-auto=validate --NOTIFICATION_EMAIL_ENABLED=false"
```

Terminal khác:

```powershell
cd frontend
npm run dev
```

1. Mở http://localhost:5173/departures khi chưa đăng nhập.
2. Chọn từ01/11/2026 đến30/11/2026,2 người → **Tìm lịch**. Dữ liệu demo hiện có trong tháng11.
3. Tăng số người vượt số chỗ → lịch không đủ chỗ bị loại khi checkbox bật. Nhập địa điểm không tồn tại → empty state.
4. Bỏ **Chỉ lịch còn đủ chỗ** → các trạng thái hiển thị riêng; lịch hủy/đóng/hết chỗ/đã đến ngày khởi hành không có nút đặt.
5. Chọn **Lịch tháng**, tháng11/2026 → click chuyến trong ô ngày để đến thẻ chi tiết phía dưới.
6. Bấm **Chọn lịch này**: URL mang `schedule` và `people`. Khách được chuyển login rồi quay lại booking; lịch/số người đã chọn được điền. Không cần gửi đơn để kiểm tra bước này.
7. Bấm **So sánh** trên2 tour khác nhau → thanh so sánh hoạt động.
8. Thử mobile390px: form/card không tràn trang, riêng lịch tháng cuộn ngang. Thử bàn phím Tab/Enter.
9. DevTools chặn API hoặc Offline → thông báo lỗi và **Thử lại**; Online và retry phục hồi.
10. Chọn khoảng ngày đảo ngược hoặc dài hơn93 ngày → lỗi validation; không giữ im lặng hoặc tải dữ liệu vô hạn.

## Bằng chứng

- Vite build đạt.
-438 backend tests đạt:435 security/controller regression (có1 ca endpoint mới),3 ca service validation. Các test này dùng mock cho DB.
-9 Chrome checks dùng API stub đạt, không có runtime exception: guest/demo, link schedule/people, trạng thái không được đặt, empty, calendar, mobile, lỗi/retry, compare.
- Actual compiled DepartureService + JdbcTemplate trên PostgreSQL thật, read-only:30 lịch tháng11 đủ2 chỗ, nhãn mô phỏng, location wildcard được escape và trả rỗng với chuỗi không khớp; không ghi DB. Runner ban đầu thiếu runtime classpath (chọn sources JAR); sửa runner rồi kiểm tra đạt, không sửa service để né lỗi.
- Chưa kiểm chứng full-app HTTP/UI với DB thật, không tạo booking hoặc gọi AI trong lượt này.

Chạy test lại từ backend:
`mvn -o "-Dmaven.repo.local=C:/Users/thong/.m2/repository" "-Dtest=DepartureServiceTest,ApiAuthorizationMatrixTest" test`

Browser script `frontend/tests/departures-ui.mjs` cần Chrome test riêng cổng9224 và Vite; có thể đặt UI_BASE_URL. Không dùng API stub làm bằng chứng DB thật.
