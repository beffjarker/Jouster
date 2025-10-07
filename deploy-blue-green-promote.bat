@echo off
REM Blue-Green Promotion Script for Jouster.org
REM This script promotes GREEN (staging) to BLUE (production) after testing

echo ========================================
echo JOUSTER.ORG - BLUE-GREEN PROMOTION
echo ========================================

echo WARNING: This will replace the current PRODUCTION environment!
echo Current BLUE (Production): http://jouster-org-static.s3-website-us-east-1.amazonaws.com
echo Current GREEN (Staging): http://jouster-org-green.s3-website-us-east-1.amazonaws.com
echo.
set /p confirm="Are you sure you want to promote GREEN to BLUE? (y/N): "
if /i not "%confirm%"=="y" (
    echo Promotion cancelled.
    exit /b 0
)

echo [1/3] Backing up current BLUE environment...
aws s3 sync s3://jouster-org-static/ s3://jouster-org-backup-%date:~-4,4%%date:~-10,2%%date:~-7,2%/ --region us-east-1

echo [2/3] Promoting GREEN to BLUE (copying staging to production)...
aws s3 sync s3://jouster-org-green/ s3://jouster-org-static/ --region us-east-1 --delete

echo [3/3] Verifying BLUE environment...
curl -I http://jouster-org-static.s3-website-us-east-1.amazonaws.com

echo.
echo ========================================
echo PROMOTION COMPLETE!
echo ========================================
echo.
echo BLUE (Production) URL: http://jouster-org-static.s3-website-us-east-1.amazonaws.com
echo Backup created at: s3://jouster-org-backup-%date:~-4,4%%date:~-10,2%%date:~-7,2%/
echo.
echo If issues occur, you can rollback using: deploy-blue-green-rollback.bat
echo.
