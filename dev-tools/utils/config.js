/**
 * Configuration Loader
 * Loads and validates environment variables
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

class Config {
  /**
   * Get environment variable with validation
   * @param {string} key - Environment variable name
   * @param {boolean} required - Whether the variable is required
   * @param {string} defaultValue - Default value if not found
   * @returns {string} Environment variable value
   */
  static get(key, required = true, defaultValue = null) {
    const value = process.env[key];

    if (!value && required) {
      console.error(`❌ Error: ${key} not found in .env file`);
      console.error(`   Please add it to dev-tools/.env`);
      console.error(`   See dev-tools/.env.example for template`);
      process.exit(1);
    }

    return value || defaultValue;
  }

  /**
   * Check if running in test/dry-run mode
   * @returns {boolean}
   */
  static isDryRun() {
    return process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
  }

  /**
   * Get all GitHub configuration
   * @returns {object} GitHub config
   */
  static getGitHubConfig() {
    return {
      token: this.get('GITHUB_TOKEN'),
      username: this.get('GITHUB_USERNAME', false, 'unknown'),
    };
  }

  /**
   * Validate all required environment variables exist
   * @param {string[]} requiredKeys - Array of required env var names
   * @returns {boolean} True if all exist
   */
  static validate(requiredKeys) {
    const missing = requiredKeys.filter(key => !process.env[key]);

    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:');
      missing.forEach(key => console.error(`   - ${key}`));
      console.error('\n📝 Add these to dev-tools/.env');
      return false;
    }

    return true;
  }
}

module.exports = Config;

