@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 ( echo Instala Node.js 22.12 o superior desde https://nodejs.org/ & pause & exit /b 1 )
if not exist "node_modules\electron" call npm install
call npm run dev
if errorlevel 1 pause
