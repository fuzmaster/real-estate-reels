@echo off
title Genera Reels Web
cd /d "%~dp0"

:: Install server dependencies if needed
if not exist "node_modules" (
    echo Installing server dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo Setup failed. Make sure Node.js is installed: https://nodejs.org
        pause
        exit /b 1
    )
)

:: Install Remotion dependencies if needed
if not exist "remotion\node_modules" (
    echo Installing Remotion dependencies ^(this takes a minute the first time^)...
    cd /d "%~dp0remotion"
    call npm install
    if errorlevel 1 (
        echo.
        echo Remotion setup failed.
        pause
        exit /b 1
    )
    cd /d "%~dp0"
)

echo.
echo  Starting Genera Reels Web...
echo  Open http://localhost:3000 in your browser.
echo.
echo  Press Ctrl+C to stop the server.
echo.
npm start
pause
