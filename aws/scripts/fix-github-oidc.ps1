# PowerShell script to fix GitHub Actions OIDC trust policy
Write-Host "Fixing GitHub Actions OIDC trust policy..." -ForegroundColor Green

# Set AWS ADMIN credentials as environment variables
$env:AWS_ACCESS_KEY_ID = "AKIA5OSYVDEIZOT5QP4T"
$env:AWS_SECRET_ACCESS_KEY = "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"
$env:AWS_REGION = "us-west-2"

Write-Host "AWS admin credentials set. Fixing trust policy..." -ForegroundColor Yellow

# Get AWS Account ID
try {
    $ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
    Write-Host "AWS Account ID: $ACCOUNT_ID" -ForegroundColor Green
} catch {
    Write-Host "Error getting AWS Account ID: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Create corrected trust policy
Write-Host "`nCreating corrected trust policy..." -ForegroundColor Cyan
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
                        "repo:beffjarker/Jouster:ref:refs/heads/develop",
                        "repo:beffjarker/Jouster:ref:refs/heads/main",
                        "repo:beffjarker/Jouster:pull_request"
                    ]
                }
            }
        }
    ]
}
"@

$trustPolicy | Out-File -FilePath "github-trust-policy-fixed.json" -Encoding UTF8
Write-Host "Corrected trust policy file created!" -ForegroundColor Green

# Update the IAM role trust policy
Write-Host "`nUpdating IAM role trust policy..." -ForegroundColor Cyan
try {
    aws iam update-assume-role-policy `
        --role-name GitHubActionsPreviewRole `
        --policy-document file://github-trust-policy-fixed.json
    Write-Host "IAM role trust policy updated successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error updating IAM role trust policy: $($_.Exception.Message)" -ForegroundColor Red
}

# Display results
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "GitHub Actions OIDC Trust Policy Fixed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "The trust policy now allows:" -ForegroundColor Yellow
Write-Host "- Pull requests from beffjarker/Jouster" -ForegroundColor White
Write-Host "- Pushes to develop and main branches" -ForegroundColor White
Write-Host "`nTry running the preview deployment again!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Magenta

# Clean up
Remove-Item -Path "github-trust-policy-fixed.json" -Force -ErrorAction SilentlyContinue
Write-Host "`nFix complete! Press any key to continue..." -ForegroundColor Green
Read-Host
