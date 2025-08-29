# 🚀 Configurable Telegram Mini App

A fully customizable Telegram mining bot and web app with dynamic branding, built with React and Firebase.

## ✨ Key Features

### 🎨 **Fully Configurable Branding**
- **Dynamic App Name**: Change your app name (e.g., "SkyTON" → "CryptoMiner")
- **Dynamic Token Name**: Customize your token (e.g., "STON" → "MINE") 
- **Flexible Web App URL**: Environment-based URL configuration
- **Admin Panel Control**: All branding changes via admin interface

### 🤖 **Telegram Bot Integration**
- Interactive inline keyboards and commands
- Automatic referral system with welcome bonuses
- Real-time notifications and admin controls
- Dynamic messages based on your branding

### ⛏️ **Mining & Rewards System**
- Auto-mining with energy system
- Mystery box rewards
- Referral spinning wheel
- Task completion system
- Withdrawal system with admin verification

### 👥 **User Management**
- User registration and profiles
- Referral tracking and rewards
- Leaderboard system
- Admin broadcasting

### 💰 **Payment Integration**
- OxaPay payment gateway
- TON network support
- Withdrawal processing
- Transaction history

## 🚀 Quick Setup

### 1. **Environment Variables**
Set these in your Vercel project:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Telegram Bot
TG_BOT_TOKEN=your_bot_token
BOT_USERNAME=your_bot_username
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret

# App Configuration
VITE_WEB_APP_URL=https://yourapp.vercel.app
ADMIN_API_KEY=your_admin_api_key

# Payment Gateway (Optional)
OXAPAY_API_KEY=your_oxapay_api_key
```

### 2. **Deploy to Vercel**
```bash
# Clone and deploy
git clone your-repo
npm install
vercel --prod
```

### 3. **Configure Your Bot**
Use the built-in setup API endpoint in your browser:
```
https://yourapp.vercel.app/api/setup-webhook?TG_BOT_TOKEN=your_bot_token&ADMIN_API_KEY=your_admin_key&TELEGRAM_WEBHOOK_SECRET=your_webhook_secret
```

### 4. **Customize Your App**
1. Access admin panel: `https://yourapp.vercel.app/admin`
2. Go to Settings
3. Update:
   - **App Name**: Your custom app name
   - **Token Name**: Your custom token symbol
   - **Telegram WebApp URL**: Your domain for user buttons

## 🎨 Customization Examples

### Example 1: Crypto Mining App
```
App Name: "CryptoMiner"
Token Name: "MINE"
Bot Messages: "Welcome to CryptoMiner! Start mining MINE tokens..."
```

### Example 2: TON Rewards App  
```
App Name: "TONRewards"
Token Name: "REWARD"
Bot Messages: "Welcome to TONRewards! Earn REWARD tokens..."
```

### Example 3: Gaming Token App
```
App Name: "GameCoin"
Token Name: "GAME"
Bot Messages: "Welcome to GameCoin! Collect GAME tokens..."
```

## 📁 Project Structure

```
├── api/                    # Vercel serverless functions
│   ├── admin.js           # Admin operations
│   ├── telegram-bot.js    # Bot webhook handler
│   ├── oxapay.js          # Payment operations
│   └── utils.js           # Utility functions
├── src/
│   ├── components/        # React components
│   │   ├── admin/         # Admin panel components
│   │   └── dashboard/     # User dashboard components
│   ├── data/              # Data management
│   │   └── firestore/     # Firebase operations
│   ├── utils/             # Utility functions
│   │   └── appConfig.js   # Dynamic configuration
│   └── hooks/             # React hooks
└── docs/                  # Documentation files
```

## 🔧 Configuration System

### **App Name & Token Name**
- Configured via Admin Panel → Settings
- Stored in Firebase admin config
- Used throughout the app dynamically
- Fallbacks to default values if not set

### **Web App URL**
- **Environment**: `VITE_WEB_APP_URL` for admin/backend operations
- **Admin Config**: `telegramWebAppUrl` for user-facing buttons
- **Priority**: User buttons always use admin config value

### **Dynamic Updates**
- No code changes required
- Instant updates across all components
- Bot messages update automatically
- Cached for performance

## 📚 Available Guides

- **[Bot Setup Guide](BOT_SETUP_GUIDE.md)** - Complete bot configuration
- **[Webhook Setup](WEBHOOK_SETUP_STEPS.md)** - Webhook configuration steps
- **[Environment Variables](ENVIRONMENT_VARIABLES.md)** - All environment variables
- **[Admin Broadcasting](ADMIN_BROADCAST_GUIDE.md)** - Admin messaging features
- **[Notification System](NOTIFICATION_SYSTEM_GUIDE.md)** - Notification configuration

## 🚀 Deployment

### Prerequisites
- Vercel account
- Firebase project
- Telegram bot token
- Domain name (optional)

### Steps
1. **Fork/Clone** this repository
2. **Configure** environment variables in Vercel
3. **Deploy** to Vercel
4. **Set up** bot webhook
5. **Customize** via admin panel

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Bot setup commands
npm run bot:setup           # Interactive bot setup
npm run bot:webhook         # Configure webhook
npm run bot:info           # Get bot information
```

## 🔐 Security Features

- Environment variable protection
- Admin authentication
- Secure API endpoints
- Request validation
- Firebase security rules

## 📱 Supported Features

### For Users
- ✅ Telegram mini app interface
- ✅ Auto-mining system
- ✅ Task completion
- ✅ Referral system
- ✅ Mystery boxes
- ✅ Spin rewards
- ✅ Withdrawal requests
- ✅ Balance tracking

### For Admins  
- ✅ User management
- ✅ Task management
- ✅ Withdrawal processing
- ✅ Broadcasting
- ✅ Configuration panel
- ✅ Analytics dashboard
- ✅ Notification settings

## 🌟 Why Use This Template?

1. **🚀 Zero-Code Branding**: Change app name and token without touching code
2. **📱 Complete Solution**: Bot + Web App + Admin Panel in one package
3. **🔧 Highly Configurable**: Environment-based configuration system
4. **💰 Payment Ready**: Built-in payment gateway integration
5. **📊 Analytics Friendly**: Built-in user tracking and analytics
6. **🛡️ Secure**: Best practices for security and authentication
7. **📈 Scalable**: Built for growth with efficient architecture

## 🆘 Support

Need help? Check out our guides or create an issue!

---

**Made with ❤️ for the TON ecosystem**