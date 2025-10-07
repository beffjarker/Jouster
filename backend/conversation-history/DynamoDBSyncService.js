const AWS = require('aws-sdk');
const ConversationSessionManager = require('./SessionManager');

class DynamoDBSyncService {
  constructor() {
    this.dynamoClient = new AWS.DynamoDB.DocumentClient({
      region: process.env.AWS_REGION || 'us-west-2'
    });
    this.tableName = process.env.CONVERSATION_TABLE_NAME || 'jouster-conversations';
    this.sessionManager = new ConversationSessionManager();
  }

  /**
   * Sync all pending sessions to DynamoDB
   */
  async syncAllPendingSessions() {
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      const pendingSessions = await this.sessionManager.getPendingSyncSessions();
      console.log(`Found ${pendingSessions.length} sessions pending sync`);

      for (const { session, filePath } of pendingSessions) {
        try {
          await this.syncSessionToDynamoDB(session);
          await this.sessionManager.markSynced(filePath);
          results.successful++;
          console.log(`✓ Synced session: ${session.sessionId}`);
        } catch (error) {
          await this.sessionManager.markSyncFailed(filePath, error);
          results.failed++;
          results.errors.push({
            sessionId: session.sessionId,
            error: error.message
          });
          console.error(`✗ Failed to sync session ${session.sessionId}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error during sync process:', error);
      results.errors.push({ general: error.message });
    }

    return results;
  }

  /**
   * Sync a single session to DynamoDB
   */
  async syncSessionToDynamoDB(session) {
    const item = {
      sessionId: session.sessionId,
      timestamp: session.timestamp,
      type: session.type,
      title: session.title,
      participants: session.participants,
      messages: session.messages,
      summary: session.summary,
      tags: session.tags,
      syncedAt: new Date().toISOString(),
      ttl: this.calculateTTL(session.timestamp) // Optional: auto-expire old sessions
    };

    const params = {
      TableName: this.tableName,
      Item: item,
      ConditionExpression: 'attribute_not_exists(sessionId)' // Prevent duplicates
    };

    return await this.dynamoClient.put(params).promise();
  }

  /**
   * Retrieve sessions from DynamoDB
   */
  async getSessionsFromDynamoDB(type = null, limit = 50) {
    const params = {
      TableName: this.tableName,
      ScanIndexForward: false, // Most recent first
      Limit: limit
    };

    if (type) {
      params.FilterExpression = '#type = :type';
      params.ExpressionAttributeNames = { '#type': 'type' };
      params.ExpressionAttributeValues = { ':type': type };
    }

    const result = await this.dynamoClient.scan(params).promise();
    return result.Items;
  }

  /**
   * Get a specific session by ID
   */
  async getSessionById(sessionId) {
    const params = {
      TableName: this.tableName,
      Key: { sessionId }
    };

    const result = await this.dynamoClient.get(params).promise();
    return result.Item;
  }

  /**
   * Check if DynamoDB is accessible
   */
  async checkConnectivity() {
    try {
      await this.dynamoClient.describeTable({ TableName: this.tableName }).promise();
      return true;
    } catch (error) {
      console.warn('DynamoDB connectivity check failed:', error.message);
      return false;
    }
  }

  /**
   * Create the conversations table if it doesn't exist
   */
  async ensureTableExists() {
    const dynamodb = new AWS.DynamoDB({
      region: process.env.AWS_REGION || 'us-west-2'
    });

    const tableParams = {
      TableName: this.tableName,
      KeySchema: [
        { AttributeName: 'sessionId', KeyType: 'HASH' }
      ],
      AttributeDefinitions: [
        { AttributeName: 'sessionId', AttributeType: 'S' },
        { AttributeName: 'timestamp', AttributeType: 'S' },
        { AttributeName: 'type', AttributeType: 'S' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'type-timestamp-index',
          KeySchema: [
            { AttributeName: 'type', KeyType: 'HASH' },
            { AttributeName: 'timestamp', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' },
          BillingMode: 'PAY_PER_REQUEST'
        }
      ],
      BillingMode: 'PAY_PER_REQUEST',
      StreamSpecification: {
        StreamEnabled: false
      }
    };

    try {
      await dynamodb.createTable(tableParams).promise();
      console.log(`Created table: ${this.tableName}`);

      // Wait for table to be active
      await dynamodb.waitFor('tableExists', { TableName: this.tableName }).promise();
      console.log(`Table ${this.tableName} is ready`);
    } catch (error) {
      if (error.code === 'ResourceInUseException') {
        console.log(`Table ${this.tableName} already exists`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Calculate TTL for auto-expiry (optional)
   * Expires sessions after 1 year
   */
  calculateTTL(timestamp) {
    const date = new Date(timestamp);
    date.setFullYear(date.getFullYear() + 1);
    return Math.floor(date.getTime() / 1000);
  }

  /**
   * Auto-sync service - runs periodically
   */
  startAutoSync(intervalMinutes = 5) {
    console.log(`Starting auto-sync service (every ${intervalMinutes} minutes)`);

    const syncInterval = setInterval(async () => {
      const isConnected = await this.checkConnectivity();
      if (isConnected) {
        console.log('DynamoDB accessible, starting sync...');
        const results = await this.syncAllPendingSessions();
        if (results.successful > 0 || results.failed > 0) {
          console.log(`Sync complete: ${results.successful} successful, ${results.failed} failed`);
        }
      } else {
        console.log('DynamoDB not accessible, skipping sync');
      }
    }, intervalMinutes * 60 * 1000);

    return syncInterval;
  }
}

module.exports = DynamoDBSyncService;
