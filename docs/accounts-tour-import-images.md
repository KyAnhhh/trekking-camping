# Tài khoản, import tour và ảnh

## Những gì đã bổ sung

- Logout có nút chữ ở menu client và admin. API tăng `users.auth_version`, khiến mọi JWT cũ của tài khoản hết hiệu lực. Khi server không liên lạc được, UI báo lỗi và cho thử lại; không thông báo đăng xuất server thành công giả.
- Quên mật khẩu gửi liên kết SMTP. Mã ngẫu nhiên 32 byte, chỉ lưu SHA-256 trong DB, có hiệu lực 15 phút. Đặt lại thành công sẽ vô hiệu hóa mọi liên kết cũ và mọi JWT cũ.
- Câu trả lời yêu cầu quên mật khẩu giống nhau cho tài khoản không có, bị khóa hoặc đã gửi gần đây. Giới hạn mỗi tài khoản 1 thư/phút, tối đa 5 yêu cầu tạo mã/giờ. Lỗi SMTP chỉ ghi loại lỗi vào log; không ghi email, mật khẩu hoặc liên kết.
- Import JSON tạo dữ liệu nghiệp vụ thật trong các bảng tour, lịch trình, lịch khởi hành, trang bị. Không phải upload tài liệu vào kho AI và chưa tự đồng bộ vector.
- Upload JPEG/PNG vào `tour_images` và filesystem, chọn ảnh bìa, xóa có xác nhận. Public tour API trả thêm `bannerUrl`, client hiển thị ảnh bìa và thư viện ảnh.

## Cấu hình email

Chỉ đặt giá trị riêng trong `backend/.env` hoặc môi trường chạy, không đặt credential mặc định trong file Java:

| Biến | Ý nghĩa |
| --- | --- |
| MAIL_HOST | SMTP host; Gmail dùng `smtp.gmail.com` |
| MAIL_PORT | Cổng STARTTLS, mặc định 587 |
| MAIL_USERNAME | Địa chỉ email dùng xác thực SMTP |
| MAIL_PASSWORD | App Password của Gmail hoặc thông tin SMTP tương ứng |
| MAIL_FROM | Địa chỉ gửi thư đã được nhà cung cấp cho phép; với Gmail cấu hình hiện tại dùng cùng username |
| APP_FRONTEND_URL | Gốc URL frontend, mặc định `http://localhost:5173`; dùng HTTPS khi triển khai |

Code bật xác thực, bắt buộc STARTTLS, kiểm tra chứng chỉ server, đặt timeout 5 giây cho kết nối/đọc/ghi.
Cấu hình hiện tại dành cho SMTP STARTTLS (ví dụ cổng 587), không dành cho implicit TLS cổng 465.
Tham khảo [cấu hình Gmail chính thức](https://support.google.com/mail/answer/7104828?hl=en).

Ngày kiểm tra 2026-09-30: các giá trị người dùng đã điền có cấu trúc phù hợp Gmail/STARTTLS;
đã chuyển nguyên giá trị khỏi Java sang `backend/.env`, file này được Git ignore.
**Chưa xác thực SMTP bằng credential thật hoặc gửi email thật.** Kiểm thử mailer dùng sender giả lập.
Khởi động lại backend sau khi đổi cấu hình. Nếu IDE có biến môi trường cùng tên, biến của IDE được ưu tiên hơn `.env`.
Token của liên kết nằm sau dấu `#`, frontend đọc rồi xóa khỏi thanh địa chỉ và gửi bằng POST body.

## Database

Thay đổi cần có:

- `users.auth_version BIGINT NOT NULL DEFAULT 0`.
- Bảng `password_reset_tokens` với user, token_hash, created_at, expires_at, used.
- Ảnh dùng bảng `tour_images` đã có. `bannerUrl` chỉ là trường trả về, không thêm cột vào bảng tours.

File [sql/account-recovery.sql](sql/account-recovery.sql) được cung cấp để review/chạy thủ công nếu cần.
**Chưa chạy SQL/migration hoặc khởi động backend trên DB thật trong đợt này.**
`application.yaml` hiện dùng `ddl-auto: update`: lần khởi động backend tiếp theo Hibernate có thể tự bổ sung schema.
Trong môi trường quản lý schema bằng migration, áp dụng SQL đã review rồi dùng chế độ validate tương ứng.

## Cách dùng giao diện

1. **Logout:** nút Đăng xuất trên menu. Logout vô hiệu hóa tất cả phiên của tài khoản, không chỉ tab hiện tại. Chat trong bộ nhớ cũng được xóa, phản hồi chat đang chờ của phiên trước không được đưa vào phiên mới.
2. **Quên mật khẩu:** trang đăng nhập → Quên mật khẩu → nhập email → mở liên kết trong thư → nhập và xác nhận mật khẩu mới → đăng nhập lại.
3. **Import:** Quản trị → Tour & lịch khởi hành → Import tour → Tải file mẫu → sửa dữ liệu → chọn file → xem danh sách chuẩn bị nhập → Xác nhận nhập tour.
4. **Ảnh:** Quản trị → Chi tiết tour → Ảnh chuyến đi → chọn JPEG/PNG → Upload ảnh. Ảnh đầu tiên làm ảnh bìa. Có thể đổi ảnh bìa và xóa ảnh.

Import giới hạn JSON 1 MB, 1–50 tour. Cấu trúc mỗi mục gồm `tour`, `itineraries`, `schedules`, `gears`.
Các danh sách con có thể bỏ qua. Mẫu tải trên UI sinh ngày khởi hành tương lai.
Các slug phải mới và không trùng; không ghi đè tour/booking hiện có. Backend kiểm tra toàn bộ trước khi ghi,
và dùng transaction để rollback cả file nếu một mục không lưu được. Sai định dạng, trường lạ như id/status,
ngày sai, số chỗ vượt sức chứa đều bị từ chối. Chưa hỗ trợ Excel/CSV.

Ảnh tối đa 5 MB, 16 megapixel, 20 ảnh/tour. Server nhận diện và giải mã nội dung, chuyển lại JPEG để loại metadata,
lưu tên UUID, không dùng tên file do client cung cấp làm đường dẫn. File bị xóa nếu DB transaction rollback.
Khi xóa ảnh bìa, ảnh còn lại được chọn thay thế. Ảnh đã upload là tài nguyên công khai của tour.

`TOUR_UPLOAD_DIR` tùy chọn chỉ thư mục lưu ảnh; mặc định `uploads/tours` tương đối với working directory của backend.
Khi đổi cách khởi động hoặc triển khai, dùng đường dẫn ổn định/persistent volume và sao lưu cùng database.
Chưa tích hợp S3/Cloudinary hoặc lưu ảnh trên nhiều instance.

## API

| Method | URL | Quyền |
| --- | --- | --- |
| POST | /api/auth/logout | Đăng nhập |
| POST | /api/auth/forgot-password | Public; body email |
| POST | /api/auth/reset-password | Public; body token, password; phải có token hợp lệ |
| POST | /api/admin/tours/import | Admin; multipart file |
| GET | /api/tours/{tourId}/images | Public, tour hoạt động |
| POST | /api/tours/{tourId}/images | Admin; multipart file |
| POST | /api/tours/{tourId}/images/{imageId}/cover | Admin |
| DELETE | /api/tours/{tourId}/images/{imageId} | Admin |
| GET | /api/media/tours/{uuid}.jpg | Public, file ảnh JPEG |

API nghiệp vụ dùng ApiResponse. Endpoint ảnh trả binary JPEG.

## Kiểm thử và giới hạn kiểm chứng

```powershell
# Từ backend; test mock, không dùng DB/Gmail thật
mvn "-Dtest=AccountRecoveryTest,PasswordResetMailerTest,TourImportTest,TourImageTest,AuthContractTest,ApiAuthorizationMatrixTest,SecurityRegressionTest" test

# Từ frontend
node --test tests/api-contracts.test.mjs
node node_modules/vite/bin/vite.js build
```

Unit test bao gồm mã hết hạn/đã dùng, không lộ mã trong DB, thu hồi phiên, giới hạn gửi thư, batch import lỗi không ghi,
ảnh giả, traversal, cleanup khi rollback và chọn lại ảnh bìa. Chưa kiểm chứng transaction/concurrency trên PostgreSQL thật.
`frontend/tests/ui-smoke.mjs` chạy với Chrome CDP localhost:9222 và frontend localhost:5174, chặn toàn bộ API bằng fixture.

Kết quả đợt kiểm tra: 212 test backend, 7 test hợp đồng frontend và 51 kiểm tra trình duyệt đều đạt;
build Vite thành công, không có lỗi JavaScript trong các kịch bản UI. Không gửi email hoặc gọi gateway thật.
