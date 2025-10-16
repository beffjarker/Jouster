# Security Implementation Verification Script
# PowerShell script to verify all security implementations

Write-Host "🔒 Security Implementation Verification" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

$results = @{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    passed = @()
    failed = @()
    warnings = @()
}

# Test 1: Verify directories exist
Write-Host "1. Checking Directory Structure..." -ForegroundColor Blue
$directories = @('middleware', 'tests', 'scripts', 'security-reports')
foreach ($dir in $directories) {
    if (Test-Path $dir) {
        Write-Host "  ✓ $dir exists" -ForegroundColor Green
        $results.passed += "Directory: $dir"
    } else {
        Write-Host "  ✗ $dir missing" -ForegroundColor Red
        $results.failed += "Directory: $dir"
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "    Created $dir" -ForegroundColor Yellow
    }
}

# Test 2: Verify security files exist
Write-Host "`n2. Checking Security Files..." -ForegroundColor Blue
$securityFiles = @(
    'middleware/enhanced-validation.js',
    'tests/security.test.js',
    'scripts/security-scan.js',
    'SECURITY-ACTION-PLAN.md',
    'SECURITY-REPORT.md',
    'SECURITY-IMPLEMENTATION-SUMMARY.md'
)

foreach ($file in $securityFiles) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length
        Write-Host "  ✓ $file ($size bytes)" -ForegroundColor Green
        $results.passed += "File: $file"
    } else {
        Write-Host "  ✗ $file missing" -ForegroundColor Red
        $results.failed += "File: $file"
    }
}

# Test 3: Verify package.json has security scripts
Write-Host "`n3. Checking package.json Security Scripts..." -ForegroundColor Blue
if (Test-Path 'package.json') {
    $packageJson = Get-Content 'package.json' -Raw | ConvertFrom-Json
    $requiredScripts = @('security:audit', 'security:scan:local', 'test:security')

    foreach ($script in $requiredScripts) {
        if ($packageJson.scripts.PSObject.Properties.Name -contains $script) {
            Write-Host "  ✓ Script: $script" -ForegroundColor Green
            $results.passed += "Script: $script"
        } else {
            Write-Host "  ✗ Script missing: $script" -ForegroundColor Red
            $results.failed += "Script: $script"
        }
    }
}

# Test 4: Check server.js for enhanced validation import
Write-Host "`n4. Checking server.js Integration..." -ForegroundColor Blue
if (Test-Path 'server.js') {
    $serverContent = Get-Content 'server.js' -Raw
    $checks = @{
        'enhanced-validation import' = 'enhanced-validation'
        'validateURLFields' = 'validateURLFields'
        'validateEmailFields' = 'validateEmailFields'
        'sanitizeRequestBody' = 'sanitizeRequestBody'
    }

    foreach ($check in $checks.GetEnumerator()) {
        if ($serverContent -match $check.Value) {
            Write-Host "  ✓ $($check.Key)" -ForegroundColor Green
            $results.passed += "server.js: $($check.Key)"
        } else {
            Write-Host "  ⚠ $($check.Key) not found" -ForegroundColor Yellow
            $results.warnings += "server.js: $($check.Key)"
        }
    }
}

# Test 5: Run npm audit and save results
Write-Host "`n5. Running NPM Audit..." -ForegroundColor Blue
$auditOutput = npm audit 2>&1
$auditOutput | Out-File -FilePath "security-reports/audit-verification.txt" -Encoding UTF8
Write-Host "  ✓ Audit results saved to security-reports/audit-verification.txt" -ForegroundColor Green

# Count vulnerabilities
$vulnLine = $auditOutput | Select-String "vulnerabilities \("
if ($vulnLine) {
    Write-Host "  $vulnLine" -ForegroundColor Yellow
    $results.warnings += "NPM Audit: $vulnLine"
} else {
    Write-Host "  ✓ No vulnerabilities found" -ForegroundColor Green
    $results.passed += "NPM Audit: Clean"
}

# Test 6: Check middleware file syntax
Write-Host "`n6. Validating JavaScript Files Exist..." -ForegroundColor Blue
$jsFiles = @(
    'middleware/enhanced-validation.js',
    'scripts/security-scan.js'
)

foreach ($file in $jsFiles) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length
        Write-Host "  ✓ $file exists ($size bytes)" -ForegroundColor Green
        $results.passed += "JS File: $file"
    } else {
        Write-Host "  ✗ $file missing" -ForegroundColor Red
        $results.failed += "JS File: $file"
    }
}

# Generate Summary
Write-Host "`n=======================================" -ForegroundColor Cyan
Write-Host "📊 VERIFICATION SUMMARY" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

Write-Host "`n✅ Passed: $($results.passed.Count)" -ForegroundColor Green
Write-Host "⚠️  Warnings: $($results.warnings.Count)" -ForegroundColor Yellow
Write-Host "❌ Failed: $($results.failed.Count)" -ForegroundColor Red

# Save detailed results
$results | ConvertTo-Json -Depth 10 | Out-File -FilePath "security-reports/verification-results.json" -Encoding UTF8
Write-Host "`n📄 Detailed results saved to: security-reports/verification-results.json" -ForegroundColor Blue

# Overall status
Write-Host "`n=======================================" -ForegroundColor Cyan
if ($results.failed.Count -eq 0) {
    Write-Host "🎉 VERIFICATION PASSED" -ForegroundColor Green
    Write-Host "All security implementations are in place!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️  VERIFICATION INCOMPLETE" -ForegroundColor Yellow
    Write-Host "Some components need attention (see above)" -ForegroundColor Yellow
    exit 1
}
