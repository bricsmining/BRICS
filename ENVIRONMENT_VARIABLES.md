# 🔧 Environment Variables Configuration

## Required Environment Variables

### For Development/Local Setup:
```bash
# Telegram Bot Configuration
TG_BOT_TOKEN=7689055729:AAEC_PcPfbQqX2LX9uaUmE7yFOke7F616mo
VITE_TG_BOT_TOKEN=7689055729:AAEC_PcPfbQqX2LX9uaUmE7yFOke7F616mo

# API Configuration  
ADMIN_API_KEY=adminsumon7891

# Web App Configuration
VITE_WEB_APP_URL=https://skyton.vercel.app

# Webhook Configuration
TELEGRAM_WEBHOOK_SECRET=skyton-webhook-secret
WEBHOOK_URL=https://skyton.vercel.app/api/telegram-bot

# Bot Information
BOT_USERNAME=xSkyTON_Bot
VITE_BOT_USERNAME=xSkyTON_Bot  # For client-side referral links
```

### For Vercel Production:
```bash
TG_BOT_TOKEN=7689055729:AAEC_PcPfbQqX2LX9uaUmE7yFOke7F616mo
ADMIN_API_KEY=adminsumon7891
VITE_WEB_APP_URL=https://skyton.vercel.app
TELEGRAM_WEBHOOK_SECRET=skyton-webhook-secret
BOT_USERNAME=xSkyTON_Bot
VITE_BOT_USERNAME=xSkyTON_Bot  # For client-side referral links
```

## Usage Examples

### Run Webhook Setup:
```bash
# Option 1: Set environment variables inline
TG_BOT_TOKEN=your_token ADMIN_API_KEY=your_key node webhook-setup.js

# Option 2: Set in PowerShell (Windows)
$env:TG_BOT_TOKEN="your_token"
$env:ADMIN_API_KEY="your_key"
node webhook-setup.js

# Option 3: Set in Bash (Linux/Mac)
export TG_BOT_TOKEN="your_token"
export ADMIN_API_KEY="your_key"
node webhook-setup.js
```

### Run Bot Setup Scripts:
```bash
# Interactive setup
npm run bot:interactive

# Standard setup
npm run bot:setup

# Get bot info
npm run bot:info

# Check webhook status
npm run bot:webhook-info
```

## Variable Descriptions

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `TG_BOT_TOKEN` | Telegram bot token from @BotFather | ✅ | `123456789:ABC...` |
| `ADMIN_API_KEY` | Secure API key for admin operations | ✅ | `your_secure_key` |
| `VITE_WEB_APP_URL` | Your deployed web app URL | ✅ | `https://yourapp.vercel.app` |
| `TELEGRAM_WEBHOOK_SECRET` | Secret token for webhook security | ⚠️ | `your_webhook_secret` |
| `BOT_USERNAME` | Your bot's username (without @) | ⚠️ | `YourBot` |
| `VITE_BOT_USERNAME` | Bot username for client-side referral links | ⚠️ | `YourBot` |
| `WEBHOOK_URL` | Full webhook endpoint URL | ⚠️ | `https://yourapp.vercel.app/api/telegram-bot` |

✅ = Required  
⚠️ = Optional (has defaults)

## Security Notes

1. **Never commit** actual tokens to version control
2. **Use different tokens** for development and production
3. **Rotate tokens** regularly for security
4. **Use strong secrets** for webhook security
5. **Restrict API keys** to necessary permissions only

## Vercel Configuration

To set environment variables in Vercel:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable with:
   - **Name**: Variable name (e.g., `TG_BOT_TOKEN`)
   - **Value**: Variable value (e.g., your bot token)
   - **Environment**: Select "Production" (and "Preview" if needed)
5. Click **Save**
6. **Redeploy** your project after adding variables

## Troubleshooting

### "Bot token not found" Error:
- Make sure `TG_BOT_TOKEN` is set correctly
- Check for typos in the variable name
- Verify the token is valid with @BotFather

### Webhook Setup Fails:
- Verify `VITE_WEB_APP_URL` points to your deployed app
- Check that your Vercel deployment is successful
- Ensure webhook endpoint is accessible

### API Calls Fail:
- Verify `ADMIN_API_KEY` matches in all configurations
- Check that the key has proper permissions
- Ensure the key is set in both local and production environments
