@echo off
REM Staging DNS Setup Helper Script
REM This script helps create the DNS CNAME record for stg.jouster.org

echo ========================================
echo STAGING DNS SETUP FOR stg.jouster.org
echo ========================================
echo.

echo Step 1: Getting Route53 Hosted Zone ID...
aws route53 list-hosted-zones --query "HostedZones[?Name=='jouster.org.'].Id" --output text > tmp\zone-id.txt
set /p ZONE_ID=<tmp\zone-id.txt

if "%ZONE_ID%"=="" (
    echo ❌ Error: Could not find hosted zone for jouster.org
    echo.
    echo Please check:
    echo 1. AWS credentials are configured correctly
    echo 2. Route53 hosted zone for jouster.org exists
    echo 3. You have permissions to access Route53
    echo.
    pause
    exit /b 1
)

REM Remove /hostedzone/ prefix if present
set ZONE_ID=%ZONE_ID:/hostedzone/=%

echo ✅ Found hosted zone: %ZONE_ID%
echo.

echo Step 2: Checking for existing stg.jouster.org record...
aws route53 list-resource-record-sets --hosted-zone-id %ZONE_ID% --query "ResourceRecordSets[?Name=='stg.jouster.org.']" --output json > tmp\existing-record.txt
set /p EXISTING=<tmp\existing-record.txt

if not "%EXISTING%"=="[]" (
    echo ⚠️  Warning: A record already exists for stg.jouster.org
    echo.
    type tmp\existing-record.txt
    echo.
    echo Would you like to UPDATE the existing record? (Y/N^)
    set /p CONFIRM=
    if /i not "%CONFIRM%"=="Y" (
        echo Operation cancelled.
        pause
        exit /b 0
    )
    set ACTION=UPSERT
) else (
    echo ✅ No existing record found
    set ACTION=CREATE
)

echo.
echo Step 3: Creating/Updating CNAME record for stg.jouster.org...
echo.
echo This will create a CNAME record pointing to:
echo   stg.jouster.org.s3-website-us-west-2.amazonaws.com
echo.

REM Create the change batch JSON
echo { > tmp\dns-change.json
echo   "Changes": [ >> tmp\dns-change.json
echo     { >> tmp\dns-change.json
echo       "Action": "%ACTION%", >> tmp\dns-change.json
echo       "ResourceRecordSet": { >> tmp\dns-change.json
echo         "Name": "stg.jouster.org", >> tmp\dns-change.json
echo         "Type": "CNAME", >> tmp\dns-change.json
echo         "TTL": 300, >> tmp\dns-change.json
echo         "ResourceRecords": [ >> tmp\dns-change.json
echo           { >> tmp\dns-change.json
echo             "Value": "stg.jouster.org.s3-website-us-west-2.amazonaws.com" >> tmp\dns-change.json
echo           } >> tmp\dns-change.json
echo         ] >> tmp\dns-change.json
echo       } >> tmp\dns-change.json
echo     } >> tmp\dns-change.json
echo   ] >> tmp\dns-change.json
echo } >> tmp\dns-change.json

REM Apply the change
aws route53 change-resource-record-sets --hosted-zone-id %ZONE_ID% --change-batch file://tmp/dns-change.json > tmp\change-result.json

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ DNS record created successfully!
    echo.
    echo Step 4: Waiting for DNS propagation...
    echo This typically takes 5-10 minutes.
    echo.
    echo You can check the status with:
    echo   nslookup stg.jouster.org
    echo.
    echo Once propagated, visit:
    echo   http://stg.jouster.org
    echo.
    type tmp\change-result.json
    echo.
) else (
    echo.
    echo ❌ Error: Failed to create DNS record
    echo.
    echo Please check the error message above.
    echo.
)

echo.
echo ========================================
pause

