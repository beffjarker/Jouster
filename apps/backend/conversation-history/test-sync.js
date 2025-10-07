#!/usr/bin/env node

const DynamoDBSyncService = require('./DynamoDBSyncService');
const fs = require('fs').promises;
const path = require('path');

async function testSync() {
  console.log('Testing DynamoDB conversation history sync...');

  const syncService = new DynamoDBSyncService();

  try {
    // Test connectivity
    console.log('1. Testing DynamoDB connectivity...');
    const isConnected = await syncService.checkConnectivity();
    console.log(`   DynamoDB accessible: ${isConnected}`);

    if (!isConnected) {
      console.log('   Trying to ensure table exists...');
      await syncService.ensureTableExists();
    }

    // Load our conversation history
    console.log('2. Loading conversation history...');
    const sessionPath = path.join(__dirname, 'sessions', '2025', '10', '06', 'github-cli-integration-and-safety-protocols.json');
    const sessionData = JSON.parse(await fs.readFile(sessionPath, 'utf8'));
    console.log(`   Loaded session: ${sessionData.title}`);

    // Try to sync to DynamoDB
    console.log('3. Syncing to DynamoDB...');
    await syncService.syncSessionToDynamoDB(sessionData);
    console.log('   ✓ Successfully synced to DynamoDB!');

    // Verify it was stored
    console.log('4. Verifying storage...');
    const retrievedSession = await syncService.getSessionById(sessionData.conversationId);
    if (retrievedSession) {
      console.log(`   ✓ Session retrieved from DynamoDB: ${retrievedSession.title}`);
      console.log(`   Messages count: ${retrievedSession.messages ? retrievedSession.messages.length : 0}`);
    } else {
      console.log('   ✗ Session not found in DynamoDB');
    }

  } catch (error) {
    console.error('Error during sync test:', error.message);
    console.error('Full error:', error);
  }
}

testSync();
