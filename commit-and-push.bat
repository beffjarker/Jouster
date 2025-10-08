@echo off
cd /d "H:\projects\Jouster"
echo === Git Operations Script ===
echo Current directory: %cd%
echo.

echo Adding changes to staging area...
git add .
if %errorlevel% neq 0 (
    echo ERROR: Failed to add changes
    exit /b 1
)

echo Committing changes...
git commit -m "fix(deps): resolve @swc-node/register override conflict in package.json"
if %errorlevel% neq 0 (
    echo ERROR: Failed to commit changes or no changes to commit
) else (
    echo SUCCESS: Changes committed
)

echo Pushing to remote repository...
git push
if %errorlevel% neq 0 (
    echo ERROR: Failed to push changes
    exit /b 1
) else (
    echo SUCCESS: Changes pushed to GitHub
)

echo.
echo === Operation Complete ===
echo Checking GitHub Actions...
gh run list --limit 3
echo.
pause
