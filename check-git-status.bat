@echo off
echo Current directory: %cd%
echo.
echo Git status:
git status
echo.
echo Recent commits:
git log --oneline -3
echo.
echo Checking for uncommitted changes:
git diff --name-only
echo.
echo Done checking git status.
pause

