# API Clients

Custom API client utilities and integrations.

## Structure

```
api-clients/
├── README.md           # This file
├── http-client.js      # Generic HTTP client wrapper
└── [service-name]/     # Service-specific clients
    └── client.js
```

## Creating a New API Client

1. Create a folder for your service
2. Add `client.js` with your API methods
3. Use `axios` for HTTP requests
4. Load config from `.env` using `Config.get()`
5. Add proper error handling and logging

## Example Template

```javascript
const axios = require('axios');
const Config = require('../utils/config');
const Logger = require('../utils/logger');

class MyServiceClient {
  constructor() {
    this.apiKey = Config.get('MY_SERVICE_API_KEY');
    this.baseURL = Config.get('MY_SERVICE_URL', false, 'https://api.example.com');
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async getData() {
    try {
      const response = await this.client.get('/endpoint');
      return response.data;
    } catch (error) {
      Logger.error('API request failed:', error.message);
      throw error;
    }
  }
}

module.exports = MyServiceClient;
```

## Best Practices

- ✅ Validate API keys exist before making requests
- ✅ Use axios interceptors for common error handling
- ✅ Implement rate limiting if needed
- ✅ Log requests in verbose mode
- ✅ Handle pagination properly
- ✅ Return consistent data structures

