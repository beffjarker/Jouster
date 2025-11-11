@echo off
REM Setup Route 53 DNS for jouster.org pointing to CloudFront
REM Usage: setup-route53-dns.bat [DISTRIBUTION_ID] [CLOUDFRONT_DOMAIN]

setlocal enabledelayedexpansion

echo ========================================
echo JOUSTER.ORG - ROUTE 53 DNS SETUP
echo ========================================
echo.

REM Get parameters
set DIST_ID=%1
set CF_DOMAIN=%2

if "%DIST_ID%"=="" (
    echo ❌ ERROR: Distribution ID required
    echo Usage: setup-route53-dns.bat [DISTRIBUTION_ID] [CLOUDFRONT_DOMAIN]
    echo.
    echo Example: setup-route53-dns.bat E1234567890ABC d3abc123.cloudfront.net
    pause
    exit /b 1
)

if "%CF_DOMAIN%"=="" (
    echo ❌ ERROR: CloudFront domain required
    echo Usage: setup-route53-dns.bat [DISTRIBUTION_ID] [CLOUDFRONT_DOMAIN]
    pause
    exit /b 1
)

echo 📋 Configuration:
echo    Distribution ID: %DIST_ID%
echo    CloudFront Domain: %CF_DOMAIN%
echo.

REM Step 1: Check CloudFront deployment status
echo [1/6] Checking CloudFront deployment status...
aws cloudfront get-distribution --id %DIST_ID% --query "Distribution.Status" --output text > tmp\cf-status.txt 2>&1
set /p CF_STATUS=<tmp\cf-status.txt

echo    Status: %CF_STATUS%

if not "%CF_STATUS%"=="Deployed" (
    echo ⚠️  WARNING: CloudFront distribution is not fully deployed yet
    echo    Current status: %CF_STATUS%
    echo    Please wait for deployment to complete before configuring DNS
    echo.
    choice /C YN /M "Continue anyway?"
    if errorlevel 2 exit /b 0
)
echo.

REM Step 2: Check for existing Route 53 hosted zone
echo [2/6] Checking for existing Route 53 hosted zone...
aws route53 list-hosted-zones --query "HostedZones[?Name=='jouster.org.'].Id" --output text > tmp\hosted-zone-id.txt 2>&1

set /p HOSTED_ZONE_ID=<tmp\hosted-zone-id.txt

if "%HOSTED_ZONE_ID%"=="" (
    echo    No existing hosted zone found
    echo [2b/6] Creating new hosted zone for jouster.org...

    REM Create hosted zone
    aws route53 create-hosted-zone ^
        --name jouster.org ^
        --caller-reference "jouster-%RANDOM%-%date:~-4%%date:~-10,2%%date:~-7,2%" ^
        --hosted-zone-config Comment="Jouster.org production domain" > tmp\create-zone-output.json 2>&1

    if errorlevel 1 (
        echo ❌ ERROR: Failed to create hosted zone
        type tmp\create-zone-output.json
        pause
        exit /b 1
    )

    REM Extract hosted zone ID
    for /f "tokens=*" %%i in ('type tmp\create-zone-output.json ^| findstr /C:"\"Id\":"') do set ZONE_LINE=%%i
    for /f "tokens=2 delims=:" %%a in ("!ZONE_LINE!") do (
        for /f "tokens=1 delims=," %%b in ("%%a") do (
            set HOSTED_ZONE_ID=%%b
            set HOSTED_ZONE_ID=!HOSTED_ZONE_ID:"=!
            set HOSTED_ZONE_ID=!HOSTED_ZONE_ID: =!
        )
    )

    echo ✅ Hosted zone created: %HOSTED_ZONE_ID%
) else (
    echo ✅ Found existing hosted zone: %HOSTED_ZONE_ID%
)
echo.

REM Step 3: Get nameservers
echo [3/6] Getting Route 53 nameservers...
aws route53 get-hosted-zone --id %HOSTED_ZONE_ID% --query "DelegationSet.NameServers" --output table > tmp\nameservers.txt 2>&1
type tmp\nameservers.txt

echo.
echo 📋 IMPORTANT: Update your domain registrar with these nameservers!
echo    These are required for DNS to work properly.
echo.
pause

REM Step 4: Create DNS records for jouster.org
echo [4/6] Creating DNS record for jouster.org...

REM Create change batch for root domain
(
echo {
echo   "Changes": [
echo     {
echo       "Action": "UPSERT",
echo       "ResourceRecordSet": {
echo         "Name": "jouster.org",
echo         "Type": "A",
echo         "AliasTarget": {
echo           "HostedZoneId": "Z2FDTNDATAQYW2",
echo           "DNSName": "%CF_DOMAIN%",
echo           "EvaluateTargetHealth": false
echo         }
echo       }
echo     }
echo   ]
echo }
) > tmp\dns-change-root.json

aws route53 change-resource-record-sets ^
    --hosted-zone-id %HOSTED_ZONE_ID% ^
    --change-batch file://tmp/dns-change-root.json > tmp\dns-change-root-output.json 2>&1

if errorlevel 1 (
    echo ⚠️  Warning: Failed to create DNS record for jouster.org
    type tmp\dns-change-root-output.json
) else (
    echo ✅ DNS record created for jouster.org
)
echo.

REM Step 5: Create DNS records for www.jouster.org
echo [5/6] Creating DNS record for www.jouster.org...

REM Create change batch for www subdomain
(
echo {
echo   "Changes": [
echo     {
echo       "Action": "UPSERT",
echo       "ResourceRecordSet": {
echo         "Name": "www.jouster.org",
echo         "Type": "A",
echo         "AliasTarget": {
echo           "HostedZoneId": "Z2FDTNDATAQYW2",
echo           "DNSName": "%CF_DOMAIN%",
echo           "EvaluateTargetHealth": false
echo         }
echo       }
echo     }
echo   ]
echo }
) > tmp\dns-change-www.json

aws route53 change-resource-record-sets ^
    --hosted-zone-id %HOSTED_ZONE_ID% ^
    --change-batch file://tmp/dns-change-www.json > tmp\dns-change-www-output.json 2>&1

if errorlevel 1 (
    echo ⚠️  Warning: Failed to create DNS record for www.jouster.org
    type tmp\dns-change-www-output.json
) else (
    echo ✅ DNS record created for www.jouster.org
)
echo.

REM Step 6: Display summary
echo [6/6] DNS Configuration Complete!
echo ========================================
echo.
echo ✅ Route 53 Setup Summary:
echo    - Hosted Zone ID: %HOSTED_ZONE_ID%
echo    - DNS Records Created:
echo      • jouster.org → %CF_DOMAIN%
echo      • www.jouster.org → %CF_DOMAIN%
echo.
echo 🌐 Your site will be available at:
echo    - https://jouster.org
echo    - https://www.jouster.org
echo.
echo ⏳ DNS propagation may take 5-60 minutes
echo    Test with: nslookup jouster.org
echo.
echo 📋 NEXT STEPS:
echo    1. Update domain registrar nameservers (from list above)
echo    2. Wait for DNS propagation
echo    3. Test HTTPS: https://jouster.org
echo    4. Verify SSL certificate in browser
echo.
echo ========================================
echo.
pause

