# Security Implementation Verification
# Simple PowerShell script to verify all security implementations

Write-Host "Security Implementation Verification" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

$passed = 0
$failed = 0
$warnings = 0

# Check directories
Write-Host "`n1. Checking Directories..." -ForegroundColor Blue
$dirs = @('middleware', 'tests', 'scripts', 'security-reports')
foreach ($dir in $dirs) {
    if (Test-Path $dir) {
        Write-Host "  [OK] $dir" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  [FAIL] $dir missing" -ForegroundColor Red
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "        Created $dir" -ForegroundColor Yellow
        $failed++
    }
}

# Check security files
Write-Host "`n2. Checking Security Files..." -ForegroundColor Blue
$files = @(
    'middleware\enhanced-validation.js',
    'tests\security.test.js',
    'scripts\security-scan.js',
    'SECURITY-ACTION-PLAN.md',
    'SECURITY-REPORT.md',
    'SECURITY-IMPLEMENTATION-SUMMARY.md'
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length
        Write-Host "  [OK] $file - $size bytes" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  [FAIL] $file missing" -ForegroundColor Red
        $failed++
    }
}

# Check package.json scripts
Write-Host "`n3. Checking package.json Scripts..." -ForegroundColor Blue
if (Test-Path 'package.json') {
    $pkg = Get-Content 'package.json' -Raw | ConvertFrom-Json
    $scripts = @('security:audit', 'security:scan:local', 'test:security')

    foreach ($script in $scripts) {
        if ($pkg.scripts.PSObject.Properties.Name -contains $script) {
            Write-Host "  [OK] $script" -ForegroundColor Green
            $passed++
        } else {
            Write-Host "  [FAIL] $script missing" -ForegroundColor Red
            $failed++
        }
    }
}

# Check server.js integration
Write-Host "`n4. Checking server.js Integration..." -ForegroundColor Blue
if (Test-Path 'server.js') {
    $content = Get-Content 'server.js' -Raw
    if ($content -match 'enhanced-validation') {
        Write-Host "  [OK] enhanced-validation imported" -ForegroundColor Green
        $passed++
    } else {
        Write-Host "  [WARN] enhanced-validation not imported" -ForegroundColor Yellow
        $warnings++
    }
}

# Run npm audit
Write-Host "`n5. Running NPM Audit..." -ForegroundColor Blue
npm audit > security-reports\audit-results.txt 2>&1
if (Test-Path 'security-reports\audit-results.txt') {
    Write-Host "  [OK] Audit saved to security-reports\audit-results.txt" -ForegroundColor Green
    $passed++
} else {
    Write-Host "  [FAIL] Could not save audit results" -ForegroundColor Red
    $failed++
}

# Summary
Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "Passed:   $passed" -ForegroundColor Green
Write-Host "Failed:   $failed" -ForegroundColor Red
Write-Host "Warnings: $warnings" -ForegroundColor Yellow

if ($failed -eq 0) {
    Write-Host "`nVERIFICATION PASSED!" -ForegroundColor Green
} else {
    Write-Host "`nVERIFICATION INCOMPLETE - $failed issues" -ForegroundColor Yellow
}

Write-Host "`nSaving results..." -ForegroundColor Blue
@{
    timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    passed = $passed
    failed = $failed
    warnings = $warnings
} | ConvertTo-Json | Out-File -FilePath "security-reports\verification-summary.json" -Encoding UTF8

Write-Host "[OK] Results saved to security-reports\verification-summary.json" -ForegroundColor Green

