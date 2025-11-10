# Jouster Backend API

A Node.js backend server that fetches Instagram posts from public profiles, bypassing CORS restrictions for the Jouster Angular frontend.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Server will run on:**
   ```
   http://localhost:3001
   ```

## 📡 API Endpoints

### Get Instagram Posts
```
GET /api/instagram/:username
```

**Example:**
```
GET http://localhost:3001/api/instagram/yourusername
```

**Response:**
```json
{
  "success": true,
  "message": "Found 10 posts for @yourusername",
  "data": [
    {
      "id": "post_id",
      "permalink": "https://www.instagram.com/p/shortcode/",
      "media_url": "https://instagram.com/image.jpg",
      "caption": "Post caption text",
      "media_type": "IMAGE",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "likes": 100,
      "comments": 5
    }
  ]
}
```

### Health Check
```
GET /api/health
```

Returns server status and timestamp.

## 🔧 How It Works

1. **Server-side Instagram Fetching:** The backend makes requests to Instagram's public pages from the server, avoiding browser CORS restrictions.

2. **HTML Parsing:** Uses multiple strategies to extract Instagram's embedded JSON data from the HTML page.

3. **Data Transformation:** Converts Instagram's data format to a clean, standardized format for the frontend.

4. **Error Handling:** Gracefully handles Instagram structure changes and network issues.

## 🌟 Features

- ✅ Bypasses CORS restrictions
- ✅ Works with any public Instagram profile
- ✅ No authentication required
- ✅ Robust error handling
- ✅ Multiple parsing strategies for reliability
- ✅ Clean API response format

## 🔄 Development

For development with auto-restart:
```bash
npm install -g nodemon
npm run dev
```

## 📝 Notes

- This fetches data from public Instagram profiles only
- Instagram may change their HTML structure, which could require updates
- For production use, consider implementing rate limiting and caching
- The server respects Instagram's public data access patterns

## 🚀 Production Deployment

Deploy to any cloud service that supports Node.js:
- Heroku
- Vercel
- AWS Lambda
- Google Cloud Functions
- DigitalOcean App Platform

Update the `BACKEND_API_URL` in your Angular service to point to your deployed backend.
