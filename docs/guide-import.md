# Import hướng dẫn viên

1. Khởi động lại backend sau khi cập nhật code, mở frontend và đăng nhập ADMIN.
2. Vào **Hướng dẫn viên → Import hướng dẫn viên**.
3. Chọn **Tải file mẫu** để chuẩn bị dữ liệu, hoặc chọn trực tiếp `docs/demo-data/guides.json`.
4. Kiểm tra danh sách xem trước rồi chọn **Xác nhận nhập hướng dẫn viên**.
5. Sau khi thành công, danh sách hồ sơ tự tải lại. Upload ảnh ở từng hồ sơ; vào chi tiết tour → lịch khởi hành để phân công trưởng đoàn/người hỗ trợ.

## Định dạng

File `.json`, UTF-8 (chấp nhận BOM), tối đa 1 MB, chứa mảng từ 1 đến 100 hồ sơ:

```json
[
  {
    "code": "HDV_MAU_01",
    "fullName": "Hướng dẫn viên mẫu",
    "bio": "Thay bằng thông tin hồ sơ đã xác nhận.",
    "experienceSince": null,
    "specialties": "",
    "languages": "Tiếng Việt",
    "phone": "",
    "email": "",
    "active": true
  }
]
```

- `code`: bắt buộc, 2–40 ký tự, chỉ chữ in hoa A–Z, số, `_` và `-`; không trùng trong file hoặc database.
- `fullName`: bắt buộc, tối đa 150 ký tự. `active`: bắt buộc, boolean `true` hoặc `false`.
- `experienceSince`: `null` hoặc số nguyên từ 1960 đến năm hiện tại.
- `bio` tối đa 4.000 ký tự, `specialties` 500, `languages` 200; các trường này có thể để trống.
- `phone`/`email` có thể để trống; nếu có phải đúng định dạng như biểu mẫu tạo hồ sơ. Liên hệ được giữ ở phần quản trị, không thêm vào hồ sơ công khai.
- Không thêm `id`, `avatarUrl` hoặc trường ngoài mẫu. Ảnh upload riêng sau khi tạo hồ sơ.

Import chỉ tạo mới. Dữ liệu sai hoặc mã đã tồn tại làm hủy toàn bộ lần nhập; lỗi kiểm tra hồ sơ chỉ ra vị trí trong mảng (bắt đầu từ 1). Sửa hồ sơ đã có bằng giao diện, không import lại cùng mã. Xem trước chỉ kiểm tra cấu trúc cơ bản; backend kiểm tra toàn bộ dữ liệu và mã đã tồn tại khi xác nhận.

`guide-intake.csv` chưa được hỗ trợ trực tiếp. Chuyển dữ liệu đã thu thập sang JSON theo mẫu. Import hồ sơ không tự gán người vào tour; `guideAssignments` trong file import tour phải sử dụng đúng mã đã tạo.

## API

`POST /api/admin/guides/import`, quyền ADMIN, token đăng nhập như các API quản trị khác. Body `multipart/form-data`, trường `file` chứa file JSON (không gửi mảng JSON trực tiếp vào body).

Response theo `ApiResponse`, `data` có dạng:

```json
{
  "count": 1,
  "guides": [{ "id": 123, "code": "HDV_MAU_01", "fullName": "Hướng dẫn viên mẫu" }]
}
```

Không cần biến môi trường hoặc migration mới. Kiểm thử tự động dùng repository giả lập và kiểm tra quyền API; chưa thực hiện import vào database đang chạy.
