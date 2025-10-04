# Instagram Graph API Setup Guide

## Overview
This guide will help you migrate from the deprecated Instagram Basic Display API to the current Instagram Graph API for accessing @beffjarker's Instagram content.

## Prerequisites
1. **Instagram Business or Creator Account** - Convert @beffjarker from personal to business/creator
2. **Facebook Page** - Required to connect to Instagram account
3. **Facebook Developer Account** - To create the app

## Step 1: Convert Instagram Account
1. Go to Instagram app on your phone
2. Navigate to Settings → Account → Switch to professional account
3. Choose "Creator" or "Business"
4. Complete the setup process

## Step 2: Create Facebook Page
1. Go to [Facebook Pages](https://www.facebook.com/pages/create)
2. Create a page for @beffjarker (can be simple)
3. Connect the page to your Instagram business account:
   - Go to Page Settings → Instagram
   - Connect your @beffjarker Instagram account

## Step 3: Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click "Create App" → "Business" type
3. Enter app details:
   - App Name: "Jouster Portfolio App"
   - Contact Email: Your email
4. Create the app

## Step 4: Add Instagram Graph API Product
1. In your Facebook app dashboard
2. Click "Add Product" → Find "Instagram Graph API"
3. Click "Set Up"

## Step 5: Get App Credentials
1. Go to App Settings → Basic
2. Copy your **App ID** and **App Secret**
3. Add these to your `.env` file:
   ```
   INSTAGRAM_APP_ID=your_app_id_here
   INSTAGRAM_APP_SECRET=your_app_secret_here
   ```

## Step 6: Get Page Access Token
1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app from dropdown
3. Click "Generate Access Token"
4. Select your Facebook Page
5. Grant permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `instagram_basic`
6. Copy the Page Access Token
7. Add to `.env` file:
   ```
   FACEBOOK_PAGE_ACCESS_TOKEN=your_page_token_here
   FACEBOOK_PAGE_ID=your_page_id_here
   ```

## Step 7: Get Instagram Business User ID
1. In Graph API Explorer, use this query:
   ```
   GET /{page-id}?fields=instagram_business_account
   ```
2. Copy the Instagram Business Account ID
3. Add to `.env` file:
   ```
   INSTAGRAM_USER_ID=your_instagram_user_id_here
   ```

## Step 8: Test the Setup
1. Start your backend server
2. Visit `http://localhost:3000/api/health`
3. You should see `credentials_configured: true`
4. Test media endpoint: `http://localhost:3000/api/instagram/user/media`

## Development vs Production

### Development (Current Setup)
- Uses mock data when credentials contain "your_"
- No API rate limits
- Perfect for testing UI/UX

### Production Setup
- Requires App Review from Facebook
- Submit for `instagram_basic` permission
- Production access tokens (longer-lived)

## API Endpoints Used

### Get Media (replaces Basic Display)
```
GET https://graph.facebook.com/v18.0/{instagram-user-id}/media
```

### Get User Info
```
GET https://graph.facebook.com/v18.0/{instagram-user-id}
```

## Troubleshooting

### "Invalid User ID" Error
- Ensure Instagram account is converted to Business/Creator
- Verify the Instagram account is connected to your Facebook Page

### "Invalid Access Token" Error
- Regenerate Page Access Token
- Ensure token has `instagram_basic` permission

### "Permission Denied" Error
- Check that your Facebook Page is connected to Instagram
- Verify app has Instagram Graph API product added

## Next Steps
1. Follow steps 1-7 to get real credentials
2. Replace placeholder values in `.env` file
3. Test with real Instagram data
4. For production: Submit app for review

Your app will automatically switch from mock data to real Instagram content once valid credentials are configured!
