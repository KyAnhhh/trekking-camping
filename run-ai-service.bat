@echo off
setlocal enabledelayedexpansion
title Trekking and Camping - AI Vision Service (YOLO26)

cd /d "%~dp0ai_service"

echo ============================================================
echo   TREK ^& CAMP - AI GEAR VISION SERVICE (YOLO26) [PORT 8001]
echo ============================================================
echo Thu muc lam viec: %CD%
echo.

where python >nul 2>&1
if errorlevel 1 (
    echo [LOI] Khong tim thay Python trong PATH. Vui long cai dat Python 3.10+
    pause
    exit /b 1
)

echo [1/2] Kiem tra phien ban Python:
python --version
echo.

if not exist "models\hiking_yolo26_8classes_best.pt" if not exist "models\hiking_yolov8_8classes_best.pt" (
    echo [CANH BAO] Chua tim thay models\hiking_yolo26_8classes_best.pt hoac models\hiking_yolov8_8classes_best.pt
    echo Vui long dam bao file mo hinh da duoc sao chep vao ai_service\models\
    pause
)

echo [2/2] Khoi dong FastAPI Uvicorn Server tren cong 8001...
echo Truy cap tai lieu API Swagger tai: http://127.0.0.1:8001/docs
echo.

python -m uvicorn app:app --host 127.0.0.1 --port 8001
pause
