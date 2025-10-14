// Simplified backend server for debugging
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Basic CORS and middleware
app.use(cors({
  origin: ['http://localhost:4200', 'http://127.0.0.1:4200'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Basic conversation history endpoint (without DynamoDB for now)
app.get('/api/conversation-history', (req, res) => {
  const fs = require('fs');
  const path = require('path');

  try {
    const conversations = [];
    const conversationDir = path.join(__dirname, 'conversation-history');

    // Check if directory exists
    if (!fs.existsSync(conversationDir)) {
      return res.json({
        success: true,
        message: 'No conversation directory found',
        data: [],
        total: 0
      });
    }

    const files = fs.readdirSync(conversationDir)
      .filter(file => file.startsWith('session-') && file.endsWith('.json'));

    for (const file of files) {
      try {
        const filePath = path.join(conversationDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const conversation = JSON.parse(content);

        conversations.push({
          conversationId: conversation.conversationId,
          title: conversation.title,
          project: conversation.project || 'Jouster',
          startTime: conversation.startTime,
          endTime: conversation.endTime,
          messageCount: conversation.messages?.length || 0
        });
      } catch (fileError) {
        console.warn(`Error reading conversation file ${file}:`, fileError.message);
      }
    }

    // Sort by most recent first
    conversations.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

    res.json({
      success: true,
      data: conversations,
      total: conversations.length,
      source: 'JSON files',
      message: `Found ${conversations.length} conversations from October 4-5, 2024`
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

// Get specific conversation with messages
app.get('/api/conversation-history/:id', (req, res) => {
  const fs = require('fs');
  const path = require('path');

  try {
    const conversationId = req.params.id;
    const conversationDir = path.join(__dirname, 'conversation-history');

    if (!fs.existsSync(conversationDir)) {
      return res.status(404).json({
        success: false,
        error: 'Conversation directory not found'
      });
    }

    const files = fs.readdirSync(conversationDir)
      .filter(file => file.startsWith('session-') && file.endsWith('.json'));

    let foundConversation = null;

    for (const file of files) {
      try {
        const filePath = path.join(conversationDir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const conversation = JSON.parse(content);

        if (conversation.conversationId === conversationId) {
          foundConversation = conversation;
          break;
        }
      } catch (fileError) {
        console.warn(`Error reading conversation file ${file}:`, fileError.message);
      }
    }

    if (!foundConversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      data: foundConversation
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

app.listen(PORT, () => {
  console.log(`🚀 Debug server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Conversation history: http://localhost:${PORT}/api/conversation-history`);
});
