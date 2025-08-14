# Referral System Guide

## How the Referral System Works

The referral system in SkyTON works through Telegram's deep linking feature combined with your bot webhook.

### 1. Referral Link Generation

When users visit the app, they get referral links like:
```
https://t.me/YourBotName?start=USER123
```

Where `USER123` is the referrer's Telegram user ID.

### 2. New User Flow

1. **User clicks referral link** → Opens Telegram with your bot
2. **User starts the bot** → Telegram sends `/start USER123` command to your bot
3. **Your bot processes the command** → Extracts the referrer ID from the start parameter
4. **Bot calls the referral API** → Makes a request to process the referral
5. **User opens the web app** → Gets created in the system with referral metadata

### 3. API Endpoint

The referral processing is now handled by:
```
GET /api/utils?action=refer&api=API_KEY&new=NEW_USER_ID&referreby=REFERRER_ID
```

**Parameters:**
- `action=refer` - Specifies the referral action
- `api=API_KEY` - Your admin API key for authentication
- `new=NEW_USER_ID` - The Telegram ID of the new user
- `referreby=REFERRER_ID` - The Telegram ID of the user who made the referral

### 4. Bot Integration

Your Telegram bot should handle the `/start` command like this:

```javascript
// Example bot code (Node.js with node-telegram-bot-api)
bot.onText(/\/start (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const referrerId = match[1]; // Extract referrer ID from start parameter
  
  // Call your referral API
  try {
    const response = await fetch(`${YOUR_DOMAIN}/api/utils?action=refer&api=${API_KEY}&new=${chatId}&referreby=${referrerId}`);
    const result = await response.json();
    
    if (result.success) {
      console.log('Referral processed:', result.message);
      // Send welcome message with referral bonus info
      bot.sendMessage(chatId, `Welcome! You've been referred by a friend and earned bonus rewards! 🎉`);
    } else {
      console.log('Referral failed:', result.message);
      // Send regular welcome message
      bot.sendMessage(chatId, `Welcome to SkyTON! Start mining STON tokens! 🚀`);
    }
  } catch (error) {
    console.error('Error processing referral:', error);
  }
  
  // Send the web app button
  bot.sendMessage(chatId, "Click below to open SkyTON:", {
    reply_markup: {
      inline_keyboard: [[
        { text: "🚀 Open SkyTON", web_app: { url: YOUR_WEB_APP_URL } }
      ]]
    }
  });
});

// Handle regular /start without parameters
bot.onText(/^\/start$/, (msg) => {
  const chatId = msg.chat.id;
  
  bot.sendMessage(chatId, "Welcome to SkyTON! Start mining STON tokens! 🚀", {
    reply_markup: {
      inline_keyboard: [[
        { text: "🚀 Open SkyTON", web_app: { url: YOUR_WEB_APP_URL } }
      ]]
    }
  });
});
```

### 5. What the API Does

When the referral API is called, it:

1. **Validates the API key** for security
2. **Checks if the new user already exists** (prevents duplicate referrals)
3. **Verifies the referrer exists** in the database
4. **Creates the new user** with referral metadata
5. **Updates the referrer's stats**:
   - Increments referral count
   - Adds referral reward (STON tokens)
   - Adds free spin for the referrer
   - Updates weekly referral tracking
   - Adds to referral history

### 6. Rewards System

**For the Referrer:**
- STON tokens (amount configured in `task_refer_friend`)
- 1 free spin for the spin wheel
- Updated referral statistics
- Weekly referral tracking

**For the New User:**
- Gets created with referral metadata
- Can see who referred them (optional)

### 7. Environment Variables Needed

Make sure you have these environment variables set:

```bash
ADMIN_API_KEY=your_secure_api_key_here
TG_BOT_TOKEN=your_telegram_bot_token
VITE_TG_BOT_TOKEN=your_telegram_bot_token  # For client-side use
```

### 8. Testing the Referral System

1. **Get a referral link** from an existing user in your app
2. **Share the link** with someone new
3. **Have them click it** and start the bot
4. **Check the logs** to see if the referral API was called
5. **Verify in your database** that:
   - New user was created with referral metadata
   - Referrer's stats were updated
   - Rewards were added

### 9. Troubleshooting

**Common Issues:**

- **"Invalid API key"** → Check your `ADMIN_API_KEY` environment variable
- **"Referrer not found"** → Make sure the referrer user exists in your database
- **"User already joined"** → The user has already been referred (prevents duplicate rewards)
- **"Referral task config missing"** → Make sure you have a `task_refer_friend` document in your tasks collection

**Debug Steps:**

1. Check your bot logs for incoming `/start` commands
2. Check your API logs for referral requests
3. Verify the API key is correct
4. Check that both users exist in your database
5. Make sure the `task_refer_friend` task is configured with a reward amount

### 10. Database Structure

The referral system updates these fields:

**New User Document:**
```javascript
{
  id: "new_user_id",
  referredBy: "referrer_id",  // Who referred this user
  // ... other user fields
}
```

**Referrer User Document:**
```javascript
{
  id: "referrer_id",
  referrals: 5,  // Total referrals count
  weeklyReferrals: 2,  // This week's referrals
  freeSpins: 3,  // Free spins earned
  balance: 1500,  // STON balance (includes referral rewards)
  referredUsers: ["user1", "user2", "user3"],  // Array of referred user IDs
  referralHistory: [
    {
      userId: "user1",
      joinedAt: "2024-01-15T10:30:00Z",
      timestamp: "2024-01-15T10:30:00Z"
    }
  ],
  weeklyReferralsLastReset: "2024-01-15T00:00:00Z",
  lastReferralDate: "2024-01-15T10:30:00Z"
}
```

This system ensures that referrals are properly tracked and rewards are distributed fairly!
