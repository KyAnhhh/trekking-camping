# Cấu trúc frontend Trek & Camp

Frontend dùng React 18, React Router 6, Axios và Vite. Bản thiết kế dùng màu xanh rừng,
nền sáng, ảnh phong cảnh và các thành phần dùng chung cho client/admin.

## Phân chia trách nhiệm

```text
frontend/src/
├── api/                  # Axios client và các service gọi API hiện có
├── components/
│   ├── common/           # Navbar, Footer, AuthShell, Modal, trạng thái tải/lỗi/rỗng
│   ├── tour/             # TourCard, TourFilter, TourTimeline
│   └── chat/             # ChatWidget, ChatPanel, ChatMessage
├── context/              # AuthContext và ChatContext
├── hooks/useResource.js  # Tải dữ liệu, retry, bỏ qua kết quả sau unmount
├── layouts/              # ClientLayout và AdminLayout
├── pages/
│   ├── auth/             # Đăng nhập, đăng ký
│   ├── client/           # Trang chủ, tour, booking, chat
│   └── admin/            # Tổng quan, tour, người dùng, kho tri thức
├── routes/AppRoutes.jsx # Routes lồng nhau, bảo vệ admin, tải trang khi cần
├── styles/               # theme, base, client, tours, auth, chat, admin, responsive
├── utils/tour.js         # Giá, ngày, độ khó và điều kiện lịch có thể đặt
└── index.css             # Điểm nhập các stylesheet theo thứ tự
```

Các file placeholder cũ như Profile, Blog, GearRental
chưa được đăng ký vào router. Dữ liệu trong data/mockTours.js không được các trang mới sử dụng.
App.css cũ không được import; cấu hình giao diện hiện tại nằm trong styles/.

## Routes và chức năng

| Route                | Quyền     | Chức năng                                                    |
| -------------------- | --------- | ------------------------------------------------------------ |
| /                    | Public    | Trang chủ, tìm hành trình, tour từ API, liên kết tư vấn      |
| /tours               | Public    | Lọc tên/địa điểm, độ khó, thời lượng, sắp xếp giá            |
| /tours/:slug         | Public    | Tour, lịch trình, trang bị, lịch khởi hành                   |
| /chat                | Public    | Hội thoại AI; dùng chung session với widget                  |
| /login, /register    | Public    | Xác thực qua backend                                         |
| /forgot-password, /reset-password | Public | Yêu cầu email và đặt lại mật khẩu bằng liên kết dùng một lần |
| /tours/:slug/booking | Đăng nhập | Chọn lịch, số người, thông tin liên hệ và gửi đơn            |
| /my-bookings         | Đăng nhập | Danh sách đơn của tài khoản hiện tại                         |
| /my-bookings/:id     | Chủ đơn | Chi tiết, thanh toán MoMo sandbox, kiểm tra kết quả, hủy đơn đủ điều kiện |
| /payment/momo/return | Đăng nhập | Đối soát kết quả qua backend; bỏ qua status/amount trên redirect |
| /admin/bookings     | Admin | Danh sách đơn đặt tour |
| /admin/bookings/:id | Admin | Chi tiết, đối soát, xác nhận đơn đã đủ tiền, hủy đơn đủ điều kiện |
| /admin               | Admin     | Số tour đang hiển thị, số người dùng, số tài liệu lấy từ API |
| /admin/tours         | Admin     | Danh sách tour đang hiển thị; biểu mẫu tạo tour              |
| /admin/tours/:slug   | Admin     | Xem/thêm lịch trình, lịch khởi hành, trang bị                |
| /admin/users         | Admin     | Tra cứu danh sách người dùng                                 |
| /admin/knowledge     | Admin     | Tải lên TXT, xem tài liệu và xác nhận xóa                    |

/admin/dashboard chuyển về /admin để giữ đường dẫn tương thích.
Frontend kiểm tra vai trò để điều hướng; backend vẫn là nơi thực thi phân quyền API.

## Luồng dữ liệu

- Thành phần giao diện gọi service trong api/, đọc dữ liệu tại response.data.data.
- useResource nhận loader ổn định (hàm ngoài component hoặc useCallback), quản lý
  loading/error/retry và bỏ qua kết quả của lần tải đã hết hiệu lực.
- Bộ lọc tour được lưu trên URL: q, difficulty, duration, sort. Lọc và sắp xếp trên
  danh sách API trả về, chưa có phân trang phía server.
- Trang chi tiết tải thông tin tour trước, rồi tải song song lịch trình, lịch khởi hành
  và trang bị; lỗi một phần được hiển thị cùng nút thử lại.
- Lịch được đặt phải OPEN, còn chỗ và khởi hành sau ngày hiện tại theo múi giờ Việt Nam.
  Backend kiểm tra lại khi nhận đơn. UI tạo phiên MoMo sandbox và đối soát qua backend.
- Người chưa đăng nhập được đưa đến login, sau đó quay về URL đặt tour và lịch đã chọn.
- ChatPanel được dùng ở cả widget và trang chat. Nội dung Markdown chỉ tải khi mở chat.
- Admin tạo tour bằng POST /api/tours, sau đó thêm dữ liệu con qua các endpoint
  /api/tours/{id}/itineraries, /schedules, /gears hiện có.

## Giới hạn hiện tại

- Tour có ảnh sử dụng ảnh bìa và thư viện ảnh từ backend; tour chưa có ảnh vẫn dùng ảnh minh họa có nhãn.
- Ảnh minh họa lấy từ Unsplash; font Manrope và Be Vietnam Pro lấy từ Google Fonts.
  Cần mạng để tải các tài nguyên này, trình duyệt có font dự phòng.
- Danh sách tour admin dùng GET /api/tours nên chỉ phản ánh tour đang hiển thị.
- Chưa có API sửa/xóa tour, thống kê doanh thu, chỉnh sửa người dùng hay hoàn tiền tự động.
  Booking và MoMo sandbox xem [hướng dẫn tích hợp](booking-momo-sandbox.md).
- Logout server, quên mật khẩu, import JSON và upload ảnh xem [hướng dẫn mới](accounts-tour-import-images.md).
- Thông tin liên hệ được điền sẵn khi vừa đăng nhập. Sau khi tải lại trang,
  AuthContext hiện tại chỉ khôi phục token, role, username; người dùng nhập lại
  thông tin liên hệ do chưa có luồng tải hồ sơ cá nhân.
- Các bài kiểm tra trình duyệt bên dưới mô phỏng API, không chứng minh kết nối
  database hoặc chất lượng phản hồi AI thực tế.

## Chạy ứng dụng

Trong thư mục frontend, dùng dependency hiện có:

```powershell
npm run dev
```

Mở http://localhost:5173 và chạy backend theo cấu hình dự án. Axios sử dụng
VITE_API_BASE_URL khi được cấu hình, mặc định http://localhost:8080.

## Kiểm thử

Build và kiểm tra hợp đồng API:

```powershell
node node_modules/vite/bin/vite.js build
node --test tests/api-contracts.test.mjs
```

Smoke test giao diện yêu cầu Node 22 và Chrome hỗ trợ DevTools Protocol; không cần
cài thêm thư viện kiểm thử. Chạy preview trong một terminal riêng:

```powershell
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5174 --strictPort
```

Trong terminal khác, cũng tại frontend, mở Chrome headless với profile riêng rồi chạy test:

```powershell
$previewProfile = Join-Path (Get-Location) 'node_modules/.cache/trek-preview/profile'
Start-Process -FilePath 'C:/Program Files/Google/Chrome/Application/chrome.exe' -ArgumentList '--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9222',("--user-data-dir=" + $previewProfile),'about:blank' -WindowStyle Hidden
node tests/ui-smoke.mjs
```

Có thể cấu hình UI_BASE_URL và CHROME_DEBUG_URL nếu đổi cổng.
Test mở tab riêng, chặn các request /api/ để trả fixture; thao tác tạo tour,
booking, upload và xóa chỉ tác động lên bộ nhớ của test.
Ảnh kiểm thử được lưu ở frontend/node_modules/.cache/trek-preview/.

Các tình huống gồm: desktop/mobile, menu, bộ lọc URL, đăng nhập quay về booking,
gửi đơn, chặn client vào admin, session chat, tạo tour và dữ liệu con, upload/xóa
tài liệu, xử lý lỗi và retry, xác nhận mật khẩu đăng ký.
