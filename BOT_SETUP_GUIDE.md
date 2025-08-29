# 🤖 Telegram Bot Setup Guide

Complete guide for setting up your custom Telegram bot with dynamic branding and webhook functionality.

## 🎯 Overview

This guide will help you create and configure a Telegram bot that:
- Uses your custom app name and token branding
- Handles user interactions and referrals
- Integrates seamlessly with your web app
- Provides admin controls and notifications

## 📋 Prerequisites

### What You Need:
- Telegram account
- Vercel deployed project
- Firebase project setup
- Custom app name and token name chosen

## Step 1: Create Your Bot with BotFather

### 1.1 Access BotFather
1. Open Telegram and search for `@BotFather`
2. Start a conversation with `/start`

### 1.2 Create New Bot
```
/newbot
```
Follow the prompts:
- **Bot Name**: Your App Bot (e.g., "CryptoMiner Bot", "GameCoin Bot")
- **Username**: your_app_bot (e.g., "CryptoMiner_Bot", "GameCoin_Bot")

### 1.3 Save Your Bot Token
Copy the token that looks like:
```
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

### 1.4 Configure Bot Settings
```bash
# Set description
/setdescription
# Then send: "Mine [YourToken] tokens and earn rewards! Start your crypto journey now."

# Set about text  
/setabouttext
# Then send: "Official [YourApp] mining bot. Join thousands of miners earning [YourToken] tokens daily!"

# Set bot commands
/setcommands
# Then send:
start - Start mining and open the app
help - Get help and information
stats - View your mining statistics
invite - Get your referral link
```

## Step 2: Environment Configuration

### 2.1 Required Environment Variables

Add these to your Vercel project environment variables:

```bash
# Bot Configuration
TG_BOT_TOKEN=your_bot_token_here
BOT_USERNAME=YourApp_Bot
TELEGRAM_WEBHOOK_SECRET=your-secure-webhook-secret

# App Configuration
VITE_WEB_APP_URL=https://yourapp.vercel.app
ADMIN_API_KEY=your-secure-admin-api-key

# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Optional - Payment Integration
OXAPAY_API_KEY=your_oxapay_api_key_if_using_payments
```

### 2.2 How to Add Variables in Vercel:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable for Production, Preview, and Development
5. **Redeploy** your project after adding all variables

## Step 3: Deploy and Set Webhook

### 3.1 Ensure Project is Deployed
```bash
# If deploying from local
vercel --prod

# Or push to your main branch if using Git integration
git push origin main
```

### 3.2 Set Up Webhook
Replace placeholders with your actual values:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://yourapp.vercel.app/api/telegram-bot&secret_token=your-webhook-secret&drop_pending_updates=true"
```

**Success Response:**
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

### 3.3 Verify Webhook
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

Should return webhook information with your URL.

## Step 4: Configure App Branding

### 4.1 Access Admin Panel
1. Go to: `https://yourapp.vercel.app/admin`
2. Enter your admin credentials

### 4.2 Update Settings
Navigate to **Settings** tab and configure:

- **App Name**: Your custom app name (e.g., "CryptoMiner")
- **Token Name**: Your token symbol (e.g., "MINE") 
- **Telegram WebApp URL**: Your app URL for user buttons
- **Telegram Channel**: Your official channel (optional)
- **Admin Username**: Your Telegram username for support

### 4.3 Save Configuration
Click **Save Changes** to apply your branding.

## Step 5: Test Your Bot

### 5.1 Basic Functionality Test
1. **Find Your Bot**: Search for your bot username in Telegram
2. **Send `/start`**: Should show welcome with your custom app name
3. **Test Web App Button**: Should open your app with custom branding
4. **Send `/help`**: Should show help with your token name

### 5.2 Test Referral System
1. **Get Referral Link**: Send `/invite` to your bot
2. **Test Referral**: Share link with another account
3. **Verify Processing**: Check that bonuses are awarded

### 5.3 Test Admin Features
1. **Check Notifications**: Admin should receive join notifications
2. **Test Broadcasting**: Try broadcasting from admin panel
3. **Verify Commands**: All commands should work with your branding

## Step 6: Advanced Configuration

### 6.1 Bot Profile Setup
```bash
# Set bot profile picture
/setuserpic
# Upload an image representing your brand

# Set inline mode (optional)
/setinline
# Enable: Yes
# Placeholder: Search your app...
```

### 6.2 Bot Privacy Settings
```bash
# Set privacy mode
/setprivacy
# Disable - allows bot to read all messages
# Enable - bot only reads commands and mentions
```

### 6.3 Payment Setup (Optional)
If using payments:
```bash
# Set payment provider
/setpayments
# Follow BotFather instructions for payment setup
```

## 🎨 Expected Bot Behavior

After successful setup, your bot will:

### **Welcome Messages**
- "Welcome to [YourApp]! Start mining [YourToken] tokens..."
- Dynamic app name in all messages
- Custom token name in rewards

### **Interactive Buttons**
- "🚀 Open [YourApp]" - launches your web app
- "📢 Join Channel" - links to your channel
- "🎯 Invite Friends" - referral system
- "❓ Help" - shows help information

### **Commands**
- `/start` - Welcome with app launch
- `/help` - Help with your branding
- `/stats` - User statistics (if implemented)
- `/invite` - Referral link generation

### **Referral System**
- Automatic bonus processing
- Welcome messages for new referrals
- Notification to referrer
- Reward tracking

## 🔧 Troubleshooting

### Common Issues:

#### **Bot Not Responding**
```bash
# Check bot token
curl "https://api.telegram.org/bot<TOKEN>/getMe"

# Check webhook
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"

# Verify environment variables are set in Vercel
```

#### **Wrong Branding in Messages**
- Update app name in Admin Panel → Settings
- Verify admin config is saved properly
- Check browser cache and refresh

#### **Webhook Errors**
- Check Vercel function logs
- Verify webhook secret matches
- Ensure all environment variables are set

#### **Web App Not Opening**
- Verify `VITE_WEB_APP_URL` is correct
- Check domain accessibility
- Ensure app is properly deployed

## 🚀 Next Steps

After successful bot setup:

1. **Customize Further**:
   - Add custom tasks for users
   - Configure payment methods
   - Set up notification channels

2. **Monitor Performance**:
   - Check user engagement metrics
   - Monitor error logs
   - Track referral effectiveness

3. **Scale Your App**:
   - Add more features
   - Integrate additional services
   - Expand to multiple bots

## ✅ Setup Checklist

- [ ] Bot created with BotFather
- [ ] Bot token saved securely
- [ ] Environment variables configured in Vercel
- [ ] Project deployed successfully
- [ ] Webhook set and verified
- [ ] App branding configured in admin panel
- [ ] Bot responds with custom branding
- [ ] Web app button opens correctly
- [ ] Referral system working
- [ ] Admin notifications functioning
- [ ] All commands working properly

---

🎉 **Success!** Your custom branded Telegram bot is now fully operational and ready to engage users with your unique app experience!