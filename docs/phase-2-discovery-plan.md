# Đợt 2 — Yêu thích, so sánh và lịch khởi hành

Kế hoạch ngày 22/10/2026, chưa triển khai chức năng trong lượt sửa dữ liệu. Tận dụng React/Vite, API tour, schedules, JWT, booking hiện có; không đổi logic giá/chỗ/thanh toán.

## 0. Tiền đề dữ liệu

- Báo cáo thực tế: `tour-summary-data-audit-20261022.md`. Chấp nhận dữ liệu thiếu; không chặn yêu thích hoặc so sánh chỉ vì thiếu radar.
- Thống nhất định nghĩa quãng đường/tổng leo/giờ vận động trước khi thêm số liệu. Không đổi maxCapacity, difficulty hoặc yêu cầu tham gia để khớp trang nguồn.
- Kiểm tra regression tour/public schedules và cách ẩn tour ngừng hoạt động trước khi thêm endpoint.

## 2A. Tour yêu thích — làm đầu tiên

- DB dự kiến `tour_favorites`: user_id, tour_id, created_at; unique(user_id,tour_id), FK, index phục vụ danh sách theo chủ sở hữu/thời gian. Migration SQL có kiểm tra trên DB test.
- API đề xuất: GET `/api/me/favorite-tours?page=0&size=12`, PUT và DELETE `/api/me/favorite-tours/{tourId}`. Tên/contract chốt sau đối chiếu convention repository. Lấy chủ sở hữu từ JWT, không nhận userId từ client.
- Thêm/bỏ idempotent, chống trùng khi click đồng thời; chỉ cho thêm tour công khai. Tour đã lưu nhưng ngừng hoạt động hiện trạng thái tối thiểu hoặc bị lọc theo policy thống nhất, không lộ mô tả riêng tư.
- UI: nút tim trên TourCard/TourDetail, trang `/favorites`, mục trong dropdown tài khoản. Khách chưa đăng nhập được hướng dẫn đăng nhập; giữ return URL nội bộ hợp lệ.
- Đăng xuất/đổi tài khoản phải xóa state/cache yêu thích. Loading và lỗi từng nút, không báo lưu thành công khi backend thất bại.
- Nghiệm thu: quyền owner, 401, ID không hợp lệ, tour inactive, thao tác lặp/concurrent, reload, mobile, empty/error state.

## 2B. So sánh tối đa 3 tour

- Dùng ID/slug làm định danh; không lưu giá hoặc chỗ làm dữ liệu có thẩm quyền trong localStorage. Có thể lưu tối đa 3 định danh để reload, xác thực lại qua API.
- Thanh so sánh trên danh sách/chi tiết và trang `/compare`. Cho bỏ từng tour/xóa toàn bộ, chống trùng, thông báo khi đủ 3.
- Bảng: giá tham khảo trên mỗi khách, thời lượng, độ khó nội bộ, 5 chỉ số summary, trang bị được cấp/cần mang, nguồn/ngày đối chiếu và lịch sắp tới. Không lấy giá nhà tổ chức trên web thay giá DB.
- Thiếu dữ liệu hiển thị “Chưa cập nhật”; không tính thành 0 hay tự xếp tour an toàn nhất. Không xếp hạng thể lực y khoa.
- Tái sử dụng endpoint chi tiết cho tối đa 3 tour; cân nhắc batch chỉ nếu đo thấy cần. Mobile cuộn bên trong vùng bảng, không tràn toàn trang; điều khiển có tên truy cập bàn phím.
- Nghiệm thu: 0/1/3 tour, link sai/trùng, tour bị ẩn sau khi lưu, dữ liệu thiếu, fetch lỗi một tour, giá DB đổi sau reload.

## 2C. Lịch khởi hành

- API công khai mới dự kiến GET `/api/tour-departures?from=YYYY-MM-DD&to=YYYY-MM-DD&people=2&location=...&page=0&size=50`.
- Query khoảng ngày có giới hạn (tối đa 93 ngày), validate people>=1, giới hạn size; chỉ tour active và lịch công khai phù hợp. Dùng projection tránh N+1; không trả thông tin liên hệ riêng của guide/khách.
- Dùng ngày Việt Nam và date-only nhất quán, tránh lệch ngày khi chuyển UTC. Theo status thật của dự án, không suy ra chỗ chỉ từ tên trạng thái.
- UI `/departures`: desktop tháng, mobile danh sách; lọc và trạng thái đang tải/rỗng/lỗi. Phải xử lý phân trang để không âm thầm bỏ lịch trong tháng.
- Chọn lịch đưa tour + scheduleId sang booking hiện có. Backend vẫn kiểm tra ngày, giá, trạng thái, chỗ tại lúc đặt; chọn trên lịch không giữ chỗ.
- Nghiệm thu: ranh giới tháng/năm, lịch hủy/hết chỗ/tour inactive, chỗ thay đổi sau khi xem, quyền truy cập, mobile và deep link booking.

## 2D. Nghiệm thu và chia commit

1. Backend yêu thích + migration + tests; frontend yêu thích.
2. So sánh tour + tests giao diện.
3. API lịch khởi hành + tests query; frontend lịch và liên kết booking.
4. Tài liệu/acceptance: người dùng tìm tour → lưu → so sánh → chọn lịch → mở booking đúng schedule.

Mỗi mốc chạy tests phù hợp + frontend build, DB concurrency trên PostgreSQL riêng. Browser stub chỉ chứng minh UI contract; cần lượt nối backend/DB thật cho owner, favorites và booking. Không gọi AI hoặc thanh toán thật trong kiểm thử mặc định. Không tự commit/push khi triển khai sau này nếu chưa được yêu cầu.
