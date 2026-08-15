@echo off
cd /d "%~dp0.."
if not exist ".next\BUILD_ID" (
  echo Production build not found. Run npm.cmd run build first. > next-production-live.log
  exit /b 1
)
if not exist ".next\standalone\server.js" (
  echo Standalone server not found. Run npm.cmd run build first. > next-production-live.log
  exit /b 1
)
set HOSTNAME=0.0.0.0
set PORT=3000
"C:\Program Files\nodejs\node.exe" "scripts\start-next-production.mjs" > "next-production-live.log" 2>&1
