# API Integration Overview

> **External API integrations and backend services with comprehensive source documentation**

## 📡 API Documentation & Sources

### Last.fm Integration
- **[Last.fm API Documentation](https://www.last.fm/api)** - Official Last.fm API reference
- **[Last.fm API Terms of Service](https://www.last.fm/api/tos)** - Usage terms and conditions
- **Real API**: Music listening data for user "Treysin"
- **Endpoints**: Recent tracks, top artists/albums, user analytics
- **Backend**: Complete Node.js API implementation
- **Features**: Listening history analysis, genre distribution, yearly stats

**Implementation References**:
- **HTTP Client**: [Axios Documentation](https://axios-http.com/docs/intro)
- **Rate Limiting**: [Last.fm API Rate Limits](https://www.last.fm/api/scrobbling)
- **Best Practices**: [RESTful API Design](https://restfulapi.net/)

### Instagram Graph API
- **[Facebook Graph API Documentation](https://developers.facebook.com/docs/graph-api/)** - Official Facebook Graph API
- **[Instagram Graph API Reference](https://developers.facebook.com/docs/instagram-api/)** - Instagram-specific endpoints
- **[Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api/)** - Legacy API (deprecated)
- **Account**: @beffjarker photography portfolio
- **Implementation**: Graph API v18.0 (replaces deprecated Basic Display)
- **Content**: Recent posts, engagement metrics, media galleries
- **Fallback**: Enhanced mock photography data for development

**Implementation References**:
- **OAuth 2.0**: [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/)
- **Access Tokens**: [Instagram Access Token Guide](https://developers.facebook.com/docs/instagram-api/getting-started)

### Backend API Services
- **Node.js Express Server**: RESTful API endpoints
- **DynamoDB Integration**: Conversation history persistence
- **S3 Integration**: Email file storage and management
- **Error Handling**: Comprehensive error responses and logging

## 🔗 Related Documentation

- [[Last.fm API Integration]] - Detailed Last.fm implementation
- [[Instagram Graph API Setup]] - Instagram integration guide
- [[Backend API]] - Server architecture and endpoints

---
*API integration documentation maintained in [[05-API-Integration]] folder*
