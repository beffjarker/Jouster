// Load environment variables
require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const CredentialManager = require('./credential-manager');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize credential manager
const credentialManager = new CredentialManager();
const credentials = credentialManager.getInstagramCredentials();

// Instagram Graph API configuration (Updated from deprecated Basic Display API)
const {
  appId: INSTAGRAM_APP_ID,
  appSecret: INSTAGRAM_APP_SECRET,
  accessToken: INSTAGRAM_ACCESS_TOKEN,
  userId: INSTAGRAM_USER_ID,
  pageId: FACEBOOK_PAGE_ID,
  pageAccessToken: FACEBOOK_PAGE_ACCESS_TOKEN
} = credentials;

// Enable CORS for your Angular app
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));

app.use(express.json());

// Enhanced mock data for @beffjarker - Photography Portfolio Style
const BEFFJARKER_ENHANCED_MOCK_DATA = [
  {
    id: 'beff_001',
    permalink: 'https://www.instagram.com/p/beff001/',
    media_url: 'https://picsum.photos/600/600?random=101',
    caption: '🌅 Golden hour magic at the coast. There\'s something about that warm light that makes everything feel possible. Shot with 85mm at f/2.8 #goldenhour #coastalphotography #beffjarker #photography #sunset',
    media_type: 'IMAGE',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    like_count: 342,
    comments_count: 28
  },
  {
    id: 'beff_002',
    permalink: 'https://www.instagram.com/p/beff002/',
    media_url: 'https://picsum.photos/600/800?random=102',
    caption: '🏔️ Alpine adventure recap! Three days in the mountains taught me more about patience and light than any workshop ever could. Swipe for the behind-the-scenes shot of me waiting 2 hours for this moment. #alpinephotography #mountains #patience #beffjarker',
    media_type: 'CAROUSEL_ALBUM',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    like_count: 528,
    comments_count: 45
  },
  {
    id: 'beff_003',
    permalink: 'https://www.instagram.com/p/beff003/',
    media_url: 'https://picsum.photos/600/600?random=103',
    caption: '📸 Street photography session in the old quarter. Love how this alley captures both shadow and story. Sometimes the best shots happen when you\'re just wandering with purpose. #streetphotography #shadows #storytelling #beffjarker #urban',
    media_type: 'IMAGE',
    timestamp: new Date(Date.now() - 259200000).toISOString(),
    like_count: 289,
    comments_count: 31
  },
  {
    id: 'beff_004',
    permalink: 'https://www.instagram.com/p/beff004/',
    media_url: 'https://picsum.photos/600/400?random=104',
    caption: '🌊 Experimenting with long exposure techniques at the pier. 30-second exposure with ND filters to get that silky water effect. The movement of the clouds was an unexpected bonus! Technical details in stories. #longexposure #seascape #technicalphotography #beffjarker',
    media_type: 'IMAGE',
    timestamp: new Date(Date.now() - 345600000).toISOString(),
    like_count: 445,
    comments_count: 62
  },
  {
    id: 'beff_005',
    permalink: 'https://www.instagram.com/p/beff005/',
    media_url: 'https://picsum.photos/600/600?random=105',
    caption: '🎭 Portrait session with Maria - exploring the interplay between natural and artificial light. This setup took 3 hours to perfect but the result speaks for itself. Lighting breakdown in my stories! #portraitphotography #lightingsetup #beffjarker #portraits',
    media_type: 'IMAGE',
    timestamp: new Date(Date.now() - 432000000).toISOString(),
    like_count: 612,
    comments_count: 87
  },
  {
    id: 'beff_006',
    permalink: 'https://www.instagram.com/p/beff006/',
    media_url: 'https://picsum.photos/600/900?random=106',
    caption: '🌸 Macro Monday! Getting intimate with nature - this cherry blossom petal tells a whole story about spring\'s fleeting beauty. Shot at f/8 with extension tubes for maximum detail. #macrophotography #spring #details #beffjarker #nature',
    media_type: 'IMAGE',
    timestamp: new Date(Date.now() - 518400000).toISOString(),
    like_count: 378,
    comments_count: 43
  },
  {
    id: 'beff_007',
    permalink: 'https://www.instagram.com/p/beff007/',
    media_url: 'https://picsum.photos/600/600?random=107',
    caption: '🏙️ City lights and reflections - sometimes the best urban shots happen after midnight when the city breathes differently. This puddle became my composition partner tonight. #nightphotography #urban #reflections #beffjarker #citylife',
    media_type: 'IMAGE',
    timestamp: new Date(Date.now() - 604800000).toISOString(),
    like_count: 467,
    comments_count: 38
  },
  {
    id: 'beff_008',
    permalink: 'https://www.instagram.com/p/beff008/',
    media_url: 'https://picsum.photos/600/800?random=108',
    caption: '🦅 Wildlife photography ethics matter. This hawk was photographed from 50+ meters with a 600mm lens - no disturbance, just patience and respect. The shot took 4 hours of waiting but wildlife photography isn\'t about the rush. #wildlifephotography #ethics #patience #beffjarker #birds',
    media_type: 'IMAGE',
    timestamp: new Date(Date.now() - 691200000).toISOString(),
    like_count: 523,
    comments_count: 76
  },
  {
    id: 'beff_009',
    permalink: 'https://www.instagram.com/p/beff009/',
    media_url: 'https://picsum.photos/600/600?random=109',
    caption: '☕ Coffee shop chronicles - documenting the quiet moments between the rush. This barista\'s concentration while crafting latte art reminded me why I love documentary photography. Real moments > posed shots. #documentaryphotography #coffee #realmoments #beffjarker',
    media_type: 'IMAGE',
    timestamp: new Date(Date.now() - 777600000).toISOString(),
    like_count: 334,
    comments_count: 29
  },
  {
    id: 'beff_010',
    permalink: 'https://www.instagram.com/p/beff010/',
    media_url: 'https://picsum.photos/600/600?random=110',
    caption: '🎨 Behind the lens: My mobile editing setup for field work. iPad Pro + Apple Pencil + Lightroom Mobile = creativity anywhere. Sometimes the best editing happens right where you captured the moment. What\'s in your mobile kit? #mobileediting #workflow #beffjarker #lightroom #gear',
    media_type: 'CAROUSEL_ALBUM',
    timestamp: new Date(Date.now() - 864000000).toISOString(),
    like_count: 892,
    comments_count: 156
  }
];

// Legacy mock data for backwards compatibility
const BEFFJARKER_MOCK_DATA = BEFFJARKER_ENHANCED_MOCK_DATA.slice(0, 5);

// Mock Instagram API endpoints
// Instagram Graph API endpoints (Updated implementation)
app.get('/api/instagram/user/media', async (req, res) => {
  try {
    const validation = credentialManager.validateCredentials();
    console.log('Instagram Graph API call - Credential validation:', validation);

    // Check if we have proper Graph API credentials
    if (!validation.isValid) {
      console.log('Using enhanced mock data - Instagram Graph API credentials not configured');
      console.log('Missing credentials:', validation.missing);

      const mockResponse = {
        data: BEFFJARKER_ENHANCED_MOCK_DATA,
        paging: {
          cursors: {
            before: 'before_cursor',
            after: 'after_cursor'
          },
          next: `https://graph.facebook.com/v18.0/${INSTAGRAM_USER_ID}/media?access_token=${INSTAGRAM_ACCESS_TOKEN}&after=after_cursor`
        }
      };

      setTimeout(() => {
        res.json(mockResponse);
      }, 500);
      return;
    }

    // Use Instagram Graph API (current standard) with real credentials
    console.log(`Making real Instagram Graph API call for user: ${INSTAGRAM_USER_ID}`);
    const response = await axios.get(`https://graph.facebook.com/v18.0/${INSTAGRAM_USER_ID}/media`, {
      params: {
        fields: 'id,media_type,media_url,permalink,caption,timestamp,like_count,comments_count,thumbnail_url',
        access_token: INSTAGRAM_ACCESS_TOKEN,
        limit: 10
      }
    });

    console.log(`✅ Successfully retrieved ${response.data.data.length} posts from @beffjarker`);
    res.json(response.data);
  } catch (error) {
    console.error('Instagram Graph API Error:', error.response?.data || error.message);

    // Fallback to enhanced mock data on any error
    console.log('Falling back to enhanced mock data due to API error');
    res.json({
      data: BEFFJARKER_ENHANCED_MOCK_DATA,
      meta: {
        note: 'Using enhanced mock data - Instagram Graph API error or not configured',
        error: error.response?.data?.error?.message || error.message,
        api_version: 'Instagram Graph API v18.0'
      }
    });
  }
});

// Get Instagram Business Account info using Graph API
app.get('/api/instagram/user', async (req, res) => {
  try {
    const validation = credentialManager.validateCredentials();

    if (!validation.isValid) {
      res.json({
        id: 'mock_user_id',
        username: 'beffjarker',
        name: 'Beff Jarker Photography',
        account_type: 'BUSINESS',
        media_count: BEFFJARKER_ENHANCED_MOCK_DATA.length,
        followers_count: 2847,
        follows_count: 312,
        biography: 'Professional photographer capturing moments that matter. Available for portrait, landscape, and event photography.',
        website: 'https://beffjarker.com',
        profile_picture_url: 'https://picsum.photos/150/150?random=profile',
        note: 'Mock data - Instagram Graph API credentials not configured'
      });
      return;
    }

    // Get real Instagram Business Account info
    const response = await axios.get(`https://graph.facebook.com/v18.0/${INSTAGRAM_USER_ID}`, {
      params: {
        fields: 'id,username,name,account_type,media_count,followers_count,follows_count,biography,website,profile_picture_url',
        access_token: INSTAGRAM_ACCESS_TOKEN
      }
    });

    console.log(`✅ Successfully retrieved @beffjarker profile info`);
    res.json(response.data);
  } catch (error) {
    console.error('Instagram User API Error:', error.response?.data || error.message);

    res.json({
      id: 'mock_user_id',
      username: 'beffjarker',
      name: 'Beff Jarker Photography',
      account_type: 'BUSINESS',
      media_count: BEFFJARKER_ENHANCED_MOCK_DATA.length,
      note: 'Mock data - Instagram Graph API error',
      error: error.response?.data?.error?.message || error.message
    });
  }
});

// Enhanced health check endpoint with credential validation
app.get('/api/health', (req, res) => {
  const validation = credentialManager.validateCredentials();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    api_version: 'Instagram Graph API v18.0',
    credentials_configured: validation.isValid,
    using_mock_data: !validation.isValid,
    environment: validation.environment,
    configured_credentials: validation.configured,
    missing_credentials: validation.missing,
    instagram_user_id: validation.isValid ? INSTAGRAM_USER_ID : 'not_configured'
  });
});

// New endpoint for credential management (development only)
app.get('/api/credentials/status', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }

  const validation = credentialManager.validateCredentials();
  res.json(validation);
});

app.listen(PORT, () => {
  const validation = credentialManager.validateCredentials();

  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📸 Instagram API: Using Graph API v18.0 (replaces deprecated Basic Display)`);
  console.log(`🔧 Environment: ${validation.environment}`);

  if (validation.isValid) {
    console.log(`✅ Instagram Graph API configured for user: ${INSTAGRAM_USER_ID}`);
    console.log(`📊 Configured credentials:`, validation.configured);
  } else {
    console.log(`⚠️  Instagram Graph API not configured - using enhanced mock data`);
    console.log(`❌ Missing credentials:`, validation.missing);
    console.log(`🎨 Mock data includes ${BEFFJARKER_ENHANCED_MOCK_DATA.length} realistic photography posts`);
  }
});
