@echo off
title ExpenseFlow - Personal Expense Tracker
cd /d "%~dp0"

echo ========================================================
echo    Starting ExpenseFlow (Personal Expense Tracker)
echo ========================================================

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in your PATH.
    echo Please install Python 3.10+ from python.org or via:
    echo   winget install Python.Python.3.12
    pause
    exit /b 1
)

REM Check or create virtual environment
if not exist "venv" (
    echo [*] Creating Python virtual environment (venv)...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
)

REM Activate venv and install dependencies
call venv\Scripts\activate.bat
echo [*] Checking dependencies...
pip install -r requirements.txt --quiet

REM Start the application
python run.py
pause
