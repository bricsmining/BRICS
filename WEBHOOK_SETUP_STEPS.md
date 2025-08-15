# 🤖 Telegram Bot Webhook Setup - Complete Guide

## 🎯 Overview

This guide provides step-by-step instructions to set up your Telegram bot webhook for the SkyTON project. After following this guide, your bot will be able to:

- ✅ Respond to user messages and commands
- ✅ Handle referral links and user registration
- ✅ Process admin notifications
- ✅ Launch the web app from Telegram

## 📋 Prerequisites

Before starting, make sure you have:
- A Telegram bot token from @BotFather
- A deployed Vercel project
- Access to your Vercel project settings

## Step 1: Verify Your Bot Token

### Get Bot Token from @BotFather:
1. **Open Telegram** and search for `@BotFather`
2. **Send `/newbot`** command (or `/mybots` if you already have a bot)
3. **Follow the prompts**:
   - Choose a name for your bot (e.g., "SkyTON Mining Bot")
   - Choose a username (e.g., "xSkyTON_Bot")
4. **Copy the bot token** (looks like: `7689055729:AAE7bP3Sad7bN26PdOdLzpMNnbr1DaqQenU`)
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
    "id": 7689055729,
    "is_bot": true,
    "first_name": "SkyTON",
    "username": "xSkyTON_Bot"
  }
}
```

## Step 2: Configure Environment Variables in Vercel

### Required Environment Variables:
```bash
TG_BOT_TOKEN=7689055729:AAE7bP3Sad7bN26PdOdLzpMNnbr1DaqQenU
VITE_WEB_APP_URL=https://skyton.vercel.app
ADMIN_API_KEY=adminsumon7891
TELEGRAM_WEBHOOK_SECRET=skyton-webhook-secret
BOT_USERNAME=xSkyTON_Bot
```

### How to Add Variables in Vercel:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your SkyTON project
3. Navigate to **Settings** → **Environment Variables**
4. Add each variable:
   - **Name**: Variable name (e.g., `TG_BOT_TOKEN`)
   - **Value**: Variable value (e.g., your bot token)
   - **Environment**: Select "Production" (and "Preview" if needed)
5. Click **Save** for each variable
6. **Redeploy** your project after adding all variables

### Firebase Configuration (Also Required):
```bash
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## Step 3: Deploy and Verify Your Application

### Redeploy After Environment Variables:
1. Go to **Deployments** tab in Vercel
2. Click **"..."** on the latest deployment
3. Select **"Redeploy"**
4. Wait for deployment to complete (status should be "Ready")

### Verify API Endpoint:
Test that your webhook endpoint is accessible:
```bash
curl -X POST "https://skyton.vercel.app/api/telegram-bot" \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: skyton-webhook-secret" \
  -d '{"update_id":999,"message":{"message_id":1,"from":{"id":123},"chat":{"id":123},"text":"/start"}}'
```

Should return: `{"ok":true}`

## Step 4: Set Up the Webhook

### Option A: Using Setup Script (Recommended)

1. **Clone the repository locally** (if not already done)
2. **Set environment variables** for the script:

**Windows PowerShell:**
```powershell
$env:TG_BOT_TOKEN="7689055729:AAE7bP3Sad7bN26PdOdLzpMNnbr1DaqQenU"
$env:VITE_WEB_APP_URL="https://skyton.vercel.app"
$env:TELEGRAM_WEBHOOK_SECRET="skyton-webhook-secret"
$env:ADMIN_API_KEY="adminsumon7891"
```

**Linux/Mac:**
```bash
export TG_BOT_TOKEN="7689055729:AAE7bP3Sad7bN26PdOdLzpMNnbr1DaqQenU"
export VITE_WEB_APP_URL="https://skyton.vercel.app"
export TELEGRAM_WEBHOOK_SECRET="skyton-webhook-secret"
export ADMIN_API_KEY="adminsumon7891"
```

3. **Run the setup script:**
```bash
node webhook-setup.js
```

### Option B: Using API Endpoint

Visit this URL in your browser (replace with your actual values):
```
https://skyton.vercel.app/api/setup-webhook?TG_BOT_TOKEN=7689055729:AAE7bP3Sad7bN26PdOdLzpMNnbr1DaqQenU&ADMIN_API_KEY=adminsumon7891&TELEGRAM_WEBHOOK_SECRET=skyton-webhook-secret
```

### Option C: Manual Setup with Direct API Call

```bash
curl -X POST "https://api.telegram.org/bot7689055729:AAE7bP3Sad7bN26PdOdLzpMNnbr1DaqQenU/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://skyton.vercel.app/api/telegram-bot",
    "secret_token": "skyton-webhook-secret",
    "allowed_updates": ["message", "callback_query"],
    "drop_pending_updates": true
  }'
```

## Step 5: Verify Webhook Setup

### Check Webhook Status:
```bash
curl "https://api.telegram.org/bot7689055729:AAE7bP3Sad7bN26PdOdLzpMNnbr1DaqQenU/getWebhookInfo"
```

**Expected Response:**
```json
{
  "ok": true,
  "result": {
    "url": "https://skyton.vercel.app/api/telegram-bot",
    "has_custom_certificate": false,
    "pending_update_count": 0,
    "last_error_date": null,
    "last_error_message": null
  }
}
```

### Set Bot Commands:
```bash
curl -X POST "https://api.telegram.org/bot7689055729:AAE7bP3Sad7bN26PdOdLzpMNnbr1DaqQenU/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{
    "commands": [
      {"command": "start", "description": "Start the bot and open SkyTON app"},
      {"command": "help", "description": "Show help information"},
      {"command": "stats", "description": "View your mining stats"},
      {"command": "invite", "description": "Get your referral link"}
    ]
  }'
```

## Step 6: Test Your Bot

### Basic Functionality Test:
1. **Open Telegram** and search for your bot: `@xSkyTON_Bot`
2. **Send `/start`** command
3. **Verify you receive** a welcome message with web app button
4. **Click the web app button** to ensure it opens your application

### Referral System Test:
1. **Create a referral link**: `https://t.me/xSkyTON_Bot?start=refID123456`
2. **Open the link** in another Telegram account
3. **Send `/start`** and verify referral bonus message appears
4. **Check** that referral is processed correctly in your app

### Expected Bot Responses:

**For `/start` command:**
```
🚀 Welcome to SkyTON!

Start mining STON tokens, complete tasks, and earn rewards!

🎯 Features:
• Mine STON tokens automatically
• Complete social tasks for bonuses
• Refer friends and earn free spins
• Compete on the leaderboard
• Purchase mining cards to boost earnings

Ready to start your mining journey? 🚀
```

**For referral links:**
```
🎉 Welcome to SkyTON!

You've been invited by a friend and earned bonus rewards! 

🎁 Referral Bonus Applied:
• 100 STON tokens added
• Free spin on the reward wheel  
• Special welcome bonus

Your SkyTON app is launching automatically... 🚀
```

## Step 7: Monitor and Debug

### Check Vercel Function Logs:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Functions** tab
4. Click on `/api/telegram-bot`
5. Review logs for webhook requests and any errors

### Common Log Messages:
- `[WEBHOOK] POST request received` - Webhook is receiving requests
- `[WEBHOOK] Processing message update` - Bot is handling messages
- `[BOT] Received message from [userId]: [text]` - Message processing
- `[BOT] Processing referral: [userId] referred by [referrerId]` - Referral handling

### Debug Webhook Issues:
```bash
# Test webhook endpoint directly
curl -X POST "https://skyton.vercel.app/api/telegram-bot" \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: skyton-webhook-secret" \
  -d '{
    "update_id": 999999,
    "message": {
      "message_id": 1,
      "from": {"id": 123456, "first_name": "Test User", "username": "testuser"},
      "chat": {"id": 123456, "type": "private"},
      "date": 1640995200,
      "text": "/start"
    }
  }'
```

## 🔧 Troubleshooting

### Issue: "Webhook not receiving updates"
**Solutions:**
- ✅ Verify Vercel deployment is successful and "Ready"
- ✅ Check that webhook URL is accessible: `https://skyton.vercel.app/api/telegram-bot`
- ✅ Ensure environment variables are set in Vercel
- ✅ Redeploy after adding environment variables
- ✅ Check Vercel function logs for errors

### Issue: "Invalid bot token"
**Solutions:**
- ✅ Double-check bot token from @BotFather (no extra spaces)
- ✅ Test token with: `curl "https://api.telegram.org/bot<TOKEN>/getMe"`
- ✅ Ensure `TG_BOT_TOKEN` is set correctly in Vercel

### Issue: "Unauthorized webhook request"
**Solutions:**
- ✅ Verify `TELEGRAM_WEBHOOK_SECRET` matches in both Vercel and webhook setup
- ✅ Check that secret token is being sent correctly
- ✅ Temporarily disable secret validation for testing (not recommended for production)

### Issue: "Bot not responding to messages"
**Solutions:**
- ✅ Check webhook status with `getWebhookInfo`
- ✅ Verify `pending_update_count` is 0
- ✅ Look for error messages in webhook info
- ✅ Test webhook endpoint manually
- ✅ Check Vercel function logs

### Issue: "Referrals not working"
**Solutions:**
- ✅ Ensure Firebase environment variables are set
- ✅ Check `ADMIN_API_KEY` is configured correctly
- ✅ Verify database connection in Vercel logs
- ✅ Test referral processing in function logs

### Issue: "Web app not opening"
**Solutions:**
- ✅ Verify `VITE_WEB_APP_URL` is set to correct domain
- ✅ Ensure web app is accessible at the configured URL
- ✅ Check that web app button markup is correct

## ✅ Success Checklist

- [ ] **Bot token verified** with `getMe` API call
- [ ] **Environment variables set** in Vercel project settings
- [ ] **Vercel project redeployed** after adding variables
- [ ] **Webhook URL set** to `https://skyton.vercel.app/api/telegram-bot`
- [ ] **Webhook secret configured** and matching
- [ ] **Bot commands set** (`/start`, `/help`, `/stats`, `/invite`)
- [ ] **Bot responds to `/start`** with welcome message
- [ ] **Web app button works** and opens application
- [ ] **Referral links work** and process bonuses correctly
- [ ] **Webhook logs show** incoming updates in Vercel
- [ ] **Firebase connection working** for user data storage

## 🚀 Quick Setup URLs

### For SkyTON Project:
- **Setup Webhook**: https://skyton.vercel.app/api/setup-webhook?TG_BOT_TOKEN=7689055729:AAE7bP3Sad7bN26PdOdLzpMNnbr1DaqQenU&ADMIN_API_KEY=adminsumon7891&TELEGRAM_WEBHOOK_SECRET=skyton-webhook-secret
- **Check Webhook**: https://api.telegram.org/bot7689055729:AAE7bP3Sad7bN26PdOdLzpMNnbr1DaqQenU/getWebhookInfo
- **Test Bot**: https://t.me/xSkyTON_Bot
- **Test Referral**: https://t.me/xSkyTON_Bot?start=refID123456

## 📚 Additional Resources

- [Telegram Bot API Documentation](https://core.telegram.org/bots/api)
- [Vercel Functions Documentation](https://vercel.com/docs/functions)
- [Firebase Firestore Documentation](https://firebase.google.com/docs/firestore)

---

🎉 **Congratulations!** Once all steps are complete, your SkyTON Telegram bot will be fully functional with webhook integration, referral system, and web app launching capabilities!