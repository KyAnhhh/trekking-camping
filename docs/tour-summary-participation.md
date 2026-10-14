# Tour Summary và xem xét yêu cầu tham gia

## Phạm vi triển khai

- Khối “Tổng quan hành trình” trên trang tour, form tạo/sửa và JSON import.
- Khai báo từng người trong chi tiết booking, mã hóa nội dung khi lưu.
- Admin xem xét khai báo trước khi mở thanh toán cho đơn mới.
- Giữ chỗ có hạn, giải phóng đơn hết hạn khi không có tiền/giao dịch đang chờ.
- Bộ lọc giới hạn hành trình trong Planner; chatbot nhận thông số tour công khai.

Không có chẩn đoán tự động, danh sách bệnh bị cấm hoặc chức năng bác sĩ phê duyệt. Mọi khai báo mới đều qua admin xem xét. “Hoàn tất xem xét” chỉ là kết quả xử lý yêu cầu tổ chức/hỗ trợ; không phải chứng nhận sức khỏe. Nội dung yêu cầu của tour phải do nhà tổ chức và chuyên gia phù hợp xác nhận trước khi áp dụng thực tế.

## Chuẩn bị trước khi chạy

1. Sao lưu database. Xem [script SQL](sql/tour-summary-participation.sql) rồi áp dụng theo quy trình quản lý schema của bạn. Script chưa được chạy trong đợt phát triển này. `ddl-auto: update` hiện có cũng có thể tạo cột/bảng khi backend khởi động; script bổ sung cả foreign key cho hai bảng mới.
2. Đặt `HEALTH_DATA_KEY` ở môi trường backend hoặc `backend/.env`: **Base64 của đúng 32 byte ngẫu nhiên**, không phải mật khẩu tự đặt. Không thêm tiền tố, không đặt vào frontend, không commit và không gửi giá trị qua chat.
3. Cất bản sao khóa ở nơi quản lý bí mật an toàn. Các instance dùng cùng khóa. Đổi/mất khóa sẽ không đọc được các khai báo đã mã hóa; chưa có quy trình xoay khóa tự động. Không dùng JWT secret hoặc VNPAY secret thay thế.
4. Khởi động lại backend/frontend. Nếu chưa có khóa, tour vẫn hiển thị nhưng gửi khai báo trả 503; **đơn mới chưa thể thanh toán khi chưa hoàn tất khai báo/xem xét**. API không rơi về lưu bệnh sử dạng văn bản thuần.

Có thể tạo và lưu biến môi trường ở phạm vi tài khoản Windows bằng PowerShell sau, không in giá trị khóa ra màn hình. Chỉ chạy một lần khi chưa có khóa, sau đó khởi động lại IDE để backend nhận môi trường mới:

```powershell
$existingHealthKey = [Environment]::GetEnvironmentVariable('HEALTH_DATA_KEY', 'User')
if ($existingHealthKey) { throw 'Đã có khóa. Không ghi đè khóa đang dùng.' }
$healthKeyBytes = New-Object byte[] 32
$healthKeyGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
$healthKeyGenerator.GetBytes($healthKeyBytes)
[Environment]::SetEnvironmentVariable('HEALTH_DATA_KEY', [Convert]::ToBase64String($healthKeyBytes), 'User')
$healthKeyGenerator.Dispose()
[Array]::Clear($healthKeyBytes, 0, $healthKeyBytes.Length)
```

Nếu đã cấu hình khóa trong `.env`, giữ khóa đó; không chạy lệnh tạo khóa mới vì biến môi trường có thể ưu tiên hơn `.env`. Đợt phát triển này không đọc hoặc chỉnh `.env`, không chạy đoạn tạo khóa trên.

## Dữ liệu Tour Summary

`CreateTourRequestDto` và kết quả đọc tour bổ sung `adventureProfile`. Có thể bỏ hẳn thuộc tính này đối với file import cũ. Để trống/null nếu chưa có số liệu; không lấy số trong ảnh minh họa làm thông số thực tế.

| Thuộc tính | Định nghĩa |
|---|---|
| `distanceKm` | Tổng quãng đường trekking, km, tối đa 2 chữ số thập phân |
| `maxAltitudeM` | Điểm cao nhất, mét so với mực nước biển |
| `totalAscentM` | Tổng độ cao leo lên tích lũy, không phải chênh lệch điểm đầu–cuối |
| `activeHoursPerDay` | Số giờ vận động của ngày dài nhất |
| `medicalAccessHours` | Ước tính thời gian tiếp cận y tế trong điều kiện được nêu |
| `medicalAccessNotes` | Điểm xuất phát, nơi tiếp cận và giả định; bắt buộc khi có thời gian ước tính |
| `recommendedMonths` | Chuỗi tháng, ví dụ `3,4,5`; không bảo đảm thời tiết |
| `customersPerGuide` | Tỷ lệ hỗ trợ dự kiến, không thay cho số guide thực tế |
| `pickupNotes`, `assemblyPoint` | Hướng dẫn đón chung và điểm tập kết |
| `participationRequirements` | Yêu cầu vận động, hỗ trợ, trường hợp cần trao đổi trước |
| `sourceNote`, `verifiedOn` | Nguồn/người xác nhận và ngày xác minh |

Các chỉ số định lượng và yêu cầu tham gia cần nguồn/ngày xác minh. Biểu đồ radar chỉ xuất hiện khi có đủ năm chỉ số. Thang 1–5 và ngưỡng từng trục được công khai dưới biểu đồ; đây là thang so sánh giao diện, không phải ngưỡng lâm sàng.

Trong lịch khởi hành, `pickupAt` (ISO local datetime, giờ Việt Nam) và `pickupPoint` là tùy chọn; khi dùng phải có cả hai. Thời điểm đón trong ngày đi hoặc tối đa hai ngày trước đó. Có thể nhập qua JSON import hoặc “Sửa lịch”; hiển thị tại lịch công khai và trang đặt tour. Chưa có hệ thống nhiều điểm đón để khách lựa chọn trong cùng lịch.

Để giữ nguyên thông tin khách đã dựa vào khi đặt: không thay đổi Adventure Profile khi tour còn booking chưa hủy cho chuyến chưa kết thúc; không thay điểm/giờ đón của lịch đã có booking. Chỉnh tiêu đề hoặc các thông tin khác vẫn theo quy tắc quản trị hiện có.

## Quy trình dùng thử

1. Admin tạo/sửa tour, điền thông số có nguồn và yêu cầu tham gia; thêm lịch, chỉnh giờ/điểm đón nếu cần.
2. Khách đặt chỗ. Đơn mới có `participationStatus=INCOMPLETE`, giữ chỗ tối đa 48 giờ, không quá đầu ngày khởi hành theo giờ Việt Nam.
3. Trong chi tiết đơn, khách nhập đúng số người: họ tên, nhu cầu hỗ trợ/trao đổi riêng, ghi chú tùy chọn, liên hệ khẩn cấp và xác nhận quyền khai báo/đồng ý chia sẻ. Đại diện chỉ khai khi được phép; phiên bản đầu dùng xác nhận của người đặt/đại diện, chưa có link mời từng người tự xác nhận độc lập.
4. Gửi khai báo chuyển trạng thái sang `REVIEW_REQUIRED`. Admin mở chi tiết booking và chọn `READY`, `NEEDS_CONTACT` hoặc `UNSUPPORTED`, có hộp xác nhận. Hai trạng thái chưa READY yêu cầu nhập lý do/hướng dẫn tiếp theo; nội dung này được mã hóa cùng khai báo và hiển thị riêng cho chủ booking, không chép vào audit metadata.
5. Khi `READY`, khách có tối đa 24 giờ tiếp tục thanh toán, không quá ngày khởi hành. Có thể tải lại chi tiết đơn để xem kết quả admin vừa cập nhật. Gọi API thanh toán trực tiếp vẫn bị chặn nếu chưa READY.
6. Sửa khai báo khi đơn còn chờ và chưa có giao dịch đang chờ/đã thu tiền sẽ tăng revision và yêu cầu xem xét lại. Giao diện cũ/revision cũ bị từ chối 409. Sau khi giao dịch bắt đầu, thay đổi khai báo phải xử lý với người phụ trách, không ghi đè tự động.

Khi chưa thể đáp ứng, khách có thể liên hệ hoặc hủy đơn chưa thanh toán rồi chọn chuyến khác. Không tự chọn tour thay thế dựa trên tên bệnh.

Tác vụ nền chạy mỗi phút, xử lý từng lô 100 đơn hết hạn, khóa booking rồi khóa lịch, hoàn chỗ đúng một lần. **Không giải phóng chỗ của đơn có giao dịch PENDING, SUCCESS hoặc REFUND_REQUIRED**; các trường hợp này tiếp tục theo luồng đối soát hiện có. Thanh toán thành công đến muộn khi booking không còn đủ điều kiện được ghi `REFUND_REQUIRED`, không tự đánh dấu đã hoàn tiền. Scheduler chỉ xử lý booking có deadline mới, không tự hủy booking lịch sử.

## Riêng tư và tương thích

- Bảng `participation_declarations` chứa nội dung AES-256-GCM; AAD gắn booking ID, mỗi lần ghi dùng nonce mới. Tên, ghi chú, liên hệ và nội dung xác nhận nằm trong phần mã hóa.
- API chỉ cho chủ booking và tài khoản ADMIN truy cập. Chưa cấp dữ liệu cho role hướng dẫn viên; hồ sơ guide hiện tại không đồng nghĩa tài khoản được phép đọc bệnh sử.
- Đọc, gửi, xem xét, xóa và tác vụ nền có nhật ký metadata trong `participation_audit`; không chép nội dung khai báo vào audit.
- Nội dung hết hạn vào đầu ngày thứ 31 sau ngày về, được ẩn khỏi API ngay khi hết hạn và xóa bởi tác vụ nền. Chủ booking có thể xóa sớm khi đơn CANCELLED hoặc COMPLETED. Đơn đang hoạt động phải xử lý hủy/đối soát với người phụ trách trước khi xóa.
- Nhật ký metadata hiện được giữ để truy vết, chưa có tự động hết hạn audit. Cần thống nhất thời hạn lưu audit, backup và quy trình xử lý yêu cầu dữ liệu trước vận hành thật. Xóa nội dung ở database không tự xóa các bản backup cũ.
- Dữ liệu booking/khai báo không được đưa vào prompt, embedding hoặc API tour công khai. Người dùng tự gõ bệnh lý vào chat vẫn là nội dung gửi tới Gemini; giao diện khuyến cáo không nhập thông tin nhạy cảm.
- Booking cũ có trạng thái khai báo null giữ flow cũ, không được gọi là đã qua xem xét. Người dùng có thể tự bắt đầu khai báo khi đơn còn chờ và chưa có giao dịch. Trường `medical_conditions` cũ không tự di chuyển/xóa/mã hóa; dữ liệu lịch sử cần kế hoạch chuyển đổi riêng. Booking mới không chấp nhận gửi bệnh sử qua trường văn bản cũ.
- Chưa có chứng minh tuân thủ pháp lý/y khoa hoặc kiểm định an toàn vận hành. Chính sách cần được đơn vị tổ chức xem xét trước khi áp dụng cho khách thật.

## API

Tất cả theo ApiResponse hiện có; không trả ciphertext hoặc khóa cho frontend.

| Method | Endpoint | Quyền |
|---|---|---|
| GET | `/api/bookings/{id}/participation` | Chủ booking |
| PUT | `/api/bookings/{id}/participation` | Chủ booking; `{revision, people}` |
| DELETE | `/api/bookings/{id}/participation` | Chủ booking, sau hủy/hoàn tất |
| GET | `/api/admin/bookings/{id}/participation` | Admin |
| POST | `/api/admin/bookings/{id}/participation/review` | Admin; `{revision, decision, note}` |

Tour API/import dùng `adventureProfile`; API sửa lịch bổ sung `pickupAt`, `pickupPoint`. `/api/plans` thêm giới hạn tùy chọn `maxDistanceKm`, `maxActiveHoursPerDay`, `maxMedicalAccessHours`. Backend lọc trước khi lấy tối đa 10 lịch gợi ý, loại tour thiếu chỉ số tương ứng nếu có bật giới hạn. AI chỉ giải thích dữ liệu, không cấp quyền thanh toán hoặc phê duyệt sức khỏe.

## Kiểm thử

Không khởi động database, chạy migration, gọi Gemini/VNPAY hoặc dùng bệnh sử thật trong đợt sửa này. Các test dùng dữ liệu giả:

```powershell
# backend
mvn -o "-Dtest=*Test,!ChatLiveSmokeTest,!BackendApplicationTests" test
# frontend
node --test tests/api-contracts.test.mjs
npm run build
```

`frontend/tests/ui-smoke.mjs` dùng Chrome headless và API fixture như hướng dẫn [feature-completion.md](feature-completion.md). Bao gồm kiểm tra khai báo, admin xem xét, khóa/mở nút thanh toán, Tour Summary 320px và desktop. Kết quả cuối xem [repair-notes.md](repair-notes.md).

Cần kiểm chứng tiếp trên DB thử nghiệm: migration, nhiều request đồng thời vào cùng booking, tác vụ hết hạn, khả năng khôi phục key/backup và toàn bộ giao dịch sandbox. Các con số test hoặc dữ liệu trong ảnh không phải dữ liệu mở bán.
