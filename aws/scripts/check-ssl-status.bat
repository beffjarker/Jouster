@echo off
REM Check SSL and CloudFront Setup Status
REM Quick verification of current deployment status

echo ========================================
echo JOUSTER.ORG - SSL SETUP STATUS CHECK
echo ========================================
echo.

REM Note: ACM certificates for CloudFront MUST be in us-east-1 (AWS requirement)
set REGION=us-west-2
set CERT_REGION=us-east-1
set CERT_ARN=arn:aws:acm:us-east-1:924677642513:certificate/08aa78df-7cce-4caf-b36d-18798e884617

echo [1/4] Checking SSL Certificate Status...
aws acm describe-certificate --certificate-arn %CERT_ARN% --region %CERT_REGION% --query "Certificate.{Status:Status,Domain:DomainName,ValidUntil:NotAfter}" --output table > tmp\cert-check.txt 2>&1
type tmp\cert-check.txt
echo.

echo [2/4] Checking CloudFront Distributions...
aws cloudfront list-distributions --query "DistributionList.Items[*].[Id,Comment,Status,DomainName]" --output table > tmp\cf-check.txt 2>&1
type tmp\cf-check.txt
echo.

echo [3/4] Checking Route 53 Hosted Zones...
aws route53 list-hosted-zones --query "HostedZones[?Name=='jouster.org.'].[Id,Name]" --output table > tmp\r53-check.txt 2>&1
if errorlevel 1 (
    echo ⚠️  Route 53 permissions may be missing
    echo    Expected: Route 53 permissions required
) else (
    type tmp\r53-check.txt
)
echo.

echo [4/4] Summary
echo ========================================
echo.

REM Check cert status
findstr /C:"ISSUED" tmp\cert-check.txt >nul 2>&1
if errorlevel 1 (
    echo ❌ SSL Certificate: NOT READY
) else (
    echo ✅ SSL Certificate: ISSUED ^(Ready to use^)
)

REM Check if production CloudFront exists
findstr /C:"Jouster.org" tmp\cf-check.txt >nul 2>&1
if errorlevel 1 (
    echo ❌ CloudFront Distribution: NOT CREATED
    echo    Next: Run setup-ssl-cloudfront.bat
) else (
    echo ✅ CloudFront Distribution: EXISTS
    echo    Check status above for deployment progress
)

REM Check Route 53
findstr /C:"jouster.org" tmp\r53-check.txt >nul 2>&1
if errorlevel 1 (
    echo ❌ Route 53 DNS: NOT CONFIGURED
    echo    Next: Run setup-route53-dns.bat after CloudFront deploys
) else (
    echo ✅ Route 53 DNS: CONFIGURED
)

echo.
echo ========================================
echo 📋 NEXT STEPS:
echo ========================================

REM Determine what to do next
findstr /C:"Jouster.org" tmp\cf-check.txt >nul 2>&1
if errorlevel 1 (
    echo.
    echo 1. Create CloudFront Distribution:
    echo    .\setup-ssl-cloudfront.bat
    echo.
    echo 2. Wait for deployment ^(~20 minutes^)
    echo.
    echo 3. Configure Route 53 DNS:
    echo    .\setup-route53-dns.bat [DIST_ID] [CF_DOMAIN]
    echo.
    echo 4. Update domain registrar nameservers
    echo.
    echo 5. Test: https://jouster.org
) else (
    echo.
    echo Check CloudFront deployment status above.
    echo If "Deployed", proceed to DNS configuration.
    echo.
    echo See docs\SSL-CLOUDFRONT-SETUP-GUIDE.md for details.
)

echo.
echo ========================================
pause

