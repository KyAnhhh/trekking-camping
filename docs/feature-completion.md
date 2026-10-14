# Tài khoản, lịch trình AI, đánh giá và quản trị tour

Cập nhật ngày 07/10/2026. Đây là các chức năng bổ sung trên flow booking/VNPAY hiện có, không thay cổng thanh toán hoặc cấu hình credential.

## Sử dụng trên giao diện

1. **Tài khoản:** đăng nhập, bấm tên tài khoản trên thanh điều hướng hoặc mở `/profile`. Có thể cập nhật họ tên, số điện thoại và đổi mật khẩu. Email và quyền không được sửa qua API này. Đổi mật khẩu yêu cầu mật khẩu hiện tại, vô hiệu hóa các JWT cũ và token đặt lại mật khẩu; giao diện đưa về đăng nhập.
2. **Lập lịch trình:** mở `/planner`, nhập điểm đến, ngày đi, số ngày, số người, ngân sách/người và thể lực. Kết quả hợp lệ được lưu vào tài khoản, có thể mở lại hoặc xóa ở cuối trang. Không tự tạo booking hoặc giữ chỗ. Nhu cầu và dữ liệu tour công khai được gửi tới Gemini; không gửi hồ sơ, email hay thông tin booking của người dùng.
3. **Hoàn thành chuyến đi:** admin mở chi tiết booking, chọn “Xác nhận đã hoàn thành”. Backend chỉ cho phép đơn `CONFIRMED`, có tổng giao dịch `SUCCESS` đủ tiền và ngày về đã qua theo múi giờ Việt Nam. Gọi lại không làm thay đổi số chỗ.
4. **Đánh giá:** khách mở booking của mình sau khi admin hoàn tất chuyến đi, chọn 1–5 sao và nhập nhận xét. Mỗi booking một đánh giá. Đánh giá được công khai ngay trên trang tour, gồm họ tên, nội dung và điểm; không trả email/số điện thoại. Chưa có quy trình duyệt/ẩn đánh giá trên giao diện quản trị.
5. **Quản trị tour:** `/admin/tours` liệt kê cả tour đang mở bán và đã ngừng. Trong chi tiết tour có sửa thông tin, ngừng/mở bán lại và sửa lịch khởi hành. Ảnh và phân công hướng dẫn viên hiện có tiếp tục sử dụng được ở trang quản trị.

## Quy tắc dữ liệu

- Tour đã có lịch không được đổi thời lượng hoặc sức chứa; slug được giữ cố định. Đổi giá không sửa số tiền trong booking đã tạo.
- Tour còn booking chưa hủy cho chuyến chưa kết thúc không được ngừng mở bán hoặc đổi độ khó. Quy tắc này giữ tương thích với việc kiểm tra tour đang hoạt động trong flow booking/payment hiện tại.
- Lịch đã có bất kỳ booking nào không được sửa ngày hoặc số chỗ thủ công. Khi còn booking chưa hủy, không đổi trạng thái lịch.
- Muốn đổi ngày lịch chưa có booking, cần gỡ phân công hướng dẫn viên rồi phân công lại để kiểm tra trùng lịch. Lịch đã hủy hoặc đã khởi hành không được chỉnh sửa. Ngày về phải khớp số ngày của tour.
- Lịch trình AI giới hạn 1–7 ngày, 1–50 người, ngân sách nguyên VND từ 50.000 đến 100 triệu/người; ngày đi từ ngày mai đến hai năm tới. Tối đa 50 lịch đã lưu và ít nhất một phút giữa hai lần lưu lịch mới. Có khóa yêu cầu đồng thời trong một tiến trình; chưa có khóa phân tán khi chạy nhiều instance.
- Danh mục gợi ý lấy tối đa 10 lịch `OPEN`, tour hoạt động, khởi hành đúng ngày người dùng chọn, kết thúc trong số ngày yêu cầu, đủ chỗ, phù hợp ngân sách và độ khó. Tìm điểm đến theo tên/địa điểm, chưa có tìm không dấu hoặc suy luận vùng địa lý.
- AI trả JSON, backend kiểm tra cấu trúc, số ngày và ID tour trước khi lưu. Giá, link đặt và số chỗ do backend lấy từ database. Văn bản gợi ý AI vẫn cần người dùng xác minh; các kiểm tra này không chứng minh tuyến đường hay điều kiện thực tế an toàn.
- Giá/chỗ trong lịch đã lưu là ảnh chụp tại thời điểm tạo. Link đưa tới flow booking hiện tại để kiểm tra lại trước khi đặt.
- HTTP gọi Gemini nằm ngoài transaction ghi dữ liệu. Nếu Gemini lỗi hoặc trả nội dung sai cấu trúc, không lưu lịch giả. Tính năng dùng cùng cấu hình model/key và xử lý lỗi của chatbot. Không bổ sung secret hay model mặc định mới.
- Nội dung tour sửa mới chưa tự tái lập vector. Dùng chức năng đồng bộ tour vào kho tri thức hiện có khi cần cập nhật phần nội dung truy hồi của chatbot.

## API bổ sung

Tất cả trả cấu trúc `ApiResponse` hiện có. API riêng tư dùng JWT trong `Authorization: Bearer ...`; quyền sở hữu lấy từ tài khoản đăng nhập, không lấy user ID từ body.

| Method | Endpoint | Quyền / mục đích |
|---|---|---|
| GET, PUT | `/api/account` | Đăng nhập; đọc/sửa hồ sơ của mình |
| POST | `/api/account/password` | Đăng nhập; đổi mật khẩu |
| GET, POST | `/api/plans` | Đăng nhập; liệt kê hoặc tạo và lưu lịch |
| GET, DELETE | `/api/plans/{id}` | Chủ lịch trình; đọc/xóa |
| GET | `/api/tours/{tourId}/reviews?page=0` | Công khai; điểm trung bình và 20 đánh giá/trang |
| GET, POST | `/api/bookings/{id}/review` | Chủ booking; kiểm tra điều kiện hoặc gửi đánh giá |
| POST | `/api/admin/bookings/{id}/complete` | Admin; hoàn tất chuyến đi |
| GET | `/api/admin/tours` | Admin; danh sách gồm tour ngừng bán |
| GET | `/api/admin/tours/{slug}` | Admin; chi tiết tour, lịch trình, lịch khởi hành, trang bị |
| PUT | `/api/admin/tours/{id}` | Admin; sửa thông tin tour |
| PUT | `/api/admin/tours/{id}/active` | Admin; body `{ "active": false }` để ngừng bán |
| PUT | `/api/admin/tours/{tourId}/schedules/{scheduleId}` | Admin; sửa lịch |
| GET | `/api/admin/tours/{id}/images` | Admin; đọc ảnh cả khi tour ngừng bán |

Ví dụ body tạo lịch, thay ngày bằng ngày phù hợp với lịch tour đang có:

```json
{
  "destination": "Lâm Đồng",
  "startDate": "2027-01-15",
  "days": 3,
  "people": 2,
  "budgetPerPerson": 4000000,
  "fitness": 2,
  "preferences": "Đi chậm, ngắm bình minh và cắm trại"
}
```

## Database và khởi chạy

Thêm bảng `saved_plans` liên kết `users`, lưu nhu cầu/kết quả dạng JSON trong cột TEXT. Thêm ràng buộc duy nhất trên `tour_reviews.booking_id`. Trạng thái `COMPLETED` sử dụng cột chuỗi status hiện có của booking.

Script PostgreSQL để xem và áp dụng thủ công: [sql/planner-reviews.sql](sql/planner-reviews.sql). Script chưa được chạy trong đợt sửa này. Nếu có nhiều đánh giá cũ cho cùng một booking, tạo unique index sẽ thất bại và transaction script rollback; cần đối chiếu dữ liệu trước, không tự xóa đánh giá.

`application.yaml` hiện có `spring.jpa.hibernate.ddl-auto: update`, nên khởi động backend có thể tự thay schema. Sao lưu database trước khi triển khai; kiểm tra bảng/index đã có sau cập nhật. Ở môi trường quản lý schema thủ công, áp dụng script đã xem xét rồi dùng `ddl-auto: validate`. Chưa có kiểm chứng migration trên database đang sử dụng.

Sau khi chuẩn bị schema và các biến môi trường hiện có, khởi động lại backend và frontend theo cách đang dùng. Không cần cài dependency mới hoặc bổ sung credential cho các chức năng này.

## Kiểm chứng

Backend chạy các kiểm thử Mockito, MockMVC, HTTP Gemini mô phỏng và Hibernate metamodel không kết nối database. Loại trừ test khởi động toàn ứng dụng và test Gemini trực tiếp:

```powershell
# Chạy trong backend; bỏ -o nếu máy chưa có Maven cache.
mvn -o "-Dtest=*Test,!ChatLiveSmokeTest,!BackendApplicationTests" test

# Chạy trong frontend.
node --test tests/api-contracts.test.mjs
npm run build
```

Kiểm tra giao diện dùng `frontend/tests/ui-smoke.mjs`, Vite tại `127.0.0.1:5174` và Chrome DevTools tại `127.0.0.1:9222`. Khởi động Vite cho phép thử với `VITE_API_BASE_URL=http://127.0.0.1:5174`, rồi chạy `node tests/ui-smoke.mjs`. Các request API được chặn và trả fixture; không dùng dữ liệu thật. Chạy Chrome với profile thử nghiệm riêng. Không thay file `.env` cho kiểm tra này.

Kết quả cuối được ghi ở mục cập nhật trong [repair-notes.md](repair-notes.md). Các kiểm tra mock không chứng minh kết nối PostgreSQL, quota Gemini, SMTP hoặc thanh toán VNPAY thật. Chưa chạy migration, import dữ liệu, gửi email, gọi Gemini hay tạo giao dịch thật trong đợt sửa này.

Kiểm tra tích hợp tiếp theo trên database thử nghiệm: sửa hồ sơ → đổi mật khẩu → đăng nhập lại; tạo lịch bằng model đang cấu hình → tải lại trang → mở lịch đã lưu; booking tour → thanh toán sandbox → hoàn tất chuyến đã kết thúc → gửi đánh giá → kiểm tra hiển thị công khai. Dùng bộ dữ liệu chuyến đã kết thúc trên môi trường thử nghiệm để kiểm tra bước đánh giá, không sửa trạng thái/tiền trong dữ liệu vận hành nhằm vượt điều kiện.

Tham khảo: Gemini hỗ trợ yêu cầu JSON qua `generationConfig.responseMimeType` trong [tài liệu generateContent](https://ai.google.dev/api/generate-content). Backend vẫn kiểm tra nội dung nhận được trước khi lưu.
