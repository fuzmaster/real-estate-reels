@echo off
title Real Estate Reels Web
cd /d "%~dp0"

if not exist "node_modules" (
    echo Installing server dependencies...
    call npm install
    if errorlevel 1 goto fail
)

if not exist "client\node_modules" (
    echo Installing client dependencies...
    call npm install --prefix client
    if errorlevel 1 goto fail
)

if not exist "client\dist" (
    echo Building client app...
    call npm run build --prefix client
    if errorlevel 1 goto fail
)

if not exist "remotion\node_modules" (
    echo Installing Remotion dependencies. This can take a few minutes...
    call npm install --prefix remotion
    if errorlevel 1 goto fail
)

echo.
echo  Starting Real Estate Reels Web...
echo  Open http://localhost:3000 in your browser.
echo.
echo  Press Ctrl+C to stop the server.
echo.
npm start
pause
exit /b 0

:fail
echo.
echo Setup failed. Make sure Node.js is installed, then try again.
pause
exit /b 1
