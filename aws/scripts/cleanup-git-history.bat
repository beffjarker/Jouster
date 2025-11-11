@echo off
REM Git History Cleanup Script (Windows)
REM This removes exposed AWS credentials from ALL git history

setlocal enabledelayedexpansion

echo =========================================
echo AWS CREDENTIALS - GIT HISTORY CLEANUP
echo =========================================
echo.
echo ⚠️  WARNING: This will rewrite git history!
echo ⚠️  All collaborators will need to re-clone the repo
echo.
echo This script will:
echo 1. Remove aws/credentials from all commits
echo 2. Remove .env files from all commits
echo 3. Force push to GitHub
echo.
set /p confirm="Do you want to continue? (yes/no): "

if not "%confirm%"=="yes" (
    echo Aborted.
    exit /b 1
)

echo.
echo Step 1: Checking for git-filter-repo...
git filter-repo --help >nul 2>&1
if errorlevel 1 (
    echo git-filter-repo not found. Please install:
    echo    pip install git-filter-repo
    echo.
    echo Or download from: https://github.com/newren/git-filter-repo
    exit /b 1
)

echo.
echo Step 2: Creating backup...
cd ..
xcopy /E /I /Q Jouster "Jouster-backup-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%"
cd Jouster

echo.
echo Step 3: Removing sensitive files from git history...
echo    Removing aws/credentials...
git filter-repo --path aws/credentials --invert-paths --force

echo    Removing .env files...
git filter-repo --path .env --invert-paths --force

echo    Removing aws/config...
git filter-repo --path aws/config --invert-paths --force

echo.
echo Step 4: Verifying removal...
git log --all --full-history -- aws/credentials >nul 2>&1
if not errorlevel 1 (
    echo ❌ ERROR: aws/credentials still found in history!
    exit /b 1
) else (
    echo ✅ aws/credentials removed from history
)

git log --all --full-history -- .env >nul 2>&1
if not errorlevel 1 (
    echo ❌ ERROR: .env still found in history!
    exit /b 1
) else (
    echo ✅ .env removed from history
)

echo.
echo Step 5: Ready to force push to GitHub
echo.
echo ⚠️  IMPORTANT: Run these commands to push:
echo.
echo     git remote add origin-clean https://github.com/beffjarker/Jouster.git
echo     git push origin-clean --force --all
echo     git push origin-clean --force --tags
echo.
echo After force push:
echo 1. Verify credentials are gone: https://github.com/beffjarker/Jouster/commits
echo 2. Notify AWS support that history is cleaned
echo 3. Delete old access keys in AWS IAM
echo 4. Create new access keys
echo 5. Add new keys to GitHub Secrets
echo.
echo =========================================
echo ✅ CLEANUP COMPLETE
echo =========================================

endlocal

