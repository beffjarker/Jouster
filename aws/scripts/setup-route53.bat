@echo off
REM Route 53 Setup Script for jouster.org (Windows)
REM This script sets up Route 53 hosted zone and SSL certificate

echo ========================================
echo JOUSTER.ORG - ROUTE 53 SETUP
echo ========================================

echo [1/4] Creating Route 53 hosted zone for jouster.org...
for /f "tokens=*" %%i in ('aws route53 create-hosted-zone --name jouster.org --caller-reference "jouster-%date:~-4,4%%date:~-10,2%%date:~-7,2%-%time:~0,2%%time:~3,2%" --hosted-zone-config Comment="Jouster.org main domain" --query "HostedZone.Id" --output text 2^>nul') do set HOSTED_ZONE_ID=%%i

if "%HOSTED_ZONE_ID%"=="" (
    echo Hosted zone may already exist, checking...
    for /f "tokens=*" %%i in ('aws route53 list-hosted-zones --query "HostedZones[?Name=='jouster.org.'].Id" --output text') do set HOSTED_ZONE_ID=%%i
)

echo Found hosted zone: %HOSTED_ZONE_ID%

echo [2/4] Getting nameservers for domain registrar...
aws route53 get-hosted-zone --id %HOSTED_ZONE_ID% --query "DelegationSet.NameServers" --output table

echo.
echo IMPORTANT: Update your domain registrar with these nameservers!
echo.

echo [3/4] Requesting SSL certificate for jouster.org...
for /f "tokens=*" %%i in ('aws acm request-certificate --domain-name jouster.org --subject-alternative-names "www.jouster.org" --validation-method DNS --region us-west-2 --query "CertificateArn" --output text') do set CERT_ARN=%%i

echo Certificate requested: %CERT_ARN%
echo Waiting for certificate request to propagate...
timeout /t 10 /nobreak >nul

echo [4/4] Getting DNS validation records...
aws acm describe-certificate --certificate-arn %CERT_ARN% --region us-west-2 --query "Certificate.DomainValidationOptions" --output table

echo.
echo ========================================
echo NEXT STEPS:
echo ========================================
echo 1. Add Route 53 permissions to your IAM user using the policy file: ..\policies\route53-permissions-policy.json
echo 2. Update domain registrar with the nameservers shown above
echo 3. Add DNS validation records for SSL certificate to Route 53
echo 4. Wait for certificate validation (5-30 minutes)
echo 5. Run: setup-cloudfront.bat (after certificate is validated)
echo.
echo Certificate ARN saved to: cert-arn.txt
echo %CERT_ARN% > cert-arn.txt
echo Hosted Zone ID saved to: hosted-zone-id.txt
echo %HOSTED_ZONE_ID% > hosted-zone-id.txt
pause
