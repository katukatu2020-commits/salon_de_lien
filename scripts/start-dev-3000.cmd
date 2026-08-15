@echo off
cd /d "%~dp0.."
"C:\Program Files\nodejs\npm.cmd" run dev -- -H 0.0.0.0
