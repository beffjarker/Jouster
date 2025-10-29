# PowerShell script to set up GitHub Actions IAM - TEMPLATE
# Copy this file to: aws/scripts/setup-github-actions.ps1
# Replace placeholder values with your actual AWS credentials
# NEVER commit the actual setup-github-actions.ps1 file to git!

Write-Host "Setting up GitHub Actions IAM with admin credentials..." -ForegroundColor Green

# IMPORTANT: Set AWS ADMIN credentials as environment variables
# DO NOT hardcode credentials here - use environment variables or AWS CLI profiles
# Option 1: Use environment variables from .env file
# Option 2: Use AWS CLI configured profile: aws configure --profile admin
# Option 3: Pass credentials as parameters (not recommended for production)

# RECOMMENDED: Load from .env file (requires dotenv or manual loading)
# Example: Read from aws/.env
# $env:AWS_ACCESS_KEY_ID = (Get-Content aws/.env | Select-String "AWS_ACCESS_KEY_ID").ToString().Split("=")[1]
# $env:AWS_SECRET_ACCESS_KEY = (Get-Content aws/.env | Select-String "AWS_SECRET_ACCESS_KEY").ToString().Split("=")[1]

# For this template, we'll use AWS CLI configured profile (RECOMMENDED)
$env:AWS_PROFILE = "admin"
$env:AWS_REGION = "us-west-2"

Write-Host "Using AWS CLI profile: admin. Testing connection..." -ForegroundColor Yellow

# 1. Get AWS Account ID
Write-Host "`n1. Getting AWS Account ID..." -ForegroundColor Cyan
try {
    $ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to get AWS Account ID"
    }
    Write-Host "AWS Account ID: $ACCOUNT_ID" -ForegroundColor Green
} catch {
    Write-Host "Error getting AWS Account ID: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure AWS CLI is configured with admin credentials" -ForegroundColor Yellow
    exit 1
}

# 2. Create the IAM policy
Write-Host "`n2. Creating IAM policy..." -ForegroundColor Cyan
try {
    aws iam create-policy `
        --policy-name GitHubActionsPreviewPolicy `
        --policy-document file://aws/policies/github-actions-preview-policy.json `
        --description "Policy for GitHub Actions to manage Jouster preview environments"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "IAM policy created successfully!" -ForegroundColor Green
    } else {
        Write-Host "Policy may already exist or error occurred" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error creating IAM policy (may already exist): $($_.Exception.Message)" -ForegroundColor Yellow
}

# 3. Create trust policy file
Write-Host "`n3. Creating trust policy..." -ForegroundColor Cyan
$trustPolicy = @"
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::$ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
                },
                "StringLike": {
                    "token.actions.githubusercontent.com:sub": "repo:YOUR_GITHUB_USERNAME/Jouster:*"
                }
            }
        }
    ]
}
"@

$trustPolicy | Out-File -FilePath "github-trust-policy.json" -Encoding UTF8
Write-Host "Trust policy file created!" -ForegroundColor Green

# 4. Create the IAM role
Write-Host "`n4. Creating IAM role..." -ForegroundColor Cyan
try {
    aws iam create-role `
        --role-name GitHubActionsPreviewRole `
        --assume-role-policy-document file://github-trust-policy.json `
        --description "Role for GitHub Actions to deploy Jouster preview environments"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "IAM role created successfully!" -ForegroundColor Green
    } else {
        Write-Host "Role may already exist or error occurred" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error creating IAM role (may already exist): $($_.Exception.Message)" -ForegroundColor Yellow
}

# 5. Attach policy to role
Write-Host "`n5. Attaching policy to role..." -ForegroundColor Cyan
try {
    aws iam attach-role-policy `
        --role-name GitHubActionsPreviewRole `
        --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/GitHubActionsPreviewPolicy"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "Policy attached to role successfully!" -ForegroundColor Green
    } else {
        Write-Host "Error attaching policy to role" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error attaching policy to role: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 6. Create GitHub OIDC provider
Write-Host "`n6. Creating GitHub OIDC provider..." -ForegroundColor Cyan
try {
    aws iam create-open-id-connect-provider `
        --url "https://token.actions.githubusercontent.com" `
        --client-id-list "sts.amazonaws.com" `
        --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1"

    if ($LASTEXITCODE -eq 0) {
        Write-Host "GitHub OIDC provider created successfully!" -ForegroundColor Green
    } else {
        Write-Host "OIDC provider may already exist" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error creating OIDC provider (may already exist): $($_.Exception.Message)" -ForegroundColor Yellow
}

# 7. Display results
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "GitHub Actions IAM Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "Role ARN: arn:aws:iam::${ACCOUNT_ID}:role/GitHubActionsPreviewRole" -ForegroundColor Yellow
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Add the Role ARN to GitHub secrets as AWS_ROLE_ARN" -ForegroundColor White
Write-Host "2. Update the trust policy with your GitHub repository (replace YOUR_GITHUB_USERNAME)" -ForegroundColor White
Write-Host "3. Test the preview deployment workflow" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Magenta

# Clean up
Remove-Item -Path "github-trust-policy.json" -Force -ErrorAction SilentlyContinue
Write-Host "`nSetup complete! Press any key to continue..." -ForegroundColor Green
Read-Host

# Security Notes:
# - NEVER commit this file with hardcoded credentials
# - Use AWS CLI profiles or environment variables from .env files
# - The actual setup-github-actions.ps1 file is in .gitignore
# - Rotate admin credentials regularly (every 90 days)
# - Use principle of least privilege for IAM policies

