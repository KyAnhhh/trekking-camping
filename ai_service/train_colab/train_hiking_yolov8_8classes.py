#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HIKING & TREKKING GEAR 8-CLASS OBJECT DETECTION (YOLOv8)
Trained for Trek & Camp Graduation Thesis

Classes:
  0: air-mineral        (Nước uống / Bình nước)
  1: alat-penerangan   (Thiết bị chiếu sáng / Đèn pin)
  2: jaket             (Áo khoác / Áo ấm)
  3: tas-gunung        (Balo leo núi)
  4: giay-leo-nui      (Giày leo núi / Hiking boots)
  5: gay-trekking      (Gậy leo núi / Trekking poles)
  6: leu-trai          (Lều cắm trại dã ngoại)
  7: hop-y-te          (Hộp y tế sơ cứu / First-aid kit)
"""

import os
import shutil
import zipfile
import yaml
from pathlib import Path

def obb_to_standard_bbox(coords):
    """Chuyển đổi 8 toạ độ OBB [x1, y1, x2, y2, x3, y3, x4, y4] thành [cx, cy, w, h]"""
    xs = coords[0::2]
    ys = coords[1::2]
    xmin, xmax = min(xs), max(xs)
    ymin, ymax = min(ys), max(ys)
    cx = (xmin + xmax) / 2.0
    cy = (ymin + ymax) / 2.0
    w = xmax - xmin
    h = ymax - ymin
    return cx, cy, w, h

def main():
    base_dir = Path("/content/dataset_8classes")
    for split in ['train', 'valid', 'test']:
        (base_dir / split / 'images').mkdir(parents=True, exist_ok=True)
        (base_dir / split / 'labels').mkdir(parents=True, exist_ok=True)

    zip_path = "/content/hiking-equipment-object-detection-v2.v1i.yolov8-obb.zip"
    if os.path.exists(zip_path):
        print(f"Giải nén {zip_path}...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall("/content/raw_base_dataset")

    # Sao chép và chuẩn hóa nhãn 4 lớp gốc
    raw_dir = Path("/content/raw_base_dataset")
    if raw_dir.exists():
        for split in ['train', 'valid', 'test']:
            src_img_dir = raw_dir / split / 'images'
            src_lbl_dir = raw_dir / split / 'labels'
            if not src_img_dir.exists(): continue
            for img_path in src_img_dir.glob("*.*"):
                shutil.copy(img_path, base_dir / split / 'images' / img_path.name)
                lbl_path = src_lbl_dir / (img_path.stem + ".txt")
                if lbl_path.exists():
                    lines = []
                    with open(lbl_path, 'r', encoding='utf-8') as f:
                        for line in f:
                            parts = line.strip().split()
                            if not parts: continue
                            cls_id = int(parts[0])
                            coords = [float(x) for x in parts[1:]]
                            if len(coords) == 8:
                                cx, cy, w, h = obb_to_standard_bbox(coords)
                                lines.append(f"{cls_id} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}\n")
                            else:
                                lines.append(line)
                    with open(base_dir / split / 'labels' / (img_path.stem + ".txt"), 'w', encoding='utf-8') as f:
                        f.writelines(lines)
        print("Đã chuẩn hóa xong 4 lớp ban đầu.")

    # Tạo dataset_8classes.yaml
    yaml_config = {
        'path': str(base_dir),
        'train': 'train/images',
        'val': 'valid/images',
        'test': 'test/images',
        'names': {
            0: 'air-mineral',
            1: 'alat-penerangan',
            2: 'jaket',
            3: 'tas-gunung',
            4: 'giay-leo-nui',
            5: 'gay-trekking',
            6: 'leu-trai',
            7: 'hop-y-te'
        }
    }
    yaml_path = "/content/dataset_8classes.yaml"
    with open(yaml_path, 'w', encoding='utf-8') as f:
        yaml.dump(yaml_config, f, sort_keys=False, allow_unicode=True)

    print(f"File YAML đã được tạo tại {yaml_path}")
    print("Sẵn sàng huấn luyện qua Ultralytics YOLOv8!")

if __name__ == '__main__':
    main()
