# Tour mới để import — ngày chuẩn bị 08/10/2026

## Chọn file

- `tours-reference.json`: 3 tour tham khảo địa điểm thật — Bidoup Núi Bà, Lảo Thẩn, Thác K50. Mỗi tour có 2 ngày lịch trình, 2 lịch khởi hành mô phỏng và 3 mục trang bị cá nhân. Thông số chưa đủ bằng chứng để trống, nên radar chưa hiện đủ 5 trục.
- `tour-radar-simulation.json`: 1 tour **giả lập hoàn toàn**, có đủ 5 thông số radar, nguồn, ngày xác minh, yêu cầu tham gia, điều kiện y tế, tỷ lệ hỗ trợ và giờ/điểm đón. Dùng file này nếu muốn kiểm thử toàn bộ phần tổng quan ngay. Không dùng các số liệu này cho một tuyến có thật.

Cả hai là JSON import đúng cấu trúc hiện tại, không phải payload PUT và không cập nhật các tour cũ. Slug có hậu tố `202610` và tiền tố riêng để giảm nguy cơ trùng; chưa đối chiếu database của bạn. Import lại cùng file sẽ bị từ chối vì slug đã tồn tại.

## Dữ liệu tham khảo và phạm vi xác minh

| Tour | Km | Độ cao cao nhất (m) | Khách/guide tham khảo | Nguồn |
|---|---:|---:|---:|---|
| Bidoup Núi Bà | 27 | 2287 | 4 | [Chương trình Bidoup](https://toongadventure.com/tour/bidoup/) |
| Lảo Thẩn | 14 | 2860 | Chưa xác nhận | [Chương trình Lảo Thẩn](https://toongadventure.com/tour/trekking-lao-than-2/) |
| Thác K50 | 9 | 1064 | Chưa xác nhận | [Chương trình K50](https://toongadventure.com/tour/tour-thac-k50-thac-hang-en/) |

Chỉ đối chiếu trang công khai, không khảo sát thực địa. Nguồn được lưu trong từng `sourceNote`; `verifiedOn` là ngày kiểm tra nguồn. Nội dung lịch trình được diễn đạt ngắn gọn, không sao chép toàn bộ chương trình.

- `totalAscentM` là tổng độ cao leo lên tích lũy. Nguồn chỉ ghi “chênh lệch độ cao”, chưa xác nhận cùng định nghĩa nên để null.
- `activeHoursPerDay` là thời gian vận động của ngày dài nhất. Số giờ ở phần tổng quan và lịch chi tiết của nguồn không thống nhất hoặc khác phạm vi đo, nên chưa nhập.
- `medicalAccessHours` để null: nguồn có số giờ nhưng thiếu điểm xuất phát, cơ sở tiếp nhận và điều kiện áp dụng. Không biến một số giờ quảng bá thành cam kết cứu hộ.
- `recommendedMonths` theo mục mùa đẹp/khai thác của nguồn; không bảo đảm thời tiết.
- `customersPerGuide` không phải phân công guide thực tế. Không lấy tên người trên trang nguồn để tự nhận là nhân sự của website.
- Hai ngày của tour là ngày hoạt động tại điểm đến. Chặng xe đêm ngoài hai ngày chưa được mô hình hóa thành thời lượng riêng trong hệ thống.

**Giá, sức chứa, độ khó quy đổi 1–3, lịch tháng 11/2026 và yêu cầu tham gia là cấu hình đồ án**, đã ghi rõ trong các bản ghi. Không phải lịch mở bán, báo giá hay quy định sức khỏe của đơn vị nguồn. Không có quan hệ đại lý/đại diện được xác nhận. Hotline để null, không tạo số điện thoại giả; chưa có hợp đồng bảo hiểm.

## Cách import và kiểm tra

1. Đăng nhập admin → Quản lý tour → Import JSON. Chọn **một trong hai file JSON trên**, xem trước rồi xác nhận. Không chọn README.
2. Mở tour vừa tạo. Kiểm tra tên, mô tả, giá, tổng quan, lịch trình và trang bị **trước khi tạo booking**. Bản ghi được tạo mới và mặc định hiển thị công khai theo flow hiện tại; chỉ dùng bộ dữ liệu này trên website đồ án.
3. Lịch tham khảo có ngày đi 14/11 và 28/11/2026, ngày về kế tiếp; lịch radar giả lập ngày 21–22/11/2026. Nếu import sau các ngày đó, sửa ngày đi thành ngày tương lai, ngày về = ngày đi + 1. Với tour giả lập cũng sửa `pickupAt` tương ứng; đừng đổi ngày xác minh thành tương lai.
4. Chưa có guide được phân công (`guideAssignments: []`), vì không biết mã guide trong database. Sau import, gán guide có thật trong hệ thống qua màn hình phân công, kiểm tra xung đột lịch. Không cần import guide trước để nạp được các file này.
5. Ảnh không nằm trong schema import hiện tại. Upload ảnh bạn có quyền sử dụng qua quản lý ảnh và chọn ảnh bìa; không thêm `bannerUrl` hoặc `images` vào JSON.
6. Chỉ sau khi kiểm tra xong thông tin mới tạo booking thử. Khai báo từng người → admin xem xét → thanh toán sandbox theo flow hiện tại. Không tạo booking ngay rồi mới sửa Adventure Profile: điều kiện khóa 409 vẫn áp dụng cho các tour mới.

Không cần chạy `planner-reviews.sql` để import tour. Bộ dữ liệu này không chạy migration, không ghi database và không thay đổi quy tắc khóa tour.

## Kết quả kiểm tra

Đã chạy cả hai file qua `TourImportService.importFile` và `TourValidation` hiện có bằng Jackson cấu hình strict của importer, repository/service ghi dữ liệu được giả lập. Kiểm tra thêm slug không trùng giữa hai file, đủ từng ngày lịch trình, ngày về khớp thời lượng và đủ năm trục ở tour mô phỏng.

- Bộ tham khảo: đạt; 3 tour, 6 lịch khởi hành, 6 ngày lịch trình, 9 mục trang bị; 13.875 byte.
- Bộ mô phỏng: đạt; 1 tour, 1 lịch khởi hành, 2 ngày lịch trình, 3 mục trang bị; 3.700 byte.

Chưa import vào database thật, chưa kiểm tra trùng slug với dữ liệu hiện có và chưa gán guide. Các lịch có thể hết hạn nếu dùng file về sau.

## Những gì còn phải nhập thủ công

Ảnh bìa/album, phân công guide, liên hệ khẩn cấp thực tế, bảo hiểm, và các thông số thực địa chưa xác nhận không thể tự điền trung thực chỉ từ các trang nguồn. Tour mô phỏng có đủ dữ liệu để kiểm thử giao diện nhưng không thay thế việc thu thập các thông tin này.
