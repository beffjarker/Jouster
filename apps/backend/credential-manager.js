// Import necessary modules
const crypto = require('crypto');

// Function to generate a secure random token
function generateSecureToken(length) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

// Export the function for use in other modules
module.exports = { generateSecureToken };
