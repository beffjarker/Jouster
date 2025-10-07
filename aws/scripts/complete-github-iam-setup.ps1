# PowerShell script to completely recreate GitHub Actions IAM setup
Write-Host "Recreating complete GitHub Actions IAM setup..." -ForegroundColor Green

# Set AWS ADMIN credentials as environment variables
$env:AWS_ACCESS_KEY_ID = "AKIA5OSYVDEIZOT5QP4T"
$env:AWS_SECRET_ACCESS_KEY = "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"
$env:AWS_REGION = "us-west-2"

Write-Host "AWS admin credentials set. Starting complete setup..." -ForegroundColor Yellow

# 1. Get AWS Account ID
Write-Host "`n1. Getting AWS Account ID..." -ForegroundColor Cyan
try {
    $ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
    Write-Host "AWS Account ID: $ACCOUNT_ID" -ForegroundColor Green
} catch {
    Write-Host "Error getting AWS Account ID: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# 2. Create the IAM policy (delete first if exists)
Write-Host "`n2. Creating IAM policy..." -ForegroundColor Cyan
try {
    # Try to delete existing policy first
    aws iam delete-policy --policy-arn "arn:aws:iam::$ACCOUNT_ID`:policy/GitHubActionsPreviewPolicy" 2>$null

    aws iam create-policy `
        --policy-name GitHubActionsPreviewPolicy `
        --policy-document file://aws/policies/github-actions-preview-policy.json `
        --description "Policy for GitHub Actions to manage Jouster preview environments"
    Write-Host "IAM policy created successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error creating IAM policy: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 3. Create corrected trust policy file
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
                    "token.actions.githubusercontent.com:sub": [
                        "repo:beffjarker/Jouster:ref:refs/heads/*",
                        "repo:beffjarker/Jouster:pull_request"
                    ]
                }
            }
        }
    ]
}
"@

$trustPolicy | Out-File -FilePath "github-trust-policy-complete.json" -Encoding UTF8
Write-Host "Trust policy file created!" -ForegroundColor Green

# 4. Create the IAM role (delete first if exists)
Write-Host "`n4. Creating IAM role..." -ForegroundColor Cyan
try {
    # Try to delete existing role first
    aws iam detach-role-policy --role-name GitHubActionsPreviewRole --policy-arn "arn:aws:iam::$ACCOUNT_ID`:policy/GitHubActionsPreviewPolicy" 2>$null
    aws iam delete-role --role-name GitHubActionsPreviewRole 2>$null

    aws iam create-role `
        --role-name GitHubActionsPreviewRole `
        --assume-role-policy-document file://github-trust-policy-complete.json `
        --description "Role for GitHub Actions to deploy Jouster preview environments"
    Write-Host "IAM role created successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error creating IAM role: $($_.Exception.Message)" -ForegroundColor Red
}

# 5. Attach policy to role
Write-Host "`n5. Attaching policy to role..." -ForegroundColor Cyan
try {
    aws iam attach-role-policy `
        --role-name GitHubActionsPreviewRole `
        --policy-arn "arn:aws:iam::$ACCOUNT_ID`:policy/GitHubActionsPreviewPolicy"
    Write-Host "Policy attached to role successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error attaching policy to role: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Create GitHub OIDC provider (delete first if exists)
Write-Host "`n6. Creating GitHub OIDC provider..." -ForegroundColor Cyan
try {
    # Try to delete existing OIDC provider first
    aws iam delete-open-id-connect-provider --open-id-connect-provider-arn "arn:aws:iam::$ACCOUNT_ID`:oidc-provider/token.actions.githubusercontent.com" 2>$null

    aws iam create-open-id-connect-provider `
        --url "https://token.actions.githubusercontent.com" `
        --client-id-list "sts.amazonaws.com" `
        --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1"
    Write-Host "GitHub OIDC provider created successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error creating OIDC provider: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 7. Display results
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "Complete GitHub Actions IAM Setup Done!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "Role ARN: arn:aws:iam::$ACCOUNT_ID`:role/GitHubActionsPreviewRole" -ForegroundColor Yellow
Write-Host "`nThe setup includes:" -ForegroundColor Cyan
Write-Host "- IAM Policy with S3 and CloudFront permissions" -ForegroundColor White
Write-Host "- IAM Role with proper trust policy for GitHub Actions" -ForegroundColor White
Write-Host "- GitHub OIDC Provider for secure authentication" -ForegroundColor White
Write-Host "- Support for pull requests and branch pushes" -ForegroundColor White
Write-Host "`nTry the preview deployment again!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Magenta

# Clean up
Remove-Item -Path "github-trust-policy-complete.json" -Force -ErrorAction SilentlyContinue
Write-Host "`nSetup complete! Press any key to continue..." -ForegroundColor Green
Read-Host
