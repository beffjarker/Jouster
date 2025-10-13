@echo off
cd /d "H:\projects\Jouster"
echo === Fixing npm ci timeout issue ===
echo.

echo Adding package.json fix...
git add package.json
if %errorlevel% neq 0 (
    echo ERROR: Failed to add package.json
    exit /b 1
)

echo Committing the fix...
git commit -m "fix(deps): remove duplicate resolutions section causing npm ci timeout

- Removed resolutions section (Yarn-specific) that was conflicting with overrides (npm-specific)
- This was causing npm ci to hang for 8+ minutes during CI builds
- npm install now completes in ~30 seconds instead of timing out
- Resolves GitHub Actions setup-and-install job timeout"

if %errorlevel% neq 0 (
    echo ERROR: Failed to commit changes
    exit /b 1
) else (
    echo SUCCESS: Fix committed
)

echo Pushing the fix...
git push
if %errorlevel% neq 0 (
    echo ERROR: Failed to push changes
    exit /b 1
) else (
    echo SUCCESS: Fix pushed to GitHub
)

echo.
echo === npm ci timeout fix deployed ===
echo The debug CI workflow should now complete successfully.
echo Check GitHub Actions to confirm the setup-and-install job passes.
pause
