@echo off
setlocal
title Trekking and Camping - PostgreSQL Service Controller

echo ============================================================
echo   HE THONG TREKKING AND CAMPING - KHOI DONG POSTGRESQL
echo ============================================================
echo.

set "PG_BIN=C:\Program Files\PostgreSQL\18\bin"
set "PG_DATA=C:\Program Files\PostgreSQL\18\data"

:: 1. Kiem tra thu muc PostgreSQL
if not exist "%PG_BIN%\pg_isready.exe" (
    echo [LOI] Khong tim thay PostgreSQL tai: %PG_BIN%
    echo Vui long kiem tra lai duong dan cai dat PostgreSQL 18 tren may cua ban.
    pause
    exit /b 1
)

:: 2. Kiem tra xem PostgreSQL da dang chay hay chua
"%PG_BIN%\pg_isready.exe" -h localhost -p 5432 -U postgres >nul 2>&1
if not errorlevel 1 (
    echo [THANH CONG] PostgreSQL da dang chay san sang tren localhost:5432!
    goto :show_info
)

:: 3. Neu chua chay, thu khoi dong qua Windows Service truoc (neu co quyen Admin)
echo Dang thu khoi dong qua Windows Service 'postgresql-x64-18'...
net start postgresql-x64-18 >nul 2>&1
if not errorlevel 1 (
    echo [THANH CONG] Da khoi dong PostgreSQL Service thanh cong!
    goto :show_info
)

:: 4. Neu khong co quyen Admin de start Service, khoi dong truc tiep bang pg_ctl
echo Dang khoi dong PostgreSQL Server bang pg_ctl...
"%PG_BIN%\pg_ctl.exe" start -D "%PG_DATA%" -w
if errorlevel 1 (
    echo.
    echo [LOI] Khong the khoi dong PostgreSQL bang pg_ctl!
    echo Vui long kiem tra thu muc log tai: %PG_DATA%\log
    pause
    exit /b 1
)

echo [THANH CONG] PostgreSQL da khoi dong thanh cong!

:show_info
echo.
echo ============================================================
echo   THONG TIN KET NOI DATABASE:
echo   - Host:     localhost
echo   - Port:     5432
echo   - Database: trekking_camping_db
echo   - User:     postgres
echo   - Password: kyanh3305
echo ============================================================
echo.
echo Meo: De PostgreSQL tu dong chay moi khi bat may tinh:
echo Mo cmd voi quyen Administrator va chay:
echo    sc config postgresql-x64-18 start= auto
echo ============================================================
echo.
timeout /t 3 >nul 2>&1
exit /b 0
