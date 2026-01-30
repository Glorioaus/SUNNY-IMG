@echo off
echo Starting SUNNY Particle Show...
echo.

REM 设置Python路径
set PYTHON_PATH=G:\aiserver\aiserver\python.exe

REM 检查Python是否存在
if not exist "%PYTHON_PATH%" (
    echo Error: Python not found at specified path.
    echo Path: %PYTHON_PATH%
    pause
    exit /b 1
)

REM 检查Node.js是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo Starting backend server...
cd ../backend
start "Backend Server" cmd /k "npm install && node server.js"
timeout /t 3 /nobreak >nul

echo Starting frontend server...
start "Frontend Server" cmd /k "%PYTHON_PATH% -m http.server 8099"
timeout /t 2 /nobreak >nul

echo Opening browser...
start http://localhost:8099

echo.
echo SUNNY Particle Show is starting!
echo Backend: http://localhost:3000
echo Frontend: http://localhost:8099
echo Press any key to exit...
pause >nul