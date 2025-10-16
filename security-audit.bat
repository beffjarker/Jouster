@echo off
REM Security Audit Script for Jouster (Windows)
REM Run this regularly to check for security issues

echo.
echo 🔒 Jouster Security Audit
echo =========================
echo.

echo 📦 Checking npm dependencies for vulnerabilities...
call npm audit

echo.
echo 📊 Audit Summary:
call npm audit --summary

echo.
echo 🔍 Checking for sensitive files in git...

REM Check if sensitive files are tracked
git ls-files | findstr /I ".env" && (
  echo ⚠️  WARNING: .env file is tracked in git!
)

git ls-files | findstr /I "credentials" && (
  echo ⚠️  WARNING: credentials file is tracked in git!
)

echo.
echo 🔐 Checking environment configuration...

if "%NODE_ENV%"=="production" (
  echo Checking production environment variables...
  if not defined ENCRYPTION_MASTER_KEY (
    echo ❌ Missing critical env var: ENCRYPTION_MASTER_KEY
  ) else (
    echo ✅ ENCRYPTION_MASTER_KEY is set
  )

  if not defined ENFORCE_HTTPS (
    echo ❌ Missing critical env var: ENFORCE_HTTPS
  ) else (
    echo ✅ ENFORCE_HTTPS is set
  )
)

echo.
echo 📝 Security audit complete!
echo.
echo Next steps:
echo 1. Review any warnings above
echo 2. Run 'npm audit fix' to fix vulnerabilities
echo 3. Rotate credentials if any exposure detected
echo 4. Review SECURITY.md for more information

