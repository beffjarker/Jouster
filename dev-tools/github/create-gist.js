#!/usr/bin/env node

/**
 * Create GitHub Gist
 * Creates a new gist from file or direct content
 *
 * Usage:
 *   node create-gist.js --file path/to/file.js
 *   node create-gist.js --content "code here" --filename "test.js"
 *   node create-gist.js --help
 */

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const GitHubUtils = require('./github-utils');
const Logger = require('../utils/logger');
const Config = require('../utils/config');

// Configure CLI
program
  .name('create-gist')
  .description('Create a GitHub gist from file or content')
  .option('-f, --file <path>', 'Path to file to upload')
  .option('-c, --content <text>', 'Direct text content')
  .option('-n, --filename <name>', 'Filename for the gist')
  .option('-d, --description <text>', 'Gist description', 'Created by dev-tools')
  .option('-p, --public', 'Make gist public (default: private)', false)
  .option('--dry-run', 'Show what would be created without actually creating', false)
  .option('--verbose', 'Show detailed output', false)
  .parse(process.argv);

const options = program.opts();

async function createGist() {
  Logger.header('Create GitHub Gist');

  // Validate inputs
  if (!options.file && !options.content) {
    Logger.error('Either --file or --content must be provided');
    program.help();
    process.exit(1);
  }

  let content;
  let filename;

  // Get content from file
  if (options.file) {
    const filePath = path.resolve(options.file);

    if (!fs.existsSync(filePath)) {
      Logger.error(`File not found: ${filePath}`);
      process.exit(1);
    }

    content = fs.readFileSync(filePath, 'utf8');
    filename = options.filename || path.basename(filePath);
    Logger.info(`Reading from file: ${filePath}`);
  }
  // Use direct content
  else if (options.content) {
    content = options.content;
    filename = options.filename || 'snippet.txt';
    Logger.info(`Using direct content (${content.length} chars)`);
  }

  // Prepare gist data
  const gistData = {
    description: options.description,
    files: {
      [filename]: {
        content: content,
      },
    },
    public: options.public,
  };

  Logger.info(`Filename: ${filename}`);
  Logger.info(`Description: ${options.description}`);
  Logger.info(`Visibility: ${options.public ? 'Public' : 'Private'}`);
  Logger.info(`Content size: ${content.length} bytes`);

  // Dry run mode
  if (Config.isDryRun()) {
    Logger.warn('DRY RUN MODE - Gist would be created with:');
    Logger.json(gistData);
    return;
  }

  // Create the gist
  try {
    Logger.info('Creating gist...');

    const github = new GitHubUtils();

    // Validate token first
    if (!await github.validateToken()) {
      process.exit(1);
    }

    const gist = await github.createGist(gistData);

    Logger.divider();
    Logger.success('Gist created successfully!');
    Logger.info(`URL: ${gist.html_url}`);
    Logger.info(`Gist ID: ${gist.id}`);

    if (options.verbose) {
      Logger.debug('Full response:');
      Logger.json(gist);
    }

  } catch (error) {
    Logger.error('Failed to create gist');
    Logger.error(error.message);

    if (options.verbose) {
      console.error(error);
    }

    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createGist().catch(error => {
    Logger.error('Unexpected error:', error.message);
    process.exit(1);
  });
}

module.exports = { createGist };

