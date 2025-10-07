@echo off
REM Blue-Green Deployment Script for Jouster.org
REM This script deploys to the GREEN (staging) environment for testing

echo ========================================
echo JOUSTER.ORG - GREEN DEPLOYMENT (STAGING)
echo ========================================

echo [1/4] Building Angular application...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ERROR: Build failed!
    exit /b 1
)

echo [2/4] Syncing files to GREEN environment (jouster-org-green)...
aws s3 sync dist\jouster\ s3://jouster-org-green --region us-east-1 --delete

echo [3/4] Moving files from browser subdirectory to root...
aws s3 sync s3://jouster-org-green/browser/ s3://jouster-org-green/ --region us-east-1

echo [4/4] Cleaning up browser subdirectory...
aws s3 rm s3://jouster-org-green/browser/ --recursive

echo.
echo ========================================
echo GREEN DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo GREEN (Staging) URL: http://jouster-org-green.s3-website-us-east-1.amazonaws.com
echo BLUE (Production) URL: http://jouster-org-static.s3-website-us-east-1.amazonaws.com
echo.
echo Test the GREEN environment thoroughly before promoting to BLUE.
echo To promote GREEN to BLUE, run: deploy-blue-green-promote.bat
echo.
