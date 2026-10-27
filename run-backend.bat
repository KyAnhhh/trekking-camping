@echo off
setlocal
title Trekking and Camping - Backend Server

cd /d "%~dp0backend"

echo ============================================================
echo   HE THONG TREKKING AND CAMPING - KHOI DONG BACKEND [PORT 8080]
echo ============================================================
echo Thu muc lam viec: %CD%
echo.

:: 1. Kiem tra Java
where java >nul 2>&1
if errorlevel 1 goto :err_no_java

echo [1/3] Kiem tra phien ban Java:
java -version
echo.

:: 2. Kiem tra file cau hinh .env
if not exist ".env" goto :warn_no_env
echo [2/3] Da tim thay file cau hinh: backend\.env
goto :check_maven

:warn_no_env
echo [CANH BAO] Khong tim thay file backend\.env!
echo Backend co the thieu cac bien moi truong nhu DB_URL, DB_USERNAME, DB_PASSWORD.
echo.

:check_maven
:: 3. Xac dinh Maven Wrapper hoac Maven toan cuc
if exist "mvnw.cmd" goto :use_mvnw
where mvn >nul 2>&1
if not errorlevel 1 goto :use_mvn
goto :err_no_mvn

:use_mvnw
set "MVN_EXEC=mvnw.cmd"
echo [3/3] Su dung Maven Wrapper cuc bo: backend\mvnw.cmd
goto :start_backend

:use_mvn
set "MVN_EXEC=mvn"
echo [3/3] Su dung Apache Maven he thong: mvn
goto :start_backend

:start_backend
echo.
echo ============================================================
echo   DANG KHOI DONG SPRING BOOT BACKEND...
echo   Nhan Ctrl+C de dung may chu.
echo ============================================================
echo.

call %MVN_EXEC% spring-boot:run
if errorlevel 1 goto :err_backend_stopped
exit /b 0

:err_no_java
echo.
echo [LOI] Khong tim thay Java trong bien moi truong PATH!
echo Du an yeu cau Java 21 [JDK 21] de bien dich va chay ung dung.
echo Vui long cai dat JDK 21 va thiet lap JAVA_HOME / PATH.
echo.
pause
exit /b 1

:err_no_mvn
echo.
echo [LOI] Khong tim thay Maven Wrapper [mvnw.cmd] hoac Maven [mvn] trong PATH!
echo Vui long kiem tra lai thu muc backend hoac cai dat Apache Maven.
echo.
pause
exit /b 1

:err_backend_stopped
echo.
echo [LOI] Backend server da dung lai hoac gap su co khoi dong [Exit code: %errorlevel%].
echo Vui long kiem tra thong diep loi phia tren.
echo.
pause
exit /b %errorlevel%
