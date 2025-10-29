/**
 * Simple Logger Utility
 * Provides colored console output
 */

const chalk = require('chalk');

class Logger {
  /**
   * Log info message (blue)
   */
  static info(...args) {
    console.log(chalk.blue('ℹ'), ...args);
  }

  /**
   * Log success message (green)
   */
  static success(...args) {
    console.log(chalk.green('✓'), ...args);
  }

  /**
   * Log warning message (yellow)
   */
  static warn(...args) {
    console.log(chalk.yellow('⚠'), ...args);
  }

  /**
   * Log error message (red)
   */
  static error(...args) {
    console.log(chalk.red('✗'), ...args);
  }

  /**
   * Log debug message (gray) - only in verbose mode
   */
  static debug(...args) {
    if (process.argv.includes('--verbose') || process.env.VERBOSE === 'true') {
      console.log(chalk.gray('🐛'), ...args);
    }
  }

  /**
   * Log a divider line
   */
  static divider() {
    console.log(chalk.gray('─'.repeat(60)));
  }

  /**
   * Log section header
   */
  static header(text) {
    console.log('\n' + chalk.bold.cyan(`\n━━━ ${text} ━━━\n`));
  }

  /**
   * Log JSON object in readable format
   */
  static json(obj) {
    console.log(JSON.stringify(obj, null, 2));
  }

  /**
   * Log with custom color
   */
  static custom(color, icon, ...args) {
    console.log(chalk[color](icon), ...args);
  }
}

module.exports = Logger;

