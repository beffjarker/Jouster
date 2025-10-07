@echo off
REM Blue-Green Deployment Manager for Jouster.org
REM Complete deployment management with safety checks

echo ========================================
echo JOUSTER.ORG - DEPLOYMENT MANAGER
echo ========================================
echo.
echo CURRENT STATUS:
echo BLUE (Production):  http://jouster-org-static.s3-website-us-east-1.amazonaws.com
echo GREEN (Staging):    http://jouster-org-green.s3-website-us-east-1.amazonaws.com
echo.
echo DEPLOYMENT OPTIONS:
echo [1] Deploy to GREEN (staging) for testing
echo [2] Promote GREEN to BLUE (production)
echo [3] Rollback BLUE to previous backup
echo [4] Direct deploy to BLUE (emergency only)
echo [5] Check environment status
echo [6] Exit
echo.
set /p choice="Select deployment option (1-6): "

if "%choice%"=="1" (
    echo Starting GREEN deployment...
    call deploy-green.bat
) else if "%choice%"=="2" (
    echo Starting promotion from GREEN to BLUE...
    call deploy-blue-green-promote.bat
) else if "%choice%"=="3" (
    echo Starting rollback...
    call deploy-blue-green-rollback.bat
) else if "%choice%"=="4" (
    echo WARNING: Direct BLUE deployment bypasses testing!
    set /p confirm="Continue with direct production deployment? (y/N): "
    if /i "%confirm%"=="y" (
        call deploy-aws-manual.bat
    ) else (
        echo Direct deployment cancelled.
    )
) else if "%choice%"=="5" (
    echo Checking environment status...
    echo.
    echo BLUE (Production) Status:
    curl -I http://jouster-org-static.s3-website-us-east-1.amazonaws.com
    echo.
    echo GREEN (Staging) Status:
    curl -I http://jouster-org-green.s3-website-us-east-1.amazonaws.com
) else if "%choice%"=="6" (
    echo Goodbye!
    exit /b 0
) else (
    echo Invalid choice. Please select 1-6.
    pause
    call %0
)

echo.
echo Deployment operation complete.
pause
