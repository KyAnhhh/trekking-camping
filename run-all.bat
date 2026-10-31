@echo off
setlocal
title Trekking and Camping - Khoi dong toan bo he thong

echo ============================================================
echo   HE THONG TREKKING AND CAMPING - KHOI DONG TOAN BO DICH VU
echo ============================================================
echo.

cd /d "%~dp0"

:: 1. Khoi dong PostgreSQL
echo [1/3] Kiem tra va khoi dong PostgreSQL Database...
call start-postgres.bat

:: 2. Khoi dong Backend trong cua so moi
echo.
echo [2/3] Khoi dong Spring Boot Backend tren port 8080 (cua so moi)...
start "Trekking Camping - Backend" cmd /k "run-backend.bat"

:: 3. Khoi dong Frontend trong cua so moi
echo.
echo [3/3] Khoi dong Vite Frontend tren port 5173 (cua so moi)...
start "Trekking Camping - Frontend" cmd /k "run-frontend.bat"

echo.
echo ============================================================
echo   DA KHOI DONG TAT CA DICH VU THANH CONG!
echo.
echo   - PostgreSQL: localhost:5432 (Database: trekking_camping_db)
echo   - Backend:    http://localhost:8080 (Swagger: http://localhost:8080/swagger-ui.html)
echo   - Frontend:   http://localhost:5173
echo ============================================================
echo.
echo Cua so nay se tu dong dong sau 5 giay. Cac cua so Backend va Frontend van tiep tuc chay.
timeout /t 5 >nul 2>&1
exit /b 0
