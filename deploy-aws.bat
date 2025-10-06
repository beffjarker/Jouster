@echo off
REM Jouster.org AWS Deployment Script for Windows
REM This script deploys the Jouster application to AWS S3 + CloudFront

setlocal enabledelayedexpansion

echo 🚀 Starting Jouster.org deployment to AWS...

REM Configuration
set DOMAIN=jouster.org
set S3_BUCKET=jouster-org-static
set REGION=us-east-1
set BUILD_DIR=dist\jouster

echo 📋 Checking prerequisites...

REM Check AWS CLI
aws --version >nul 2>&1
if errorlevel 1 (
    echo ❌ AWS CLI not found. Please install AWS CLI first.
    echo Install: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html
    pause
    exit /b 1
)
echo ✅ AWS CLI found

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)
echo ✅ Node.js found

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm not found. Please install npm first.
    pause
    exit /b 1
)
echo ✅ npm found

REM Check AWS credentials
aws sts get-caller-identity >nul 2>&1
if errorlevel 1 (
    echo ❌ AWS credentials not configured. Run 'aws configure' first.
    pause
    exit /b 1
)
echo ✅ AWS credentials configured

REM Install dependencies
echo 📦 Installing dependencies...
call npm ci --production=false
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed

REM Build the application for production
echo 🏗️ Building application for production...
call npm run build
if not exist "%BUILD_DIR%" (
    echo ❌ Build failed. Directory %BUILD_DIR% not found.
    pause
    exit /b 1
)
echo ✅ Application built successfully

REM Deploy infrastructure (CloudFormation)
echo ☁️ Deploying AWS infrastructure...
aws cloudformation deploy --template-file aws-infrastructure.yml --stack-name jouster-org-infrastructure --parameter-overrides DomainName=%DOMAIN% --capabilities CAPABILITY_IAM --region %REGION%

if errorlevel 1 (
    echo ❌ Infrastructure deployment failed
    pause
    exit /b 1
)
echo ✅ Infrastructure deployed successfully

REM Get CloudFront Distribution ID
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name jouster-org-infrastructure --region %REGION% --query "Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue" --output text') do set CLOUDFRONT_DISTRIBUTION_ID=%%i

echo ✅ CloudFront Distribution ID: %CLOUDFRONT_DISTRIBUTION_ID%

REM Sync files to S3
echo 📁 Syncing files to S3...
aws s3 sync %BUILD_DIR% s3://%S3_BUCKET% --delete --region %REGION%

if errorlevel 1 (
    echo ❌ S3 sync failed
    pause
    exit /b 1
)

REM Set cache headers for HTML files (1 day)
echo 🔧 Setting cache headers for HTML files...
aws s3 cp s3://%S3_BUCKET%/ s3://%S3_BUCKET%/ --recursive --exclude "*" --include "*.html" --metadata-directive REPLACE --cache-control "public, max-age=86400" --region %REGION%

REM Set cache headers for JS/CSS files (1 year)
echo 🔧 Setting cache headers for JS/CSS files...
aws s3 cp s3://%S3_BUCKET%/ s3://%S3_BUCKET%/ --recursive --exclude "*" --include "*.js" --include "*.css" --metadata-directive REPLACE --cache-control "public, max-age=31536000, immutable" --region %REGION%

REM Set cache headers for static assets (1 year)
echo 🔧 Setting cache headers for static assets...
aws s3 cp s3://%S3_BUCKET%/ s3://%S3_BUCKET%/ --recursive --exclude "*" --include "*.png" --include "*.jpg" --include "*.ico" --include "*.svg" --metadata-directive REPLACE --cache-control "public, max-age=31536000" --region %REGION%

echo ✅ Files synced to S3 with optimized cache headers

REM Invalidate CloudFront cache
echo 🔄 Invalidating CloudFront cache...
aws cloudfront create-invalidation --distribution-id %CLOUDFRONT_DISTRIBUTION_ID% --paths "/*" --region %REGION%

if errorlevel 1 (
    echo ❌ CloudFront invalidation failed
    pause
    exit /b 1
)
echo ✅ CloudFront cache invalidated

REM Get the CloudFront domain
for /f "tokens=*" %%i in ('aws cloudformation describe-stacks --stack-name jouster-org-infrastructure --region %REGION% --query "Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue" --output text') do set CLOUDFRONT_DOMAIN=%%i

echo.
echo 🎉 Deployment completed successfully!
echo.
echo ✅ Your application is now live at:
echo    📍 https://%DOMAIN%
echo    📍 https://%CLOUDFRONT_DOMAIN% (CloudFront direct)
echo.
echo ✅ Flash Experiments with 56+ presets are ready!
echo ⚠️  DNS propagation may take up to 48 hours for the custom domain.
echo.
pause
