#!/usr/bin/env node

/**
 * List GitHub Repositories
 * Lists repositories for the authenticated user
 *
 * Usage:
 *   node list-repos.js
 *   node list-repos.js --sort stars --filter jouster
 *   node list-repos.js --limit 10 --verbose
 */

const { program } = require('commander');
const GitHubUtils = require('./github-utils');
const Logger = require('../utils/logger');

// Configure CLI
program
  .name('list-repos')
  .description('List GitHub repositories')
  .option('-s, --sort <type>', 'Sort by (created, updated, pushed, full_name)', 'updated')
  .option('-d, --direction <dir>', 'Sort direction (asc, desc)', 'desc')
  .option('-l, --limit <number>', 'Maximum number of repos to show', '30')
  .option('-f, --filter <text>', 'Filter repos by name (case-insensitive)')
  .option('--stars', 'Show only repos with stars')
  .option('--verbose', 'Show detailed information')
  .parse(process.argv);

const options = program.opts();

async function listRepositories() {
  Logger.header('GitHub Repositories');

  try {
    const github = new GitHubUtils();

    // Validate token
    Logger.info('Authenticating...');
    if (!await github.validateToken()) {
      process.exit(1);
    }

    const user = await github.getUser();
    Logger.success(`Authenticated as: ${user.login}`);
    Logger.divider();

    // Fetch repositories
    Logger.info('Fetching repositories...');
    const repos = await github.listRepositories({
      sort: options.sort,
      direction: options.direction,
      perPage: parseInt(options.limit),
    });

    // Filter repositories
    let filteredRepos = repos;

    if (options.filter) {
      const filterLower = options.filter.toLowerCase();
      filteredRepos = repos.filter(repo =>
        repo.name.toLowerCase().includes(filterLower) ||
        (repo.description && repo.description.toLowerCase().includes(filterLower))
      );
      Logger.info(`Filtered: ${filteredRepos.length} of ${repos.length} repos match "${options.filter}"`);
    }

    if (options.stars) {
      filteredRepos = filteredRepos.filter(repo => repo.stargazers_count > 0);
      Logger.info(`Filtered: ${filteredRepos.length} repos have stars`);
    }

    if (filteredRepos.length === 0) {
      Logger.warn('No repositories found matching criteria');
      return;
    }

    Logger.divider();
    Logger.success(`Found ${filteredRepos.length} repositories:\n`);

    // Display repositories
    filteredRepos.forEach((repo, index) => {
      console.log(`${index + 1}. ${repo.full_name}`);

      if (repo.description) {
        console.log(`   📝 ${repo.description}`);
      }

      console.log(`   🔗 ${repo.html_url}`);
      console.log(`   ⭐ ${repo.stargazers_count} stars  🍴 ${repo.forks_count} forks`);
      console.log(`   📅 Updated: ${new Date(repo.updated_at).toLocaleDateString()}`);

      if (repo.language) {
        console.log(`   💻 ${repo.language}`);
      }

      if (options.verbose) {
        console.log(`   👁  Watchers: ${repo.watchers_count}`);
        console.log(`   📊 Size: ${repo.size} KB`);
        console.log(`   ${repo.private ? '🔒 Private' : '🌍 Public'}`);

        if (repo.homepage) {
          console.log(`   🏠 Homepage: ${repo.homepage}`);
        }
      }

      console.log('');
    });

    // Summary
    Logger.divider();
    const totalStars = filteredRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    const totalForks = filteredRepos.reduce((sum, repo) => sum + repo.forks_count, 0);

    Logger.info(`Total stars: ${totalStars}`);
    Logger.info(`Total forks: ${totalForks}`);

    const languages = [...new Set(filteredRepos.map(r => r.language).filter(Boolean))];
    if (languages.length > 0) {
      Logger.info(`Languages: ${languages.join(', ')}`);
    }

  } catch (error) {
    Logger.error('Failed to list repositories');
    Logger.error(error.message);

    if (options.verbose) {
      console.error(error);
    }

    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  listRepositories().catch(error => {
    Logger.error('Unexpected error:', error.message);
    process.exit(1);
  });
}

module.exports = { listRepositories };

