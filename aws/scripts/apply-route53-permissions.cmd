@echo off
echo ========================================
echo APPLYING ROUTE 53 IAM PERMISSIONS
echo ========================================

echo [1/3] Creating IAM policy for Route 53...
aws iam create-policy ^
    --policy-name JousterRoute53Policy ^
    --policy-document file://..\policies\route53-permissions-policy.json ^
    --description "IAM policy for Jouster Route 53 operations"

if %ERRORLEVEL% NEQ 0 (
    echo Policy may already exist, continuing...
)

echo.
echo [2/3] Getting current user ARN...
for /f "tokens=*" %%i in ('aws sts get-caller-identity --query "Arn" --output text') do set USER_ARN=%%i
echo Current user: %USER_ARN%

echo.
echo [3/3] Attaching policy to current user...
for /f "tokens=*" %%i in ('aws sts get-caller-identity --query "Account" --output text') do set ACCOUNT_ID=%%i
aws iam attach-user-policy ^
    --user-name jouster-dev ^
    --policy-arn arn:aws:iam::%ACCOUNT_ID%:policy/JousterRoute53Policy

if %ERRORLEVEL% EQU 0 (
    echo ✅ Route 53 permissions successfully applied!
) else (
    echo ❌ Error applying permissions. You may need to attach the policy manually in AWS Console.
    echo Policy ARN: arn:aws:iam::%ACCOUNT_ID%:policy/JousterRoute53Policy
)

echo.
echo [INFO] Testing Route 53 access...
aws route53 list-hosted-zones --query "HostedZones[?Name=='jouster.org.']" --output table

echo.
echo Setup complete! You can now run setup-route53.cmd to configure DNS.
pause
