#!/usr/bin/env node

// Credential Obfuscation Tool for Production Environment
// Usage: node obfuscate-credentials.js

const CredentialManager = require('./backend/credential-manager');

const credentialManager = new CredentialManager();

// Sample credentials for demonstration (replace with your actual values)
const sampleCredentials = {
  INSTAGRAM_APP_ID: '123456789012345',
  INSTAGRAM_APP_SECRET: 'abcdef123456789abcdef123456789abc',
  INSTAGRAM_ACCESS_TOKEN: 'EAAG1234567890ABCDEFabcdef1234567890',
  INSTAGRAM_USER_ID: '17841400123456789',
  FACEBOOK_PAGE_ID: '987654321098765',
  FACEBOOK_PAGE_ACCESS_TOKEN: 'EAAG0987654321ZYXWVUzyxwvu0987654321'
};

console.log('🔒 Instagram Credential Obfuscation Tool\n');
console.log('This tool helps you create obfuscated credentials for production deployment.\n');

console.log('📝 Development (.env file format):');
console.log('Use plain text credentials in your .env file for development:\n');

Object.entries(sampleCredentials).forEach(([key, value]) => {
  console.log(`${key}=${value}`);
});

console.log('\n🔐 Production (Obfuscated format):');
console.log('Use these obfuscated versions for production environment variables:\n');

Object.entries(sampleCredentials).forEach(([key, value]) => {
  const obfuscated = credentialManager.obfuscate(value);
  console.log(`${key}_OBFUSCATED=${obfuscated}`);
});

console.log('\n📋 Production .env Template:');
console.log('Copy this to your production environment:\n');

console.log('# Production Instagram Graph API Configuration (Obfuscated)');
console.log('NODE_ENV=production');
Object.entries(sampleCredentials).forEach(([key, value]) => {
  const obfuscated = credentialManager.obfuscate(value);
  console.log(`${key}_OBFUSCATED=${obfuscated}`);
});

console.log('\n⚠️  Important Security Notes:');
console.log('1. Replace the sample values above with your actual Instagram API credentials');
console.log('2. Never commit actual credentials to version control');
console.log('3. Use environment-specific deployment processes for production');
console.log('4. The obfuscation is basic - use proper secrets management for high security');
console.log('5. Rotate credentials regularly and update obfuscated versions');

console.log('\n🧪 Test Deobfuscation:');
console.log('Verifying obfuscation/deobfuscation works correctly...\n');

Object.entries(sampleCredentials).forEach(([key, originalValue]) => {
  const obfuscated = credentialManager.obfuscate(originalValue);
  const deobfuscated = credentialManager.deobfuscate(obfuscated);
  const isCorrect = originalValue === deobfuscated;

  console.log(`${key}: ${isCorrect ? '✅' : '❌'} ${isCorrect ? 'PASS' : 'FAIL'}`);
  if (!isCorrect) {
    console.log(`  Original: ${originalValue}`);
    console.log(`  Deobfuscated: ${deobfuscated}`);
  }
});

console.log('\n🚀 Next Steps:');
console.log('1. Replace sample credentials with your actual Instagram Graph API credentials');
console.log('2. For development: Add plain text values to .env file');
console.log('3. For production: Add obfuscated values to production environment');
console.log('4. Test with: curl http://localhost:3000/api/health');
