# 🤖 Telegram Bot Webhook Setup - Complete Guide

## 🎯 Overview

This guide provides step-by-step instructions to set up your Telegram bot webhook for your configurable mini app. After following this guide, your bot will be able to:

- ✅ Respond to user messages and commands with your custom branding
- ✅ Handle referral links and user registration
- ✅ Process admin notifications
- ✅ Launch the web app from Telegram with your custom name

## 📋 Prerequisites

Before starting, make sure you have:
- A Telegram bot token from @BotFather
- A deployed Vercel project
- Access to your Vercel project settings
- Your custom app name and token name ready

## Step 1: Create Your Custom Bot

### Get Bot Token from @BotFather:
1. **Open Telegram** and search for `@BotFather`
2. **Send `/newbot`** command (or `/mybots` if you already have a bot)
3. **Follow the prompts**:
   - Choose a name for your bot (e.g., "YourApp Mining Bot")
   - Choose a username (e.g., "YourApp_Bot")
4. **Copy the bot token** (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. **Save the bot username** for later use

### Test Your Bot Token:
```bash
# Verify token works
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe"
```

Should return bot information like:
```json
{
  "ok": true,
  "result": {
    "id": 1234567890,
    "is_bot": true,
    "first_name": "YourApp",
    "username": "YourApp_Bot"
  }
}
```

## Step 2: Configure Environment Variables in Vercel

### Required Environment Variables:
```bash
# Bot Configuration
TG_BOT_TOKEN=your_bot_token_here
BOT_USERNAME=YourApp_Bot
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret

# App Configuration  
VITE_WEB_APP_URL=https://yourapp.vercel.app
ADMIN_API_KEY=your_secure_admin_key

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Payment Gateway (Optional)
OXAPAY_API_KEY=your_oxapay_api_key
```

### How to Add Variables in Vercel:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add each variable:
   - **Name**: Variable name (e.g., `TG_BOT_TOKEN`)
   - **Value**: Your actual value
   - **Environment**: Select all (Production, Preview, Development)
5. Click **Save** for each one
6. **Redeploy** your project (go to Deployments → click "..." → Redeploy)

## Step 3: Set Up Webhook

### One-Click Setup (Recommended):
Use your app's built-in setup API endpoint. Simply open this URL in your browser with your values:

```
https://yourapp.vercel.app/api/setup-webhook?TG_BOT_TOKEN=your_bot_token&ADMIN_API_KEY=your_admin_key&TELEGRAM_WEBHOOK_SECRET=your_webhook_secret
```

**Example:**
```
https://yourapp.vercel.app/api/setup-webhook?TG_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz&ADMIN_API_KEY=your_secure_key&TELEGRAM_WEBHOOK_SECRET=your_webhook_secret
```

This endpoint will:
- ✅ Validate your bot token
- ✅ Set up the webhook automatically
- ✅ Configure bot commands
- ✅ Return complete setup status

### Alternative Method (Manual):
If you prefer the direct Telegram API method:
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://yourapp.vercel.app/api/telegram-bot&secret_token=your-webhook-secret&drop_pending_updates=true
```

Success response:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

## Step 4: Configure Bot Commands

Set up bot commands for better user experience:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{
    "commands": [
      {"command": "start", "description": "Start the bot and open your app"},
      {"command": "help", "description": "Show help information"},
      {"command": "stats", "description": "View your mining stats"},
      {"command": "invite", "description": "Get your referral link"}
    ]
  }'
```

## Step 5: Customize Your App Branding

1. **Access Admin Panel**: Go to `https://yourapp.vercel.app/admin`
2. **Navigate to Settings**
3. **Update Configuration**:
   - **App Name**: Enter your custom app name (e.g., "CryptoMiner")
   - **Token Name**: Enter your token symbol (e.g., "MINE")
   - **Telegram WebApp URL**: Confirm your app URL
4. **Save Changes**

## Step 6: Verify Setup

### Test Bot Responses:
1. **Find your bot**: Search for your bot username in Telegram
2. **Send `/start`**: Should show welcome message with your custom app name
3. **Test web app button**: Should open your app with custom branding
4. **Check referral**: Test with `?start=refID123456`

### Verify Webhook Status:
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Should show:
```json
{
  "ok": true,
  "result": {
    "url": "https://yourapp.vercel.app/api/telegram-bot",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "last_error_date": 0,
    "max_connections": 40
  }
}
```

## 🎨 Expected Results

After successful setup, your bot will:

✅ **Welcome Message**: "Welcome to [YourApp]! Start mining [YourToken] tokens..."
✅ **Custom Buttons**: "🚀 Open [YourApp]" 
✅ **Help Command**: Show help with your app name
✅ **Referral Messages**: Use your custom token name
✅ **All Notifications**: Display your branding throughout

## 🔧 Troubleshooting

### Common Issues:

#### **Issue**: Bot not responding
**Solutions:**
- ✅ Verify bot token is correct
- ✅ Check webhook URL is accessible
- ✅ Ensure webhook secret matches environment variable

#### **Issue**: Wrong app name in messages
**Solutions:**
- ✅ Update app name in Admin Panel → Settings
- ✅ Verify admin config is saved
- ✅ Clear cache and test again

#### **Issue**: Web app not opening
**Solutions:**
- ✅ Verify `VITE_WEB_APP_URL` environment variable
- ✅ Check domain is accessible
- ✅ Ensure bot button URL is correct

#### **Issue**: Webhook errors
**Solutions:**
- ✅ Check Vercel function logs
- ✅ Verify webhook secret
- ✅ Ensure environment variables are set

## ✅ Success Checklist

- [ ] **Bot token configured** and verified with getMe
- [ ] **Environment variables set** in Vercel
- [ ] **Project redeployed** after adding variables
- [ ] **Webhook URL set** to your domain + `/api/telegram-bot`
- [ ] **Webhook secret configured** and matching
- [ ] **Bot commands set** for better UX
- [ ] **App branding customized** in admin panel
- [ ] **Bot responds** with your custom app name
- [ ] **Web app button works** and opens your app
- [ ] **Referral links work** and process correctly

## 🚀 Next Steps

After successful setup:

1. **Customize Further**: Update colors, features, and functionality
2. **Add Tasks**: Create custom tasks for your users
3. **Configure Payments**: Set up OxaPay for withdrawals
4. **Monitor Analytics**: Track user engagement and growth
5. **Scale Up**: Add more features and integrations

---

🎉 **Congratulations!** Your custom Telegram mini app is now fully functional with personalized branding!