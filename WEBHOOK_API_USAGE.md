# 🚀 Dynamic Webhook Setup API

## 📡 **New API Endpoint: `/api/setup-webhook`**

You can now set up webhooks dynamically by calling a URL with parameters!

## 🔗 **Usage**

### **Basic URL Format:**
```
https://skyton.vercel.app/api/setup-webhook?TG_BOT_TOKEN=your_token&ADMIN_API_KEY=your_key&TELEGRAM_WEBHOOK_SECRET=your_secret
```

### **Example with Your Values:**
```
https://skyton.vercel.app/api/setup-webhook?TG_BOT_TOKEN=7689055729:AAEC_PcPfbQqX2LX9uaUmE7yFOke7F616mo&ADMIN_API_KEY=adminsumon7891&TELEGRAM_WEBHOOK_SECRET=skyton-000ddeab741cc1f0246b5aef
```

## 📝 **Parameters**

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `TG_BOT_TOKEN` | ✅ **Required** | Your Telegram bot token from @BotFather | `7689055729:AAEC_Pc...` |
| `ADMIN_API_KEY` | ✅ **Required** | Your secure API key for admin operations | `adminsumon7891` |
| `TELEGRAM_WEBHOOK_SECRET` | ⚠️ Optional | Webhook security secret (auto-generated if not provided) | `skyton-000ddeab...` |
| `VITE_WEB_APP_URL` | ⚠️ Optional | Your web app URL (auto-detected if not provided) | `https://skyton.vercel.app` |

## 🎯 **What It Does**

When you call this URL, the API will:

1. ✅ **Validate** your bot token
2. 🗑️ **Remove** any existing webhook
3. 🔗 **Set** new webhook to your app
4. 📋 **Configure** bot commands (`/start`, `/help`, etc.)
5. ✅ **Verify** webhook is working
6. 🧪 **Test** the endpoint
7. 📊 **Return** complete status report

## 📊 **Response Format**

### **Success Response:**
```json
{
  "success": true,
  "message": "Webhook setup completed successfully",
  "bot_info": {
    "id": 7689055729,
    "username": "xSkyTON_Bot",
    "first_name": "SkyTON",
    "can_join_groups": true,
    "can_read_all_group_messages": false
  },
  "webhook_info": {
    "url": "https://skyton.vercel.app/api/telegram-bot",
    "secret_token": "skyton-000ddeab741cc1f0246b5aef",
    "webhook_status": "Webhook was set",
    "endpoint_status": "working",
    "pending_updates": 0
  },
  "commands_status": "set",
  "configuration": {
    "TG_BOT_TOKEN": "7689055729...",
    "ADMIN_API_KEY": "admin...",
    "TELEGRAM_WEBHOOK_SECRET": "skyton-000ddeab741cc1f0246b5aef",
    "VITE_WEB_APP_URL": "https://skyton.vercel.app"
  },
  "links": {
    "bot_link": "https://t.me/xSkyTON_Bot",
    "start_link": "https://t.me/xSkyTON_Bot",
    "referral_example": "https://t.me/xSkyTON_Bot?start=123456"
  },
  "next_steps": [
    "Add the same environment variables to your Vercel project",
    "Redeploy your Vercel project if needed",
    "Test your bot: https://t.me/xSkyTON_Bot",
    "Test referral: https://t.me/xSkyTON_Bot?start=123456"
  ]
}
```

### **Error Response:**
```json
{
  "error": "Missing TG_BOT_TOKEN parameter",
  "usage": "GET /api/setup-webhook?TG_BOT_TOKEN=your_token&ADMIN_API_KEY=your_key&TELEGRAM_WEBHOOK_SECRET=your_secret"
}
```

## 🛠️ **How to Use**

### **Method 1: Browser (Simple)**
1. Copy the URL with your parameters
2. Paste in browser address bar
3. Press Enter
4. See JSON response with setup status

### **Method 2: curl (Command Line)**
```bash
curl "https://skyton.vercel.app/api/setup-webhook?TG_BOT_TOKEN=7689055729:AAEC_PcPfbQqX2LX9uaUmE7yFOke7F616mo&ADMIN_API_KEY=adminsumon7891&TELEGRAM_WEBHOOK_SECRET=skyton-000ddeab741cc1f0246b5aef"
```

### **Method 3: JavaScript (Programmatic)**
```javascript
const setupWebhook = async () => {
  const params = new URLSearchParams({
    TG_BOT_TOKEN: '7689055729:AAEC_PcPfbQqX2LX9uaUmE7yFOke7F616mo',
    ADMIN_API_KEY: 'adminsumon7891',
    TELEGRAM_WEBHOOK_SECRET: 'skyton-000ddeab741cc1f0246b5aef'
  });
  
  const response = await fetch(`https://skyton.vercel.app/api/setup-webhook?${params}`);
  const result = await response.json();
  console.log(result);
};
```

## 🔒 **Security Features**

- ✅ **Token Validation**: Verifies bot token with Telegram
- ✅ **Parameter Validation**: Checks required parameters
- ✅ **Webhook Security**: Uses secret tokens for verification
- ✅ **Error Handling**: Comprehensive error responses
- ✅ **Logging**: Server-side logging for debugging

## ⚡ **Benefits**

### **Before (Manual Setup):**
- Set environment variables
- Run setup script
- Check multiple status endpoints
- Manual verification

### **After (API Setup):**
- Single URL call
- Instant setup
- Complete status report
- No local environment needed

## 🧪 **Testing**

### **Test with Your Bot:**
```
https://skyton.vercel.app/api/setup-webhook?TG_BOT_TOKEN=7689055729:AAEC_PcPfbQqX2LX9uaUmE7yFOke7F616mo&ADMIN_API_KEY=adminsumon7891&TELEGRAM_WEBHOOK_SECRET=skyton-000ddeab741cc1f0246b5aef
```

### **Expected Results:**
- ✅ `"success": true`
- ✅ `"webhook_status": "Webhook was set"`
- ✅ `"commands_status": "set"`
- ✅ Bot responds to `/start` command
- ✅ Referral links work with direct web app launch

## 🚀 **Integration Ideas**

### **Admin Dashboard:**
Create a form that calls this API with user inputs

### **Multiple Bots:**
Set up webhooks for different bots dynamically

### **CI/CD Pipeline:**
Automate webhook setup during deployment

### **Bot Management:**
Build tools to manage multiple bot configurations

## 📱 **Quick Test Steps**

1. **Call the API**: Use the URL with your parameters
2. **Check Response**: Look for `"success": true`
3. **Test Bot**: Go to the `bot_link` from response
4. **Send `/start`**: Should get welcome message
5. **Test Referral**: Use `referral_example` link
6. **Verify Web App**: Should launch directly with bonus

Your webhook setup is now just a URL call away! 🎉
