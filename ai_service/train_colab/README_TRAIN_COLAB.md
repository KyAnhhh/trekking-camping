# HƯỚNG DẪN HUẤN LUYỆN YOLOv8 8 LỚP TRÊN GOOGLE COLAB
**Đồ án Tốt nghiệp: Hệ thống Trek & Camp - AI Nhận diện Trang bị Trekking**

---

### 1. Chuẩn bị file
Bạn đã có sẵn 2 file trong thư mục `Downloads`:
1. File dataset gốc: `hiking-equipment-object-detection-v2.v1i.yolov8-obb.zip` (346 MB)
2. File Notebook Colab: `train_hiking_yolov8_8classes.ipynb` (hoặc lấy từ `ai_service/train_colab/train_hiking_yolov8_8classes.ipynb`)

---

### 2. Các bước chạy trên Google Colab (Mất khoảng 15 – 25 phút)

#### Bước 1: Mở Google Colab & Tải Notebook lên
1. Truy cập: [https://colab.research.google.com/](https://colab.research.google.com/)
2. Đăng nhập tài khoản Google của bạn.
3. Trong bảng hiện ra, chọn tab **Upload** (Tải lên) $\rightarrow$ Chọn file `train_hiking_yolov8_8classes.ipynb` từ thư mục `Downloads`.

#### Bước 2: Bật GPU miễn phí (Bắt buộc để train nhanh)
1. Trên thanh menu của Colab, chọn: **Runtime** $\rightarrow$ **Change runtime type** (Thay đổi loại phần cứng).
2. Tại mục **Hardware accelerator**, chọn: **T4 GPU**.
3. Bấm **Save** (Lưu).

#### Bước 3: Tải file dữ liệu zip lên Colab
1. Ở thanh công cụ bên trái của Colab, bấm vào biểu tượng **Thư mục (Files)** 📁.
2. Bấm nút **Upload to session storage** (biểu tượng trang giấy có mũi tên hướng lên) hoặc kéo thả trực tiếp file `hiking-equipment-object-detection-v2.v1i.yolov8-obb.zip` vào đó.
3. Chờ thanh vòng tròn tải xong 100% (file nằm tại `/content/hiking-equipment-object-detection-v2.v1i.yolov8-obb.zip`).

#### Bước 4: Chạy Notebook (Run All)
1. Chọn menu: **Runtime** $\rightarrow$ **Run all** (hoặc ấn tổ hợp phím `Ctrl + F9`).
2. Notebook sẽ tự động:
   - Cài đặt Ultralytics YOLOv8.
   - Giải nén và tự động chuyển đổi nhãn từ OBB (8 điểm) sang Standard Bounding Box.
   - Thiết lập cấu hình 8 danh mục trang bị:
     - `0: air-mineral` (Nước uống)
     - `1: alat-penerangan` (Đèn pin)
     - `2: jaket` (Áo khoác ấm)
     - `3: tas-gunung` (Balo leo núi)
     - `4: giay-leo-nui` (Giày leo núi / Hiking boots)
     - `5: gay-trekking` (Gậy trekking)
     - `6: leu-trai` (Lều cắm trại)
     - `7: hop-y-te` (Hộp sơ cứu khẩn cấp)
   - Chạy huấn luyện 50 Epochs trên GPU T4.
   - Hiển thị đồ thị ma trận nhầm lẫn (`confusion_matrix.png`) và đồ thị Loss/mAP (`results.png`) – **bạn hãy lưu lại 2 ảnh này để chèn vào Báo cáo Đồ án!**

#### Bước 5: Nhận file kết quả
- Ở ô cuối cùng, Colab sẽ tự động xuất và tải file **`hiking_yolov8_8classes_best.pt`** về máy tính của bạn!
- Bạn chỉ cần copy file này vào thư mục `ai_service` của dự án để hệ thống tự động nhận diện cả 8 danh mục!
