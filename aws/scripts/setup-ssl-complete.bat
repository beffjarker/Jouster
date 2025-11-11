@echo off
REM Master SSL Setup Script for Jouster.org
REM Interactive guide through complete SSL + CloudFront + Route 53 setup

echo ========================================
echo JOUSTER.ORG - COMPLETE SSL SETUP
echo ========================================
echo.
echo This script will guide you through:
echo   1. SSL Certificate verification
echo   2. CloudFront distribution creation
echo   3. Route 53 DNS configuration
echo   4. Domain registrar nameserver update
echo.
echo Estimated total time: 40-60 minutes
echo   ^(includes 20-30 min CloudFront deployment wait^)
echo.
pause

REM ============================================
REM STEP 1: Check current status
REM ============================================
echo.
echo ========================================
echo STEP 1: Checking Current Setup Status
echo ========================================
echo.

call check-ssl-status.bat

echo.
echo Press any key to continue to CloudFront setup...
pause >nul

REM ============================================
REM STEP 2: Create CloudFront Distribution
REM ============================================
echo.
echo ========================================
echo STEP 2: Create CloudFront Distribution
echo ========================================
echo.
echo This will create a CloudFront distribution with:
echo   - SSL Certificate: Your ACM certificate
echo   - Domains: jouster.org, www.jouster.org
echo   - HTTPS redirect enabled
echo   - Origin: S3 bucket jouster-org-static
echo.
choice /C YN /M "Ready to create CloudFront distribution?"
if errorlevel 2 goto skip_cloudfront

call setup-ssl-cloudfront.bat

echo.
echo CloudFront distribution creation initiated!
echo.
echo ⏳ IMPORTANT: CloudFront deployment takes 15-20 minutes
echo    You'll need the Distribution ID and Domain for the next step.
echo.
echo Press any key when ready to continue...
pause >nul
goto dns_setup

:skip_cloudfront
echo.
echo ⚠️  Skipped CloudFront creation.
echo    You can run it manually later: setup-ssl-cloudfront.bat
echo.

REM ============================================
REM STEP 3: Configure Route 53 DNS
REM ============================================
:dns_setup
echo.
echo ========================================
echo STEP 3: Configure Route 53 DNS
echo ========================================
echo.
echo This requires:
echo   - CloudFront Distribution ID
echo   - CloudFront Domain Name
echo.
echo You can find these in: tmp\cloudfront-production-info.txt
echo.
set /p DIST_ID="Enter CloudFront Distribution ID (e.g., E1234567ABCDEF): "
set /p CF_DOMAIN="Enter CloudFront Domain (e.g., d1abc234xyz.cloudfront.net): "

if "%DIST_ID%"=="" (
    echo ❌ Distribution ID required
    echo.
    echo You can run DNS setup later with:
    echo setup-route53-dns.bat [DIST_ID] [CF_DOMAIN]
    goto summary
)

if "%CF_DOMAIN%"=="" (
    echo ❌ CloudFront domain required
    echo.
    echo You can run DNS setup later with:
    echo setup-route53-dns.bat [DIST_ID] [CF_DOMAIN]
    goto summary
)

echo.
echo Configuration:
echo   Distribution ID: %DIST_ID%
echo   CloudFront Domain: %CF_DOMAIN%
echo.
choice /C YN /M "Is this correct?"
if errorlevel 2 goto dns_setup

call setup-route53-dns.bat %DIST_ID% %CF_DOMAIN%

REM ============================================
REM STEP 4: Summary and Next Steps
REM ============================================
:summary
echo.
echo ========================================
echo SETUP COMPLETE - NEXT STEPS
echo ========================================
echo.
echo ✅ What you've done:
echo    - Verified SSL certificate ^(ISSUED^)
echo    - Created CloudFront distribution
echo    - Configured Route 53 DNS records
echo.
echo 📋 MANUAL STEPS REQUIRED:
echo ========================================
echo.
echo 1. UPDATE DOMAIN REGISTRAR NAMESERVERS
echo    Log in to where you registered jouster.org
echo    Update nameservers to the Route 53 nameservers shown above
echo    ^(Find them in: tmp\nameservers.txt^)
echo.
echo 2. WAIT FOR DNS PROPAGATION
echo    This typically takes 15-30 minutes
echo    Can take up to 48 hours in rare cases
echo.
echo 3. TEST YOUR SITE
echo    Once DNS propagates, visit:
echo    - https://jouster.org
echo    - https://www.jouster.org
echo.
echo 4. VERIFY SSL
echo    Check for green padlock in browser
echo    Certificate should show "jouster.org"
echo    No security warnings
echo.
echo ========================================
echo 📚 DOCUMENTATION:
echo ========================================
echo.
echo - Full Guide: docs\SSL-CLOUDFRONT-SETUP-GUIDE.md
echo - Deployment: docs\DEPLOYMENT.md
echo - Troubleshooting: See guide for common issues
echo.
echo ========================================
echo 🔧 USEFUL COMMANDS:
echo ========================================
echo.
echo Check DNS propagation:
echo   nslookup jouster.org
echo   nslookup jouster.org 8.8.8.8
echo.
echo Check CloudFront status:
echo   aws cloudfront get-distribution --id %DIST_ID%
echo.
echo Invalidate CloudFront cache ^(after updates^):
echo   aws cloudfront create-invalidation --distribution-id %DIST_ID% --paths "/*"
echo.
echo Check setup status:
echo   .\check-ssl-status.bat
echo.
echo ========================================
echo.
echo ✅ SSL setup process complete!
echo    Your site will be live at https://jouster.org
echo    once DNS propagates ^(15-30 minutes^)
echo.
pause

