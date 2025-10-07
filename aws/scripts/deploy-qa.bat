@echo off
REM QA Environment Deployment Script for qa.jouster.org
REM This script deploys the application to the QA environment

echo ========================================
echo JOUSTER QA DEPLOYMENT
echo ========================================

echo [1/5] Building application for QA...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo [2/5] Creating QA S3 bucket if needed...
aws s3api head-bucket --bucket qa.jouster.org --region us-west-2 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Creating QA S3 bucket...
    aws s3 mb s3://qa.jouster.org --region us-west-2

    REM Configure bucket for static website hosting
    aws s3 website s3://qa.jouster.org --index-document index.html --error-document index.html

    REM Remove public access blocks
    aws s3api put-public-access-block --bucket qa.jouster.org --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

    REM Apply public read policy
    aws s3api put-bucket-policy --bucket qa.jouster.org --policy file://..\policies\qa-bucket-policy.json

    echo ✅ QA S3 bucket created and configured
) else (
    echo QA S3 bucket already exists
)

echo [3/5] Deploying application to QA S3 bucket...
aws s3 sync dist\ s3://qa.jouster.org --delete --region us-west-2
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Deployment failed!
    pause
    exit /b 1
)

echo [4/5] Setting up QA DNS record...
for /f "tokens=*" %%i in ('aws route53 list-hosted-zones --query "HostedZones[?Name=='jouster.org.'].Id" --output text') do set HOSTED_ZONE_ID=%%i
set HOSTED_ZONE_ID=%HOSTED_ZONE_ID:/hostedzone/=%

if not "%HOSTED_ZONE_ID%"=="" (
    echo Checking DNS record for qa.jouster.org...
    aws route53 list-resource-record-sets --hosted-zone-id %HOSTED_ZONE_ID% --query "ResourceRecordSets[?Name=='qa.jouster.org.' && Type=='CNAME']" --output text | find /c "qa.jouster.org" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo Creating DNS record for qa.jouster.org...
        aws route53 change-resource-record-sets --hosted-zone-id %HOSTED_ZONE_ID% --change-batch file://..\configs\qa-dns-record.json
        echo ✅ DNS record created for qa.jouster.org
    ) else (
        echo DNS record for qa.jouster.org already exists
    )
) else (
    echo ⚠️ No hosted zone found for jouster.org - QA accessible via S3 endpoint only
)

echo [5/5] Deployment complete!
echo.
echo ========================================
echo QA DEPLOYMENT COMPLETE
echo ========================================
echo QA Environment URLs:
echo - Custom Domain: https://qa.jouster.org
echo - S3 Direct: http://qa.jouster.org.s3-website-us-west-2.amazonaws.com
echo.
echo Build deployed from develop branch
echo Timestamp: %date% %time%
echo.
pause
