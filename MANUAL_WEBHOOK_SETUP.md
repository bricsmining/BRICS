# 🤖 Manual Webhook Setup Steps

Based on your information:
- **Bot Token**: `7689055729:AAEtSkOpdognz7LzD5IbE5s0JcqtkhNw0RI`
- **Vercel URL**: `https://skyton.vercel.app`
- **API Key**: `adminsumon7891`

## Step 1: Set Environment Variables in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your "SkyTON" project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

```
TG_BOT_TOKEN = 7689055729:AAEtSkOpdognz7LzD5IbE5s0JcqtkhNw0RI
ADMIN_API_KEY = adminsumon7891
VITE_WEB_APP_URL = https://skyton.vercel.app
TELEGRAM_WEBHOOK_SECRET = skyton-webhook-secret
BOT_USERNAME = (we'll get this after setting up)
```

5. Click **Save** for each one
6. **Redeploy** your project (go to Deployments → click "..." → Redeploy)

## Step 2: Set Up Webhook (Using Browser)

Open your browser and go to this URL (copy and paste exactly):

```
https://api.telegram.org/bot7689055729:AAEtSkOpdognz7LzD5IbE5s0JcqtkhNw0RI/setWebhook?url=https://skyton.vercel.app/api/telegram-bot&secret_token=skyton-webhook-secret&drop_pending_updates=true
```

You should see a response like:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

## Step 3: Set Bot Commands

Go to this URL in your browser:

```
https://api.telegram.org/bot7689055729:AAEtSkOpdognz7LzD5IbE5s0JcqtkhNw0RI/setMyCommands?commands=[{"command":"start","description":"Start the bot and open SkyTON app"},{"command":"help","description":"Show help information"},{"command":"stats","description":"View your mining stats"},{"command":"invite","description":"Get your referral link"}]
```

## Step 4: Get Bot Information

Go to this URL to get your bot username:

```
https://api.telegram.org/bot7689055729:AAEtSkOpdognz7LzD5IbE5s0JcqtkhNw0RI/getMe
```

Look for the "username" field in the response and add it to Vercel as:
```
BOT_USERNAME = (the username you see)
```

## Step 5: Test Your Bot

1. **Find your bot**: Search for your bot username in Telegram
2. **Send `/start`**: You should get a welcome message with a web app button
3. **Test the web app button**: It should open your SkyTON app
4. **Test referral**: Share `https://t.me/YOUR_BOT_USERNAME?start=123456` with another account

## Step 6: Verify Webhook

Check if webhook is working by going to:

```
https://api.telegram.org/bot7689055729:AAEtSkOpdognz7LzD5IbE5s0JcqtkhNw0RI/getWebhookInfo
```

You should see:
```json
{
  "ok": true,
  "result": {
    "url": "https://skyton.vercel.app/api/telegram-bot",
    "has_custom_certificate": false,
    "pending_update_count": 0
  }
}
```

## Troubleshooting

### If webhook setup fails:
- Make sure your Vercel deployment is complete and accessible
- Check that the URL `https://skyton.vercel.app/api/telegram-bot` returns some response (not 404)

### If bot doesn't respond:
- Check Vercel function logs for errors
- Verify all environment variables are set correctly
- Make sure you redeployed after adding environment variables

### If referrals don't work:
- Check that `ADMIN_API_KEY` matches in both Vercel and the referral API calls
- Look at Vercel logs for `/api/utils` calls

## Success Indicators

✅ Webhook URL shows in getWebhookInfo
✅ Bot responds to `/start` with welcome message
✅ Web app button opens your SkyTON application
✅ Referral links process correctly (test with another account)
✅ Bot commands appear in Telegram when typing `/`

Once all steps are complete, your bot will be fully functional! 🚀
