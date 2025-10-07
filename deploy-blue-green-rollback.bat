@echo off
REM Blue-Green Rollback Script for Jouster.org
REM This script rolls back BLUE (production) to the most recent backup

echo ========================================
echo JOUSTER.ORG - BLUE-GREEN ROLLBACK
echo ========================================

echo This will rollback the PRODUCTION environment to the most recent backup.
echo Current BLUE (Production): http://jouster-org-static.s3-website-us-east-1.amazonaws.com
echo.

REM Get the most recent backup bucket
for /f "tokens=*" %%a in ('aws s3 ls s3:// --region us-east-1 | findstr jouster-org-backup | sort | tail -1') do set BACKUP_BUCKET=%%a
set BACKUP_BUCKET=%BACKUP_BUCKET:~19%

if "%BACKUP_BUCKET%"=="" (
    echo ERROR: No backup found! Cannot rollback.
    echo Available backups:
    aws s3 ls s3:// --region us-east-1 | findstr jouster-org-backup
    exit /b 1
)

echo Found backup: s3://%BACKUP_BUCKET%
set /p confirm="Rollback to this backup? (y/N): "
if /i not "%confirm%"=="y" (
    echo Rollback cancelled.
    exit /b 0
)

echo [1/2] Rolling back BLUE environment from backup...
aws s3 sync s3://%BACKUP_BUCKET%/ s3://jouster-org-static/ --region us-east-1 --delete

echo [2/2] Verifying BLUE environment...
curl -I http://jouster-org-static.s3-website-us-east-1.amazonaws.com

echo.
echo ========================================
echo ROLLBACK COMPLETE!
echo ========================================
echo.
echo BLUE (Production) URL: http://jouster-org-static.s3-website-us-east-1.amazonaws.com
echo Restored from backup: s3://%BACKUP_BUCKET%
echo.
