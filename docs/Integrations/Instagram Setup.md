# Instagram API Setup for Local Development

This guide will help you securely configure Instagram API credentials for local development testing.

## Option 1: Instagram Basic Display API (Recommended for Your Own Content)

If you want to display your own Instagram posts (from your personal account), follow these steps:

### Step 1: Create a Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "Create App" → "Consumer" → "Next"
3. Enter app name (e.g., "Jouster Local Dev")
4. Add your email and select a purpose

### Step 2: Configure Instagram Basic Display
1. In your Facebook app dashboard, click "Add Product"
2. Find "Instagram Basic Display" and click "Set Up"
3. Go to Instagram Basic Display → Basic Display
4. Click "Create New App" if prompted
5. Add Instagram Test User (your Instagram account)

### Step 3: Get Your Access Token
1. In Instagram Basic Display settings, click "Generate Token" next to your test user
2. Log in with your Instagram account and authorize the app
3. Copy the generated access token

### Step 4: Configure Environment Variables
1. Open the `.env` file in your project root
2. Replace the placeholder values:

```env
INSTAGRAM_APP_ID=your_app_id_from_facebook
INSTAGRAM_APP_SECRET=your_app_secret_from_facebook
INSTAGRAM_ACCESS_TOKEN=your_generated_access_token
PORT=3001
NODE_ENV=development
```

## Option 2: Web Scraping (For Public Profiles Only)

If you want to display posts from a public Instagram account, the app will automatically fall back to web scraping when no API credentials are provided.

**Note:** This method is less reliable and may break if Instagram changes their website structure.

## Security Notes

- ✅ Your `.env` file is already added to `.gitignore` to prevent accidental commits
- ✅ Never share your access tokens or app secrets
- ✅ Access tokens expire and may need to be refreshed periodically
- ✅ The Basic Display API only works with your own Instagram content

## Testing Your Setup

1. Start the backend server:
   ```bash
   cd backend
   npm start
   ```

2. Test the API endpoint:
   ```bash
   curl http://localhost:3001/api/instagram/yourusername
   ```

3. Start the frontend:
   ```bash
   npm run serve
   ```

## Troubleshooting

- **401 Authentication Error**: Check your access token is valid and not expired
- **No posts showing**: Ensure you've added your Instagram account as a test user
- **Rate limiting**: Instagram APIs have rate limits; wait before retrying
- **Fallback to scraping**: If API fails, the app automatically tries web scraping

## Access Token Refresh

Instagram Basic Display access tokens expire after 60 days. You'll need to:
1. Go back to your Facebook app dashboard
2. Instagram Basic Display → Basic Display
3. Generate a new token for your test user
4. Update the `INSTAGRAM_ACCESS_TOKEN` in your `.env` file
