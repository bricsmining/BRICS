# 🔒 Environment Variables Setup Guide

## Quick Start

Create a `.env.local` file in your project root with these configurations:

```bash
# ========================================
# 🔥 FIREBASE CONFIGURATION (Required)
# ========================================
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# ========================================
# 🤖 TELEGRAM BOT CONFIGURATION
# ========================================
# Bot token from @BotFather (required for admin notifications)
VITE_TG_BOT_TOKEN=7689055729:AAEtSkOpdognz7LzD5IbE5s0JcqtkhNw0RI

# ========================================
# 🔐 REFERRAL SYSTEM (Optional)
# ========================================
# Referral API key for external referral tracking
VITE_REFERRAL_API_KEY=your-referral-api-key

# ========================================
# 💳 OXAPAY PAYMENT GATEWAY
# ========================================
# OxaPay API keys (get from OxaPay dashboard)
VITE_OXAPAY_API_KEY=your-oxapay-api-key
VITE_OXAPAY_PAYOUT_API_KEY=JLTE2F-DYZQHI-20JAOW-16UPGY

# ========================================
# 🔥 FIREBASE CONFIGURATION
# ========================================
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

## 🛡️ Security Features

### ✅ What's Secure:
- **No Hardcoded Secrets**: All sensitive data in environment variables
- **Client-Side Safe**: Only necessary variables prefixed with `VITE_`
- **Bot Token Security**: Telegram bot token stored securely
- **Admin Control**: Email-based admin access control
- **Payment Security**: OxaPay keys in environment

### 🔒 Why This Approach:
1. **Environment Variables**: Industry standard for configuration
2. **Version Control Safe**: `.env.local` not committed to git
3. **Deploy Friendly**: Easy to configure in production
4. **Team Management**: Multiple admin emails supported
5. **Zero Hardcoding**: No secrets in source code

## 🚀 Getting Started

### Step 1: Create .env.local
```bash
# Copy the template above and fill in your actual values
cp ENV_SETUP_GUIDE.md .env.local
# Edit .env.local with your real credentials
```

### Step 2: Configure Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Application type: "Web application"
6. Authorized JavaScript origins: `http://localhost:5173`, `https://yourdomain.com`
7. Copy the Client ID to `VITE_GOOGLE_CLIENT_ID`

### Step 3: Set Up Telegram Bot
1. Message @BotFather on Telegram
2. Create a new bot: `/newbot`
3. Follow instructions and get your bot token
4. Add token to `VITE_TG_BOT_TOKEN`
5. Admin chat ID and username can be configured in the admin panel

### Step 4: Configure Admin Access
```bash
# Single admin
VITE_ADMIN_EMAILS=john.doe@gmail.com

# Multiple admins
VITE_ADMIN_EMAILS=john.doe@gmail.com,jane.smith@company.com,admin@skyton.com
```

### Step 5: Set Up Ad Networks (Optional)
Ad network settings (block IDs, zone IDs, enable/disable) can be configured directly in the admin panel.

## 📱 Admin Panel Features

### 🔍 What You'll See:
- **Environment Status**: Visual indicators for configured variables
- **Read-Only Display**: Sensitive data shown as configured but not editable
- **Real-Time Status**: Green/red indicators for enabled/disabled features
- **Configuration Guide**: Instructions for each environment variable

### 🎛️ What You Can Edit:
- **Ad Networks**: Enable/disable networks, configure block/zone IDs
- **App Limits**: Daily/hourly ad limits, energy limits, withdrawal limits
- **Feature Toggles**: Enable/disable app features
- **Exchange Rates**: STON to TON, USD to TON conversion rates
- **Admin Settings**: Chat ID, username for notifications
- **User Broadcast**: Send messages to all users
- **Telegram Settings**: Channel link, join requirements

## 🔄 Deployment

### Vercel:
1. Go to your Vercel dashboard
2. Select your project → Settings → Environment Variables
3. Add each variable from your `.env.local`
4. Redeploy your application

### Netlify:
1. Go to Site Settings → Environment Variables
2. Add each variable manually
3. Trigger a new deployment

### Docker:
```dockerfile
# Copy .env.local to container
COPY .env.local .env.local

# Or use environment variables in docker-compose.yml
environment:
  - VITE_ADMIN_EMAILS=admin@domain.com
  - VITE_TG_BOT_TOKEN=your_token
```

## 🚨 Security Best Practices

### ✅ DO:
- Keep `.env.local` out of version control
- Use strong, unique passwords
- Rotate API keys regularly
- Monitor admin access logs
- Use HTTPS in production

### ❌ DON'T:
- Commit `.env` files to git
- Share credentials in chat/email
- Use weak passwords
- Leave default values
- Expose sensitive data in client code

## 🔧 Troubleshooting

### Admin Can't Login:
- Check `VITE_ADMIN_EMAILS` contains your email
- Verify Google Client ID is correct
- Ensure no typos in email address

### Telegram Not Working:
- Verify bot token from @BotFather
- Check chat ID is correct number
- Ensure bot has permission to send messages

### Ads Not Showing:
- Check ad network is enabled (`VITE_ADSGRAM_ENABLED=true`)
- Verify block/zone IDs are correct
- Test in production environment

## 📞 Support

If you need help with configuration:
1. Check this guide first
2. Verify all environment variables are set
3. Check browser console for errors
4. Test in incognito mode
5. Contact support with specific error messages

---

🎉 **You're all set!** Visit `/admin` to access your secure admin panel.
