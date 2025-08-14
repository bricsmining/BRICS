/**
 * Telegram Bot Webhook Handler
 * Handles all Telegram bot interactions including /start commands and referrals
 */

const BOT_TOKEN = process.env.TG_BOT_TOKEN || process.env.VITE_TG_BOT_TOKEN;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;
const WEB_APP_URL = process.env.VITE_WEB_APP_URL || 'https://your-app.vercel.app';
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'your-webhook-secret';

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify webhook secret for security (optional but recommended)
  const providedSecret = req.headers['x-telegram-bot-api-secret-token'];
  if (WEBHOOK_SECRET && providedSecret !== WEBHOOK_SECRET) {
    console.error('Invalid webhook secret. Expected:', WEBHOOK_SECRET, 'Got:', providedSecret);
    // Temporarily disabled for debugging - re-enable after testing
    // return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!BOT_TOKEN) {
    console.error('Bot token not configured');
    return res.status(500).json({ error: 'Bot token not configured' });
  }

  try {
    const update = req.body;
    
    // Handle different types of updates
    if (update.message) {
      await handleMessage(update.message);
    } else if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Handle incoming messages
async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = message.text;
  const userId = message.from.id;

  console.log(`Received message from ${userId}: ${text}`);

  // Handle /start command with referral parameter
  if (text && text.startsWith('/start ')) {
    const startParam = text.split(' ')[1];
    let referrerId = null;
    
    // Extract referrer ID from different formats
    if (startParam) {
      if (startParam.startsWith('refID')) {
        // New format: refID{tgID}
        referrerId = startParam.replace('refID', '');
      } else if (startParam.startsWith('User_')) {
        // Old format: User_{tgID}
        referrerId = startParam.replace('User_', '');
      } else {
        // Direct ID format
        referrerId = startParam;
      }
    }
    
    await handleStartWithReferral(chatId, userId, referrerId);
    return;
  }

  // Handle regular /start command
  if (text === '/start') {
    await handleStart(chatId, userId);
    return;
  }

  // Handle other commands
  if (text === '/help') {
    await sendMessage(chatId, `
🤖 *SkyTON Bot Commands*

/start - Start the bot and open the app
/help - Show this help message
/stats - View your mining stats
/invite - Get your referral link

Ready to start mining STON tokens? Tap the button below! 🚀
    `, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: "🚀 Open SkyTON", web_app: { url: WEB_APP_URL } }
        ]]
      }
    });
    return;
  }

  // Default response for unknown messages
  await sendMessage(chatId, `
Welcome to SkyTON! 🚀

Tap the button below to start mining STON tokens and earning rewards!
  `, {
    reply_markup: {
      inline_keyboard: [[
        { text: "🚀 Open SkyTON", web_app: { url: WEB_APP_URL } }
      ]]
    }
  });
}

// Handle /start command with referral
async function handleStartWithReferral(chatId, userId, referrerId) {
  console.log(`[BOT] Processing referral: ${userId} referred by ${referrerId}`);

  // Validate referrer ID - prevent self-referral and empty referrals
  if (!referrerId || 
      referrerId === userId.toString() || 
      referrerId === String(userId) ||
      parseInt(referrerId) === parseInt(userId)) {
    console.log('Invalid referral: Self-referral or empty referrer ID detected');
    // Invalid referral, treat as regular start
    await handleStart(chatId, userId);
    return;
  }

  try {
    // Call the referral API
    if (ADMIN_API_KEY) {
      const referralUrl = `${getBaseUrl()}/api/utils?action=refer&api=${encodeURIComponent(ADMIN_API_KEY)}&new=${encodeURIComponent(userId)}&referreby=${encodeURIComponent(referrerId)}`;
      
      const response = await fetch(referralUrl);
      const result = await response.json();

      if (result.success) {
        console.log('[BOT] Referral API success:', result.message);
        
        // Launch web app directly with referral info in URL and welcome tracking
        const webAppUrlWithReferral = `${WEB_APP_URL}?referred=true&referrer=${encodeURIComponent(referrerId)}&bonus=true&firstTime=true&userId=${encodeURIComponent(userId)}`;
        
        await sendMessage(chatId, `
🎉 *Welcome to SkyTON!*

You've been invited by a friend and earned bonus rewards! 

🎁 *Referral Bonus Applied:*
• STON tokens added to your balance
• Free spin on the reward wheel  
• Special welcome bonus

Your SkyTON app is launching automatically... 🚀
        `, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: "🚀 Open SkyTON Mining App", web_app: { url: webAppUrlWithReferral } }]
            ]
          }
        });
      } else {
        console.log('[BOT] Referral API failed:', result.message);
        // Send regular welcome message with web app launch
        const webAppUrlWithInfo = `${WEB_APP_URL}?welcome=true`;
        await sendMessage(chatId, `
🚀 *Welcome to SkyTON!*

Welcome to the mining community! 

Ready to start earning STON tokens? Your app is launching... 🚀
        `, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: "🚀 Open SkyTON Mining App", web_app: { url: webAppUrlWithInfo } }]
            ]
          }
        });
      }
    } else {
      console.error('ADMIN_API_KEY not configured - falling back to regular start');
      await handleStart(chatId, userId);
    }
  } catch (error) {
    console.error('Error processing referral:', error);
    const webAppUrlWithInfo = `${WEB_APP_URL}?welcome=true&error=referral_processing`;
    await sendMessage(chatId, `
🚀 *Welcome to SkyTON!*

Welcome! There was a minor issue processing your referral bonus, but you can still start mining!

Your app is launching... 🚀
    `, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: "🚀 Open SkyTON Mining App", web_app: { url: webAppUrlWithInfo } }]
        ]
      }
    });
  }
}

// Handle regular /start command
async function handleStart(chatId, userId, customMessage = null) {
  const message = customMessage || `
🚀 *Welcome to SkyTON!*

Start mining STON tokens, complete tasks, and earn rewards!

🎯 *Features:*
• Mine STON tokens automatically
• Complete social tasks for bonuses
• Refer friends and earn free spins
• Compete on the leaderboard
• Purchase mining cards to boost earnings

Ready to start your mining journey? 🚀
  `;

  await sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Open SkyTON", web_app: { url: WEB_APP_URL } }],
        [
          { text: "📊 Stats", callback_data: "show_stats" },
          { text: "🎯 Invite Friends", callback_data: "get_referral_link" }
        ],
        [{ text: "❓ Help", callback_data: "show_help" }]
      ]
    }
  });
}

// Handle callback queries (inline button presses)
async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;

  // Answer the callback query to remove loading state
  await answerCallbackQuery(callbackQuery.id);

  switch (data) {
    case 'get_referral_link':
      await handleGetReferralLink(chatId, userId);
      break;
    
    case 'show_stats':
      await handleShowStats(chatId, userId);
      break;
    
    case 'show_help':
      await sendMessage(chatId, `
🤖 *SkyTON Help*

*How to earn STON tokens:*
• ⛏️ Auto-mining (passive income)
• ✅ Complete social tasks
• 🎯 Refer friends (earn free spins)
• 🎰 Spin the reward wheel
• 💎 Purchase mining cards

*Commands:*
/start - Start the bot
/help - Show this help
/stats - View your stats

*Need support?* Contact @YourSupportUsername
      `, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: "🚀 Open App", web_app: { url: WEB_APP_URL } }
          ]]
        }
      });
      break;
  }
}

// Handle get referral link
async function handleGetReferralLink(chatId, userId) {
  const referralLink = `https://t.me/${getBotUsername()}?start=refID${userId}`;
  
  await sendMessage(chatId, `
🎯 *Your Referral Link*

Share this link with friends to earn rewards:

\`${referralLink}\`

*Rewards for each referral:*
• 🪙 STON tokens
• 🎰 Free spin on reward wheel
• 📈 Leaderboard points

The more friends you invite, the more you earn! 🚀
  `, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: "📱 Share Link", url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join me on SkyTON and start mining STON tokens! 🚀')}` }],
        [{ text: "🚀 Open App", web_app: { url: WEB_APP_URL } }]
      ]
    }
  });
}

// Handle show stats (basic version - you can enhance this)
async function handleShowStats(chatId, userId) {
  await sendMessage(chatId, `
📊 *Your SkyTON Stats*

To view your detailed stats including:
• 🪙 STON balance
• ⛏️ Mining power
• 🎯 Referrals count
• 🏆 Leaderboard position

Please open the SkyTON app below! 👇
  `, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: "📊 View Detailed Stats", web_app: { url: WEB_APP_URL } }
      ]]
    }
  });
}

// Utility functions
async function sendMessage(chatId, text, options = {}) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  const payload = {
    chat_id: chatId,
    text: text,
    ...options
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to send message:', error);
    }
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

async function answerCallbackQuery(callbackQueryId, text = null) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`;
  
  const payload = {
    callback_query_id: callbackQueryId,
    text: text
  };

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('Error answering callback query:', error);
  }
}

function getBotUsername() {
  // Extract bot username from token or use environment variable
  return process.env.BOT_USERNAME || 'YourBotUsername';
}

function getBaseUrl() {
  // Get the base URL for API calls
  return process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : process.env.VITE_WEB_APP_URL || 'https://your-app.vercel.app';
}
