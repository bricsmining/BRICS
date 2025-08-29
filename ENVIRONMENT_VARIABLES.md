# 🔧 Environment Variables Configuration

Complete guide for configuring all environment variables for your customizable Telegram mini app.

## 📋 Required Environment Variables

### 🤖 **Telegram Bot Configuration**
```bash
# Bot Token from @BotFather
TG_BOT_TOKEN=your_bot_token_here

# Bot Username (without @)
BOT_USERNAME=YourApp_Bot

# Webhook Security Secret
TELEGRAM_WEBHOOK_SECRET=your-secure-webhook-secret
```

### 🌐 **App Configuration**
```bash
# Your web app URL (will be used as fallback)
VITE_WEB_APP_URL=https://yourapp.vercel.app

# Admin API key for secure operations
ADMIN_API_KEY=your-secure-admin-api-key
```

### 🔥 **Firebase Configuration**
```bash
# Firebase project configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 💰 **Payment Configuration (Optional)**
```bash
# OxaPay API key for payment processing
OXAPAY_API_KEY=your_oxapay_api_key
```

## 🚀 **How to Set Up**

### **Vercel Deployment** (Recommended)
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add each variable:
   - **Name**: Variable name (exactly as shown above)
   - **Value**: Your actual value
   - **Environments**: Select all (Production, Preview, Development)
5. Click **Save** for each variable
6. **Redeploy** your project to apply changes

### **Local Development**
Create a `.env` file in your project root:
```bash
# .env file
TG_BOT_TOKEN=your_bot_token_here
BOT_USERNAME=YourApp_Bot
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret
VITE_WEB_APP_URL=http://localhost:5173
ADMIN_API_KEY=your-admin-key
# ... add all other variables
```

## 🔍 **Variable Details**

### **TG_BOT_TOKEN**
- **Source**: @BotFather on Telegram
- **Format**: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`
- **Usage**: Server-side bot API calls
- **Required**: Yes

### **BOT_USERNAME**
- **Source**: Your bot username from @BotFather
- **Format**: `YourApp_Bot` (without @)
- **Usage**: Referral link generation
- **Required**: Yes

### **TELEGRAM_WEBHOOK_SECRET**
- **Source**: You generate this
- **Format**: Any secure random string
- **Usage**: Webhook security validation
- **Required**: Recommended

### **VITE_WEB_APP_URL**
- **Source**: Your app deployment URL
- **Format**: `https://yourapp.vercel.app`
- **Usage**: Fallback webapp URL, API base URL
- **Required**: Yes

### **ADMIN_API_KEY**
- **Source**: You generate this
- **Format**: Secure random string
- **Usage**: Admin panel authentication
- **Required**: Yes

### **Firebase Variables**
- **Source**: Firebase Console → Project Settings
- **Usage**: Database, authentication, storage
- **Required**: Yes (all of them)

### **OXAPAY_API_KEY**
- **Source**: OxaPay dashboard
- **Usage**: Payment processing
- **Required**: Only if using payments

## 🎨 **Configuration Priority**

The app uses this priority for webapp URLs:

1. **User-facing buttons**: `adminConfig.telegramWebAppUrl` (set in admin panel)
2. **Admin/backend operations**: `VITE_WEB_APP_URL` (environment variable)
3. **Fallback**: `https://skyton.vercel.app` (default)

This allows you to:
- Set production URL in environment variables
- Override for user buttons via admin panel
- Test with different URLs without redeployment

## 🔐 **Security Best Practices**

### **Generate Secure Keys**
```bash
# Generate secure random strings
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use online generators (for non-sensitive keys only)
```

### **Environment Separation**
- Use different values for development/production
- Never commit `.env` files to version control
- Rotate keys periodically

### **Access Control**
- Limit who has access to environment variables
- Use Vercel team permissions appropriately
- Monitor access logs

## 🧪 **Testing Configuration**

### **Verify Bot Token**
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe"
```

### **Test Webhook**
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

### **Check Environment Loading**
Add temporary logging in your API routes to verify variables are loaded.

## 🚨 **Troubleshooting**

### **Common Issues**

#### **"Bot token invalid"**
- Verify token is copied correctly
- Check for extra spaces or characters
- Ensure token is from the correct bot

#### **"Webhook not receiving updates"**
- Verify `TELEGRAM_WEBHOOK_SECRET` is set
- Check webhook URL accessibility
- Ensure bot token matches

#### **"Firebase connection failed"**
- Verify all Firebase variables are set
- Check project ID is correct
- Ensure Firebase project is active

#### **"Admin panel not accessible"**
- Check `ADMIN_API_KEY` is set
- Verify key in requests matches environment
- Clear browser cache

### **Debugging Steps**
1. Check Vercel function logs
2. Verify all variables are present in Vercel dashboard
3. Test API endpoints individually
4. Check browser network tab for errors

## 📝 **Quick Setup Checklist**

- [ ] Created bot with @BotFather
- [ ] Copied bot token to `TG_BOT_TOKEN`
- [ ] Set bot username in `BOT_USERNAME`
- [ ] Generated secure `ADMIN_API_KEY`
- [ ] Set webhook secret in `TELEGRAM_WEBHOOK_SECRET`
- [ ] Configured `VITE_WEB_APP_URL` with your domain
- [ ] Added all Firebase configuration variables
- [ ] Added OxaPay key if using payments
- [ ] Set all variables in Vercel
- [ ] Redeployed project
- [ ] Tested bot functionality

## 🔄 **After Setup**

Once environment variables are configured:

1. **Set Webhook**: Use webhook setup guide
2. **Configure Branding**: Update app name/token in admin panel  
3. **Test Functionality**: Verify all features work
4. **Monitor Logs**: Check for any errors
5. **Scale**: Add more features and integrations

---

✅ **Environment configured correctly = Smooth app operation!**