@echo off
title My Website Runner

REM Ensure Node.js is in the PATH for this session and all child processes
set "PATH=C:\Program Files\nodejs;%APPDATA%\npm;%PATH%"

cd /d "D:\my-website"

echo ===================================================
echo               Starting My Website
echo ===================================================
echo.

if not exist "node_modules" (
    echo [1/3] "node_modules" folder not found. Installing dependencies...
    echo (This may take a minute or two on first run...)
    call npm install
    echo.
) else (
    echo [1/3] Dependencies already installed.
)

if not exist "data\store.db" (
    echo [2/3] SQLite Database not found. Initializing database and seeding data...
    node db/init.js
    echo.
) else (
    echo [2/3] SQLite Database exists.
)

echo [3/3] Launching web server...
echo.
echo Website will open automatically at http://localhost:3000
echo KEEP THIS WINDOW OPEN while using your website. Close it to stop the server.
echo.

REM Wait a moment then open browser
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"

REM Run the Express server (this blocks until you close the window)
node server.js
pause
