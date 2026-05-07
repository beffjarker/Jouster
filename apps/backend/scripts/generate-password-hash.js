/**
 * Generate a bcrypt password hash for LIFE_MAP_PASSWORD_HASH in .env
 *
 * Usage:
 *   node scripts/generate-password-hash.js "your-secure-password"
 *
 * Then paste the output into your .env file as LIFE_MAP_PASSWORD_HASH
 */

const bcrypt = require('bcrypt');

const password = process.argv[2];

if (!password) {
  console.error('Usage: node scripts/generate-password-hash.js "your-password"');
  console.error('');
  console.error('The output hash goes in .env as LIFE_MAP_PASSWORD_HASH');
  process.exit(1);
}

const SALT_ROUNDS = 12;

bcrypt.hash(password, SALT_ROUNDS).then(hash => {
  console.log('');
  console.log('Generated hash (copy to .env):');
  console.log('');
  console.log(`LIFE_MAP_PASSWORD_HASH=${hash}`);
  console.log('');
});

