@echo off
REM Terraform deployment script for Jouster.org
REM This replaces CloudFormation with Infrastructure as Code

setlocal enabledelayedexpansion

echo 🚀 Starting Terraform deployment for Jouster.org...

REM Check if Terraform is installed
terraform version >nul 2>&1
if errorlevel 1 (
    echo ❌ Terraform not found. Installing Terraform...
    echo Please download Terraform from: https://www.terraform.io/downloads
    echo Or use Chocolatey: choco install terraform
    pause
    exit /b 1
)
echo ✅ Terraform found

REM Initialize Terraform
echo 📋 Initializing Terraform...
cd terraform
terraform init

if errorlevel 1 (
    echo ❌ Terraform initialization failed
    pause
    exit /b 1
)
echo ✅ Terraform initialized

REM Plan infrastructure changes
echo 📋 Planning infrastructure changes...
terraform plan -out=tfplan

if errorlevel 1 (
    echo ❌ Terraform planning failed
    pause
    exit /b 1
)
echo ✅ Infrastructure plan created

REM Apply infrastructure
echo 📋 Applying infrastructure changes...
terraform apply tfplan

if errorlevel 1 (
    echo ❌ Terraform apply failed
    pause
    exit /b 1
)
echo ✅ Infrastructure deployed successfully

REM Get outputs
echo 📋 Getting deployment outputs...
for /f "tokens=*" %%i in ('terraform output -raw s3_bucket_name') do set S3_BUCKET=%%i
for /f "tokens=*" %%i in ('terraform output -raw website_endpoint') do set WEBSITE_ENDPOINT=%%i
for /f "tokens=*" %%i in ('terraform output -raw cloudfront_url') do set CLOUDFRONT_URL=%%i
for /f "tokens=*" %%i in ('terraform output -raw api_gateway_url') do set API_URL=%%i

cd ..

REM Build and deploy application
echo 📋 Building application...
call npm run build
if errorlevel 1 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo 📋 Deploying application to S3...
aws s3 sync dist/jouster/browser s3://%S3_BUCKET% --delete --region us-east-1

REM Set proper content types
echo 📋 Setting content types...
aws s3 cp s3://%S3_BUCKET%/ s3://%S3_BUCKET%/ --recursive --exclude "*" --include "*.html" --content-type "text/html; charset=utf-8" --metadata-directive REPLACE --region us-east-1
aws s3 cp s3://%S3_BUCKET%/ s3://%S3_BUCKET%/ --recursive --exclude "*" --include "*.js" --content-type "application/javascript" --metadata-directive REPLACE --region us-east-1
aws s3 cp s3://%S3_BUCKET%/ s3://%S3_BUCKET%/ --recursive --exclude "*" --include "*.css" --content-type "text/css" --metadata-directive REPLACE --region us-east-1

echo.
echo 🎉 Terraform deployment completed successfully!
echo.
echo ✅ Your Jouster application is now live at:
echo    📍 S3 Website: http://%WEBSITE_ENDPOINT%
echo    📍 CloudFront CDN: %CLOUDFRONT_URL%
echo    📍 API Gateway: %API_URL%
echo.
echo ✅ Infrastructure includes:
echo    📍 DynamoDB conversation history (serverless)
echo    📍 Lambda-based API backend (serverless)
echo    📍 CloudFront CDN for global performance
echo    📍 S3 static website hosting
echo.
pause
