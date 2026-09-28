/**
 * DynamoDB Service for Jouster Backend
 * Handles all DynamoDB operations with environment-specific table names
 *
 * Environment-based table naming:
 * - development: jouster-users-dev
 * - qa: jouster-users-qa
 * - staging: jouster-users-stg
 * - production: jouster-users-prod
 *
 * @module services/dynamodb
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand
} = require('@aws-sdk/lib-dynamodb');

class DynamoDBService {
  constructor() {
    // Determine environment (default to development)
    this.environment = process.env.NODE_ENV || 'development';

    // Configure DynamoDB client
    const clientConfig = {
      region: process.env.AWS_REGION || 'us-west-2',
    };

    // Use local DynamoDB for development if endpoint is configured
    if (process.env.DYNAMODB_ENDPOINT && this.environment === 'development') {
      clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
      console.log(`DynamoDB: Using local endpoint ${process.env.DYNAMODB_ENDPOINT}`);
    }

    // Configure credentials
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }

    // Create DynamoDB client
    const client = new DynamoDBClient(clientConfig);
    this.docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true,
      },
    });

    // Table names based on environment
    this.tables = {
      users: `jouster-users-${this.getEnvironmentSuffix()}`,
    };

    console.log(`DynamoDB Service initialized for environment: ${this.environment}`);
    console.log(`Users table: ${this.tables.users}`);
  }

  /**
   * Get environment suffix for table names
   * @returns {string} Environment suffix
   */
  getEnvironmentSuffix() {
    const envMap = {
      development: 'dev',
      qa: 'qa',
      staging: 'stg',
      production: 'prod',
    };
    return envMap[this.environment] || 'dev';
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  async createUser(userData) {
    const timestamp = new Date().toISOString();

    const user = {
      ...userData,
      createdAt: timestamp,
      updatedAt: timestamp,
      isActive: userData.isActive !== undefined ? userData.isActive : true,
    };

    const command = new PutCommand({
      TableName: this.tables.users,
      Item: user,
      ConditionExpression: 'attribute_not_exists(userId)',
    });

    try {
      await this.docClient.send(command);
      return user;
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new Error('User already exists');
      }
      throw error;
    }
  }

  /**
   * Get user by userId
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} User object or null
   */
  async getUserById(userId) {
    const command = new GetCommand({
      TableName: this.tables.users,
      Key: { userId },
    });

    const response = await this.docClient.send(command);
    return response.Item || null;
  }

  /**
   * Get user by username
   * @param {string} username - Username
   * @returns {Promise<Object|null>} User object or null
   */
  async getUserByUsername(username) {
    const command = new QueryCommand({
      TableName: this.tables.users,
      IndexName: 'username-index',
      KeyConditionExpression: 'username = :username',
      ExpressionAttributeValues: {
        ':username': username,
      },
    });

    const response = await this.docClient.send(command);
    return response.Items && response.Items.length > 0 ? response.Items[0] : null;
  }

  /**
   * Get user by email
   * @param {string} email - Email address
   * @returns {Promise<Object|null>} User object or null
   */
  async getUserByEmail(email) {
    const command = new QueryCommand({
      TableName: this.tables.users,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email.toLowerCase(),
      },
    });

    const response = await this.docClient.send(command);
    return response.Items && response.Items.length > 0 ? response.Items[0] : null;
  }

  /**
   * Update user
   * @param {string} userId - User ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(userId, updates) {
    const timestamp = new Date().toISOString();

    // Build update expression
    const updateExpressionParts = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {
      ':updatedAt': timestamp,
    };

    // Add updatedAt
    updateExpressionParts.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';

    // Add other fields
    Object.keys(updates).forEach((key) => {
      if (key !== 'userId') { // Don't update the primary key
        updateExpressionParts.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = updates[key];
      }
    });

    const command = new UpdateCommand({
      TableName: this.tables.users,
      Key: { userId },
      UpdateExpression: `SET ${updateExpressionParts.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    });

    const response = await this.docClient.send(command);
    return response.Attributes;
  }

  /**
   * Delete user (soft delete by setting isActive to false)
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Updated user
   */
  async deleteUser(userId) {
    return this.updateUser(userId, {
      isActive: false,
      deletedAt: new Date().toISOString(),
    });
  }

  /**
   * Permanently delete user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async permanentlyDeleteUser(userId) {
    const command = new DeleteCommand({
      TableName: this.tables.users,
      Key: { userId },
    });

    await this.docClient.send(command);
  }

  /**
   * List all users (with optional filters)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} List of users
   */
  async listUsers(options = {}) {
    const { activeOnly = true, limit = 100 } = options;

    const params = {
      TableName: this.tables.users,
      Limit: limit,
    };

    if (activeOnly) {
      params.FilterExpression = 'isActive = :isActive';
      params.ExpressionAttributeValues = {
        ':isActive': true,
      };
    }

    const command = new ScanCommand(params);
    const response = await this.docClient.send(command);
    return response.Items || [];
  }
}

module.exports = DynamoDBService;

