// Refactored credential manager using ES6+ features
const crypto = require('crypto');

function encryptCredentials(credentials) {
  const cipher = crypto.createCipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
  let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptCredentials(encrypted) {
  const decipher = crypto.createDecipher('aes-256-cbc', process.env.ENCRYPTION_KEY);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
}

// Function to generate a secure random token
function generateSecureToken(length) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

module.exports = {
  encryptCredentials,
  decryptCredentials,
  generateSecureToken
};
