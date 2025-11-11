/**
 * GitHub API Utilities
 * Shared functions for GitHub integrations
 */

const { Octokit } = require('@octokit/rest');
const Config = require('../utils/config');
const Logger = require('../utils/logger');

class GitHubUtils {
  constructor() {
    const token = Config.get('GITHUB_TOKEN');

    this.octokit = new Octokit({
      auth: token,
      userAgent: 'Jouster Dev Tools v1.0.0',
    });
  }

  /**
   * Get authenticated user information
   * @returns {Promise<object>} User data
   */
  async getUser() {
    try {
      const { data } = await this.octokit.rest.users.getAuthenticated();
      return data;
    } catch (error) {
      Logger.error('Failed to get user:', error.message);
      throw error;
    }
  }

  /**
   * Validate GitHub token
   * @returns {Promise<boolean>} True if valid
   */
  async validateToken() {
    try {
      await this.getUser();
      return true;
    } catch (error) {
      if (error.status === 401) {
        Logger.error('Invalid GitHub token. Please check GITHUB_TOKEN in .env');
        return false;
      }
      throw error;
    }
  }

  /**
   * Create a gist
   * @param {object} options - Gist options
   * @param {string} options.description - Gist description
   * @param {object} options.files - Files object { filename: { content: string } }
   * @param {boolean} options.public - Whether gist is public
   * @returns {Promise<object>} Created gist data
   */
  async createGist({ description, files, public: isPublic = false }) {
    try {
      const { data } = await this.octokit.rest.gists.create({
        description,
        files,
        public: isPublic,
      });

      return data;
    } catch (error) {
      Logger.error('Failed to create gist:', error.message);
      throw error;
    }
  }

  /**
   * List user's gists
   * @param {number} perPage - Number of gists per page
   * @returns {Promise<array>} Array of gists
   */
  async listGists(perPage = 30) {
    try {
      const { data } = await this.octokit.rest.gists.list({
        per_page: perPage,
      });

      return data;
    } catch (error) {
      Logger.error('Failed to list gists:', error.message);
      throw error;
    }
  }

  /**
   * List user's repositories
   * @param {object} options - List options
   * @param {string} options.sort - Sort by (created, updated, pushed, full_name)
   * @param {string} options.direction - Sort direction (asc, desc)
   * @param {number} options.perPage - Results per page
   * @returns {Promise<array>} Array of repositories
   */
  async listRepositories({ sort = 'updated', direction = 'desc', perPage = 30 } = {}) {
    try {
      const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
        sort,
        direction,
        per_page: perPage,
      });

      return data;
    } catch (error) {
      Logger.error('Failed to list repositories:', error.message);
      throw error;
    }
  }

  /**
   * Get repository information
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @returns {Promise<object>} Repository data
   */
  async getRepository(owner, repo) {
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      return data;
    } catch (error) {
      Logger.error('Failed to get repository:', error.message);
      throw error;
    }
  }
}

module.exports = GitHubUtils;

