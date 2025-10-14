@echo off
REM Staging Environment Deployment Script for stg.jouster.org
REM This script deploys the application to the staging environment (green)

echo ========================================
echo JOUSTER STAGING DEPLOYMENT (GREEN)
echo ========================================

echo [1/5] Building application for staging...
call npm run build:prod
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo [2/5] Creating staging S3 bucket if needed...
aws s3api head-bucket --bucket stg.jouster.org --region us-west-2 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Creating staging S3 bucket...
    aws s3 mb s3://stg.jouster.org --region us-west-2

    REM Configure bucket for static website hosting
    aws s3 website s3://stg.jouster.org --index-document index.html --error-document index.html

    REM Remove public access blocks
    aws s3api put-public-access-block --bucket stg.jouster.org --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

    REM Apply public read policy using correct path
    aws s3api put-bucket-policy --bucket stg.jouster.org --policy file://aws/policies/staging-bucket-policy.json

    echo ✅ Staging S3 bucket created and configured
) else (
    echo Staging S3 bucket already exists
)

echo [3/5] Deploying application to staging S3 bucket (green environment)...
REM Deploy from the correct browser directory to root of S3 bucket
aws s3 sync dist/jouster/browser/ s3://stg.jouster.org --delete --region us-west-2
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Deployment failed!
    pause
    exit /b 1
)

echo [4/5] Setting up staging DNS record...
for /f "tokens=*" %%i in ('aws route53 list-hosted-zones --query "HostedZones[?Name=='jouster.org.'].Id" --output text') do set HOSTED_ZONE_ID=%%i
set HOSTED_ZONE_ID=%HOSTED_ZONE_ID:/hostedzone/=%

if not "%HOSTED_ZONE_ID%"=="" (
    echo Checking DNS record for stg.jouster.org...
    aws route53 list-resource-record-sets --hosted-zone-id %HOSTED_ZONE_ID% --query "ResourceRecordSets[?Name=='stg.jouster.org.' && Type=='CNAME']" --output text | find /c "stg.jouster.org" >nul
    if %ERRORLEVEL% NEQ 0 (
        echo Creating DNS record for stg.jouster.org...
        aws route53 change-resource-record-sets --hosted-zone-id %HOSTED_ZONE_ID% --change-batch file://aws/configs/staging-dns-record.json
        echo ✅ DNS record created for stg.jouster.org
    ) else (
        echo DNS record for stg.jouster.org already exists
    )
) else (
    echo ⚠️ No hosted zone found for jouster.org - staging accessible via S3 endpoint only
)

echo [5/5] Deployment complete!
echo.
echo ========================================
echo STAGING DEPLOYMENT COMPLETE (GREEN)
echo ========================================
echo Staging Environment URLs:
echo - Custom Domain: https://stg.jouster.org
echo - S3 Direct: http://stg.jouster.org.s3-website-us-west-2.amazonaws.com
echo.
echo Build deployed from main branch to GREEN environment
echo Timestamp: %date% %time%
echo.
pause
