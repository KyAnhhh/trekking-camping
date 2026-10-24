# Phân công và phản hồi hướng dẫn viên — 23/10/2026

## Triển khai

- Admin → **Phân công dẫn đoàn** (`/admin/guide-assignments`):20 lịch/trang, cảnh báo chưa có trưởng đoàn đã nhận, pending/declined và hồ sơ chưa có tài khoản hoạt động. Dùng lại modal phân công hiện có, bổ sung lý do.
- Guide → `/guide-workspace`: nhận hoặc từ chối phân công mới. Từ chối bắt buộc lý do. Chỉ người đã nhận hoặc phân công cũ được giữ lại mới có quyền truy cập roster/passenger/check-in.
- Client/public schedules, booking contacts và context hướng dẫn viên cho AI chỉ nhận phân công ACCEPTED/LEGACY. Không công khai lý do từ chối hoặc lịch sử admin.
- Admin nhận notification khi guide phản hồi; guide nhận notification khi được thêm/gỡ/đổi vai trò. Dùng hệ thống thông báo/email hiện có. Không gửi email/thông báo thật để kiểm thử lượt này.
- Lịch sử ghi actor, schedule, guide, action, reason, time. Phân công không đổi giữ nguyên identity và phản hồi; thay vai trò hoặc mời lại người đã từ chối tạo pending mới. Gửi lại cùng phản hồi không tạo event lần hai.
- Kiểm tra trùng lịch giữ khóa schedule→guide theo thứ tự cũ. Pending giữ chỗ trong lịch làm việc, DECLINED không chặn lịch khác. Khi nhận kiểm tra lại conflict và ngày/status. assignmentId cũ trả409 sau khi phân công bị thay.

## Migration đã chạy

`docs/sql/guide-assignment-response.sql` **đã áp dụng vào DB hiện tại**, backup ngoài Git tại:
`%LOCALAPPDATA%/TrekkingCamping/backups/guide-assignment-response/1792728770198/before.json`.

Thêm3 cột response_status/response_reason/responded_at và bảng guide_assignment_events.3 phân công cũ được LEGACY, responded_at vẫn null; không giả tạo phản hồi ACCEPTED hay lịch sử cũ. Quyền cũ giữ nguyên. Không thay booking/guide account, không tự gán thêm guide.

Khi triển khai DB khác: review và chạy SQL trước khi khởi động code mới. Không dựa Hibernate update để thay thế migration. DB hiện tại không cần chạy lại.

## Cách test

1. Khởi động lại backend với cấu hình hiện có. Nếu không muốn gửi email trong buổi thử:

```powershell
cd backend
mvn spring-boot:run "-Dspring-boot.run.arguments=--spring.jpa.hibernate.ddl-auto=validate --NOTIFICATION_EMAIL_ENABLED=false"
```

Frontend: từ frontend chạy `npm run dev`. Mở http://localhost:5173.

2. Admin vào **Hướng dẫn viên**, dùng chức năng liên kết/mời để bảo đảm guide cần thử có tài khoản hoạt động ROLE_GUIDE. Không dùng thông tin đăng nhập giả hoặc công khai password. Sau đổi role cần đăng nhập lại.
3. Admin vào **Phân công dẫn đoàn**, chọn lịch tương lai mô phỏng không có booking thật. Chọn trưởng đoàn, nhập lý do rồi lưu. Thấy trạng thái chờ. Hồ sơ không liên kết có cảnh báo nhưng vẫn có thể tạo pending để admin hoàn tất liên kết sau.
4. Guide đăng nhập bằng cửa sổ riêng, mở thông báo/lịch làm việc. Pending chưa có link danh sách khách; thử gọi URL roster trực tiếp phải bị từ chối404.
5. Guide bấm **Nhận lịch**. Trang tải lại, hiện đã nhận và link danh sách khách. Admin nhận thông báo, lịch sử có ACCEPTED. Client xem chi tiết cùng lịch thấy guide.
6. Dùng một phân công khác để thử **Từ chối**: nút khóa khi chưa nhập lý do; sau phản hồi không có quyền roster, admin thấy trạng thái/lý do trong chi tiết phân công và lịch sử. Không phải nút hủy nhận sau ACCEPTED: việc đổi sau xác nhận cần admin xử lý.
7. Admin phân công lại đúng guide/vai trò đã ACCEPTED → giữ phản hồi. Gỡ rồi phân công lại hoặc đổi vai trò → cần nhận lại. Tab guide cũ gửi assignmentId cũ phải409; tải lại để thấy phiên bản mới.
8. Thử gán guide đã có PENDING/ACCEPTED/LEGACY trùng ngày trên lịch khác →409. Không dùng lịch đang vận hành thật để test.
9. Client hoặc Guide gọi `/api/admin/guide-assignments` →403; khách chưa login →401. Guide khác không được đọc roster/passengers của lịch chưa được nhận.
10. Kiểm tra mobile và lịch sử. Các dòng LEGACY ghi rõ phân công cũ, không được hiểu là đã bấm nhận trong tính năng mới.

## API

- PUT `/api/admin/schedules/{id}/guides?reason=...`: body danh sách guideCode/role giữ contract cũ. Lý do mới từ UI tối đa900 ký tự.
- GET `/api/admin/guide-assignments?page=0`: overview tương lai chưa hủy, gồm cả lịch đã đóng.
- GET `/api/admin/guide-assignments/{scheduleId}/history`: tối đa100 sự kiện mới nhất, chỉ admin.
- PUT `/api/guide-workspace/trips/{scheduleId}/response`: `{assignmentId,decision:"ACCEPTED"|"DECLINED",reason}`. Reason tối đa1000 ký tự, bắt buộc khi từ chối.

## Bằng chứng và giới hạn

- Backend474 tests đạt ở lần cuối:436 API/security,14 GuideService,11 workspace,10 passenger,2 booking guide controller,1 HQL/metamodel. Lần471 trước là bộ chồng lặp, không cộng thành945 tests độc lập.
- Vite production build đạt.
-7 Chrome checks với API stub đạt: pending không có roster link, lý do từ chối bắt buộc, declined không có roster, accepted có link, admin cảnh báo, audit, mobile. Không có runtime exception. Harness ban đầu parse OPTIONS như PUT; đã sửa harness.
- Migration commit thật; kết nối độc lập read-only chạy compiled admin overview/history query đạt,3 LEGACY và0 responded_at mới. Không coi đó là kiểm thử phản hồi/concurrency đầy đủ trên DB thật.
- Chưa chạy full-app ba tài khoản/notification email hoặc concurrency bằng PostgreSQL; không tự gửi email/booking/phân công để tạo bằng chứng.

Test backend:
`mvn -o "-Dmaven.repo.local=C:/Users/thong/.m2/repository" "-Dtest=GuideWorkspaceTest,GuideServiceTest,GuideQueryTest,BookingGuideControllerTest,ApiAuthorizationMatrixTest,*Passenger*Test" test`

Không có commit/push. Tiến trình Chrome/Vite kiểm thử riêng được dừng sau nghiệm thu.
