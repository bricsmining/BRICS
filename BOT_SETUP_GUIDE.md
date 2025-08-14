# Telegram Bot Setup Guide

This guide will help you set up the complete Telegram bot integration with webhook functionality for SkyTON.

## 1. Prerequisites

### Environment Variables

Add these to your `.env` file and Vercel environment variables:

```bash
# Required
TG_BOT_TOKEN=123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
ADMIN_API_KEY=your-secure-api-key-here
VITE_WEB_APP_URL=https://your-app.vercel.app

# Optional but recommended
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret
BOT_USERNAME=YourBotUsername
```

### Getting Your Bot Token

1. **Create a bot with @BotFather**:
   - Open Telegram and search for `@BotFather`
   - Send `/newbot` command
   - Follow the instructions to create your bot
   - Copy the bot token

2. **Configure your bot**:
   - Send `/setdescription` to set bot description
   - Send `/setabouttext` to set about text
   - Send `/setuserpic` to set bot profile picture

## 2. Deploy Your Changes

First, make sure all the new API endpoints are deployed:

```bash
# Build and deploy
npm run build
git add .
git commit -m "Add Telegram bot webhook and referral system"
git push origin main
```

## 3. Set Up the Webhook

### Option A: Using the Setup Script

```bash
# Install dependencies if needed
npm install

# Set environment variables and run setup
TG_BOT_TOKEN=your_bot_token \
WEBHOOK_URL=https://your-app.vercel.app/api/telegram-bot \
TELEGRAM_WEBHOOK_SECRET=your-secret \
node scripts/setup-bot.js setup
```

### Option B: Manual Setup

You can also set up the webhook manually using curl:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.vercel.app/api/telegram-bot",
    "secret_token": "your-webhook-secret",
    "allowed_updates": ["message", "callback_query"],
    "drop_pending_updates": true
  }'
```

## 4. Test Your Bot

### Basic Tests

1. **Start your bot**: Send `/start` to your bot
2. **Test referral**: Share `https://t.me/YourBot?start=123` with another account
3. **Check webhook**: Look at Vercel function logs

### Test Commands

- `/start` - Should show welcome message with web app button
- `/start 123456` - Should process referral and show bonus message
- `/help` - Should show help information
- `/stats` - Should prompt to open web app
- Inline buttons should work correctly

## 5. Webhook Endpoint Details

The webhook endpoint `/api/telegram-bot` handles:

### Incoming Updates
- **Messages**: `/start`, `/help`, text messages
- **Callback Queries**: Inline button presses

### Referral Processing
When a user sends `/start REFERRER_ID`:
1. Extracts referrer ID from the command
2. Calls `/api/utils?action=refer&api=API_KEY&new=USER_ID&referreby=REFERRER_ID`
3. Processes the referral reward
4. Sends appropriate welcome message

### Response Messages
- **Regular start**: Welcome message with web app button
- **Referral start**: Welcome message with referral bonus info
- **Help**: Command list and instructions
- **Callback queries**: Referral links, stats, help

## 6. Security Features

### Webhook Security
- **Secret token validation**: Prevents unauthorized webhook calls
- **Method validation**: Only accepts POST requests
- **API key validation**: Secure referral API calls

### Rate Limiting
The bot includes basic error handling and logging for monitoring.

## 7. Monitoring and Debugging

### Check Webhook Status
```bash
node scripts/setup-bot.js webhook-info
```

### Check Bot Info
```bash
node scripts/setup-bot.js info
```

### Vercel Function Logs
- Go to Vercel dashboard
- Navigate to your project
- Check function logs for `/api/telegram-bot`

### Common Issues

1. **Webhook not receiving updates**:
   - Check if webhook URL is correct
   - Verify SSL certificate is valid
   - Check Vercel function logs

2. **Referral not working**:
   - Verify `ADMIN_API_KEY` is set correctly
   - Check `/api/utils` endpoint is working
   - Look for error messages in logs

3. **Bot commands not showing**:
   - Run the setup script again
   - Check bot permissions with @BotFather

## 8. Customization

### Bot Messages
Edit the messages in `api/telegram-bot.js`:
- Welcome messages
- Help text
- Button labels
- Referral bonus messages

### Bot Commands
Modify the commands array in `scripts/setup-bot.js`:
```javascript
const commands = [
  { command: 'start', description: 'Start the bot and open SkyTON app' },
  { command: 'help', description: 'Show help information' },
  // Add more commands...
];
```

### Web App Button
Update the web app URL in `api/telegram-bot.js`:
```javascript
const WEB_APP_URL = process.env.VITE_WEB_APP_URL || 'https://your-app.vercel.app';
```

## 9. Production Checklist

- [ ] Bot token is set in environment variables
- [ ] Admin API key is configured
- [ ] Web app URL is correct
- [ ] Webhook is set up and working
- [ ] Bot commands are configured
- [ ] Referral system is tested
- [ ] Error handling is working
- [ ] Logs are monitored

## 10. API Endpoints Summary

Your bot now uses these consolidated endpoints:

- **`/api/telegram-bot`** - Webhook for bot updates
- **`/api/utils?action=refer`** - Process referrals
- **`/api/utils?action=verify-telegram`** - Verify Telegram membership
- **`/api/admin?action=notify`** - Send admin notifications
- **`/api/admin?action=broadcast`** - Broadcast to all users
- **`/api/oxapay?action=*`** - Payment processing

## 11. Example Bot Conversation

```
User: /start 123456
Bot: 🎉 Welcome to SkyTON!
     You've been invited by a friend and earned bonus rewards!
     
     🎁 Referral Bonus:
     • STON tokens added to your balance
     • Free spin on the reward wheel
     • Special welcome bonus
     
     Ready to start mining? Tap the button below! 🚀
     [🚀 Start Mining STON] [🎯 Invite Friends]

User: [Clicks "🎯 Invite Friends"]
Bot: 🎯 Your Referral Link
     Share this link with friends to earn rewards:
     
     https://t.me/YourBot?start=789012
     
     Rewards for each referral:
     • 🪙 STON tokens
     • 🎰 Free spin on reward wheel
     • 📈 Leaderboard points
     
     [📱 Share Link] [🚀 Open App]
```

Your bot is now ready to handle referrals and provide a great user experience! 🚀
