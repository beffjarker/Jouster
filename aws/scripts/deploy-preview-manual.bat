@echo off
REM Manual Preview Deployment Script (Windows)
REM Use this until GitHub Actions npm install issue is resolved

setlocal enabledelayedexpansion

set PR_NUMBER=%1

if "%PR_NUMBER%"=="" (
    echo ❌ Error: PR number required
    echo Usage: deploy-preview-manual.bat ^<pr-number^>
    echo Example: deploy-preview-manual.bat 11
    exit /b 1
)

set BUCKET_NAME=jouster-preview-pr%PR_NUMBER%
set PREVIEW_URL=http://%BUCKET_NAME%.s3-website-us-west-2.amazonaws.com

echo ========================================
echo MANUAL PREVIEW DEPLOYMENT
echo ========================================
echo 📦 PR: #%PR_NUMBER%
echo 🪣 Bucket: %BUCKET_NAME%
echo 🌐 URL: %PREVIEW_URL%
echo ========================================

REM Check if dist exists
if not exist "dist\apps\jouster-ui\browser" (
    echo.
    echo 🔨 Building application...
    call npm run build:prod
)

echo.
echo ☁️  Creating/updating S3 bucket...
aws s3 mb "s3://%BUCKET_NAME%" --region us-west-2 2>nul || echo Bucket already exists

echo.
echo 🌐 Configuring static website hosting...
aws s3 website "s3://%BUCKET_NAME%" --index-document index.html --error-document index.html

echo.
echo 🔓 Configuring public access...
aws s3api put-public-access-block --bucket "%BUCKET_NAME%" --public-access-block-configuration "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"

echo.
echo 📜 Applying bucket policy...
(
echo {
echo     "Version": "2012-10-17",
echo     "Statement": [
echo         {
echo             "Sid": "PublicReadGetObject",
echo             "Effect": "Allow",
echo             "Principal": "*",
echo             "Action": "s3:GetObject",
echo             "Resource": "arn:aws:s3:::%BUCKET_NAME%/*"
echo         }
echo     ]
echo }
) > tmp\bucket-policy.json

aws s3api put-bucket-policy --bucket "%BUCKET_NAME%" --policy file://tmp\bucket-policy.json

echo.
echo 📤 Uploading files to S3...
aws s3 sync dist\apps\jouster-ui\browser "s3://%BUCKET_NAME%" --delete --cache-control "max-age=300"

echo.
echo ========================================
echo ✅ DEPLOYMENT COMPLETE!
echo ========================================
echo.
echo 🌐 Preview URL:
echo    %PREVIEW_URL%
echo.
echo 📝 To post to PR, run:
echo    gh pr comment %PR_NUMBER% --body "🎉 Preview deployed: %PREVIEW_URL%"
echo.
echo 🧹 To cleanup later, run:
echo    aws s3 rb s3://%BUCKET_NAME% --force
echo.

endlocal

