/**
 * Secure Express Server for Jouster Backend
 * Implements comprehensive security best practices
 */

// Load environment variables
require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const CredentialManager = require('./credential-manager');

// Import security middleware
const {
  helmetConfig,
  generalLimiter,
  apiLimiter,
  sanitizeInput,
  xssClean,
  hppProtection,
  additionalSecurityHeaders,
  validateRequest,
  enforceHTTPS,
  securityLogger,
} = require('./middleware/security');

// Import enhanced validation for mitigating validator.js vulnerabilities
const {
  validateURLFields,
  validateEmailFields,
  sanitizeRequestBody,
} = require('./middleware/enhanced-validation');

// Import CORS configuration
const { corsOptions } = require('./config/cors');

// Import routes
const emailRoutes = require('./routes/emails');

// Conversation history data layer (DynamoDB in preview/cloud, JSON files locally)
const conversationStore = require('./data/conversations');

const app = express();
const PORT = process.env.PORT || 3001;

// Behind API Gateway / CloudFront (Lambda previews) the app sits behind proxies.
// Trusting the proxy lets Express resolve req.ip / protocol from forwarded headers.
app.set('trust proxy', true);

// ===== SECURITY MIDDLEWARE (Applied in specific order) =====

// 1. HTTPS enforcement (must be first)
app.use(enforceHTTPS);

// 2. Helmet for security headers
app.use(helmetConfig);

// 3. Additional security headers
app.use(additionalSecurityHeaders);

// 4. Security event logging
app.use(securityLogger);

// 5. Request validation (check for malicious patterns)
app.use(validateRequest);

// 6. General rate limiting
app.use(generalLimiter);

// 7. XSS protection
app.use(xssClean);

// 8. NoSQL injection protection
app.use(sanitizeInput);

// 9. HTTP Parameter Pollution protection
app.use(hppProtection);

// 10. CORS configuration
app.use(cors(corsOptions));
// Note: handleCorsError is an error handler and will be added in the error handling section

// 11. Body parsing with size limits (security measure)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===== APPLICATION CONFIGURATION =====

// Initialize credential manager
const credentialManager = new CredentialManager();
const credentials = credentialManager.getInstagramCredentials();

// Instagram Graph API configuration
const {
  appId: INSTAGRAM_APP_ID,
  appSecret: INSTAGRAM_APP_SECRET,
  accessToken: INSTAGRAM_ACCESS_TOKEN,
  userId: INSTAGRAM_USER_ID,
  pageId: FACEBOOK_PAGE_ID,
  pageAccessToken: FACEBOOK_PAGE_ACCESS_TOKEN
} = credentials;

// Last.fm API configuration (use environment variables only)
const LASTFM_API_KEY = process.env.LASTFM_API_KEY;
const LASTFM_BASE_URL = 'http://ws.audioscrobbler.com/2.0/';
const LASTFM_DEFAULT_USER = process.env.LASTFM_USER || 'Treysin';

// ===== HEALTH CHECK ENDPOINT (No rate limiting) =====

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'connected',
      api: 'ready'
    }
  });
});

// ===== API ROUTES (With additional rate limiting) =====

// API rate limiting for all API routes
app.use('/api', apiLimiter);

// Mount email routes
app.use('/api/emails', emailRoutes);

// ===== CONVERSATION HISTORY ENDPOINTS =====

// Get all conversations
app.get('/api/conversation-history', async (req, res) => {
  try {
    const conversations = await conversationStore.listConversations();
    res.json({
      success: true,
      data: conversations,
      total: conversations.length,
      source: conversationStore.source(),
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Migration status endpoint (declared before :id so it is not captured by it)
app.get('/api/conversation-history/migration-status', (req, res) => {
  res.json({
    success: true,
    status: conversationStore.useDynamo() ? 'migrated' : 'pending',
    message: conversationStore.useDynamo()
      ? 'Conversations are served from DynamoDB'
      : 'Conversations exist as JSON files but have not been migrated to DynamoDB yet',
    source: conversationStore.source(),
  });
});

// Get specific conversation
app.get('/api/conversation-history/:id', async (req, res) => {
  try {
    const foundConversation = await conversationStore.getConversation(req.params.id);

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
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ===== INSTAGRAM API MOCK DATA =====

const BEFFJARKER_ENHANCED_MOCK_DATA = [
  {
    id: 'beff_001',
    permalink: 'https://www.instagram.com/p/beff001/',
    media_url: 'https://picsum.photos/600/600?random=101',
    caption: '🌅 Golden hour magic at the coast. #goldenhour #coastalphotography #beffjarker',
    media_type: 'IMAGE',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    like_count: 342,
    comments_count: 28
  },
  // Add more mock data as needed
];

// ===== INSTAGRAM API ENDPOINTS =====

app.get('/api/instagram/user/media', async (req, res) => {
  try {
    const validation = credentialManager.validateCredentials();

    if (!validation.isValid) {
      console.log('Using mock data - Instagram credentials not configured');

      return res.json({
        data: BEFFJARKER_ENHANCED_MOCK_DATA,
        meta: {
          note: 'Mock data - Instagram Graph API credentials not configured',
          missing: validation.missing
        }
      });
    }

    // Real Instagram Graph API call
    const response = await axios.get(`https://graph.facebook.com/v18.0/${INSTAGRAM_USER_ID}/media`, {
      params: {
        fields: 'id,media_type,media_url,permalink,caption,timestamp,like_count,comments_count',
        access_token: INSTAGRAM_ACCESS_TOKEN,
        limit: 10
      },
      timeout: 10000 // 10 second timeout
    });

    res.json(response.data);
  } catch (error) {
    console.error('Instagram API Error:', error.message);

    res.json({
      data: BEFFJARKER_ENHANCED_MOCK_DATA,
      meta: {
        note: 'Fallback mock data - API error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'API unavailable'
      }
    });
  }
});

app.get('/api/instagram/user', async (req, res) => {
  try {
    const validation = credentialManager.validateCredentials();

    if (!validation.isValid) {
      return res.json({
        id: 'mock_user_id',
        username: 'beffjarker',
        name: 'Beff Jarker Photography',
        account_type: 'BUSINESS',
        note: 'Mock data - Instagram credentials not configured'
      });
    }

    const response = await axios.get(`https://graph.facebook.com/v18.0/${INSTAGRAM_USER_ID}`, {
      params: {
        fields: 'id,username,name,account_type,media_count,followers_count,follows_count,biography,website,profile_picture_url',
        access_token: INSTAGRAM_ACCESS_TOKEN
      },
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Instagram User API Error:', error.message);

    res.status(500).json({
      error: 'Failed to fetch Instagram user data',
      message: process.env.NODE_ENV === 'development' ? error.message : 'API unavailable'
    });
  }
});

// ===== LAST.FM API ENDPOINTS =====

// Fake recent tracks used when no Last.fm API key is configured (dev/preview).
const LASTFM_MOCK_RECENT = {
  recenttracks: {
    track: [
      {
        name: 'Weird Fishes/ Arpeggi',
        artist: { '#text': 'Radiohead' },
        album: { '#text': 'In Rainbows' },
        url: 'https://www.last.fm/music/Radiohead/_/Weird+Fishes',
        image: [{ '#text': 'https://picsum.photos/174/174?random=201', size: 'large' }],
        '@attr': { nowplaying: 'true' },
      },
      {
        name: 'Midnight City',
        artist: { '#text': 'M83' },
        album: { '#text': 'Hurry Up, We\u2019re Dreaming' },
        url: 'https://www.last.fm/music/M83/_/Midnight+City',
        image: [{ '#text': 'https://picsum.photos/174/174?random=202', size: 'large' }],
        date: { uts: String(Math.floor(Date.now() / 1000) - 3600) },
      },
      {
        name: 'Nightcall',
        artist: { '#text': 'Kavinsky' },
        album: { '#text': 'OutRun' },
        url: 'https://www.last.fm/music/Kavinsky/_/Nightcall',
        image: [{ '#text': 'https://picsum.photos/174/174?random=203', size: 'large' }],
        date: { uts: String(Math.floor(Date.now() / 1000) - 7200) },
      },
    ],
    '@attr': { user: 'devuser', total: '3', page: '1', perPage: '10', totalPages: '1' },
  },
};

app.get('/api/lastfm/recent-tracks', async (req, res) => {
  try {
    const user = req.query.user || LASTFM_DEFAULT_USER;

    if (!LASTFM_API_KEY) {
      // No key (dev/preview): serve fake data instead of failing so the UI is
      // fully functional against dev data.
      return res.json({
        ...LASTFM_MOCK_RECENT,
        meta: { note: 'Mock data - Last.fm API key not configured' },
      });
    }

    const response = await axios.get(LASTFM_BASE_URL, {
      params: {
        method: 'user.getrecenttracks',
        user: user,
        api_key: LASTFM_API_KEY,
        format: 'json',
        limit: 10
      },
      timeout: 10000
    });

    res.json(response.data);
  } catch (error) {
    console.error('Last.fm API Error:', error.message);

    // Fall back to mock data on upstream error so previews stay functional.
    res.json({
      ...LASTFM_MOCK_RECENT,
      meta: {
        note: 'Fallback mock data - API error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'API unavailable',
      },
    });
  }
});

// ===== ERROR HANDLERS =====

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Don't expose error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(isDevelopment && { stack: err.stack }),
    ...(isDevelopment && { details: err })
  });
});

// ===== START SERVER =====

// Only start an HTTP listener when this file is executed directly (local/dev/prod
// container). When imported (e.g. by the AWS Lambda handler in lambda.js), we export
// the Express app instead so it can be wrapped by serverless-http.
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Jouster Backend Server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔒 Security: Enhanced middleware enabled`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

module.exports = app;
