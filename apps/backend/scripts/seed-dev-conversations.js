#!/usr/bin/env node

/**
 * Seed Dev Conversations
 * 
 * Seeds the local DynamoDB with sample conversation data for development.
 * 
 * Usage:
 *   node scripts/seed-dev-conversations.js
 */

let AWS;
try {
  AWS = require('aws-sdk');
} catch (err) {
  console.warn('aws-sdk is not installed. Skipping conversation seeding.');
  console.warn('To run this script, install aws-sdk: npm install aws-sdk');
  process.exit(0);
}

const path = require('path');

// Configure AWS for local DynamoDB
const dynamodb = new AWS.DynamoDB.DocumentClient({
  region: 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
});

const TABLE_NAME = process.env.CONVERSATIONS_TABLE || 'jouster-conversations-dev';

const sampleConversations = [
  {
    conversationId: 'conv-001',
    userId: 'dev-user-1',
    title: 'Sample Conversation 1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      { role: 'user', content: 'Hello, how are you?' },
      { role: 'assistant', content: 'I am doing well, thank you! How can I help you today?' },
    ],
  },
  {
    conversationId: 'conv-002',
    userId: 'dev-user-1',
    title: 'Sample Conversation 2',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      { role: 'user', content: 'What is the weather like?' },
      { role: 'assistant', content: 'I don\'t have access to real-time weather data, but I can help you find a weather service!' },
    ],
  },
];

async function seedConversations() {
  console.log(`Seeding conversations to table: ${TABLE_NAME}`);
  
  for (const conversation of sampleConversations) {
    const params = {
      TableName: TABLE_NAME,
      Item: conversation,
    };
    
    try {
      await dynamodb.put(params).promise();
      console.log(`  Seeded: ${conversation.conversationId} - ${conversation.title}`);
    } catch (err) {
      console.error(`  Failed to seed ${conversation.conversationId}:`, err.message);
    }
  }
  
  console.log('Seeding complete.');
}

seedConversations().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
