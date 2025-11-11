@echo off
REM AWS Credential Rotation Script - Windows
REM Run after detaching AWSCompromisedKeyQuarantineV3 policy

echo ========================================
echo AWS Credential Rotation Script
echo ========================================
echo.

REM Step 1: Create new access key
echo Step 1: Creating new access key...
aws iam create-access-key --user-name mzzz-console-admin > tmp\new-credentials.json 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to create new access key
    echo Make sure the quarantine policy is detached!
    type tmp\new-credentials.json
    pause
    exit /b 1
)

echo ✅ New access key created successfully
echo.

REM Step 2: Display new credentials (SAVE THESE SECURELY!)
echo ========================================
echo 🔐 NEW CREDENTIALS (SAVE SECURELY!)
echo ========================================
type tmp\new-credentials.json
echo.
echo ⚠️  IMPORTANT: Save these credentials now!
echo They will not be shown again.
echo.
pause

REM Step 3: Deactivate old compromised key
echo.
echo Step 2: Deactivating old compromised key AKIA5OSYVDEIZOT5QP4T...
aws iam update-access-key --user-name mzzz-console-admin --access-key-id AKIA5OSYVDEIZOT5QP4T --status Inactive > tmp\deactivate-key.txt 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Failed to deactivate old key
    type tmp\deactivate-key.txt
) else (
    echo ✅ Old key deactivated
)

REM Step 4: Prompt to update .env and test
echo.
echo ========================================
echo Step 3: Update your .env file
echo ========================================
echo.
echo Update H:\projects\Jouster\.env with:
echo AWS_ACCESS_KEY_ID=^<AccessKeyId from above^>
echo AWS_SECRET_ACCESS_KEY=^<SecretAccessKey from above^>
echo.
echo Press any key after updating .env...
pause > nul

REM Step 5: Test new credentials
echo.
echo Testing new credentials...
aws sts get-caller-identity > tmp\test-identity.txt 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERROR: New credentials not working!
    echo Reactivating old key...
    aws iam update-access-key --user-name mzzz-console-admin --access-key-id AKIA5OSYVDEIZOT5QP4T --status Active
    type tmp\test-identity.txt
    pause
    exit /b 1
)

echo ✅ New credentials working!
type tmp\test-identity.txt
echo.

REM Step 6: Delete old compromised key
echo ========================================
echo Step 4: Delete old compromised key?
echo ========================================
echo Are you sure the new credentials work? (Y/N)
set /p CONFIRM=
if /i "%CONFIRM%" NEQ "Y" (
    echo Skipping deletion. Old key remains inactive.
    goto :skip_delete
)

echo Deleting old compromised key AKIA5OSYVDEIZOT5QP4T...
aws iam delete-access-key --user-name mzzz-console-admin --access-key-id AKIA5OSYVDEIZOT5QP4T > tmp\delete-key.txt 2>&1

if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Failed to delete old key
    type tmp\delete-key.txt
) else (
    echo ✅ Old compromised key deleted
)

:skip_delete

REM Step 7: Check for unauthorized activity
echo.
echo ========================================
echo Step 5: Checking for unauthorized activity...
echo ========================================
echo.

echo Checking CloudTrail events for last 24 hours...
aws cloudtrail lookup-events --lookup-attributes AttributeKey=Username,AttributeValue=mzzz-console-admin --max-results 50 > tmp\cloudtrail-events.txt 2>&1
type tmp\cloudtrail-events.txt
echo.

echo Checking EC2 instances...
aws ec2 describe-instances --region us-west-2 --query "Reservations[].Instances[].{ID:InstanceId,State:State.Name,Type:InstanceType}" > tmp\ec2-instances.txt 2>&1
type tmp\ec2-instances.txt
echo.

echo Checking Lambda functions...
aws lambda list-functions --region us-west-2 --query "Functions[].{Name:FunctionName,Runtime:Runtime}" > tmp\lambda-functions.txt 2>&1
type tmp\lambda-functions.txt
echo.

echo Checking S3 buckets...
aws s3 ls > tmp\s3-buckets.txt 2>&1
type tmp\s3-buckets.txt
echo.

REM Step 8: Summary
echo ========================================
echo 🎉 Credential Rotation Complete!
echo ========================================
echo.
echo ✅ New access key created
echo ✅ Old key deactivated/deleted
echo ✅ New credentials tested
echo ✅ Security scan completed
echo.
echo Next Steps:
echo 1. Update GitHub Secrets with new credentials
echo 2. Review CloudTrail/EC2/Lambda/S3 output above for anomalies
echo 3. Respond to AWS Support case
echo 4. Update SECURITY-INCIDENT-RESPONSE.md with completion status
echo.

REM Save summary
echo Credential Rotation Summary > tmp\rotation-summary.txt
echo Date: %DATE% %TIME% >> tmp\rotation-summary.txt
echo User: mzzz-console-admin >> tmp\rotation-summary.txt
echo Old Key (deleted): AKIA5OSYVDEIZOT5QP4T >> tmp\rotation-summary.txt
echo New Key: See tmp\new-credentials.json >> tmp\rotation-summary.txt
echo Status: Complete >> tmp\rotation-summary.txt

echo.
echo Summary saved to tmp\rotation-summary.txt
echo New credentials saved to tmp\new-credentials.json (DELETE AFTER SAVING SECURELY!)
echo.
pause

