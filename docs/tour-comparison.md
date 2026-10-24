# So sánh tour

Đã thêm lựa chọn 2–3 tour từ thẻ tour (trang chủ, danh sách, yêu thích) và trang chi tiết. Khách chưa đăng nhập cũng dùng được. Trang `/compare` tải dữ liệu từ API public hiện có, không thêm API/backend/table/migration.

Lưu slug và tên trong `sessionStorage` của tab, tối đa3 tour; reload giữ lựa chọn. Dữ liệu giá, chỉ số và lịch được đọc lại từ backend khi mở trang so sánh hoặc bấm **Tải lại dữ liệu**. Lựa chọn không thuộc tài khoản, không lưu server; bấm **Bỏ tất cả** để xóa.

## Cách chạy và kiểm thử

Backend đang chạy ở8080 thì dùng lại; nếu chưa chạy, từ thư mục gốc:

```powershell
cd backend
mvn spring-boot:run "-Dspring-boot.run.arguments=--spring.jpa.hibernate.ddl-auto=validate --NOTIFICATION_EMAIL_ENABLED=false"
```

Terminal khác:

```powershell
cd frontend
npm run dev
```

1. Mở http://localhost:5173/tours khi chưa đăng nhập. Bấm **So sánh** một tour: thanh dưới hiện1/3 và yêu cầu chọn thêm.
2. Chọn tour thứ2 → có **So sánh ngay**; chọn thứ3 → nút tour thứ4 bị khóa, ghi **Đã đủ 3 tour**. Bỏ một tour bằng dấu X để thay tour khác.
3. Bấm **So sánh ngay** → `/compare`: kiểm tra giá, thời lượng, địa điểm, độ khó,5 chỉ số, yêu cầu tham gia, trang bị, nguồn và lịch.
4. Tour thiếu trường → **Chưa cập nhật**, không thay bằng0. Tour có nhãn mô phỏng trong tên/tóm tắt/nguồn → nhãn cảnh báo trong đầu cột. Đây là nhận diện từ metadata hiện tại, không phải hệ thống xác minh nguồn độc lập.
5. Lịch chỉ có link đặt khi OPEN, còn chỗ và ngày khởi hành sau hôm nay theo giờ Việt Nam, dùng cùng `isBookable` với trang chi tiết. Không có lịch → thông báo rõ; API lịch lỗi → thông báo lỗi riêng, không coi là hết lịch.
6. F5 → giữ2–3 lựa chọn và tải lại dữ liệu hiện tại. Bấm **Bỏ tất cả** → trạng thái cần chọn tour, không còn bảng.
7. Đăng nhập, mở `/favorites`: nút so sánh dùng chung thanh lựa chọn. Không thay đổi trạng thái yêu thích khi chọn so sánh.
8. DevTools Network chặn request chi tiết một tour → cột đó báo lỗi, cột còn lại vẫn đọc được. Bỏ chặn và bấm **Tải lại dữ liệu** → phục hồi.
9. Mobile390px → chỉ bảng được cuộn ngang, toàn trang không tràn ngang. Tab đến vùng bảng và các nút; Enter kích hoạt nút. Thanh so sánh chừa bên phải cho nút chatbot.
10. Mở checkout/login/thanh toán/admin → không có thanh so sánh che giao diện; quay lại danh sách vẫn giữ lựa chọn.

Link đặt chuyển vào booking hiện có. Backend vẫn kiểm tra giá/chỗ/quyền khi đặt; so sánh không giữ chỗ hoặc xác nhận sức khỏe phù hợp. Không thanh toán thật chỉ để thử giao diện.

## Bằng chứng

- Vite production build đạt.
- `frontend/tests/compare-ui.mjs`:11 kiểm tra Chrome dùng API stub đạt,0 runtime exceptions. Gồm giới hạn chọn, guest, nhãn mô phỏng, dữ liệu thiếu, lọc lịch, reload, mobile, lỗi từng cột/retry, xóa và kết nối trang yêu thích.
- Chưa kiểm chứng end-to-end với tài khoản/booking/DB thật trong lượt này. Không gọi AI và không sửa DB.
- Browser script yêu cầu Chrome kiểm thử riêng có debugging9224 và Vite; chạy từ frontend: `$env:UI_BASE_URL='http://127.0.0.1:5177'; node tests/compare-ui.mjs` nếu Vite chạy5177.

Các tệp chính: `CompareContext.jsx`, `CompareButton.jsx`, `CompareTray.jsx`, `TourCompare.jsx`, `compare.css`; tích hợp App, ClientLayout, routes, TourCard, TourDetail. `tourService.js` nhận thêm AbortSignal tùy chọn cho detail/schedules và encode slug.
