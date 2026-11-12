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

### 🔒 Authentication (deny-by-default)

Every `/api/*` route requires an authenticated session **except** this allowlist
(`PUBLIC_API_ROUTES` in `middleware/auth-guard.js`):

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/auth/login` | Password login (bcrypt vs `LIFE_MAP_PASSWORD_HASH`); 5 failures / 15 min per IP |
| `POST` | `/api/auth/logout` | Destroy the session |
| `GET` | `/api/auth/verify` | `{ authenticated: boolean }` |

`/health` is also public. Unauthenticated requests to anything else get **401**.

- Every state-changing `/api` request (`POST`/`PUT`/`PATCH`/`DELETE`) must send
  `X-Requested-With: XMLHttpRequest` (CSRF defense-in-depth), otherwise **403**.
- Session cookie `jstr.sid`: `HttpOnly`, `SameSite=Strict`, `Secure` when deployed,
  30 min rolling idle timeout, 4 h absolute lifetime (`config/session.js`).
- With `NODE_ENV` = `production` / `staging` / `nonprod`, the server **refuses to start** unless
  `SESSION_SECRET` (≥ 32 bytes) is set and `SESSION_STORE=dynamodb`. On Lambda, secrets can come
  from Secrets Manager via `SECRETS_ARNS` (`config/secrets.js`).
- Generate a password hash: `node scripts/generate-password-hash.js '<password>'`.

Tests: `npm test` (built-in `node:test`; covers the auth gate, CSRF check and session config).

**Client (`jouster-ui`):** there is no visible login link. `Ctrl+Shift+;` opens a password dialog
(Enter submits, Esc closes); pressed while logged in it asks "End session?" (Enter confirms, Esc
cancels). Only genuine, non-repeated key presses count. Private menu items (e.g. Life Map) are shown
only while logged in, and any `401` from a private API logs the client out and leaves private pages.
Hiding UI is cosmetic — the server-side gate above is the actual protection.

### Get Instagram Posts
```
GET /api/instagram/:username
```

**Example:**
```
GET http://localhost:3001/api/instagram/beffjarker
```

**Response:**
```json
{
  "success": true,
  "message": "Found 10 posts for @beffjarker",
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
- ✅ Session authentication required for all data endpoints (see above)
- ✅ Robust error handling
- ✅ Multiple parsing strategies for reliability
- ✅ Clean API response format

## 🔄 Development

For development with auto-restart:
```bash
npm install -g nodemon
npm run dev
```

## 🔐 Security Scripts

- `npm run security-audit`: Runs npm audit to check for vulnerabilities.
- `npm run vulnerability-check`: Uses Snyk to test for known vulnerabilities.

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
