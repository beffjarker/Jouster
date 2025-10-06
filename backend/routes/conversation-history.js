const express = require('express');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Configure DynamoDB
const dynamodb = new AWS.DynamoDB.DocumentClient({
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy'
});

const CONVERSATIONS_TABLE = 'jouster-conversations';
const MESSAGES_TABLE = 'jouster-messages';

/**
 * GET /api/conversation-history - Get all conversations
 */
router.get('/', async (req, res) => {
  try {
    const params = {
      TableName: CONVERSATIONS_TABLE,
      ScanIndexForward: false // Sort by most recent first
    };

    const result = await dynamodb.scan(params).promise();

    // Sort by startTime descending
    const conversations = result.Items.sort((a, b) =>
      new Date(b.startTime) - new Date(a.startTime)
    );

    res.json({
      success: true,
      data: conversations,
      total: conversations.length
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations',
      details: error.message
    });
  }
});

/**
 * GET /api/conversation-history/:id - Get specific conversation with messages
 */
router.get('/:id', async (req, res) => {
  try {
    const conversationId = req.params.id;

    // Get conversation details
    const conversationParams = {
      TableName: CONVERSATIONS_TABLE,
      Key: { conversationId }
    };

    const conversationResult = await dynamodb.get(conversationParams).promise();

    if (!conversationResult.Item) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    // Get messages for this conversation
    const messagesParams = {
      TableName: MESSAGES_TABLE,
      KeyConditionExpression: 'conversationId = :conversationId',
      ExpressionAttributeValues: {
        ':conversationId': conversationId
      },
      ScanIndexForward: true // Sort by timestamp ascending
    };

    const messagesResult = await dynamodb.query(messagesParams).promise();

    res.json({
      success: true,
      data: {
        ...conversationResult.Item,
        messages: messagesResult.Items
      }
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation',
      details: error.message
    });
  }
});

/**
 * POST /api/conversation-history - Create new conversation
 */
router.post('/', async (req, res) => {
  try {
    const { title, project, messages = [] } = req.body;

    const conversationId = uuidv4();
    const now = new Date().toISOString();

    const conversation = {
      conversationId,
      title: title || `Conversation ${now}`,
      project: project || 'Jouster',
      startTime: now,
      endTime: now,
      messageCount: messages.length,
      createdAt: now,
      updatedAt: now
    };

    // Save conversation
    const conversationParams = {
      TableName: CONVERSATIONS_TABLE,
      Item: conversation
    };

    await dynamodb.put(conversationParams).promise();

    // Save messages if provided
    if (messages.length > 0) {
      for (const [index, message] of messages.entries()) {
        const messageItem = {
          conversationId,
          messageId: message.messageId || uuidv4(),
          timestamp: message.timestamp || Date.now(),
          sortKey: index.toString().padStart(6, '0'), // For ordering
          role: message.role,
          content: message.content,
          metadata: message.metadata || {},
          createdAt: now
        };

        const messageParams = {
          TableName: MESSAGES_TABLE,
          Item: messageItem
        };

        await dynamodb.put(messageParams).promise();
      }

      // Update conversation with final message count and end time
      const updateParams = {
        TableName: CONVERSATIONS_TABLE,
        Key: { conversationId },
        UpdateExpression: 'SET messageCount = :count, endTime = :endTime, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':count': messages.length,
          ':endTime': messages[messages.length - 1].timestamp
            ? new Date(messages[messages.length - 1].timestamp).toISOString()
            : now,
          ':updatedAt': now
        }
      };

      await dynamodb.update(updateParams).promise();
    }

    res.status(201).json({
      success: true,
      data: { ...conversation, messages }
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create conversation',
      details: error.message
    });
  }
});

/**
 * POST /api/conversation-history/migrate - Migrate JSON files to DynamoDB
 */
router.post('/migrate', async (req, res) => {
  try {
    const conversationDir = path.join(__dirname, '../conversation-history');
    const files = fs.readdirSync(conversationDir)
      .filter(file => file.endsWith('.json') && file.startsWith('session-'));

    let migratedCount = 0;
    const errors = [];

    for (const file of files) {
      try {
        const filePath = path.join(conversationDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const conversation = JSON.parse(content);

        // Check if conversation already exists
        const existsParams = {
          TableName: CONVERSATIONS_TABLE,
          Key: { conversationId: conversation.conversationId }
        };

        const existsResult = await dynamodb.get(existsParams).promise();

        if (existsResult.Item) {
          console.log(`Conversation ${conversation.conversationId} already exists, skipping`);
          continue;
        }

        // Migrate conversation
        const conversationItem = {
          conversationId: conversation.conversationId,
          title: conversation.title,
          project: conversation.project || 'Jouster',
          startTime: conversation.startTime,
          endTime: conversation.endTime,
          messageCount: conversation.messages?.length || 0,
          createdAt: conversation.startTime,
          updatedAt: new Date().toISOString()
        };

        await dynamodb.put({
          TableName: CONVERSATIONS_TABLE,
          Item: conversationItem
        }).promise();

        // Migrate messages
        if (conversation.messages && conversation.messages.length > 0) {
          for (const [index, message] of conversation.messages.entries()) {
            const messageItem = {
              conversationId: conversation.conversationId,
              messageId: message.messageId || uuidv4(),
              timestamp: message.timestamp || Date.now(),
              sortKey: index.toString().padStart(6, '0'),
              role: message.role,
              content: message.content,
              metadata: message.metadata || {},
              createdAt: conversation.startTime
            };

            await dynamodb.put({
              TableName: MESSAGES_TABLE,
              Item: messageItem
            }).promise();
          }
        }

        migratedCount++;
        console.log(`Migrated conversation: ${conversation.title}`);
      } catch (fileError) {
        console.error(`Error migrating file ${file}:`, fileError);
        errors.push({ file, error: fileError.message });
      }
    }

    res.json({
      success: true,
      message: `Migration completed. Migrated ${migratedCount} conversations.`,
      migratedCount,
      errors
    });
  } catch (error) {
    console.error('Error during migration:', error);
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      details: error.message
    });
  }
});

/**
 * DELETE /api/conversation-history/:id - Delete conversation
 */
router.delete('/:id', async (req, res) => {
  try {
    const conversationId = req.params.id;

    // Delete all messages first
    const messagesParams = {
      TableName: MESSAGES_TABLE,
      KeyConditionExpression: 'conversationId = :conversationId',
      ExpressionAttributeValues: {
        ':conversationId': conversationId
      }
    };

    const messagesResult = await dynamodb.query(messagesParams).promise();

    for (const message of messagesResult.Items) {
      await dynamodb.delete({
        TableName: MESSAGES_TABLE,
        Key: {
          conversationId: message.conversationId,
          messageId: message.messageId
        }
      }).promise();
    }

    // Delete conversation
    await dynamodb.delete({
      TableName: CONVERSATIONS_TABLE,
      Key: { conversationId }
    }).promise();

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete conversation',
      details: error.message
    });
  }
});

module.exports = router;
