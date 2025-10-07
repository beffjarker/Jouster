#!/usr/bin/env node

const ConversationSessionManager = require('./SessionManager');
const DynamoDBSyncService = require('./DynamoDBSyncService');
const fs = require('fs').promises;
const path = require('path');

class SessionMigrationTool {
  constructor() {
    this.sessionManager = new ConversationSessionManager();
    this.syncService = new DynamoDBSyncService();
  }

  async convertExistingMarkdownFiles() {
    const sessionsDir = path.join(__dirname, 'sessions', '2025', '10', '06');
    const results = {
      converted: [],
      errors: []
    };

    try {
      const files = await fs.readdir(sessionsDir);
      const markdownFiles = files.filter(file => file.endsWith('.md'));

      console.log(`Found ${markdownFiles.length} markdown files to convert`);

      for (const filename of markdownFiles) {
        const filePath = path.join(sessionsDir, filename);

        try {
          const jsonPath = await this.sessionManager.convertMarkdownToJson(filePath);
          results.converted.push({
            original: filePath,
            converted: jsonPath
          });
          console.log(`✓ Converted: ${filename} → ${path.basename(jsonPath)}`);

          // Optional: Remove original markdown file after successful conversion
          // await fs.unlink(filePath);

        } catch (error) {
          results.errors.push({
            file: filename,
            error: error.message
          });
          console.error(`✗ Failed to convert ${filename}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Error during conversion:', error);
      results.errors.push({ general: error.message });
    }

    return results;
  }

  async initializeDynamoDB() {
    console.log('Initializing DynamoDB table...');
    try {
      await this.syncService.ensureTableExists();
      console.log('✓ DynamoDB table ready');
    } catch (error) {
      console.error('✗ Failed to initialize DynamoDB:', error.message);
      throw error;
    }
  }

  async performInitialSync() {
    console.log('Performing initial sync to DynamoDB...');
    try {
      const results = await this.syncService.syncAllPendingSessions();
      console.log(`Initial sync complete: ${results.successful} successful, ${results.failed} failed`);

      if (results.errors.length > 0) {
        console.error('Sync errors:');
        results.errors.forEach(error => {
          console.error(`  - ${error.sessionId || 'General'}: ${error.error || error.general}`);
        });
      }

      return results;
    } catch (error) {
      console.error('Error during initial sync:', error.message);
      throw error;
    }
  }

  async runFullMigration() {
    console.log('Starting full session migration...\n');

    try {
      // Step 1: Convert existing markdown files
      console.log('Step 1: Converting markdown files to JSON...');
      const conversionResults = await this.convertExistingMarkdownFiles();
      console.log(`Conversion complete: ${conversionResults.converted.length} files converted\n`);

      // Step 2: Initialize DynamoDB
      console.log('Step 2: Setting up DynamoDB...');
      await this.initializeDynamoDB();
      console.log('DynamoDB setup complete\n');

      // Step 3: Perform initial sync
      console.log('Step 3: Syncing to DynamoDB...');
      const syncResults = await this.performInitialSync();

      console.log('\n=== Migration Summary ===');
      console.log(`Files converted: ${conversionResults.converted.length}`);
      console.log(`Sessions synced: ${syncResults.successful}`);
      console.log(`Sync failures: ${syncResults.failed}`);

      if (conversionResults.errors.length > 0 || syncResults.failed > 0) {
        console.log('\nSome operations failed. Check the logs above for details.');
        console.log('Failed files are stored in the failed-sync directory for manual review.');
      } else {
        console.log('\n✓ All operations completed successfully!');
      }

    } catch (error) {
      console.error('\n✗ Migration failed:', error.message);
      process.exit(1);
    }
  }
}

// CLI interface
if (require.main === module) {
  const tool = new SessionMigrationTool();
  const command = process.argv[2];

  switch (command) {
    case 'convert':
      tool.convertExistingMarkdownFiles()
        .then(results => {
          console.log('Conversion complete:', results);
        })
        .catch(error => {
          console.error('Conversion failed:', error);
          process.exit(1);
        });
      break;

    case 'init-db':
      tool.initializeDynamoDB()
        .then(() => {
          console.log('DynamoDB initialization complete');
        })
        .catch(error => {
          console.error('DynamoDB initialization failed:', error);
          process.exit(1);
        });
      break;

    case 'sync':
      tool.performInitialSync()
        .then(results => {
          console.log('Sync complete:', results);
        })
        .catch(error => {
          console.error('Sync failed:', error);
          process.exit(1);
        });
      break;

    case 'migrate':
    default:
      tool.runFullMigration();
      break;
  }
}

module.exports = SessionMigrationTool;
