/**
 * Automated Security Checks for Jouster
 * Run with: node security-checks.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔒 Running Jouster Security Checks\n');

const checks = {
  passed: [],
  warnings: [],
  critical: []
};

// Check 1: Ensure .env files are not tracked
console.log('1️⃣  Checking for tracked sensitive files...');
try {
  const tracked = execSync('git ls-files', { encoding: 'utf-8' });
  const sensitivePatterns = ['.env', 'credentials', '.pem', '.key'];

  const trackedSensitive = sensitivePatterns.filter(pattern =>
    tracked.includes(pattern)
  );

  if (trackedSensitive.length > 0) {
    checks.critical.push(`Sensitive files tracked in git: ${trackedSensitive.join(', ')}`);
  } else {
    checks.passed.push('No sensitive files tracked in git');
  }
} catch (e) {
  checks.warnings.push('Could not check git tracked files');
}

// Check 2: Verify .gitignore exists and has required entries
console.log('2️⃣  Verifying .gitignore configuration...');
try {
  const gitignore = fs.readFileSync('.gitignore', 'utf-8');
  const requiredPatterns = ['.env', 'aws/credentials', '*.pem', '*.key'];

  const missing = requiredPatterns.filter(pattern => !gitignore.includes(pattern));

  if (missing.length > 0) {
    checks.warnings.push(`Missing .gitignore patterns: ${missing.join(', ')}`);
  } else {
    checks.passed.push('.gitignore properly configured');
  }
} catch (e) {
  checks.critical.push('.gitignore file not found');
}

// Check 3: Check for hardcoded credentials in code
console.log('3️⃣  Scanning for hardcoded credentials...');
try {
  const suspiciousPatterns = [
    /AKIA[0-9A-Z]{16}/g, // AWS access key pattern
    /password\s*=\s*["'][^"']+["']/gi,
    /api_key\s*=\s*["'][^"']+["']/gi,
    /secret\s*=\s*["'][^"']+["']/gi
  ];

  const jsFiles = execSync('git ls-files "*.js" "*.ts"', { encoding: 'utf-8' }).split('\n');

  let foundHardcoded = false;

  jsFiles.forEach(file => {
    if (!file || file.includes('node_modules')) return;

    try {
      const content = fs.readFileSync(file, 'utf-8');

      suspiciousPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          checks.critical.push(`Possible hardcoded credential in ${file}`);
          foundHardcoded = true;
        }
      });
    } catch (e) {
      // File might not exist anymore
    }
  });

  if (!foundHardcoded) {
    checks.passed.push('No obvious hardcoded credentials found');
  }
} catch (e) {
  checks.warnings.push('Could not scan for hardcoded credentials');
}

// Check 4: Verify security middleware files exist
console.log('4️⃣  Checking security middleware...');
const securityFiles = [
  'apps/backend/middleware/security.js',
  'apps/backend/middleware/validation.js',
  'apps/backend/config/cors.js'
];

securityFiles.forEach(file => {
  if (fs.existsSync(file)) {
    checks.passed.push(`Security file exists: ${file}`);
  } else {
    checks.warnings.push(`Missing security file: ${file}`);
  }
});

// Check 5: Verify package.json has no malicious scripts
console.log('5️⃣  Checking package.json scripts...');
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const suspiciousCommands = ['curl', 'wget', 'rm -rf', 'chmod 777'];

  let foundSuspicious = false;
  Object.entries(pkg.scripts || {}).forEach(([name, script]) => {
    suspiciousCommands.forEach(cmd => {
      if (script.includes(cmd)) {
        checks.warnings.push(`Suspicious command in script "${name}": ${cmd}`);
        foundSuspicious = true;
      }
    });
  });

  if (!foundSuspicious) {
    checks.passed.push('No suspicious npm scripts found');
  }
} catch (e) {
  checks.warnings.push('Could not check package.json');
}

// Check 6: Verify NODE_ENV is set appropriately
console.log('6️⃣  Checking NODE_ENV configuration...');
const nodeEnv = process.env.NODE_ENV;

if (!nodeEnv) {
  checks.warnings.push('NODE_ENV not set');
} else if (nodeEnv === 'production' && !process.env.ENCRYPTION_MASTER_KEY) {
  checks.critical.push('Production environment without ENCRYPTION_MASTER_KEY');
} else {
  checks.passed.push(`NODE_ENV correctly set to: ${nodeEnv}`);
}

// Print Results
console.log('\n📊 Security Check Results\n');
console.log('=========================\n');

if (checks.critical.length > 0) {
  console.log('🚨 CRITICAL ISSUES:');
  checks.critical.forEach(issue => console.log(`   ❌ ${issue}`));
  console.log('');
}

if (checks.warnings.length > 0) {
  console.log('⚠️  WARNINGS:');
  checks.warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
  console.log('');
}

if (checks.passed.length > 0) {
  console.log('✅ PASSED CHECKS:');
  checks.passed.forEach(pass => console.log(`   ✅ ${pass}`));
  console.log('');
}

// Summary
const total = checks.passed.length + checks.warnings.length + checks.critical.length;
const score = (checks.passed.length / total) * 100;

console.log(`\n📈 Security Score: ${score.toFixed(1)}% (${checks.passed.length}/${total} checks passed)`);

if (checks.critical.length > 0) {
  console.log('\n⚠️  CRITICAL ISSUES FOUND - Please address immediately!');
  process.exit(1);
} else if (checks.warnings.length > 0) {
  console.log('\n⚠️  Some warnings found - Please review');
  process.exit(0);
} else {
  console.log('\n✅ All security checks passed!');
  process.exit(0);
}
#!/bin/bash
# Security Audit Script for Jouster
# Run this regularly to check for security issues

echo "🔒 Jouster Security Audit"
echo "========================="
echo ""

# Check for npm vulnerabilities
echo "📦 Checking npm dependencies for vulnerabilities..."
npm audit --json > vulnerability-report.json
npm audit

echo ""
echo "📊 Audit Summary:"
npm audit --summary

echo ""
echo "🔍 Checking for sensitive files in git..."

# Check if sensitive files are tracked
SENSITIVE_FILES=".env .env.production aws/credentials aws/config *.pem *.key"
for file in $SENSITIVE_FILES; do
  if git ls-files --error-unmatch "$file" 2>/dev/null; then
    echo "⚠️  WARNING: $file is tracked in git!"
  fi
done

echo ""
echo "🔐 Checking environment variables..."

# Check if critical env vars are set (production)
if [ "$NODE_ENV" = "production" ]; then
  REQUIRED_VARS="ENCRYPTION_MASTER_KEY ENFORCE_HTTPS"
  for var in $REQUIRED_VARS; do
    if [ -z "${!var}" ]; then
      echo "❌ Missing critical env var: $var"
    else
      echo "✅ $var is set"
    fi
  done
fi

echo ""
echo "🔒 Checking file permissions..."

# Check for overly permissive files
find . -type f -perm 0777 2>/dev/null | grep -v node_modules | while read file; do
  echo "⚠️  WARNING: $file has 777 permissions"
done

echo ""
echo "📝 Security audit complete!"
echo ""
echo "Next steps:"
echo "1. Review vulnerability-report.json"
echo "2. Run 'npm audit fix' to fix vulnerabilities"
echo "3. Check for any warnings above"
echo "4. Rotate credentials if any exposure detected"

