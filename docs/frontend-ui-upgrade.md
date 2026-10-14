# Nâng cấp UI/UX frontend — 12/10/2026

## Khảo sát kiến trúc và phạm vi

- React 18 + Vite 5, React Router 6, Axios, Lucide; font Be Vietnam Pro/Manrope và CSS thường. `src/main.jsx` mount React qua `createRoot`: ứng dụng hiện là CSR, không có luồng hydrate SSR.
- `App.jsx` giữ AuthProvider, BrowserRouter và ChatProvider. `AppRoutes.jsx` chia ClientLayout/AdminLayout, lazy-load các trang phụ; Home vẫn là entry hiển thị trực tiếp.
- Nhóm client: danh sách/chi tiết tour, đặt tour, đơn cá nhân, hồ sơ, hướng dẫn viên, Planner, Chat, trang trả kết quả thanh toán, Cẩm nang và Về chúng tôi. Nhóm auth: login/register/forgot/reset password. Nhóm admin: dashboard, tour/lịch/ảnh/import, booking, users, guides, knowledge.
- Các component nghiệp vụ tour, khai báo tham gia, đánh giá, guide, chatbot dùng API service hiện có và `useResource`; Axios xử lý token/401. Lượt nâng cấp này không thay payload, endpoint, interceptor, auth context, chat context, logic booking hoặc thanh toán.
- `BlogList.jsx`, `BlogDetail.jsx`, `GearRental.jsx`, `GearCard.jsx`, `blogService.js`, `gearService.js` đang là file rỗng, không được nối vào routing. `mockTours.js` chứa dữ liệu mẫu nhưng không được import trong luồng trang hiện tại. `App.css` là stylesheet mẫu chưa được App import. Không dùng các dữ liệu/file này để giả lập nội dung công khai.
- CSS được tổ chức theo theme/base/client/tour/auth/admin/chat/responsive và các module bổ sung. `base.css` còn các khai báo trùng với stylesheet khác; không thực hiện dọn toàn bộ CSS vì có thể ảnh hưởng những luồng ngoài phạm vi. Style nâng cấp được giới hạn trong `.client-site`, `.home-page` hoặc component mới.

## Những thay đổi đã triển khai

### Layout và nội dung

- Header: Logo → Khám phá tour → Điểm đến → Lập lịch trình → Cẩm nang → Về chúng tôi → Hỏi AI → tài khoản. Liên hệ nằm ở footer và các liên kết hỗ trợ. Chuyển menu gọn ở ≤1200px để không ép chữ; giữ dropdown theo role, bàn phím, Escape và đóng khi điều hướng. Intersection Observer thay nền/shadow khi cuộn.
- Footer chia khám phá, chuẩn bị hành trình, thông tin/hỗ trợ; cùng hệ font/màu tự nhiên. Card, nút, khoảng cách và trạng thái focus được đồng bộ phía client. Fallback ảnh của card ghi rõ “Ảnh minh họa”, kể cả khi banner API bị lỗi.
- Trang chủ: hero, tìm tour, các tour để bắt đầu khám phá, điểm đến, loại trải nghiệm, lý do sử dụng, quy trình đặt tour, đánh giá và FAQ. Ba tour đầu là lựa chọn từ danh sách API, không được gọi là “bán chạy nhất” hay dùng số liệu giả.
- `/destinations`: nhóm theo toàn bộ chuỗi `tour.location` hiện có, tìm khu vực và dẫn sang `/tours?q=...`. Không tự suy ra tỉnh hay tách một tour liên tỉnh thành các dịch vụ riêng. Số tour không đồng nghĩa số lịch còn chỗ.
- `/contact`: chỉ dẫn tới chatbot/đơn của khách, thông tin liên hệ công khai nếu được cấu hình, công cụ soạn và sao chép câu hỏi, FAQ. Chưa có API tiếp nhận liên hệ nên không hiển thị “đã gửi”. Nội dung form không được lưu localStorage và không gửi vào AI.
- Cẩm nang/Về chúng tôi/danh sách tour được bổ sung hướng dẫn và lối đi tiếp có liên quan; tái sử dụng nội dung hiện có, không thêm chính sách hoàn tiền, hotline, nhân sự hoặc đánh giá giả.

### Theme theo giờ

| Theme | Giờ trình duyệt | Hình thức |
|---|---|---|
| Sáng | 05:00–10:59 | Vàng nhạt, xanh lá, ánh bình minh và sương |
| Trưa | 11:00–14:59 | Trời xanh, ánh sáng rõ, xanh tự nhiên |
| Chiều | 15:00–18:59 | Cam vàng, ánh ấm |
| Tối | 19:00–04:59 | Navy, trăng, sao và ánh lều |

- `timeThemeAt()` dùng `Date.getHours()` theo múi giờ trình duyệt; **không đổi** đồng hồ Việt Nam dùng trong booking.
- `useTimeTheme` mặc định Auto, đặt timer tới đầu phút kế tiếp, cập nhật khi tab hiện lại/focus. Timer dừng khi tab ẩn và được cleanup khi unmount. Preview chỉ tồn tại trong lần mở trang, không thay cài đặt toàn website.
- Biến CSS và `data-time-theme` đặt trên `.home-page`, không trên body/root. Rời trang chủ không mang theme sang admin, booking hoặc trang trả kết quả VNPAY.
- Dùng ảnh phong cảnh có sẵn với các lớp gradient/ánh sáng crossfade, không tải bốn ảnh hero lớn mới. Cảnh được ghi là minh họa, không phải ảnh chứng thực địa điểm hay dự báo thời tiết.
- Chữ và nút dùng màu sáng trên lớp phủ tối; nút preview được đo tương phản trong kiểm thử. Kích thước hero không đổi giữa bốn preview ở cùng viewport.

### Animation và tải dữ liệu

- Parallax giới hạn 18px, chạy qua requestAnimationFrame và passive scroll listener; không setState theo từng pixel. Tắt parallax trên mobile, khi giảm chuyển động hoặc hero ngoài màn hình.
- Ảnh di chuyển chậm bằng transform; sương dùng transform, sao dùng opacity. Dừng animation khi tab ẩn/hero ngoài viewport. Tôn trọng thay đổi `prefers-reduced-motion` ngay lúc đang xem.
- Reveal dùng Intersection Observer. Nội dung mặc định hiển thị; chỉ ẩn tạm section phía dưới sau khi observer được gắn. Bàn phím focus vào section sẽ hiện nội dung. Không ẩn nội dung nếu observer không được hỗ trợ.
- Tour/điểm đến dùng API danh sách hiện tại. Review chỉ tải khi gần viewport, tối đa ba API đánh giá của ba tour đang giới thiệu, chạy song song và xử lý lỗi từng request. Không tính điểm trung bình toàn website từ mẫu này.
- Có trạng thái loading/error/retry/empty cho tour, điểm đến và đánh giá; hình ngoài màn hình lazy-load, giữ khung ảnh bằng aspect-ratio/kích thước. Các asset phong cảnh/font vẫn phụ thuộc nguồn ngoài hiện có.

## Cấu hình liên hệ tùy chọn

`VITE_CONTACT_EMAIL` là **địa chỉ email công khai**, không phải SMTP user/password hay secret. Nếu chưa cấu hình, trang hiển thị thông tin liên hệ chung chưa được công bố. Khi có địa chỉ hợp lệ, trang cung cấp liên kết `mailto:` để mở ứng dụng email của khách; không tự gửi mail. Biến Vite được đọc khi build, cần build lại sau khi thay đổi. Không mở, hiển thị hoặc chỉnh sửa `.env` trong lượt nâng cấp này.

## File thay đổi trong lượt nâng cấp này

Các đường dẫn dưới đây tính từ `frontend/` (không phải toàn bộ Git changes tồn đọng):

| Nhóm | File sửa/tạo |
|---|---|
| Shell | `src/layouts/ClientLayout.jsx`, `src/components/common/Navbar.jsx`, `HeaderNavigation.jsx`, `Footer.jsx`, `src/routes/AppRoutes.jsx`, `src/index.css` |
| Dùng chung | `src/components/common/Reveal.jsx`, `TravelFaq.jsx`, `src/components/tour/DestinationGrid.jsx`, `TourCard.jsx` |
| Trang chủ | `src/pages/client/Home.jsx`, `src/components/home/TimeHero.jsx`, `HomeReviews.jsx` |
| Hook/utility | `src/hooks/useTimeTheme.js`, `useHeroMotion.js`, `src/utils/timeTheme.js`, `destinations.js` |
| Nội dung | `src/pages/client/Destinations.jsx`, `Contact.jsx`, `TourList.jsx`, `About.jsx`, `Handbook.jsx` |
| CSS | `src/styles/header.css`, `client-experience.css`, `home.css` |
| Kiểm tra | `tests/time-theme.test.mjs`, `experience-checks.mjs`, `ui-smoke.mjs` |

## Kiểm chứng

- `npm run build`: production build thành công, không thêm dependency.
- `node --test tests/api-contracts.test.mjs tests/time-theme.test.mjs`: 14 kiểm thử đạt, gồm các mốc giờ, thời điểm đặt timer và nhóm điểm đến, cùng hợp đồng API cũ.
- Bộ Chrome UI dùng API fixture: 142 kiểm tra đạt trong lượt chạy cuối, không ghi nhận lỗi JavaScript, bao gồm các chức năng mới và hồi quy auth, booking, payment, chat, guide, import, admin.
- Đã mô phỏng thời gian đi qua 10:59 → 11:00 và xác nhận tự chuyển theme không reload; kiểm tra preview/Auto, reduced motion, ảnh chụp các theme, viewport 320–1440px, điều hướng, trạng thái rỗng/lỗi và thao tác sao chép liên hệ.
- Không gọi Gemini/VNPAY thật, không ghi database. Chưa đo Lighthouse/Core Web Vitals trong môi trường triển khai và chưa kiểm tra Safari/iOS thực tế; kết quả Chrome fixture không thay thế các phép đo đó.
