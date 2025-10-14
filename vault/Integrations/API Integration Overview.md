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
- **Webhooks**: [Instagram Webhooks](https://developers.facebook.com/docs/graph-api/webhooks/)

### Backend Services Architecture
- **[Node.js Documentation](https://nodejs.org/en/docs/)** - Server runtime environment
- **[Express.js Guide](https://expressjs.com/en/guide/routing.html)** - Web framework
- **[CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)** - Cross-origin resource sharing
- [[Backend-API]] - Node.js Express server documentation
- **Port**: 3000 (configurable via environment)
- **Features**: CORS handling, credential management, health checks
- **Database**: DynamoDB Local for conversation history

**Security & Best Practices**:
- **[Express Security Guide](https://expressjs.com/en/advanced/best-practice-security.html)** - Security best practices
- **[OWASP Node.js Security](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)** - Security guidelines
- **[Environment Variables](https://nodejs.org/en/learn/command-line/how-to-read-environment-variables-from-nodejs)** - Configuration management

## 🔧 Database & Storage

### DynamoDB Local Setup
- **[DynamoDB Local Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)** - Local development database
- **[AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/getting-started.html)** - AWS service interaction
- **[Docker DynamoDB](https://hub.docker.com/r/amazon/dynamodb-local/)** - Containerized local DynamoDB
- **Tables**: ConversationHistory, ConversationMetadata
- **Purpose**: AI conversation persistence and analytics

**Implementation References**:
- **Data Modeling**: [DynamoDB Data Modeling](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-general-nosql-design.html)
- **Best Practices**: [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

## 🔗 API Setup Guides & References

### Configuration Documentation
- [[INSTAGRAM_SETUP]] - Instagram API configuration guide
- [[INSTAGRAM_GRAPH_API_SETUP]] - Graph API implementation guide
- [[Conversation-History]] - Database and persistence setup guide

**Setup References**:
- **[Facebook Developers Console](https://developers.facebook.com/)** - App creation and management
- **[Graph API Explorer](https://developers.facebook.com/tools/explorer/)** - API testing tool
- **[Last.fm API Account](https://www.last.fm/api/account/create)** - API key registration

### Environment Configuration
API credentials managed through `.env` file following **[Twelve-Factor App](https://12factor.net/config)** methodology:

```bash
# Last.fm Configuration
LASTFM_API_KEY=your_lastfm_api_key_here
LASTFM_USER=Treysin

# Instagram Graph API Configuration  
INSTAGRAM_APP_ID=your_facebook_app_id
INSTAGRAM_APP_SECRET=your_facebook_app_secret
INSTAGRAM_ACCESS_TOKEN=your_long_lived_access_token
INSTAGRAM_USER_ID=your_instagram_business_account_id
FACEBOOK_PAGE_ID=your_facebook_page_id
FACEBOOK_PAGE_ACCESS_TOKEN=your_page_access_token

# Backend Configuration
PORT=3000
NODE_ENV=development
```

**Security References**:
- **[Environment Variables Security](https://blog.gitguardian.com/secrets-api-management/)** - Secure credential management
- **[dotenv Best Practices](https://github.com/motdotla/dotenv#should-i-commit-my-env-file)** - Environment file handling

## 🚀 API Client Implementation

### HTTP Client Configuration
Using **[Axios](https://axios-http.com/)** for HTTP requests with comprehensive error handling:

```typescript
// Based on: https://axios-http.com/docs/config_defaults
const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptors - Source: https://axios-http.com/docs/interceptors
apiClient.interceptors.response.use(
  response => response,
  error => {
    // Error handling patterns from: https://axios-http.com/docs/handling_errors
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);
```

### Observable Patterns
Using **[RxJS](https://rxjs.dev/)** for reactive API interactions:

```typescript
// Based on: https://rxjs.dev/guide/operators
import { catchError, map, retry } from 'rxjs/operators';
import { of } from 'rxjs';

// Error handling with fallback - Source: https://rxjs.dev/api/operators/catchError
return this.http.get<ApiResponse>('/api/endpoint').pipe(
  retry(3), // Retry failed requests
  map(response => response.data),
  catchError(error => {
    console.warn('API call failed, using fallback data');
    return of(fallbackData);
  })
);
```

## 📊 API Response Handling

### Type Safety Implementation
Following **[TypeScript Best Practices](https://typescript-eslint.io/rules/)**:

```typescript
// API Response interfaces based on actual API documentation
interface LastfmApiResponse<T> {
  success: boolean;
  data: T;
  user: string;
  timestamp: string;
}

interface InstagramMediaResponse {
  data: InstagramMedia[];
  paging: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
}
```

### Error Handling Patterns
Following **[Angular Error Handling Guide](https://angular.dev/best-practices/error-handling)**:

```typescript
// Comprehensive error handling
private handleApiError<T>(operation = 'operation', result?: T) {
  return (error: any): Observable<T> => {
    console.error(`${operation} failed:`, error);
    
    // User-friendly error messages
    this.notificationService.showError(
      `Failed to ${operation}. Please try again later.`
    );
    
    // Return safe fallback value
    return of(result as T);
  };
}
```

## 🔗 Related Documentation & Sources

### Internal Documentation
- [[Backend-API]] - Backend server implementation details
- [[Development Setup Guide]] - Local development environment
- [[Features Overview]] - API integration usage in features

### External References
- **[RESTful API Design](https://restfulapi.net/)** - REST API best practices
- **[API Security Checklist](https://github.com/shieldfy/API-Security-Checklist)** - Security guidelines
- **[HTTP Status Codes](https://httpstatuses.com/)** - Standard HTTP response codes
- **[OAuth 2.0 Specification](https://oauth.net/2/)** - Authentication standard

### Testing & Monitoring
- **[API Testing Best Practices](https://blog.postman.com/api-testing-best-practices/)** - Testing strategies
- **[Postman Collections](https://www.postman.com/collection/)** - API testing tools
- **[API Monitoring](https://blog.postman.com/what-is-api-monitoring/)** - Health monitoring strategies

---
*API documentation maintained in [[05-API-Integration]] folder*
