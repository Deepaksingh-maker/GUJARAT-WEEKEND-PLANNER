@echo off
echo ==================================================
echo Starting Gujarat Weekend Full Stack Project
echo ==================================================

REM Start Backend
start "Backend (FastAPI - Port 8000)" cmd /k "cd /d "%~dp0" && ".\venv\Scripts\python.exe" backend\run.py"

REM Start Frontend
start "Frontend (Next.js - Port 3000)" cmd /k "cd /d "%~dp0frontend" && npm run dev:frontend"

echo.
echo Both servers have been launched in separate windows!
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:3000
echo.
