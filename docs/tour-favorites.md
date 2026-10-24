# Tour yêu thích: triển khai và kiểm thử

## Cập nhật sửa lỗi 500

Đã xác minh database đang cấu hình thiếu `tour_favorites` (SQLSTATE42P01). Đã áp dụng `docs/sql/tour-favorites.sql` trực tiếp bằng JDBC, commit bảng/index thành công; không sửa dữ liệu tour/user/booking hay `.env`. Không cần chạy lại migration trên database này.

Kiểm chứng PostgreSQL thật: truy vấn IDs/count/cards với danh sách rỗng đạt; insert lần đầu, insert lặp không trùng, xóa sai owner không ảnh hưởng, xóa đúng owner và xóa lặp đạt. Thao tác dữ liệu thử nằm trong transaction rollback, không lưu favorite thử. Đây là kiểm chứng SQL trực tiếp, chưa phải UI→HTTP→DB bằng tài khoản thật hoặc kiểm thử concurrency.

Sau sửa: F5 trang, vào `/favorites` thấy trạng thái chưa lưu tour; lưu một tour rồi reload kiểm tra. Nút tim trước đó bị disable vì API IDs lỗi; F5 sẽ tải lại trạng thái từ bảng đã tồn tại. `Unchecked runtime.lastError` thường đến từ extension trình duyệt; riêng dòng đó không đủ xác định extension nào và không phải bằng chứng lỗi SQL. Nếu còn xuất hiện, thử cửa sổ không bật extension.

Các ghi chú chưa chạy migration bên dưới mô tả kết quả ở lượt triển khai ban đầu, đã được cập nhật bởi mục này.

## Chuẩn bị

Trong pgAdmin/công cụ SQL, chọn đúng database dự án, sao lưu rồi chạy toàn bộ `docs/sql/tour-favorites.sql`. Script chỉ thêm bảng/index, không sửa tour/user/booking hiện có. **Lượt này chưa chạy migration trên DB thật.** Backend không tự tạo bảng này vì dùng JdbcTemplate, không có entity tương ứng.

Bảng có PK `(user_id,tour_id)`, FK và thời điểm lưu. Tour ngừng công khai được ẩn khỏi danh sách, favorite vẫn giữ để hiện lại khi mở tour. Xóa user/tour vật lý sẽ xóa favorite tương ứng.

## Khởi động

Từ thư mục gốc, terminal 1:

```powershell
cd backend
mvn spring-boot:run "-Dspring-boot.run.arguments=--spring.jpa.hibernate.ddl-auto=validate --NOTIFICATION_EMAIL_ENABLED=false"
```

Terminal 2:

```powershell
cd frontend
npm run dev
```

Mở http://localhost:5173/tours. Nếu có ứng dụng đang chạy, dùng lại hoặc dừng đúng tiến trình trước khi chạy mới. Ctrl+C tại từng terminal để dừng. Không cần gọi AI/đổi `.env`.

## Kiểm thử thủ công

1. Khách chưa đăng nhập bấm **Yêu thích** → đến login. Đăng nhập xong quay lại trang cũ; bấm lưu lại.
2. Tài khoản A lưu hai tour → tim chuyển **Đã yêu thích** sau khi API thành công.
3. Menu tài khoản → **Tour yêu thích**, hoặc `/favorites`: thấy hai tour; reload vẫn còn. Mở chi tiết tour kiểm tra tim đồng bộ.
4. Bỏ lưu một tour → biến mất khỏi danh sách. Bỏ hết → trạng thái trống. Bấm nhanh không tạo bản ghi trùng.
5. Đăng xuất, vào B → không thấy danh sách của A. Quay lại A → vẫn giữ dữ liệu đã lưu.
6. DevTools Network → Offline khi lưu → báo lỗi, không chuyển tim thành lưu thành công. Online rồi thử lại.
7. Mobile 390px không tràn ngang; Tab/Enter sử dụng được nút tim.
8. Với dữ liệu kiểm thử, ẩn tour đã lưu → reload không thấy; mở lại → hiện lại. Không thay tour đang có booking thật chỉ để test.
9. Request không token đến favorite GET/PUT/DELETE → 401. Thêm `?userId=<id-khác>` không đổi chủ sở hữu: backend chỉ dùng JWT.

Kiểm tra DB mà không xuất dữ liệu cá nhân:

```sql
SELECT user_id, tour_id, created_at FROM tour_favorites ORDER BY created_at DESC;
```

## API và bằng chứng

- GET `/api/me/favorite-tours?page=0&size=12`: `ApiResponse.data = {items,page,size,totalElements}`, size1–48.
- GET `/api/me/favorite-tours/ids`: ID tour công khai đã lưu.
- PUT `/api/me/favorite-tours/{id}` không body: lưu idempotent; tour ẩn/không tồn tại trả404.
- DELETE cùng đường dẫn: bỏ lưu idempotent kể cả khi tour đã ẩn.
- Tất cả yêu cầu đăng nhập, không nhận owner từ frontend.

22/10/2026:8 service tests đạt (mock repository/JdbcTemplate);434 security/controller tests đạt (gồm một ca mới favorite, không phải434 ca mới); Vite production build đạt;7 Chrome checks đạt bằng API stub (guest, lưu lỗi/thành công, reload, mobile, xóa, hết phiên). Không có runtime exception. **Chưa kiểm chứng migration/concurrency/lưu dữ liệu trên PostgreSQL thật.** Mock không chứng minh điều đó.

```powershell
cd backend
mvn -o "-Dmaven.repo.local=C:/Users/thong/.m2/repository" "-Dtest=FavoriteServiceTest,ApiAuthorizationMatrixTest" test
```

Browser script: `frontend/tests/favorites-ui.mjs`, cần Vite và Chrome kiểm thử riêng mở remote debugging9224; chạy `node tests/favorites-ui.mjs` từ frontend. Mặc định Vite5173, có thể đặt UI_BASE_URL. API được giả lập hoàn toàn. Tiến trình Chrome/Vite kiểm thử lượt này được dừng sau khi xong.

Chỉ Tour yêu thích được triển khai lượt này; so sánh tour và lịch khởi hành còn ở kế hoạch.
