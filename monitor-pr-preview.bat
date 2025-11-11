@echo off
REM Monitor PR Creation and Preview Environment Workflow

echo =====================================
echo PR Preview Environment Monitor
echo =====================================
echo.

:CHECK_PR
echo [%TIME%] Checking for new PR...
gh pr list --head feature/docs-security-preview-setup --state open --json number,url,title > temp-check-pr.txt 2>&1

REM Check if PR exists
findstr /C:"\"number\"" temp-check-pr.txt >nul 2>&1
if %ERRORLEVEL%==0 (
    goto PR_FOUND
) else (
    echo No PR found yet. Waiting 10 seconds...
    timeout /t 10 /nobreak >nul
    goto CHECK_PR
)

:PR_FOUND
echo.
echo ======================================
echo ✅ PR FOUND!
echo ======================================
type temp-check-pr.txt
echo.

REM Extract PR number
for /f "tokens=2 delims=:, " %%a in ('findstr /C:"\"number\"" temp-check-pr.txt') do set PR_NUMBER=%%a
echo PR Number: %PR_NUMBER%
echo.

echo Opening PR in browser...
gh pr view %PR_NUMBER% --web

echo.
echo ======================================
echo Monitoring Workflow...
echo ======================================
echo.

:CHECK_WORKFLOW
echo [%TIME%] Checking workflow status...
gh run list --limit 1 --json status,conclusion,name,databaseId > temp-workflow.txt 2>&1
type temp-workflow.txt
echo.

REM Check if workflow is running
findstr /C:"in_progress" temp-workflow.txt >nul 2>&1
if %ERRORLEVEL%==0 (
    echo Workflow is running... checking again in 30 seconds
    timeout /t 30 /nobreak >nul
    goto CHECK_WORKFLOW
)

findstr /C:"queued" temp-workflow.txt >nul 2>&1
if %ERRORLEVEL%==0 (
    echo Workflow is queued... checking again in 10 seconds
    timeout /t 10 /nobreak >nul
    goto CHECK_WORKFLOW
)

echo.
echo ======================================
echo ✅ Workflow Complete!
echo ======================================
echo.

echo Checking PR comments for preview URL...
gh pr view %PR_NUMBER% --json comments --jq ".comments[] | select(.body | contains(\"Preview Environment\")) | .body" > temp-preview-comment.txt 2>&1
type temp-preview-comment.txt
echo.

echo.
echo ======================================
echo 🎉 Done! Check the PR for preview link
echo ======================================
echo PR URL: https://github.com/beffjarker/Jouster/pull/%PR_NUMBER%

REM Cleanup
del temp-check-pr.txt temp-workflow.txt temp-preview-comment.txt 2>nul

pause

