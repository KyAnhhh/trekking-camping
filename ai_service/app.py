import io
import os
import base64
from pathlib import Path
from typing import List, Optional

import cv2
import numpy as np
from PIL import Image
from fastapi import FastAPI, File, UploadFile, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO

# ==============================================================================
# HIKING GEAR OBJECT DETECTION SERVICE (YOLO26 / YOLOv8 - 8 CLASSES)
# ==============================================================================

app = FastAPI(
    title="Trek & Camp - Hiking Gear Vision Service",
    description="Microservice AI nhận diện trang bị trekking/camping sử dụng YOLO26/YOLOv8 8 lớp",
    version="2.0.0"
)

# CORS Middleware for local integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Path to trained weights (Prefers YOLO26, fallback to YOLOv8)
YOLO26_MODEL_PATH = Path(__file__).parent / "models" / "hiking_yolo26_8classes_best.pt"
YOLOV8_MODEL_PATH = Path(__file__).parent / "models" / "hiking_yolov8_8classes_best.pt"
MODEL_PATH = YOLO26_MODEL_PATH if YOLO26_MODEL_PATH.exists() else YOLOV8_MODEL_PATH
MODEL_VERSION = "YOLO26" if MODEL_PATH == YOLO26_MODEL_PATH else "YOLOv8"

CLASS_METADATA = {
    0: {
        "code": "air-mineral",
        "name_vi": "Nước uống / Bình nước dã ngoại",
        "name_en": "Hydration / Water Bottle",
        "category": "HYDRATION",
        "safety_advice": "Duy trì uống từng ngụm nhỏ 15-20 phút một lần, nên bổ sung thêm viên điện giải bù khoáng."
    },
    1: {
        "code": "alat-penerangan",
        "name_vi": "Thiết bị chiếu sáng / Đèn pin đội đầu",
        "name_en": "Headlamp / Lighting",
        "category": "SAFETY",
        "safety_advice": "Kiểm tra pin dự phòng trước khi xuất phát; đèn pin đội đầu giúp giải phóng 2 tay khi di chuyển đêm."
    },
    2: {
        "code": "jaket",
        "name_vi": "Áo khoác giữ nhiệt / Áo gió chống thấm",
        "name_en": "Thermal / Windproof Jacket",
        "category": "CLOTHING",
        "safety_advice": "Nhiệt độ trên núi và ban đêm hạ rất nhanh; luôn mang áo khoác gió có khả năng chống thấm sương mù."
    },
    3: {
        "code": "tas-gunung",
        "name_vi": "Balo leo núi trợ lực",
        "name_en": "Hiking Backpack with Frame",
        "category": "CARRIER",
        "safety_advice": "Cài chặt đai hông và đai ngực để dồn 70% trọng lượng vào xương chậu, giảm áp lực lên vai và cột sống."
    },
    4: {
        "code": "giay-leo-nui",
        "name_vi": "Giày leo núi / Hiking boots chuyên dụng",
        "name_en": "Hiking Boots / Shoes",
        "category": "FOOTWEAR",
        "safety_advice": "Đế gai bám sâu giúp chống trơn trượt trên dốc đá ướt và bảo vệ cổ chân tránh lật sơmi."
    },
    5: {
        "code": "gay-trekking",
        "name_vi": "Gậy trekking trợ lực",
        "name_en": "Trekking Poles",
        "category": "SUPPORT",
        "safety_advice": "Gậy leo núi giúp giảm 25% phản lực lên khớp gối khi xuống dốc và giữ thăng bằng khi qua suối, bùn lầy."
    },
    6: {
        "code": "leu-trai",
        "name_vi": "Lều cắm trại dã ngoại",
        "name_en": "Camping Tent / Shelter",
        "category": "SHELTER",
        "safety_advice": "Cố định cọc lều chắc chắn ngược hướng gió, không dựng lều sát mép vực hoặc ngay lòng suối cạn."
    },
    7: {
        "code": "hop-y-te",
        "name_vi": "Hộp sơ cứu / Túi y tế khẩn cấp",
        "name_en": "First-aid Medical Kit",
        "category": "MEDICAL",
        "safety_advice": "Trang bị băng gạc cá nhân, thuốc sát trùng, thuốc xịt côn trùng/vắt và thuốc giảm đau, hạ sốt cơ bản."
    }
}

# Colors for bounding boxes (BGR)
CLASS_COLORS = [
    (255, 144, 30),   # 0: Blue-ish (Water)
    (0, 215, 255),    # 1: Gold / Yellow (Lighting)
    (50, 168, 82),    # 2: Green (Jacket)
    (180, 105, 255),  # 3: Pink (Backpack)
    (34, 139, 34),    # 4: Forest Green (Hiking Shoes)
    (238, 104, 123),  # 5: Cyan/Blue (Poles)
    (220, 20, 60),    # 6: Crimson (Tent)
    (0, 0, 255)       # 7: Bright Red (First-aid)
]

# Load YOLO Model
model: Optional[YOLO] = None

@app.on_event("startup")
def load_model():
    global model
    if not MODEL_PATH.exists():
        print(f"⚠️ CẢNH BÁO: Chưa tìm thấy file mô hình tại {MODEL_PATH}")
        return
    print(f"🚀 Đang tải mô hình {MODEL_VERSION} từ: {MODEL_PATH}")
    model = YOLO(str(MODEL_PATH))
    print(f"✅ Đã tải mô hình {MODEL_VERSION} thành công! Classes ({len(model.names)}): {model.names}")

@app.get("/health")
def health():
    return {
        "status": "UP",
        "modelLoaded": model is not None,
        "modelVersion": MODEL_VERSION,
        "modelPath": str(MODEL_PATH),
        "classesCount": len(CLASS_METADATA),
        "classes": [CLASS_METADATA[i]["name_vi"] for i in range(len(CLASS_METADATA))]
    }

class DetectedItem(BaseModel):
    classId: int
    rawName: str
    nameVi: str
    nameEn: str
    category: str
    confidence: float
    box: List[float] # [x1, y1, x2, y2]
    safetyAdvice: str

class DetectionResponse(BaseModel):
    status: str
    itemCount: int
    detectedItems: List[DetectedItem]
    annotatedImageBase64: Optional[str] = None
    inferenceTimeMs: float

@app.post("/detect-gear", response_model=DetectionResponse)
async def detect_gear(
    request: Request,
    confidence: float = Query(0.35, ge=0.1, le=0.95),
    drawBoxes: bool = Query(True)
):
    global model
    if model is None:
        if MODEL_PATH.exists():
            model = YOLO(str(MODEL_PATH))
        else:
            raise HTTPException(status_code=503, detail=f"Mô hình {MODEL_VERSION} chưa sẵn sàng trên máy chủ.")

    content_type = request.headers.get("content-type", "")
    if "multipart/form-data" in content_type:
        form = await request.form()
        file = form.get("file")
        if file is None:
            raise HTTPException(status_code=400, detail="Thiếu trường 'file' trong form.")
        contents = await file.read()
    else:
        contents = await request.body()

    if not contents:
        raise HTTPException(status_code=400, detail="Dữ liệu ảnh rỗng.")

    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Không đọc được định dạng ảnh: {str(e)}")

    start_time = cv2.getTickCount()
    
    # Run YOLO prediction
    results = model.predict(image, conf=confidence, verbose=False)
    
    end_time = cv2.getTickCount()
    inference_ms = (end_time - start_time) / cv2.getTickFrequency() * 1000.0

    detected_items: List[DetectedItem] = []
    r = results[0]

    # Convert PIL Image to OpenCV BGR for drawing
    img_bgr = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

    if r.boxes is not None and len(r.boxes) > 0:
        for box in r.boxes:
            cls_id = int(box.cls[0].item())
            conf = float(box.conf[0].item())
            xyxy = box.xyxy[0].tolist() # [x1, y1, x2, y2]
            
            meta = CLASS_METADATA.get(cls_id, {
                "code": f"class_{cls_id}",
                "name_vi": f"Vật phẩm {cls_id}",
                "name_en": f"Item {cls_id}",
                "category": "GENERAL",
                "safety_advice": "Kiểm tra kỹ lưỡng trước chuyến đi."
            })

            detected_items.append(DetectedItem(
                classId=cls_id,
                rawName=meta["code"],
                nameVi=meta["name_vi"],
                nameEn=meta["name_en"],
                category=meta["category"],
                confidence=round(conf, 4),
                box=[round(c, 1) for c in xyxy],
                safetyAdvice=meta["safety_advice"]
            ))

            if drawBoxes:
                x1, y1, x2, y2 = map(int, xyxy)
                color = CLASS_COLORS[cls_id % len(CLASS_COLORS)]
                cv2.rectangle(img_bgr, (x1, y1), (x2, y2), color, 3)

                label_text = f"{meta['name_vi'].split('/')[0].strip()} {conf*100:.0f}%"
                font = cv2.FONT_HERSHEY_SIMPLEX
                font_scale = 0.6
                thickness = 2
                (tw, th), baseline = cv2.getTextSize(label_text, font, font_scale, thickness)

                # Draw label background box
                cv2.rectangle(
                    img_bgr, 
                    (x1, max(0, y1 - th - 10)), 
                    (x1 + tw + 8, y1), 
                    color, 
                    -1
                )
                cv2.putText(
                    img_bgr, 
                    label_text, 
                    (x1 + 4, max(th + 2, y1 - 4)), 
                    font, 
                    font_scale, 
                    (255, 255, 255), 
                    thickness, 
                    cv2.LINE_AA
                )

    annotated_b64 = None
    if drawBoxes:
        _, buffer = cv2.imencode(".jpg", img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
        annotated_b64 = base64.b64encode(buffer).decode("utf-8")

    return DetectionResponse(
        status="SUCCESS",
        itemCount=len(detected_items),
        detectedItems=detected_items,
        annotatedImageBase64=annotated_b64,
        inferenceTimeMs=round(inference_ms, 2)
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8001, reload=False)
