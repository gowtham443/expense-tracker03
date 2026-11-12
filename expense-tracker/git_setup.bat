@echo off
title ExpenseFlow - Git & GitHub Setup
cd /d "%~dp0"

echo ========================================================
echo    ExpenseFlow - Git & GitHub Repository Setup
echo ========================================================
echo.

REM Check if Git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Git is not found in your PATH.
    echo [*] Attempting to install Git via winget...
    winget install --id Git.Git -e --source winget
    echo.
    echo If Git was just installed, please restart this terminal.
    pause
    exit /b 1
)

echo [+] Git is installed.
echo.

REM Initialize git repository if not already initialized
if not exist ".git" (
    echo [*] Initializing local Git repository...
    git init
    git branch -M main
)

REM Stage all files
echo [*] Staging project files...
git add .

REM Commit
echo [*] Committing files...
git commit -m "Initial commit: ExpenseFlow personal expense tracker"

echo.
echo ========================================================
echo [+] Local Git repository is ready!
echo ========================================================
echo.
echo To link and push to your GitHub account:
echo 1. Go to: https://github.com/new
echo 2. Repository name: expense-tracker (or ExpenseFlow)
echo 3. Keep it Public or Private, DO NOT initialize with README/license
echo 4. Copy your repository URL, e.g.:
echo    https://github.com/gowtham443/expense-tracker.git
echo.
set /p REPO_URL="Enter your GitHub Repository URL (or press Enter to skip): "

if not "%REPO_URL%"=="" (
    git remote remove origin 2>nul
    git remote add origin %REPO_URL%
    echo [*] Pushing to GitHub main branch...
    git push -u origin main
    echo.
    echo [SUCCESS] Pushed to GitHub!
)

pause
