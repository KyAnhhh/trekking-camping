@echo off
setlocal
title Trekking and Camping - Frontend Server

cd /d "%~dp0frontend"

echo ============================================================
echo   HE THONG TREKKING AND CAMPING - KHOI DONG FRONTEND [PORT 5173]
echo ============================================================
echo Thu muc lam viec: %CD%
echo.

:: 1. Kiem tra Node.js
where node >nul 2>&1
if errorlevel 1 goto :err_no_node

echo [1/4] Kiem tra phien ban Node.js:
node -v
echo.

:: 2. Kiem tra package.json
if not exist "package.json" goto :err_no_package_json
echo [2/4] Da tim thay: frontend\package.json

:: 3. Kiem tra thu muc node_modules
if not exist "node_modules\" goto :err_no_modules
echo [3/4] Da tim thay thu muc: frontend\node_modules

:: 4. Xac dinh package manager dua tren lockfile
if exist "package-lock.json" goto :check_npm_lock
if exist "yarn.lock" goto :check_yarn_lock
goto :check_default_pm

:check_npm_lock
where npm >nul 2>&1
if not errorlevel 1 (
    set "RUN_CMD=npm run dev"
    echo [4/4] Phat hien package-lock.json - Su dung: npm run dev
    goto :start_frontend
)
goto :check_yarn_lock

:check_yarn_lock
where yarn >nul 2>&1
if not errorlevel 1 (
    set "RUN_CMD=yarn dev"
    echo [4/4] Phat hien yarn.lock - Su dung: yarn dev
    goto :start_frontend
)
goto :check_default_pm

:check_default_pm
where npm >nul 2>&1
if not errorlevel 1 (
    set "RUN_CMD=npm run dev"
    echo [4/4] Mac dinh su dung: npm run dev
    goto :start_frontend
)
where yarn >nul 2>&1
if not errorlevel 1 (
    set "RUN_CMD=yarn dev"
    echo [4/4] Mac dinh su dung: yarn dev
    goto :start_frontend
)
goto :err_no_pm

:start_frontend
echo.
echo ============================================================
echo   DANG KHOI CHAY VITE FRONTEND DEV SERVER...
echo   Nhan Ctrl+C de dung may chu.
echo ============================================================
echo.

call %RUN_CMD%
if errorlevel 1 goto :err_frontend_stopped
exit /b 0

:err_no_node
echo.
echo [LOI] Khong tim thay Node.js trong bien moi truong PATH!
echo Vui long cai dat Node.js [khuyen nghi v20.x hoac v22.x LTS] tu https://nodejs.org
echo.
pause
exit /b 1

:err_no_package_json
echo.
echo [LOI] Khong tim thay file package.json trong thu muc frontend!
echo.
pause
exit /b 1

:err_no_modules
echo.
echo [LOI] Thu muc node_modules chua ton tai!
echo Du an chua duoc cai dat thu vien phu thuoc.
echo Vui long mo Command Prompt tai thu muc frontend va chay lenh:
echo     npm install
echo.
pause
exit /b 1

:err_no_pm
echo.
echo [LOI] Khong tim thay npm hoac yarn trong PATH!
echo Vui long kiem tra lai bo cai dat Node.js tren may tinh.
echo.
pause
exit /b 1

:err_frontend_stopped
echo.
echo [LOI] Frontend server da dung lai hoac gap su co [Exit code: %errorlevel%].
echo Vui long kiem tra thong diep loi phia tren.
echo.
pause
exit /b %errorlevel%
