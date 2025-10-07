# Conversation Sessions

This directory contains conversation history session files organized by date and type. These files serve as:

1. **Offline Backup**: Persistent storage when DynamoDB is unavailable
2. **Audit Trail**: Complete conversation history for debugging and analysis
3. **Sync Source**: Files to be imported into DynamoDB when connection is restored

## Structure

```
sessions/
├── 2025/
│   ├── 10/
│   │   ├── 06/
│   │   │   ├── aws-deployment-session.json
│   │   │   ├── route53-setup-session.json
│   │   │   └── general-session.json
│   │   └── 07/
│   └── 11/
├── pending-sync/          # Files waiting to be synced to DynamoDB
├── synced/               # Successfully synced files (archived)
└── failed-sync/          # Files that failed to sync
```

## File Format

Each session file follows this JSON structure:

```json
{
  "sessionId": "uuid-v4",
  "timestamp": "2025-10-06T21:30:00.000Z",
  "type": "deployment|setup|general|debugging",
  "title": "Human readable session title",
  "participants": ["user", "assistant"],
  "messages": [
    {
      "id": "msg-uuid",
      "timestamp": "2025-10-06T21:30:05.000Z",
      "role": "user|assistant",
      "content": "message content",
      "metadata": {
        "tools_used": [],
        "files_modified": [],
        "commands_executed": []
      }
    }
  ],
  "summary": "Session summary and outcomes",
  "tags": ["aws", "deployment", "route53"],
  "syncStatus": "pending|synced|failed",
  "syncAttempts": 0,
  "lastSyncAttempt": null
}
```

## Sync Process

1. New sessions are created in the current date folder
2. When internet is available, files are moved to `pending-sync/`
3. Successful syncs move files to `synced/` (or delete them based on retention policy)
4. Failed syncs move files to `failed-sync/` for manual review
