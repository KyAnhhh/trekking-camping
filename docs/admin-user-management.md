# Quản lý người dùng

Trang `/admin/users` có các thao tác:

- **Sửa** họ tên và số điện thoại, giữ nguyên email đăng nhập và vai trò.
- **Khóa / Mở khóa** tài khoản khách hàng hoặc hướng dẫn viên. Mỗi lần thay đổi trạng thái tăng `authVersion`: JWT cũ không dùng lại được, kể cả sau khi mở khóa.
- **Xóa** vĩnh viễn tài khoản chưa có dữ liệu liên quan, sau khi xác nhận trong hộp thoại. Tài khoản có booking, hồ sơ hướng dẫn viên, đánh giá, lịch trình đã lưu, lịch sử/phiên chat, draft booking, nhật ký tham gia, thông báo hoặc token đặt lại mật khẩu bị chặn xóa với HTTP 409; dùng Khóa để giữ lịch sử.

Tài khoản đang đăng nhập và tài khoản quản trị không được khóa/xóa qua các API này. Không hỗ trợ đổi role hoặc email tại màn hình này. Liên kết vai trò hướng dẫn viên qua **Hướng dẫn viên → Tài khoản đăng nhập**; thông tin liên hệ của hồ sơ hướng dẫn viên và liên hệ trong booking được quản lý riêng.

## API (chỉ ADMIN)

| Method | Endpoint | Payload |
|---|---|---|
| GET | `/api/users` | Không có; mỗi dòng bổ sung `active`, `updatedAt` |
| PUT | `/api/users/{id}` | `{fullName, phone, updatedAt}` |
| PUT | `/api/users/{id}/active` | `{active, updatedAt}` |
| DELETE | `/api/users/{id}?updatedAt=...` | Không có body |

Gửi lại nguyên giá trị `updatedAt` từ danh sách, không chuyển múi giờ hoặc làm tròn bằng JavaScript Date. Backend khóa hàng user và đối chiếu phiên bản để trả 409 nếu dữ liệu đã thay đổi. Giao diện yêu cầu đóng hộp thoại và tải lại khi gặp 409/404. Phản hồi giữ chuẩn `ApiResponse`; không trả mật khẩu hoặc `authVersion`.

Không có migration mới cho chức năng này: sử dụng các cột `is_active`, `auth_version`, `updated_at` hiện có. Các bảng tính năng trước đó phải đã được tạo theo SQL tương ứng, bao gồm `notifications-guide-workspace.sql`. Không tự động chạy SQL hoặc sửa tài khoản trên database thật khi phát triển.

## Kiểm tra

- `AdminUserServiceTest`: chỉnh sửa, validation, thu hồi phiên, bảo vệ admin/self, dữ liệu liên quan, stale writes và lỗi khóa ngoại.
- `UserDependenciesTest`: biên dịch HQL với mapping Hibernate thật, kiểm tra từng loại tham chiếu; không cần database.
- `ApiAuthorizationMatrixTest`: GET/PUT/DELETE người dùng được bảo vệ cho anonymous, USER, GUIDE và ADMIN.
- `frontend/tests/api-contracts.test.mjs`: method, URL, JWT và phiên bản của các thao tác.
- `frontend/tests/ui-smoke.mjs`: modal sửa/khóa/mở khóa/xóa, lỗi 409 và responsive với API fixture; không gọi database thật.

Khởi động lại backend và tải lại frontend để thấy chức năng. Với dữ liệu thực, nên thử trên tài khoản kiểm thử không có lịch sử trước; chức năng xóa không có cơ chế khôi phục.

Sau khi bổ sung lời mời hướng dẫn viên, cần áp dụng thêm `guide-invitations-passengers.sql`. Kiểm tra dữ liệu liên quan khi xóa tài khoản bao gồm cả người đã gửi lời mời; admin vẫn được bảo vệ khỏi xóa như trước.
