# Nghiệm thu sáu chức năng trải nghiệm chuyến đi

## Phạm vi

Sáu chức năng đã có bản MVP: yêu cầu đổi/hủy, checklist, nhắc lịch và tùy chọn email, báo cáo hướng dẫn viên, ảnh đánh giá có duyệt, công cụ AI đọc thông tin chuẩn bị chuyến đi.

Chỉ dùng đơn và tài khoản kiểm thử cho các thao tác bên dưới. Không hủy đơn thật hoặc giả lập giao dịch thành công trong database ứng dụng. Kiểm tra AI thật và gửi email cần một đợt nghiệm thu riêng.

## Kiểm tra thủ công

Dùng ba cửa sổ trình duyệt/profile riêng cho khách, admin, hướng dẫn viên; thêm tài khoản khách thứ hai để kiểm tra quyền. Không chỉ đổi role trong frontend.

| Chức năng | Thao tác | Kết quả cần thấy |
|---|---|---|
| Đổi/hủy | Khách gửi yêu cầu có lý do; admin từ chối kèm ghi chú | Khách thấy ghi chú sau reload; không có thay đổi lịch/chỗ |
| Đổi lịch | Với đơn test, gửi đổi sang lịch cùng tour; admin duyệt | Lịch và chỗ cập nhật đúng một lần; gửi lại quyết định không trừ chỗ lần hai |
| Checklist | Tick mục theo tour, thêm mục riêng, reload | Trạng thái còn lưu; khách thứ hai không đọc/sửa được |
| Thông báo | Tắt email trong trang thông báo, reload | Tùy chọn còn lưu; thông báo trong website vẫn hoạt động |
| Báo cáo guide | Guide đã nhận lịch test kết thúc trước hôm nay gửi báo cáo; admin phản hồi | Guide thấy phản hồi; không ghi đè báo cáo đã gửi; guide khác không truy cập được |
| Ảnh đánh giá | Chủ đơn test COMPLETED upload PNG/JPEG; admin duyệt rồi ẩn | Trước duyệt chỉ chủ ảnh/admin thấy; sau ẩn khách vãng lai không đọc URL ảnh được |
| Chuẩn bị với AI | Bấm “Hỏi AI về chuyến này” | Mở chat với nháp đúng booking, chưa tự gửi; việc tư vấn thật chưa thuộc nghiệm thu offline |

Đối với nhắc lịch, cần lịch test còn hiệu lực sau một/ba ngày và dữ liệu hành khách thiếu để kiểm tra job. Không sửa ngày chuyến thật để kích hoạt job. Không bật SMTP trong môi trường nghiệm thu tự động.

## Cách chạy kiểm tra tự động không gọi dịch vụ ngoài

Trong `backend`:

```powershell
mvn -o "-Dmaven.repo.local=C:/Users/thong/.m2/repository" "-Dtest=*Test,!BackendApplicationTests,!ChatLiveSmokeTest" test
```

Lệnh cố ý không chạy `BackendApplicationTests` vì test này tải cấu hình ứng dụng mặc định; cũng không chạy smoke AI thật. Các test nghiệp vụ sử dụng mock, không chứng minh transaction/concurrency PostgreSQL.

Trong `frontend`:

```powershell
node --test tests/api-contracts.test.mjs tests/time-theme.test.mjs tests/auth-session.mjs
npm run build
```

Browser scripts và hướng dẫn chi tiết: [trải nghiệm chuyến đi](trip-experience.md), [đổi/hủy booking](booking-change-requests.md).

## Phần chưa đủ bằng chứng

Kết quả mới ngày 24/10: **864 backend tests / 52 suites đạt, 0 lỗi, 0 skipped**, đối chiếu cả Maven `BUILD SUCCESS` và XML Surefire của đúng các suite vừa chạy. Đây là tổng của lần hồi quy mở rộng, có bao gồm các test trong lần 616 trước, không cộng hai con số. PowerShell trả exit code 1 do cảnh báo Java agent ghi ra stderr; báo cáo Maven/XML đều xác nhận thành công. Log: `backend/target/six-features-regression.log`.

**24 frontend Node tests đạt** (15 API contract, 6 auth session, 3 theme/destination); không phải browser hay backend HTTP thật. Kết quả build và 20 browser checks dùng API stub từ lượt trước được giữ nguyên, không chạy lại vì chưa thay source.

- Full-app HTTP qua JWT với hai tài khoản và PostgreSQL test riêng.
- Hai admin duyệt đồng thời, hoặc duyệt đồng thời với callback thanh toán, trên DB thật.
- Gửi SMTP thật, chất lượng câu trả lời AI thật và hoàn tiền qua cổng thanh toán.

Ngày 24/10: chưa tìm lại được PostgreSQL test riêng trong checkout hiện tại. `D:/Downloads/PostgreSQL/16` chỉ thấy thư mục `data`; không có `pg_ctl`/`psql` trong PATH. Đây là giới hạn các vị trí đã kiểm tra, không phải kết luận máy hoàn toàn không có PostgreSQL. Không khởi động hay sửa data directory này vì chưa xác định đây là dữ liệu kiểm thử.
