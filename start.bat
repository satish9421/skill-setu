@echo off
echo ========================================
echo   Skill Setu - Starting Application
echo ========================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found!
echo.

echo Checking if dependencies are installed...
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
) else (
    echo Dependencies already installed.
)

echo.
echo ========================================
echo   Starting Server...
echo ========================================
echo.
echo Server will start at: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
echo Make sure MongoDB is running!
echo.

node server.js
