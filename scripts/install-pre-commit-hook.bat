@echo off
REM Install Pre-commit Hook for Windows
REM This script sets up the pre-commit hook to prevent credential commits

echo ============================================
echo Installing Pre-commit Hook
echo ============================================
echo.

REM Check if .git directory exists
if not exist ".git" (
    echo [31mERROR: Not in a git repository![0m
    echo Please run this script from the project root.
    exit /b 1
)

REM Check if hooks directory exists
if not exist ".git\hooks" (
    echo Creating hooks directory...
    mkdir ".git\hooks"
)

REM Copy the batch version to pre-commit (Git on Windows can execute .bat files)
echo Installing pre-commit hook...
copy /Y ".git\hooks\pre-commit.bat" ".git\hooks\pre-commit" >nul 2>&1

if errorlevel 1 (
    echo [31mERROR: Failed to install hook![0m
    exit /b 1
)

echo [32m✅ Pre-commit hook installed successfully![0m
echo.

REM Test the hook
echo ============================================
echo Testing Pre-commit Hook
echo ============================================
echo.

echo Creating test credential file...
echo aws_access_key_id=TEST123 > test-credentials.txt

echo Attempting to stage test file...
git add test-credentials.txt >nul 2>&1

echo Running pre-commit hook test...
call .git\hooks\pre-commit
set TEST_RESULT=%errorlevel%

REM Clean up test file
git reset test-credentials.txt >nul 2>&1
del test-credentials.txt >nul 2>&1

echo.
if %TEST_RESULT%==1 (
    echo [32m✅ TEST PASSED: Hook correctly blocked sensitive file![0m
) else (
    echo [31m❌ TEST FAILED: Hook did not block sensitive file![0m
    exit /b 1
)

echo.
echo ============================================
echo Installation Complete!
echo ============================================
echo.
echo The pre-commit hook will now prevent you from accidentally
echo committing sensitive files like:
echo   - aws/credentials
echo   - .env files
echo   - Private keys (.pem, .key, etc.)
echo   - Certificates
echo.
echo To bypass the hook (if you're sure a file is safe):
echo   git commit --no-verify
echo.

