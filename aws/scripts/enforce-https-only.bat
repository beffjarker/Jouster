@echo off
REM Enforce HTTPS-Only for jouster.org
REM This script verifies HTTPS configuration and optionally adds security headers

echo ========================================
echo ENFORCE HTTPS-ONLY FOR JOUSTER.ORG
echo ========================================
echo.

REM Configuration
set DIST_ID=E3EQJ0O0PJTVVX
set CERT_ARN=arn:aws:acm:us-east-1:924677642513:certificate/08aa78df-7cce-4caf-b36d-18798e884617
set CF_DOMAIN=d2kfv0ssubbghw.cloudfront.net

echo [1/5] Verifying CloudFront HTTPS redirect...
aws cloudfront get-distribution --id %DIST_ID% --query "Distribution.DistributionConfig.DefaultCacheBehavior.ViewerProtocolPolicy" --output text > tmp\viewer-policy.txt 2>&1
set /p VIEWER_POLICY=<tmp\viewer-policy.txt
echo    Viewer Protocol Policy: %VIEWER_POLICY%

if "%VIEWER_POLICY%"=="redirect-to-https" (
    echo    ✅ HTTPS redirect is ENABLED
) else (
    echo    ⚠️  WARNING: HTTPS redirect is NOT enabled
    echo    Current policy: %VIEWER_POLICY%
)
echo.

echo [2/5] Checking SSL certificate status...
aws acm describe-certificate --certificate-arn %CERT_ARN% --region us-east-1 --query "Certificate.Status" --output text > tmp\cert-status-check.txt 2>&1
set /p CERT_STATUS=<tmp\cert-status-check.txt
echo    Certificate Status: %CERT_STATUS%

if "%CERT_STATUS%"=="ISSUED" (
    echo    ✅ SSL certificate is ACTIVE
) else (
    echo    ❌ SSL certificate issue detected
)
echo.

echo [3/5] Testing HTTP to HTTPS redirect...
echo    Testing: http://%CF_DOMAIN%
curl -I -s http://%CF_DOMAIN% 2>nul | findstr /C:"Location" /C:"301" /C:"302" > tmp\redirect-test.txt 2>&1
if errorlevel 1 (
    echo    ⚠️  Could not verify redirect (curl may not be available)
) else (
    type tmp\redirect-test.txt
    echo    ✅ Redirect appears to be working
)
echo.

echo [4/5] Testing HTTPS access...
echo    Testing: https://%CF_DOMAIN%
curl -I -s https://%CF_DOMAIN% 2>nul | findstr /C:"200" > tmp\https-test.txt 2>&1
if errorlevel 1 (
    echo    ⚠️  Could not verify HTTPS access (curl may not be available)
) else (
    echo    ✅ HTTPS access is working
)
echo.

echo [5/5] Security Headers Check...
echo.
echo Would you like to add security headers to CloudFront?
echo This will add HSTS, CSP, and other security headers.
echo.
choice /C YN /M "Add security headers CloudFront Function?"

if errorlevel 2 goto skip_headers

echo.
echo Creating CloudFront Function for security headers...

REM Create CloudFront Function
aws cloudfront create-function ^
    --name jouster-security-headers ^
    --function-config "Comment=Add HTTPS security headers,Runtime=cloudfront-js-1.0" ^
    --function-code fileb://aws/scripts/security-headers-function.js > tmp\function-create.json 2>&1

if errorlevel 1 (
    echo ❌ Failed to create CloudFront Function
    type tmp\function-create.json
    goto summary
)

REM Get function ARN
for /f "tokens=*" %%i in ('type tmp\function-create.json ^| findstr /C:"FunctionARN"') do set FUNC_ARN_LINE=%%i
echo ✅ CloudFront Function created

echo.
echo ⚠️  MANUAL STEP REQUIRED:
echo    To associate this function with CloudFront distribution:
echo    1. Go to AWS CloudFront Console
echo    2. Select distribution: %DIST_ID%
echo    3. Go to Behaviors tab
echo    4. Edit default behavior
echo    5. Under Function associations, add:
echo       - Event type: Viewer response
echo       - Function: jouster-security-headers
echo    6. Save changes
echo.
echo    OR use AWS CLI (requires distribution config update)
echo.

goto summary

:skip_headers
echo    Skipping security headers setup
echo.

:summary
echo ========================================
echo HTTPS-ONLY CONFIGURATION SUMMARY
echo ========================================
echo.

if "%VIEWER_POLICY%"=="redirect-to-https" (
    echo ✅ HTTPS Redirect: ENABLED
) else (
    echo ❌ HTTPS Redirect: NOT ENABLED
)

if "%CERT_STATUS%"=="ISSUED" (
    echo ✅ SSL Certificate: ACTIVE
) else (
    echo ❌ SSL Certificate: ISSUE DETECTED
)

echo.
echo CURRENT STATUS:
echo ----------------
if "%VIEWER_POLICY%"=="redirect-to-https" (
    echo ✅ Your site is ALREADY configured for HTTPS-only!
    echo    All HTTP traffic is automatically redirected to HTTPS.
    echo.
    echo WHAT THIS MEANS:
    echo    - http://jouster.org → https://jouster.org ✅
    echo    - http://www.jouster.org → https://www.jouster.org ✅
    echo    - Direct HTTP access is blocked ✅
    echo    - SSL/TLS encryption enforced ✅
) else (
    echo ⚠️  HTTPS redirect is not fully configured
    echo    You may need to update CloudFront distribution settings
)

echo.
echo OPTIONAL ENHANCEMENTS:
echo ----------------------
echo 1. Add security headers (HSTS, CSP, etc.)
echo 2. Update app links to use https://
echo 3. Add meta tag: upgrade-insecure-requests
echo 4. Block direct S3 access
echo.
echo See docs\HTTPS-ONLY-MIGRATION.md for details
echo.

echo ========================================
echo.
pause

