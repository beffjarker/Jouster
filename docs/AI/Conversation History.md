# Conversation History Setup Guide

This directory contains all the necessary files to run DynamoDB locally for storing conversation history.

## Quick Start

### Option 1: Docker Compose (Recommended for Development)
```bash
cd backend/conversation-history
docker-compose up -d
```

### Option 2: Rancher Stack Deployment
1. Import `rancher-stack.yml` into your Rancher environment
2. Deploy the stack
3. Access services on configured ports

## After Starting DynamoDB

1. **Initialize Tables** (Windows):
   ```cmd
   cd backend/conversation-history
   init-tables.bat
   ```

2. **Access DynamoDB Admin UI**: http://localhost:8001
3. **DynamoDB Endpoint**: http://localhost:8000

## Environment Setup

1. Copy `.env.example` to your project root as `.env.local`
2. Update configuration values if needed
3. The Angular service will automatically connect to local DynamoDB

## Data Storage

- **Conversation messages**: Stored in `ConversationHistory` table
- **Conversation metadata**: Stored in `ConversationMetadata` table  
- **Local data**: Persisted in Docker volume `dynamodb-data`

## Usage in Angular

The `ConversationHistoryService` is ready to use:

```typescript
// Inject the service
constructor(private conversationHistory: ConversationHistoryService) {}

// Create a new conversation
const conversationId = await this.conversationHistory.createConversation('Flash Experiments Discussion');

// Store a message
await this.conversationHistory.storeMessage({
  conversationId,
  timestamp: Date.now(),
  messageId: 'msg_123',
  role: 'user',
  content: 'How do I fix linting issues?'
});

// Get conversation history
const messages = await this.conversationHistory.getConversationHistory(conversationId);
```

## Security Notes

- This setup uses dummy AWS credentials for local development
- All conversation data stays local unless you configure AWS production credentials
- The entire `backend/conversation-history/` directory is git-ignored for privacy
- Only the `.gitkeep` file is tracked to preserve directory structure

## Integration with Docs Vault

This conversation history system is now integrated with our Obsidian documentation vault located in `docs/`. The conversation data helps maintain context across development sessions and provides a searchable history of project decisions and solutions.

## File Locations (Updated)

- **Documentation**: `docs/AI/Conversation History.md` (this file)
- **Backend Implementation**: `backend/conversation-history/`
- **Frontend Service**: `src/app/services/conversation-history.service.ts`
- **Database Setup**: `backend/conversation-history/docker-compose.yml`
