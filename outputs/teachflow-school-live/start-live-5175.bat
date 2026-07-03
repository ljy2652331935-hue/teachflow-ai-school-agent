@echo off
cd /d "%~dp0"
"C:\Program Files\nodejs\node.exe" server.js --port=5175 > teachflow-live-5175.log 2>&1
