const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class ConversationSessionManager {
  constructor() {
    this.basePath = path.join(__dirname, 'sessions');
    this.pendingSyncPath = path.join(this.basePath, 'pending-sync');
    this.syncedPath = path.join(this.basePath, 'synced');
    this.failedSyncPath = path.join(this.basePath, 'failed-sync');
  }

  /**
   * Create a new conversation session file
   */
  async createSession(type, title, participants = ['user', 'assistant']) {
    const sessionId = uuidv4();
    const now = new Date();
    const dateStr = this.formatDatePath(now);

    const session = {
      sessionId,
      timestamp: now.toISOString(),
      type,
      title,
      participants,
      messages: [],
      summary: '',
      tags: [],
      syncStatus: 'pending',
      syncAttempts: 0,
      lastSyncAttempt: null
    };

    const sessionPath = path.join(this.basePath, dateStr, `${type}-session-${sessionId}.json`);
    await this.ensureDirectoryExists(path.dirname(sessionPath));
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));

    return { sessionId, sessionPath };
  }

  /**
   * Add a message to an existing session
   */
  async addMessage(sessionPath, role, content, metadata = {}) {
    const session = await this.loadSession(sessionPath);
    const messageId = uuidv4();

    const message = {
      id: messageId,
      timestamp: new Date().toISOString(),
      role,
      content,
      metadata: {
        tools_used: metadata.tools_used || [],
        files_modified: metadata.files_modified || [],
        commands_executed: metadata.commands_executed || [],
        ...metadata
      }
    };

    session.messages.push(message);
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));

    return messageId;
  }

  /**
   * Update session summary and tags
   */
  async updateSessionMetadata(sessionPath, summary, tags = []) {
    const session = await this.loadSession(sessionPath);
    session.summary = summary;
    session.tags = tags;

    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));
  }

  /**
   * Load a session from file
   */
  async loadSession(sessionPath) {
    const content = await fs.readFile(sessionPath, 'utf8');
    return JSON.parse(content);
  }

  /**
   * Get all sessions pending sync
   */
  async getPendingSyncSessions() {
    const sessions = [];
    const walkDir = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await walkDir(fullPath);
        } else if (entry.name.endsWith('.json')) {
          try {
            const session = await this.loadSession(fullPath);
            if (session.syncStatus === 'pending') {
              sessions.push({ session, filePath: fullPath });
            }
          } catch (error) {
            console.warn(`Failed to load session ${fullPath}:`, error.message);
          }
        }
      }
    };

    await walkDir(this.basePath);
    return sessions;
  }

  /**
   * Move session to pending sync folder
   */
  async markForSync(sessionPath) {
    const session = await this.loadSession(sessionPath);
    const filename = path.basename(sessionPath);
    const pendingPath = path.join(this.pendingSyncPath, filename);

    session.syncStatus = 'pending';
    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));
    await fs.copyFile(sessionPath, pendingPath);

    return pendingPath;
  }

  /**
   * Mark session as successfully synced
   */
  async markSynced(sessionPath, moveTo = 'synced') {
    const session = await this.loadSession(sessionPath);
    const filename = path.basename(sessionPath);

    session.syncStatus = 'synced';
    session.lastSyncAttempt = new Date().toISOString();

    const destinationPath = moveTo === 'synced'
      ? path.join(this.syncedPath, filename)
      : path.join(this.failedSyncPath, filename);

    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));
    await fs.copyFile(sessionPath, destinationPath);

    // Remove from pending if it exists there
    const pendingPath = path.join(this.pendingSyncPath, filename);
    try {
      await fs.unlink(pendingPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }

    return destinationPath;
  }

  /**
   * Mark session sync as failed
   */
  async markSyncFailed(sessionPath, error) {
    const session = await this.loadSession(sessionPath);
    const filename = path.basename(sessionPath);

    session.syncStatus = 'failed';
    session.syncAttempts += 1;
    session.lastSyncAttempt = new Date().toISOString();
    session.lastSyncError = error.message;

    await fs.writeFile(sessionPath, JSON.stringify(session, null, 2));

    const failedPath = path.join(this.failedSyncPath, filename);
    await fs.copyFile(sessionPath, failedPath);

    return failedPath;
  }

  /**
   * Convert existing markdown files to JSON format
   */
  async convertMarkdownToJson(markdownPath) {
    const content = await fs.readFile(markdownPath, 'utf8');
    const filename = path.basename(markdownPath, '.md');
    const sessionId = uuidv4();

    // Extract type from filename
    const type = filename.includes('deployment') ? 'deployment' :
                 filename.includes('route53') ? 'setup' :
                 filename.includes('summary') ? 'general' : 'general';

    const session = {
      sessionId,
      timestamp: new Date().toISOString(),
      type,
      title: filename.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      participants: ['user', 'assistant'],
      messages: [{
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        role: 'assistant',
        content: content,
        metadata: {
          source: 'markdown_conversion',
          original_file: markdownPath
        }
      }],
      summary: `Converted from markdown file: ${filename}`,
      tags: [type, 'converted'],
      syncStatus: 'pending',
      syncAttempts: 0,
      lastSyncAttempt: null
    };

    const jsonPath = markdownPath.replace('.md', '.json');
    await fs.writeFile(jsonPath, JSON.stringify(session, null, 2));

    return jsonPath;
  }

  /**
   * Helper methods
   */
  formatDatePath(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  }

  async ensureDirectoryExists(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
}

module.exports = ConversationSessionManager;
