@echo off
cd /d "H:\projects\Jouster"
echo === Checking differences from last successful commit ===
echo.

echo Recent commits:
git log --oneline -10 > temp_commits.txt
type temp_commits.txt
echo.

echo Files changed since successful commit 72c94077966861dc1c6dfc2029f0db0ad44155c0:
git diff 72c94077966861dc1c6dfc2029f0db0ad44155c0..HEAD --name-only > temp_files.txt
type temp_files.txt
echo.

echo Detailed changes in package.json:
git diff 72c94077966861dc1c6dfc2029f0db0ad44155c0..HEAD -- package.json > temp_package_diff.txt
type temp_package_diff.txt
echo.

echo Any workflow or action files changed:
git diff 72c94077966861dc1c6dfc2029f0db0ad44155c0..HEAD -- .github/ > temp_workflow_diff.txt
type temp_workflow_diff.txt

echo.
echo === Analysis Complete ===
pause
