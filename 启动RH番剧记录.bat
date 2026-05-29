@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"

:: Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js not detected. Please install Node.js first.
    echo Download link: https://nodejs.org/
    pause
    exit /b 1
)

:: Start PowerShell tray script
start "" powershell -WindowStyle Hidden -STA -NoProfile -ExecutionPolicy Bypass -File "%~dp0tray.ps1"
exit
