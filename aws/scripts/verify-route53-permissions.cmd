@echo off
echo ========================================
echo VERIFYING ROUTE 53 PERMISSIONS
echo ========================================

echo [1/4] Testing Route 53 list permissions...
aws route53 list-hosted-zones --output table
if %ERRORLEVEL% EQU 0 (
    echo ✅ Route 53 list permissions: OK
) else (
    echo ❌ Route 53 list permissions: FAILED
)

echo.
echo [2/4] Testing Certificate Manager permissions...
aws acm list-certificates --region us-east-1 --output table
if %ERRORLEVEL% EQU 0 (
    echo ✅ Certificate Manager permissions: OK
) else (
    echo ❌ Certificate Manager permissions: FAILED
)

echo.
echo [3/4] Testing CloudFront permissions...
aws cloudfront list-distributions --output table
if %ERRORLEVEL% EQU 0 (
    echo ✅ CloudFront permissions: OK
) else (
    echo ❌ CloudFront permissions: FAILED
)

echo.
echo [4/4] Checking current user identity...
aws sts get-caller-identity --output table

echo.
echo ========================================
echo PERMISSION CHECK COMPLETE
echo ========================================
pause
