@echo off
REM Windows batch script to set up GitHub Actions IAM with admin credentials

REM AWS credentials should be set via environment variables or AWS CLI config
REM DO NOT hardcode credentials in this file
REM Use: aws configure
REM Or set environment variables:
REM   set AWS_ACCESS_KEY_ID=your_key_here
REM   set AWS_SECRET_ACCESS_KEY=your_secret_here
REM   set AWS_REGION=us-west-2

if "%AWS_ACCESS_KEY_ID%"=="" (
    echo ERROR: AWS_ACCESS_KEY_ID environment variable is not set
    echo Please run 'aws configure' or set AWS credentials as environment variables
    pause
    exit /b 1
)

if "%AWS_REGION%"=="" (
    set AWS_REGION=us-west-2
    echo Using default region: us-west-2
)

echo Setting up GitHub Actions IAM with configured credentials...

REM 1. Get AWS Account ID
echo.
echo Getting AWS Account ID...
for /f %%i in ('aws sts get-caller-identity --query Account --output text') do set ACCOUNT_ID=%%i
echo AWS Account ID: %ACCOUNT_ID%

REM 2. Create the IAM policy
echo.
echo Creating IAM policy...
aws iam create-policy --policy-name GitHubActionsPreviewPolicy --policy-document file://aws/policies/github-actions-preview-policy.json --description "Policy for GitHub Actions to manage Jouster preview environments"

REM 3. Create trust policy file
echo.
echo Creating trust policy...
echo {> github-trust-policy.json
echo     "Version": "2012-10-17",>> github-trust-policy.json
echo     "Statement": [>> github-trust-policy.json
echo         {>> github-trust-policy.json
echo             "Effect": "Allow",>> github-trust-policy.json
echo             "Principal": {>> github-trust-policy.json
echo                 "Federated": "arn:aws:iam::%ACCOUNT_ID%:oidc-provider/token.actions.githubusercontent.com">> github-trust-policy.json
echo             },>> github-trust-policy.json
echo             "Action": "sts:AssumeRoleWithWebIdentity",>> github-trust-policy.json
echo             "Condition": {>> github-trust-policy.json
echo                 "StringEquals": {>> github-trust-policy.json
echo                     "token.actions.githubusercontent.com:aud": "sts.amazonaws.com">> github-trust-policy.json
echo                 },>> github-trust-policy.json
echo                 "StringLike": {>> github-trust-policy.json
echo                     "token.actions.githubusercontent.com:sub": "repo:beffjarker/Jouster:*">> github-trust-policy.json
echo                 }>> github-trust-policy.json
echo             }>> github-trust-policy.json
echo         }>> github-trust-policy.json
echo     ]>> github-trust-policy.json
echo }>> github-trust-policy.json

REM 4. Create the IAM role
echo.
echo Creating IAM role...
aws iam create-role --role-name GitHubActionsPreviewRole --assume-role-policy-document file://github-trust-policy.json --description "Role for GitHub Actions to deploy Jouster preview environments"

REM 5. Attach policy to role
echo.
echo Attaching policy to role...
aws iam attach-role-policy --role-name GitHubActionsPreviewRole --policy-arn "arn:aws:iam::%ACCOUNT_ID%:policy/GitHubActionsPreviewPolicy"

REM 6. Create GitHub OIDC provider
echo.
echo Creating GitHub OIDC provider...
aws iam create-open-id-connect-provider --url "https://token.actions.githubusercontent.com" --client-id-list "sts.amazonaws.com" --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1"

REM 7. Display results
echo.
echo ========================================
echo GitHub Actions IAM Setup Complete!
echo ========================================
echo Role ARN: arn:aws:iam::%ACCOUNT_ID%:role/GitHubActionsPreviewRole
echo.
echo Next steps:
echo 1. Add the Role ARN to GitHub secrets as AWS_ROLE_ARN
echo 2. Test the preview deployment workflow
echo ========================================

REM Clean up
del github-trust-policy.json

pause
