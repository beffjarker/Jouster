@echo off
cd /d "H:\projects\Jouster"
echo === Committing Debug CI Workflow ===
echo.

echo Adding debug CI workflow...
git add .github\workflows\ci-debug.yml
if %errorlevel% neq 0 (
    echo ERROR: Failed to add ci-debug.yml
    exit /b 1
)

echo Temporarily renaming original CI to prevent conflicts...
if exist .github\workflows\ci.yml (
    git mv .github\workflows\ci.yml .github\workflows\ci-original.yml.bak
    echo Original CI renamed to ci-original.yml.bak
) else (
    echo No original ci.yml found to rename
)

echo Committing changes...
git add -A
git commit -m "feat(ci): add debug CI workflow with isolated steps and timeouts

- Split CI into separate jobs for better isolation
- Added comprehensive timeouts (5-30 min per job)
- Enhanced logging for debugging hanging issues
- Temporarily disabled original CI to test debug version
- E2E tests isolated with 30min timeout to identify hanging"

if %errorlevel% neq 0 (
    echo ERROR: Failed to commit changes
    exit /b 1
) else (
    echo SUCCESS: Debug CI workflow committed
)

echo Pushing changes...
git push
if %errorlevel% neq 0 (
    echo ERROR: Failed to push changes
    exit /b 1
) else (
    echo SUCCESS: Changes pushed to GitHub
)

echo.
echo === Debug CI Workflow Deployed ===
echo The new workflow should trigger automatically on push.
echo Check GitHub Actions to see which step hangs or times out.
pause
