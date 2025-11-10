@echo off
REM Monitor script to watch for merge to develop and track QA deployment
echo ========================================
echo Jouster QA Deployment Monitor
echo ========================================
echo.
echo Monitoring for merge to develop branch...
echo When merged, QA deployment will trigger automatically.
echo.
echo Current branch status:
git branch -vv | findstr "feature/v002-preview-test"
echo.
echo Develop branch current state:
git log origin/develop --oneline -1
echo.
echo ----------------------------------------
echo To merge manually (from develop branch):
echo   git checkout develop
echo   git pull origin develop
echo   git merge feature/v002-preview-test
echo   git push origin develop
echo ----------------------------------------
echo.
echo After merge, QA deployment workflow will:
echo   1. Build jouster-ui (production config)
echo   2. Deploy to S3: qa.jouster.org
echo   3. Configure DNS (if available)
echo   4. Post deployment info
echo.
echo QA Environment URLs:
echo   - Custom Domain: https://qa.jouster.org
echo   - S3 Direct: http://qa.jouster.org.s3-website-us-west-2.amazonaws.com
echo.
echo ========================================
echo Waiting for merge...
echo Press Ctrl+C to exit monitoring
echo ========================================
echo.

:LOOP
timeout /t 30 /nobreak >nul 2>&1
git fetch origin develop >nul 2>&1

REM Check if develop has new commits
for /f "tokens=*" %%i in ('git log origin/develop --oneline -1') do set DEVELOP_HEAD=%%i

REM Check if our branch is merged
git log origin/develop --oneline | findstr "2e01d57" >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo ✓ MERGE DETECTED!
    echo ========================================
    echo Branch merged to develop at: %date% %time%
    echo.
    echo Checking for QA deployment workflow...
    timeout /t 5 /nobreak >nul 2>&1

    REM Check for workflow runs
    gh run list --workflow="qa-deploy.yml" --branch develop --limit 1

    echo.
    echo To watch the QA deployment:
    echo   gh run watch --workflow="qa-deploy.yml"
    echo.
    echo Or view in browser:
    echo   gh run view --workflow="qa-deploy.yml" --web
    echo.
    goto END
)

echo [%date% %time%] Still waiting for merge... (checking every 30 seconds)
goto LOOP

:END
echo.
echo Monitoring complete. QA deployment should be in progress.
echo.
pause

