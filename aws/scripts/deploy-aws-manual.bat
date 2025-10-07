@echo off
REM Manual AWS Deployment Script for Jouster.org (No CloudFormation)
REM This script creates AWS resources directly using AWS CLI

setlocal enabledelayedexpansion

echo 🚀 Starting manual Jouster.org deployment to AWS...

REM Configuration
set DOMAIN=jouster.org
set S3_BUCKET=jouster-org-static
set REGION=us-west-2
set BUILD_DIR=dist\jouster\browser

echo 📋 Step 1: Creating S3 bucket...
aws s3 mb s3://%S3_BUCKET% --region %REGION%
if errorlevel 1 (
    echo ℹ️  Bucket may already exist, continuing...
)

echo 📋 Step 2: Configuring S3 bucket for static website hosting...
aws s3 website s3://%S3_BUCKET% --index-document index.html --error-document index.html

echo 📋 Step 3: Setting S3 bucket policy for public access...
echo {
echo   "Version": "2012-10-17",
echo   "Statement": [
echo     {
echo       "Sid": "PublicReadGetObject",
echo       "Effect": "Allow",
echo       "Principal": "*",
echo       "Action": "s3:GetObject",
echo       "Resource": "arn:aws:s3:::%S3_BUCKET%/*"
echo     }
echo   ]
echo } > bucket-policy.json

aws s3api put-bucket-policy --bucket %S3_BUCKET% --policy file://bucket-policy.json

echo 📋 Step 4: Uploading website files to S3...
if not exist "%BUILD_DIR%" (
    echo ❌ Build directory %BUILD_DIR% not found. Run 'npm run build' first.
    pause
    exit /b 1
)

aws s3 sync %BUILD_DIR% s3://%S3_BUCKET% --delete --region %REGION%

echo 📋 Step 5: Setting cache headers for optimal performance...
REM Set cache headers for HTML files (1 day)
aws s3 cp s3://%S3_BUCKET%/ s3://%S3_BUCKET%/ --recursive --exclude "*" --include "*.html" --metadata-directive REPLACE --cache-control "public, max-age=86400" --region %REGION%

REM Set cache headers for JS/CSS files (1 year)
aws s3 cp s3://%S3_BUCKET%/ s3://%S3_BUCKET%/ --recursive --exclude "*" --include "*.js" --include "*.css" --metadata-directive REPLACE --cache-control "public, max-age=31536000, immutable" --region %REGION%

echo.
echo 🎉 Manual deployment completed successfully!
echo.
echo ✅ Your application is now live at:
echo    📍 http://%S3_BUCKET%.s3-website-%REGION%.amazonaws.com
echo    📍 Direct S3 URL: https://s3.%REGION%.amazonaws.com/%S3_BUCKET%/index.html
echo.
echo ⚠️  Note: This is using S3 static website hosting without CloudFront CDN
echo ⚠️  For production with custom domain, you'll need CloudFormation permissions
echo.
echo 🔧 Next steps to get https://jouster.org working:
echo    1. Create CloudFront distribution (requires CloudFormation or manual setup)
echo    2. Configure Route 53 DNS to point to CloudFront
echo    3. Add SSL certificate for HTTPS
echo.
pause
