# 🤖 Telegram Bot Webhook Setup - Step by Step

## Step 1: Check Vercel Deployment Status

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Find your SkyTON project
3. Check that the latest deployment is "Ready" (green status)
4. Copy your deployment URL (e.g., `https://your-app.vercel.app`)

## Step 2: Set Environment Variables in Vercel

Go to your Vercel project settings and add these environment variables:

### Required Variables:
```bash
TG_BOT_TOKEN=123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
ADMIN_API_KEY=your-secure-random-api-key-here
VITE_WEB_APP_URL=https://your-app.vercel.app
```

### Optional but Recommended:
```bash
TELEGRAM_WEBHOOK_SECRET=your-webhook-secret-token
BOT_USERNAME=YourBotUsername
```

### How to add them in Vercel:
1. Go to your project in Vercel dashboard
2. Click "Settings" tab
3. Click "Environment Variables" 
4. Add each variable with name and value
5. Set environment to "Production" (and "Preview" if you want)
6. Click "Save"

## Step 3: Get Your Bot Token

If you don't have a bot token yet:

1. **Open Telegram** and search for `@BotFather`
2. **Send `/newbot`** command
3. **Follow the prompts**:
   - Choose a name for your bot (e.g., "SkyTON Mining Bot")
   - Choose a username (e.g., "skyton_mining_bot")
4. **Copy the bot token** (looks like: `123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)
5. **Save the bot username** for later

## Step 4: Redeploy After Adding Environment Variables

After adding environment variables:
1. Go to "Deployments" tab in Vercel
2. Click "..." on the latest deployment
3. Click "Redeploy" 
4. Wait for deployment to complete

## Step 5: Set Up the Webhook

Now we'll configure your bot to use the webhook. You have 2 options:

### Option A: Using Our Setup Script (Recommended)

```bash
# Set your environment variables locally for the setup script
$env:TG_BOT_TOKEN="123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
$env:WEBHOOK_URL="https://your-app.vercel.app/api/telegram-bot"
$env:TELEGRAM_WEBHOOK_SECRET="your-webhook-secret"

# Run the setup script
npm run bot:setup
```

### Option B: Manual Setup with Curl

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

Replace:
- `<YOUR_BOT_TOKEN>` with your actual bot token
- `your-app.vercel.app` with your actual Vercel URL
- `your-webhook-secret` with your chosen secret

## Step 6: Verify Webhook Setup

Check if webhook is working:

```bash
# Check webhook info
$env:TG_BOT_TOKEN="your_bot_token"
npm run bot:webhook-info
```

Or manually:
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

You should see:
```json
{
  "ok": true,
  "result": {
    "url": "https://your-app.vercel.app/api/telegram-bot",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

## Step 7: Test Your Bot

1. **Find your bot** in Telegram (search for the username you created)
2. **Send `/start`** - You should get a welcome message with a web app button
3. **Test referral**: Create a referral link like `https://t.me/YourBot?start=123456`
4. **Share with another account** and test the referral flow

## Step 8: Monitor and Debug

### Check Vercel Function Logs:
1. Go to Vercel Dashboard
2. Click on your project
3. Go to "Functions" tab
4. Click on `/api/telegram-bot`
5. Check the logs for any errors

### Test Webhook Manually:
```bash
# Send a test message to your webhook
curl -X POST "https://your-app.vercel.app/api/telegram-bot" \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: your-webhook-secret" \
  -d '{
    "update_id": 123,
    "message": {
      "message_id": 1,
      "from": {"id": 123456, "first_name": "Test"},
      "chat": {"id": 123456, "type": "private"},
      "date": 1640995200,
      "text": "/start"
    }
  }'
```

## Troubleshooting

### Common Issues:

1. **"Webhook not receiving updates"**
   - Check if your Vercel URL is correct and accessible
   - Verify environment variables are set in Vercel
   - Check Vercel function logs for errors

2. **"Invalid bot token"**
   - Double-check your bot token from @BotFather
   - Make sure there are no extra spaces or characters

3. **"Webhook setup failed"**
   - Verify your Vercel deployment is successful
   - Check that `/api/telegram-bot` endpoint is accessible
   - Try setting up webhook without secret first

4. **"Referrals not working"**
   - Check that `ADMIN_API_KEY` is set correctly
   - Verify `/api/utils?action=refer` endpoint works
   - Check Vercel function logs for referral API calls

### Success Indicators:

✅ Webhook shows correct URL in getWebhookInfo
✅ Bot responds to `/start` command
✅ Web app button opens your application
✅ Referral links process correctly
✅ Vercel function logs show incoming updates

## Final Checklist:

- [ ] Vercel deployment is successful
- [ ] Environment variables are set in Vercel
- [ ] Bot token is valid
- [ ] Webhook URL is set correctly
- [ ] Bot responds to messages
- [ ] Referral system works
- [ ] Web app opens from bot

Once all steps are complete, your bot will be fully functional! 🚀
