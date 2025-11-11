#!/usr/bin/env node

/**
 * Environment Validator
 * Validates required environment variables are present before starting application
 */

const fs = require('fs');
const path = require('path');

const ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = ENV === 'production';

console.log(`\n🔍 Validating environment configuration for: ${ENV}\n`);

// Required variables for all environments
const REQUIRED_VARS = [
  'NODE_ENV',
  'PORT',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
];

// Additional required variables for production
const PRODUCTION_REQUIRED_VARS = [
  'S3_BUCKET_NAME',
  'DYNAMODB_REGION',
  'SENTRY_DSN',
];

// Optional but recommended variables
const RECOMMENDED_VARS = [
  'INSTAGRAM_APP_ID',
  'INSTAGRAM_APP_SECRET',
  'LASTFM_API_KEY',
  'LASTFM_SHARED_SECRET',
];

let hasErrors = false;
let hasWarnings = false;

// Check required variables
console.log('📋 Required Variables:');
REQUIRED_VARS.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.error(`   ❌ ${varName} - MISSING`);
    hasErrors = true;
  } else if (value.includes('your_') || value.includes('_here')) {
    console.error(`   ❌ ${varName} - Contains placeholder value`);
    hasErrors = true;
  } else {
    // Show partial value for security (first 4 chars only)
    const preview = value.length > 4 ? value.substring(0, 4) + '...' : '***';
    console.log(`   ✅ ${varName} - ${preview}`);
  }
});

// Check production-specific variables
if (IS_PRODUCTION) {
  console.log('\n📋 Production-Required Variables:');
  PRODUCTION_REQUIRED_VARS.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      console.error(`   ❌ ${varName} - MISSING`);
      hasErrors = true;
    } else {
      console.log(`   ✅ ${varName}`);
    }
  });
}

// Check recommended variables
console.log('\n📋 Recommended Variables:');
RECOMMENDED_VARS.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.warn(`   ⚠️  ${varName} - Not set (some features may not work)`);
    hasWarnings = true;
  } else {
    console.log(`   ✅ ${varName}`);
  }
});

// Check for dangerous configurations
console.log('\n🔒 Security Checks:');

// Check for admin credentials in app environment
if (process.env.AWS_ADMIN_ACCESS_KEY_ID || process.env.AWS_ADMIN_SECRET_ACCESS_KEY) {
  console.error('   ❌ Admin credentials detected! NEVER use admin credentials in application code');
  hasErrors = true;
} else {
  console.log('   ✅ No admin credentials found');
}

// Check for local DynamoDB endpoint in production
if (IS_PRODUCTION && process.env.DYNAMODB_ENDPOINT) {
  console.error('   ❌ Local DynamoDB endpoint set in production!');
  hasErrors = true;
} else {
  console.log('   ✅ DynamoDB configuration appropriate for environment');
}

// Check .env file exists
const envFile = `.env${ENV !== 'development' ? '.' + ENV : ''}`;
const envPath = path.join(process.cwd(), envFile);
if (fs.existsSync(envPath)) {
  console.log(`   ✅ Environment file exists: ${envFile}`);
} else {
  console.warn(`   ⚠️  Environment file not found: ${envFile}`);
  hasWarnings = true;
}

// Summary
console.log('\n' + '='.repeat(60));
if (hasErrors) {
  console.error('\n❌ VALIDATION FAILED - Missing required environment variables');
  console.error('   Please check your .env file and fill in all required values');
  console.error('   See .env.example for template\n');
  process.exit(1);
} else if (hasWarnings) {
  console.warn('\n⚠️  VALIDATION PASSED WITH WARNINGS');
  console.warn('   Some optional features may not work without recommended variables\n');
  process.exit(0);
} else {
  console.log('\n✅ VALIDATION PASSED - All required variables are set\n');
  process.exit(0);
}

