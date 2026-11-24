import json
import os

notebook = {
    "nbformat": 4,
    "nbformat_minor": 0,
    "metadata": {
        "colab": {
            "name": "train_hiking_yolov8_8classes.ipynb",
            "provenance": [],
            "gpuType": "T4"
        },
        "kernelspec": {
            "name": "python3",
            "display_name": "Python 3"
        },
        "language_info": {
            "name": "python"
        },
        "accelerator": "GPU"
    },
    "cells": [
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "# 🏔️ HUẤN LUYỆN MÔ HÌNH NHẬN DIỆN TRANG BỊ TREKKING 8 LỚP (YOLOv8)\n",
                "### 🎓 Đồ án Tốt nghiệp Hệ thống Trek & Camp - AI Nhận diện Trang bị\n",
                "---\n",
                "Quy trình tự động gồm:\n",
                "1. **Cài đặt môi trường & kiểm tra GPU T4**.\n",
                "2. **Kết nối Google Drive / Nạp file zip dataset 346 MB** (tự động đợi tải 100% chống lỗi `BadZipFile`).\n",
                "3. **Giải nén & Chuẩn hóa nhãn** từ OBB (8 điểm) sang Bounding Box chuẩn (`cx cy w h`).\n",
                "4. **Tạo cấu hình huấn luyện 8 lớp** (`dataset_8classes.yaml`).\n",
                "5. **Huấn luyện mô hình YOLOv8 Nano** (50 Epochs trên GPU T4).\n",
                "6. **Xuất đồ thị kết quả & Tự động tải file `.pt`** về máy tính."
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 1️⃣ Kiểm tra GPU & Cài đặt Thư viện"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "!pip install -q ultralytics pyyaml opencv-python matplotlib\n",
                "\n",
                "import torch\n",
                "import os\n",
                "import sys\n",
                "import time\n",
                "import glob\n",
                "import shutil\n",
                "import zipfile\n",
                "import yaml\n",
                "from pathlib import Path\n",
                "\n",
                "if torch.cuda.is_available():\n",
                "    print(f\"✅ Đang dùng GPU: {torch.cuda.get_device_name(0)}\")\n",
                "else:\n",
                "    print(\"⚠️ CẢNH BÁO: Chưa bật GPU! Hãy vào menu: Runtime -> Change runtime type -> Chọn T4 GPU\")"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 2️⃣ (Tuỳ chọn Khuyên dùng) Kết nối Google Drive\n",
                "> **Mẹo hay**: Nếu bạn tải file zip 346MB lên Google Drive (thư mục `My Drive`), bạn chỉ cần chạy ô này để nạp dữ liệu trong **2 giây**, không cần mất thời gian chờ upload qua trình duyệt!"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "# Nếu bạn đã để file zip trên Google Drive, hãy bỏ comment dòng dưới để kết nối:\n",
                "try:\n",
                "    from google.colab import drive\n",
                "    drive.mount('/content/drive')\n",
                "    print(\"✅ Đã kết nối Google Drive thành công!\")\n",
                "except Exception as e:\n",
                "    print(\"💡 Bỏ qua kết nối Google Drive (sẽ tìm file trực tiếp trong /content/)\")"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 3️⃣ Nạp File Zip & Tự động Giải nén (Chống lỗi `BadZipFile`)\n",
                "> Ô này sẽ tự động kiểm tra xem file zip đã tải lên đủ 100% dung lượng (~330 MB) hay chưa trước khi giải nén, tránh tuyệt đối lỗi file bị hỏng do upload dở."
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "RAW_EXTRACT_DIR = Path(\"/content/raw_base_dataset\")\n",
                "BASE_DIR = Path(\"/content/dataset_8classes\")\n",
                "\n",
                "# 1. Tìm kiếm file zip\n",
                "zip_candidates = glob.glob(\"/content/*.zip\") + glob.glob(\"/content/drive/MyDrive/*.zip\") + glob.glob(\"/content/drive/MyDrive/*hiking*.zip\")\n",
                "selected_zip = None\n",
                "\n",
                "for z in zip_candidates:\n",
                "    if \"hiking\" in os.path.basename(z).lower() or \"roboflow\" in os.path.basename(z).lower():\n",
                "        selected_zip = z\n",
                "        break\n",
                "if not selected_zip and zip_candidates:\n",
                "    selected_zip = zip_candidates[0]\n",
                "\n",
                "# 2. Nếu chưa thấy file zip, yêu cầu upload trực tiếp\n",
                "if not selected_zip:\n",
                "    print(\"⚠️ Chưa thấy file zip dataset trong /content/ hoặc Google Drive!\")\n",
                "    print(\"👉 Bấm nút 'Choose Files' bên dưới để tải file zip từ máy tính của bạn:\")\n",
                "    from google.colab import files\n",
                "    uploaded = files.upload()\n",
                "    for fn in uploaded.keys():\n",
                "        if fn.endswith('.zip'):\n",
                "            selected_zip = os.path.join(\"/content\", fn)\n",
                "            break\n",
                "\n",
                "if not selected_zip or not os.path.exists(selected_zip):\n",
                "    raise FileNotFoundError(\"❌ Vui lòng kéo thả file zip dataset vào mục Files bên trái hoặc tải lên rồi chạy lại ô này!\")\n",
                "\n",
                "print(f\"📦 Đang kiểm tra file: {selected_zip}...\")\n",
                "\n",
                "# 3. Vòng lặp chờ file upload hoàn tất 100% (chống lỗi BadZipFile do mạng chậm/upload dở)\n",
                "last_size = -1\n",
                "valid_zip = False\n",
                "\n",
                "for _ in range(60): # Chờ tối đa 3-5 phút nếu đang upload\n",
                "    if not os.path.exists(selected_zip):\n",
                "        time.sleep(2)\n",
                "        continue\n",
                "    \n",
                "    cur_size = os.path.getsize(selected_zip)\n",
                "    try:\n",
                "        with zipfile.ZipFile(selected_zip, 'r') as zf:\n",
                "            names = zf.namelist()\n",
                "            if len(names) > 0:\n",
                "                print(f\"✅ File zip hoàn chỉnh và hợp lệ ({cur_size / (1024*1024):.1f} MB, {len(names)} tệp bên trong)!\")\n",
                "                valid_zip = True\n",
                "                break\n",
                "    except zipfile.BadZipFile:\n",
                "        # Kiểm tra nếu kích thước file không tăng nữa (bị đứt mạng giữa chừng)\n",
                "        if cur_size == last_size and cur_size > 0:\n",
                "            print(f\"\\n❌ LỖI: File zip trên Colab chỉ có {cur_size / (1024*1024):.1f} MB (kích thước chuẩn là ~330 MB).\")\n",
                "            print(\"👉 Nguyên nhân: Quá trình upload qua trình duyệt bị đứt mạng giữa chừng nên file bị cụt (BadZipFile).\")\n",
                "            print(\"👉 CÁCH KHẮC PHỤC TRIỆT ĐỂ: Hãy tải file zip này lên Google Drive của bạn, sau đó chạy lại ô số 2 (Mount Drive) là xong ngay!\")\n",
                "            raise RuntimeError(\"File zip bị hỏng/cụt do upload chưa xong. Hãy upload lại lên Google Drive!\")\n",
                "        \n",
                "        print(f\"⏳ File đang được upload lên Colab... Đã nhận: {cur_size / (1024*1024):.1f} MB / ~330 MB. Đang chờ 100%...\")\n",
                "        last_size = cur_size\n",
                "        time.sleep(4)\n",
                "\n",
                "if not valid_zip:\n",
                "    raise RuntimeError(\"Hết thời gian chờ upload. Vui lòng thử lại!\")\n",
                "\n",
                "# 4. Giải nén nhanh bằng lệnh hệ thống\n",
                "print(\"⏳ Đang giải nén dữ liệu...\")\n",
                "if RAW_EXTRACT_DIR.exists(): shutil.rmtree(RAW_EXTRACT_DIR)\n",
                "RAW_EXTRACT_DIR.mkdir(parents=True, exist_ok=True)\n",
                "\n",
                "!unzip -q -o \"{selected_zip}\" -d \"{RAW_EXTRACT_DIR}\"\n",
                "print(\"✅ Đã giải nén xong thư mục gốc!\")"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 4️⃣ Chuẩn hóa Nhãn OBB sang Bounding Box Chuẩn & Tạo Dataset 8 Lớp"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "RAW_EXTRACT_DIR = Path(\"/content/raw_base_dataset\")\n",
                "BASE_DIR = Path(\"/content/dataset_8classes\")\n",
                "\n",
                "# Hàm chuyển đổi nhãn OBB (8 điểm) sang Bounding Box chuẩn [cx, cy, w, h]\n",
                "def obb_to_standard_bbox(coords):\n",
                "    xs = coords[0::2]\n",
                "    ys = coords[1::2]\n",
                "    xmin, xmax = min(xs), max(xs)\n",
                "    ymin, ymax = min(ys), max(ys)\n",
                "    cx = (xmin + xmax) / 2.0\n",
                "    cy = (ymin + ymax) / 2.0\n",
                "    w = xmax - xmin\n",
                "    h = ymax - ymin\n",
                "    return cx, cy, w, h\n",
                "\n",
                "# Tìm thư mục gốc chứa train/images\n",
                "subdirs = [p for p in RAW_EXTRACT_DIR.rglob(\"train/images\") if p.is_dir()]\n",
                "data_root = subdirs[0].parent.parent if subdirs else RAW_EXTRACT_DIR\n",
                "print(f\"📁 Đọc ảnh và nhãn từ: {data_root}\")\n",
                "\n",
                "if BASE_DIR.exists(): shutil.rmtree(BASE_DIR)\n",
                "for split in ['train', 'valid', 'test']:\n",
                "    (BASE_DIR / split / 'images').mkdir(parents=True, exist_ok=True)\n",
                "    (BASE_DIR / split / 'labels').mkdir(parents=True, exist_ok=True)\n",
                "\n",
                "total_copied = 0\n",
                "for split in ['train', 'valid', 'test']:\n",
                "    src_img_dir = data_root / split / 'images'\n",
                "    src_lbl_dir = data_root / split / 'labels'\n",
                "    if not src_img_dir.exists(): continue\n",
                "    \n",
                "    for img_path in src_img_dir.glob(\"*.*\"):\n",
                "        if img_path.suffix.lower() not in ['.jpg', '.jpeg', '.png', '.webp', '.bmp']: continue\n",
                "        \n",
                "        dest_img = BASE_DIR / split / 'images' / img_path.name\n",
                "        shutil.copy(img_path, dest_img)\n",
                "        \n",
                "        lbl_path = src_lbl_dir / (img_path.stem + \".txt\")\n",
                "        dest_lbl = BASE_DIR / split / 'labels' / (img_path.stem + \".txt\")\n",
                "        \n",
                "        if lbl_path.exists():\n",
                "            converted_lines = []\n",
                "            with open(lbl_path, 'r', encoding='utf-8') as f:\n",
                "                for line in f:\n",
                "                    parts = line.strip().split()\n",
                "                    if not parts: continue\n",
                "                    cls_id = int(parts[0])\n",
                "                    coords = [float(x) for x in parts[1:]]\n",
                "                    if len(coords) == 8:\n",
                "                        cx, cy, w, h = obb_to_standard_bbox(coords)\n",
                "                        converted_lines.append(f\"{cls_id} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}\\n\")\n",
                "                    elif len(coords) == 4:\n",
                "                        converted_lines.append(line + \"\\n\")\n",
                "            with open(dest_lbl, 'w', encoding='utf-8') as f:\n",
                "                f.writelines(converted_lines)\n",
                "        else:\n",
                "            dest_lbl.touch()\n",
                "        total_copied += 1\n",
                "\n",
                "train_count = len(list((BASE_DIR / 'train' / 'images').glob('*.*')))\n",
                "val_count = len(list((BASE_DIR / 'valid' / 'images').glob('*.*')))\n",
                "print(f\"\\n✅ CHUẨN HÓA DATASET THÀNH CÔNG:\")\n",
                "print(f\"   - Tập Train: {train_count} ảnh\")\n",
                "print(f\"   - Tập Valid: {val_count} ảnh\")\n",
                "print(f\"   - Tổng cộng: {total_copied} ảnh\")\n",
                "\n",
                "if train_count == 0:\n",
                "    raise RuntimeError(\"❌ Lỗi: Thư mục train không có ảnh nào! Hãy kiểm tra lại file zip tải lên.\")"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 5️⃣ Sinh File Cấu hình `dataset_8classes.yaml`"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import yaml\n",
                "from pathlib import Path\n",
                "\n",
                "BASE_DIR = Path(\"/content/dataset_8classes\")\n",
                "YAML_PATH = \"/content/dataset_8classes.yaml\"\n",
                "\n",
                "yaml_data = {\n",
                "    'path': str(BASE_DIR),\n",
                "    'train': 'train/images',\n",
                "    'val': 'valid/images',\n",
                "    'test': 'test/images',\n",
                "    'names': {\n",
                "        0: 'air-mineral',        # Nước uống / Bình nước\n",
                "        1: 'alat-penerangan',   # Đèn pin đội đầu / Chiếu sáng\n",
                "        2: 'jaket',             # Áo khoác / Áo ấm dã ngoại\n",
                "        3: 'tas-gunung',        # Balo leo núi trợ lực\n",
                "        4: 'giay-leo-nui',      # Giày leo núi / Hiking boots\n",
                "        5: 'gay-trekking',      # Gậy trekking\n",
                "        6: 'leu-trai',          # Lều cắm trại dã ngoại\n",
                "        7: 'hop-y-te'           # Hộp y tế / Túi sơ cứu khẩn cấp\n",
                "    }\n",
                "}\n",
                "\n",
                "with open(YAML_PATH, 'w', encoding='utf-8') as f:\n",
                "    yaml.dump(yaml_data, f, sort_keys=False, allow_unicode=True)\n",
                "\n",
                "print(f\"✅ Đã tạo cấu hình 8 danh mục tại: {YAML_PATH}\")\n",
                "print(open(YAML_PATH, 'r', encoding='utf-8').read())"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 6️⃣ Huấn luyện Mô hình YOLOv8 Nano (50 Epochs)"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import torch\n",
                "from pathlib import Path\n",
                "from ultralytics import YOLO\n",
                "\n",
                "BASE_DIR = Path(\"/content/dataset_8classes\")\n",
                "YAML_PATH = \"/content/dataset_8classes.yaml\"\n",
                "\n",
                "train_images = list((BASE_DIR / 'train' / 'images').glob('*.*'))\n",
                "assert len(train_images) > 0, \"Thư mục train không có ảnh! Hãy chạy lại bước 3.\"\n",
                "\n",
                "print(f\"🚀 Sẵn sàng huấn luyện với {len(train_images)} ảnh train...\")\n",
                "model = YOLO('yolov8n.pt')\n",
                "\n",
                "print(\"🔥 Bắt đầu huấn luyện 50 Epochs trên GPU...\")\n",
                "results = model.train(\n",
                "    data=YAML_PATH,\n",
                "    epochs=50,\n",
                "    imgsz=640,\n",
                "    batch=16,\n",
                "    optimizer='AdamW',\n",
                "    lr0=0.001,\n",
                "    device=0 if torch.cuda.is_available() else 'cpu',\n",
                "    project=\"hiking_8classes_project\",\n",
                "    name=\"run_yolov8_8classes\",\n",
                "    exist_ok=True,\n",
                "    plots=True\n",
                ")\n",
                "\n",
                "print(\"🎉 HUẤN LUYỆN THÀNH CÔNG RỰC RỠ!\")"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 7️⃣ Hiển thị Đồ thị Đánh giá (Dùng cho Báo cáo Đồ án)"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import os\n",
                "from IPython.display import Image, display\n",
                "\n",
                "res_plot = \"hiking_8classes_project/run_yolov8_8classes/results.png\"\n",
                "cm_plot = \"hiking_8classes_project/run_yolov8_8classes/confusion_matrix.png\"\n",
                "\n",
                "if os.path.exists(res_plot):\n",
                "    print(\"📊 ĐỒ THỊ HUẤN LUYỆN LOSS VÀ mAP:\")\n",
                "    display(Image(filename=res_plot, width=900))\n",
                "\n",
                "if os.path.exists(cm_plot):\n",
                "    print(\"🎯 MA TRẬN NHẦM LẪN (CONFUSION MATRIX):\")\n",
                "    display(Image(filename=cm_plot, width=700))"
            ]
        },
        {
            "cell_type": "markdown",
            "metadata": {},
            "source": [
                "## 8️⃣ Xuất Mô hình & Tự động Tải Về Máy Tính"
            ]
        },
        {
            "cell_type": "code",
            "execution_count": None,
            "metadata": {},
            "outputs": [],
            "source": [
                "import os\n",
                "import shutil\n",
                "from google.colab import files\n",
                "\n",
                "best_pt = \"hiking_8classes_project/run_yolov8_8classes/weights/best.pt\"\n",
                "target_pt = \"/content/hiking_yolov8_8classes_best.pt\"\n",
                "\n",
                "if os.path.exists(best_pt):\n",
                "    shutil.copy(best_pt, target_pt)\n",
                "    print(f\"✅ Đã xuất mô hình: {target_pt}\")\n",
                "    print(\"📥 Đang tải file về máy tính của bạn...\")\n",
                "    files.download(target_pt)\n",
                "else:\n",
                "    print(f\"⚠️ Chưa tìm thấy file: {best_pt}\")"
            ]
        }
    ]
}

notebook_path = 'ai_service/train_colab/train_hiking_yolov8_8classes.ipynb'
with open(notebook_path, 'w', encoding='utf-8') as f:
    json.dump(notebook, f, ensure_ascii=False, indent=2)

print(f"Upgraded notebook saved to: {notebook_path}")
