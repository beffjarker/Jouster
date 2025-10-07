# PowerShell script to fix the IAM role creation with proper JSON formatting
Write-Host "Fixing IAM role creation with proper JSON formatting..." -ForegroundColor Green

# Set AWS ADMIN credentials as environment variables
$env:AWS_ACCESS_KEY_ID = "AKIA5OSYVDEIZOT5QP4T"
$env:AWS_SECRET_ACCESS_KEY = "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"
$env:AWS_REGION = "us-west-2"

# Get AWS Account ID
$ACCOUNT_ID = aws sts get-caller-identity --query Account --output text
Write-Host "AWS Account ID: $ACCOUNT_ID" -ForegroundColor Green

# Create properly formatted trust policy file
Write-Host "`nCreating properly formatted trust policy..." -ForegroundColor Cyan

# Use echo to create the JSON file with proper formatting
$jsonContent = @'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::924677642513:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:beffjarker/Jouster:*"
        }
      }
    }
  ]
}
'@

$jsonContent | Out-File -FilePath "trust-policy.json" -Encoding UTF8 -NoNewline
Write-Host "Trust policy JSON file created!" -ForegroundColor Green

# Delete existing role if it exists (ignore errors)
Write-Host "`nCleaning up any existing role..." -ForegroundColor Yellow
aws iam detach-role-policy --role-name GitHubActionsPreviewRole --policy-arn "arn:aws:iam::924677642513:policy/GitHubActionsPreviewPolicy" 2>$null
aws iam delete-role --role-name GitHubActionsPreviewRole 2>$null

# Create the IAM role with fixed JSON
Write-Host "`nCreating IAM role with fixed JSON..." -ForegroundColor Cyan
try {
    $result = aws iam create-role `
        --role-name GitHubActionsPreviewRole `
        --assume-role-policy-document file://trust-policy.json `
        --description "Role for GitHub Actions to deploy Jouster preview environments"

    Write-Host "IAM role created successfully!" -ForegroundColor Green
    Write-Host $result
} catch {
    Write-Host "Error creating IAM role: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Attach policy to role
Write-Host "`nAttaching policy to role..." -ForegroundColor Cyan
try {
    aws iam attach-role-policy `
        --role-name GitHubActionsPreviewRole `
        --policy-arn "arn:aws:iam::924677642513:policy/GitHubActionsPreviewPolicy"
    Write-Host "Policy attached to role successfully!" -ForegroundColor Green
} catch {
    Write-Host "Error attaching policy to role: $($_.Exception.Message)" -ForegroundColor Red
}

# Display final results
Write-Host "`n========================================" -ForegroundColor Magenta
Write-Host "GitHub Actions IAM Role Fixed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "Role ARN: arn:aws:iam::924677642513:role/GitHubActionsPreviewRole" -ForegroundColor Yellow
Write-Host "`nNow the GitHub Actions workflow should work!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Magenta

# Clean up
Remove-Item -Path "trust-policy.json" -Force -ErrorAction SilentlyContinue
Write-Host "`nRole fix complete! Press any key to continue..." -ForegroundColor Green
Read-Host
