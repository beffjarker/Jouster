@echo off
REM Setup SSL and CloudFront for jouster.org Production
REM This script creates a CloudFront distribution with the existing SSL certificate

echo ========================================
echo JOUSTER.ORG - SSL CLOUDFRONT SETUP
echo ========================================
echo.

REM Configuration
REM Note: S3 bucket region is us-west-2, but ACM cert MUST be in us-east-1 for CloudFront
set REGION=us-west-2
set CERT_REGION=us-east-1
set CERT_ARN=arn:aws:acm:us-east-1:924677642513:certificate/08aa78df-7cce-4caf-b36d-18798e884617
set S3_BUCKET=jouster-org-static
set S3_ENDPOINT=jouster-org-static.s3-website-us-west-2.amazonaws.com

echo 📋 Configuration:
echo    - Region: %REGION%
echo    - S3 Bucket: %S3_BUCKET%
echo    - Certificate: ISSUED ✅
echo    - Domains: jouster.org, www.jouster.org
echo.

REM Step 1: Verify SSL certificate status
echo [1/5] Verifying SSL certificate status...
    --region %CERT_REGION% ^
    --certificate-arn %CERT_ARN% ^
    --region %REGION% ^
    --query "Certificate.Status" ^
    --output text > tmp\cert-status.txt 2>&1

set /p CERT_STATUS=<tmp\cert-status.txt
echo    Certificate Status: %CERT_STATUS%

if not "%CERT_STATUS%"=="ISSUED" (
    echo ❌ ERROR: Certificate is not in ISSUED status
    echo    Current status: %CERT_STATUS%
    echo    Please wait for certificate validation to complete
    pause
    exit /b 1
)
echo ✅ Certificate is ISSUED and ready
echo.

REM Step 2: Create CloudFront distribution configuration
echo [2/5] Creating CloudFront distribution configuration...

REM Generate unique caller reference
set CALLER_REF=jouster-prod-cf-%RANDOM%-%RANDOM%

REM Create the distribution config JSON
(
echo {
echo   "CallerReference": "%CALLER_REF%",
echo   "Comment": "Jouster.org Production - HTTPS with SSL",
echo   "Enabled": true,
echo   "DefaultRootObject": "index.html",
echo   "Aliases": {
echo     "Quantity": 2,
echo     "Items": ["jouster.org", "www.jouster.org"]
echo   },
echo   "Origins": {
echo     "Quantity": 1,
echo     "Items": [
echo       {
echo         "Id": "jouster-s3-origin",
echo         "DomainName": "%S3_ENDPOINT%",
echo         "CustomOriginConfig": {
echo           "HTTPPort": 80,
echo           "HTTPSPort": 443,
echo           "OriginProtocolPolicy": "http-only",
echo           "OriginSslProtocols": {
echo             "Quantity": 3,
echo             "Items": ["TLSv1", "TLSv1.1", "TLSv1.2"]
echo           },
echo           "OriginReadTimeout": 30,
echo           "OriginKeepaliveTimeout": 5
echo         }
echo       }
echo     ]
echo   },
echo   "DefaultCacheBehavior": {
echo     "TargetOriginId": "jouster-s3-origin",
echo     "ViewerProtocolPolicy": "redirect-to-https",
echo     "AllowedMethods": {
echo       "Quantity": 2,
echo       "Items": ["GET", "HEAD"],
echo       "CachedMethods": {
echo         "Quantity": 2,
echo         "Items": ["GET", "HEAD"]
echo       }
echo     },
echo     "Compress": true,
echo     "ForwardedValues": {
echo       "QueryString": false,
echo       "Cookies": {
echo         "Forward": "none"
echo       }
echo     },
echo     "MinTTL": 0,
echo     "DefaultTTL": 86400,
echo     "MaxTTL": 31536000,
echo     "TrustedSigners": {
echo       "Enabled": false,
echo       "Quantity": 0
echo     }
echo   },
echo   "CustomErrorResponses": {
echo     "Quantity": 1,
echo     "Items": [
echo       {
echo         "ErrorCode": 404,
echo         "ResponsePagePath": "/index.html",
echo         "ResponseCode": "200",
echo         "ErrorCachingMinTTL": 300
echo       }
echo     ]
echo   },
echo   "ViewerCertificate": {
echo     "ACMCertificateArn": "%CERT_ARN%",
echo     "SSLSupportMethod": "sni-only",
echo     "MinimumProtocolVersion": "TLSv1.2_2021",
echo     "CertificateSource": "acm"
echo   },
echo   "PriceClass": "PriceClass_100",
echo   "HttpVersion": "http2",
echo   "IsIPV6Enabled": true
echo }
) > tmp\cloudfront-distribution-config.json

echo ✅ Configuration file created: tmp\cloudfront-distribution-config.json
echo.

REM Step 3: Create CloudFront distribution
echo [3/5] Creating CloudFront distribution...
echo    ⏳ This may take 15-20 minutes for CloudFront to deploy globally...
REM CloudFront is a global service, but we specify region for consistency
echo.
    --distribution-config file://tmp/cloudfront-distribution-config.json > tmp\cloudfront-create-output.json 2>&1
    --distribution-config file://tmp/cloudfront-distribution-config.json ^
    --region %REGION% > tmp\cloudfront-create-output.json 2>&1

if errorlevel 1 (
    echo ❌ ERROR: Failed to create CloudFront distribution
    type tmp\cloudfront-create-output.json
    pause
    exit /b 1
)

REM Extract distribution ID and domain
for /f "tokens=*" %%i in ('type tmp\cloudfront-create-output.json ^| findstr /C:"\"Id\":"') do set DIST_LINE=%%i
for /f "tokens=2 delims=:" %%a in ("%DIST_LINE%") do (
    for /f "tokens=1 delims=," %%b in ("%%a") do (
        set DIST_ID=%%b
        set DIST_ID=!DIST_ID:"=!
        set DIST_ID=!DIST_ID: =!
    )
)

for /f "tokens=*" %%i in ('type tmp\cloudfront-create-output.json ^| findstr /C:"\"DomainName\":"') do set DOMAIN_LINE=%%i
for /f "tokens=2 delims=:" %%a in ("%DOMAIN_LINE%") do (
    for /f "tokens=1 delims=," %%b in ("%%a") do (
        set CF_DOMAIN=%%b
        set CF_DOMAIN=!CF_DOMAIN:"=!
        set CF_DOMAIN=!CF_DOMAIN: =!
    )
)

echo ✅ CloudFront distribution created!
echo    Distribution ID: %DIST_ID%
echo    CloudFront Domain: %CF_DOMAIN%
echo.

REM Step 4: Save distribution info
echo [4/5] Saving distribution information...
(
echo JOUSTER.ORG PRODUCTION CLOUDFRONT
echo ==================================
echo Created: %date% %time%
echo.
echo Distribution ID: %DIST_ID%
echo CloudFront Domain: %CF_DOMAIN%
echo SSL Certificate: %CERT_ARN%
echo Status: Deploying
echo.
echo Custom Domains:
echo   - jouster.org
echo   - www.jouster.org
echo.
echo HTTPS URLs:
echo   - https://%CF_DOMAIN%
echo   - https://jouster.org (after DNS setup)
echo   - https://www.jouster.org (after DNS setup)
) > tmp\cloudfront-production-info.txt

echo ✅ Distribution info saved to: tmp\cloudfront-production-info.txt
type tmp\cloudfront-production-info.txt
echo.

REM Step 5: Display next steps
echo [5/5] Next Steps for DNS Configuration
echo ========================================
echo.
echo ⏳ CloudFront is now deploying (Status: InProgress)
echo    This will take 15-20 minutes to complete.
echo.
echo 📋 TO COMPLETE SETUP:
echo.
echo 1. Wait for CloudFront deployment to complete
echo    Check status: aws cloudfront get-distribution --id %DIST_ID%
echo.
echo 2. Configure Route 53 DNS (requires Route 53 permissions):
echo    Run: .\setup-route53-dns.bat %DIST_ID% %CF_DOMAIN%
echo.
echo 3. Test HTTPS access:
echo    https://%CF_DOMAIN%
echo.
echo 4. Update DNS at your domain registrar:
echo    Point jouster.org to CloudFront distribution
echo.
echo ========================================
echo.
echo ✅ SSL + CloudFront setup initiated successfully!
echo    Distribution ID: %DIST_ID%
echo    Monitor deployment in AWS Console or with:
echo    aws cloudfront get-distribution --id %DIST_ID%
echo.
pause

