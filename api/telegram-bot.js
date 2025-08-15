/**
 * Comprehensive Telegram Bot Webhook Handler
 * Handles all bot interactions, referrals, notifications, and admin features directly
 */

import { db } from '../src/lib/serverFirebase.js';
import { 
  collection, 
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  increment,
  arrayUnion
} from 'firebase/firestore';

const BOT_TOKEN = process.env.TG_BOT_TOKEN || process.env.VITE_TG_BOT_TOKEN;
const WEB_APP_URL = process.env.VITE_WEB_APP_URL || 'https://skyton.vercel.app';
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'skyton-webhook-secret';

export default async function handler(req, res) {
  console.log(`[WEBHOOK] ${req.method} request received`);
  
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify webhook secret for security
  const providedSecret = req.headers['x-telegram-bot-api-secret-token'];
  if (WEBHOOK_SECRET && providedSecret !== WEBHOOK_SECRET) {
    console.error('Invalid webhook secret. Expected:', WEBHOOK_SECRET, 'Got:', providedSecret);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!BOT_TOKEN) {
    console.error('Bot token not configured');
    return res.status(500).json({ error: 'Bot token not configured' });
  }

  try {
    const update = req.body;
    console.log('[WEBHOOK] Received update:', JSON.stringify(update, null, 2));
    
    // Handle different types of updates
    if (update.message) {
      console.log('[WEBHOOK] Processing message update');
      await handleMessage(update.message);
    } else if (update.callback_query) {
      console.log('[WEBHOOK] Processing callback query update');
      await handleCallbackQuery(update.callback_query);
    } else {
      console.log('[WEBHOOK] Unknown update type, ignoring');
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[WEBHOOK] Handler error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// Handle incoming messages
async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = message.text;
  const userId = message.from.id;

  console.log(`[BOT] Received message from ${userId}: ${text}`);

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
    
    await handleStartWithReferral(chatId, userId, referrerId, message.from);
    return;
  }

  // Handle regular /start command
  if (text === '/start') {
    await handleStart(chatId, userId, message.from);
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

// Handle /start command with referral - Direct Firebase processing
async function handleStartWithReferral(chatId, userId, referrerId, userInfo) {
  console.log(`[BOT] Processing referral: ${userId} referred by ${referrerId}`);

  // Validate referrer ID - prevent self-referral and empty referrals
  if (!referrerId || 
      referrerId === userId.toString() || 
      referrerId === String(userId) ||
      parseInt(referrerId) === parseInt(userId)) {
    console.log('[BOT] Invalid referral: Self-referral or empty referrer ID detected');
    await handleStart(chatId, userId, userInfo);
    return;
  }

  try {
    // Process referral directly with Firebase
    const referralResult = await processReferralDirect(userId, referrerId, userInfo);
    
    if (referralResult.success) {
      console.log('[BOT] Referral processed successfully');
      
      // Send admin notification about new referral
      await notifyAdminDirect('referral', {
        newUserId: userId,
        newUserName: userInfo.first_name || 'Unknown',
        referrerId: referrerId,
        reward: referralResult.reward
      });
      
      // Send welcome message with referral bonus
      const webAppUrlWithReferral = `${WEB_APP_URL}?referred=true&referrer=${encodeURIComponent(referrerId)}&bonus=true&firstTime=true&userId=${encodeURIComponent(userId)}`;
      
      await sendMessage(chatId, `
🎉 *Welcome to SkyTON!*

You've been invited by a friend and earned bonus rewards! 

🎁 *Referral Bonus Applied:*
• ${referralResult.reward} STON tokens added
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
      
      // Notify referrer about successful referral
      await notifyUserDirect(referrerId, 'successful_referral', {
        newUserName: userInfo.first_name || `User ${userId}`,
        reward: referralResult.reward,
        referrerId: referrerId
      });
      
    } else {
      console.log('[BOT] Referral processing failed:', referralResult.message);
      await handleStart(chatId, userId, userInfo);
    }
    
  } catch (error) {
    console.error('[BOT] Error processing referral:', error);
    await handleStart(chatId, userId, userInfo);
  }
}

// Handle regular /start command
async function handleStart(chatId, userId, userInfo, customMessage = null) {
  // Send new user notification to admin
  if (userInfo) {
    await notifyAdminDirect('new_user', {
      userId: userId,
      name: userInfo.first_name || 'Unknown',
      username: userInfo.username || null
    });
  }

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

  switch (data) {
    case 'get_referral_link':
      await answerCallbackQuery(callbackQuery.id, "🎯 Getting your referral link...");
      await handleGetReferralLink(chatId, userId);
      break;
    
    case 'show_stats':
      await answerCallbackQuery(callbackQuery.id, "📊 Loading your stats...");
      await handleShowStats(chatId, userId);
      break;
    
    case 'show_help':
      await answerCallbackQuery(callbackQuery.id, "❓ Showing help information...");
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
    
    default:
      // For unknown callback queries, just acknowledge without text
      await answerCallbackQuery(callbackQuery.id);
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

// =============================================================================
// FIREBASE DIRECT PROCESSING FUNCTIONS
// =============================================================================

// Process referral directly with Firebase
async function processReferralDirect(newUserId, referrerId, userInfo) {
  try {
    const usersRef = collection(db, 'users');
    const tasksRef = collection(db, 'tasks');

    const newUserRef = doc(usersRef, newUserId.toString());
    const referredByRef = doc(usersRef, referrerId.toString());
    const referTaskRef = doc(tasksRef, 'task_refer_friend');

    const [newUserSnap, referredBySnap, referTaskSnap] = await Promise.all([
      getDoc(newUserRef),
      getDoc(referredByRef),
      getDoc(referTaskRef)
    ]);

    if (!referredBySnap.exists()) {
      return { success: false, message: 'Referrer not found.' };
    }

    if (!referTaskSnap.exists()) {
      return { success: false, message: 'Referral task config missing.' };
    }

    const rewardAmount = referTaskSnap.data().reward || 100;

    // Check if user already exists
    if (newUserSnap.exists()) {
      const existingUserData = newUserSnap.data();
      
      // If user already has a different referrer, reject
      if (existingUserData.invitedBy && existingUserData.invitedBy !== referrerId) {
        return { 
          success: false, 
          message: 'User already has a different referrer.' 
        };
      }
      
      // If user doesn't have a referrer yet, update with referral info
      if (!existingUserData.invitedBy) {
        await updateDoc(newUserRef, {
          invitedBy: referrerId
        });
        console.log(`[BOT] Updated existing user ${newUserId} with referrer ${referrerId}`);
      }
    } else {
      // Create the new user with referral metadata
      const defaultUser = {
        telegramId: newUserId.toString(),
        username: userInfo.username || `user_${newUserId}`,
        firstName: userInfo.first_name || '',
        lastName: userInfo.last_name || '',
        balance: 100,
        balanceBreakdown: {
          task: 100,
          box: 0,
          referral: 0,
          mining: 0
        },
        energy: 500,
        referrals: 0,
        weeklyReferrals: 0,
        referralHistory: [],
        referralCode: newUserId.toString(),
        invitedBy: referrerId,
        referralLink: `https://t.me/${getBotUsername()}?start=refID${newUserId}`,
        completedTasks: [],
        referredUsers: [],
        isBanned: false,
        isAdmin: false,
        profilePicUrl: userInfo.photo_url || null,
        mysteryBoxes: 0,
        lastBoxEarned: null,
        lastBoxOpened: null,
        cards: 0,
        miningData: {
          lastClaimTime: null,
          miningStartTime: null,
          isActive: false,
          totalMined: 0,
        }
      };
      
      await setDoc(newUserRef, { ...defaultUser, joinedAt: serverTimestamp() });
      console.log(`[BOT] Created new user ${newUserId} with referrer ${referrerId}`);
    }

    // Update referrer's stats with dynamic reward AND free spin
    const referrerData = referredBySnap.data();
    const currentDate = new Date();
    
    // Check if this user is already in referredUsers to prevent duplicate rewards
    const existingReferredUsers = referrerData.referredUsers || [];
    if (existingReferredUsers.includes(newUserId.toString())) {
      console.log(`[BOT] User ${newUserId} already referred by ${referrerId}, skipping duplicate reward`);
      return {
        success: true,
        message: 'Referral already processed (no duplicate rewards)',
        reward: rewardAmount,
        existingReferral: true
      };
    }
    
    // Check if we need to reset weekly referrals
    const lastReset = referrerData.weeklyReferralsLastReset;
    let weeklyReferrals = referrerData.weeklyReferrals || 0;
    let needsReset = false;
    
    if (lastReset) {
      const daysSinceReset = (currentDate - lastReset.toDate()) / (1000 * 60 * 60 * 24);
      if (daysSinceReset >= 7) {
        weeklyReferrals = 0;
        needsReset = true;
      }
    }

    // Update referrer with new referral
    const referrerUpdate = {
      referrals: increment(1),
      weeklyReferrals: needsReset ? 1 : increment(1),
      'balanceBreakdown.referral': increment(rewardAmount),
      referredUsers: arrayUnion(newUserId.toString()),
      referralHistory: arrayUnion({
        userId: newUserId.toString(),
        timestamp: serverTimestamp(),
        reward: rewardAmount
      }),
      mysteryBoxes: increment(1) // Give 1 free spin
    };

    if (needsReset) {
      referrerUpdate.weeklyReferralsLastReset = serverTimestamp();
    }

    await updateDoc(referredByRef, referrerUpdate);

    return {
      success: true,
      message: 'Referral processed successfully',
      reward: rewardAmount
    };

  } catch (error) {
    console.error('[BOT] Error in processReferralDirect:', error);
    return {
      success: false,
      message: 'Server error processing referral'
    };
  }
}

// =============================================================================
// NOTIFICATION FUNCTIONS
// =============================================================================

// Send notification to admin
async function notifyAdminDirect(type, data) {
  try {
    const adminConfigRef = doc(db, 'admin', 'config');
    const adminConfigSnap = await getDoc(adminConfigRef);
    
    if (!adminConfigSnap.exists()) {
      console.log('[BOT] Admin config not found');
      return false;
    }

    const adminConfig = adminConfigSnap.data();
    const adminChatId = adminConfig.telegramChatId;

    if (!adminChatId) {
      console.log('[BOT] Admin chat ID not configured');
      return false;
    }

    const message = generateAdminMessage(type, data);
    if (!message) {
      console.log('[BOT] Invalid notification type:', type);
      return false;
    }

    await sendMessage(adminChatId, message, { parse_mode: 'Markdown' });
    return true;

  } catch (error) {
    console.error('[BOT] Error sending admin notification:', error);
    return false;
  }
}

// Send notification to user
async function notifyUserDirect(userId, type, data) {
  try {
    const message = generateUserMessage(type, data);
    if (!message) {
      console.log('[BOT] Invalid user notification type:', type);
      return false;
    }

    await sendMessage(userId, message, { parse_mode: 'Markdown' });
    return true;

  } catch (error) {
    console.error('[BOT] Error sending user notification:', error);
    return false;
  }
}

// Generate admin notification messages
function generateAdminMessage(type, data) {
  const timestamp = new Date().toLocaleString();
  
  switch (type) {
    case 'new_user':
      return `🎉 *New User Joined!*

👤 *User Info:*
• ID: \`${data.userId}\`
• Name: ${data.name || 'Unknown'}
• Username: @${data.username || 'None'}

🕐 *Time:* ${timestamp}`;

    case 'referral':
      return `💰 *New Referral!*

👥 *Referral Info:*
• Referrer: \`${data.referrerId}\`
• New User: \`${data.newUserId}\` (${data.newUserName || 'Unknown'})
• Reward: ${data.reward || 0} STON + 1 Free Spin

🕐 *Time:* ${timestamp}`;

    case 'task_submission':
      return `📋 *Task Submission!*

👤 *User:* \`${data.userId}\` (${data.userName || 'Unknown'})
📝 *Task:* ${data.taskTitle || 'Unknown Task'}
💰 *Reward:* ${data.reward || 0} STON
🔗 *Target:* ${data.target || 'N/A'}

*Action Required: Review and approve/reject*

🕐 *Time:* ${timestamp}`;

    case 'withdrawal_request':
      return `💸 *Withdrawal Request!*

👤 *User:* \`${data.userId}\` (${data.userName || 'Unknown'})
💰 *Amount:* ${data.amount || 0} STON
💳 *Method:* ${data.method || 'Unknown'}
📍 *Address:* \`${data.address || 'Not provided'}\`
💵 *Current Balance:* ${data.currentBalance || 0} STON

*Action Required: Process withdrawal*

🕐 *Time:* ${timestamp}`;

    default:
      return null;
  }
}

// Generate user notification messages
function generateUserMessage(type, data) {
  switch (type) {
    case 'task_approved':
      return `✅ *Task Approved!*

Your task submission has been approved!

📝 *Task:* ${data.taskTitle || 'Unknown Task'}
💰 *Reward:* ${data.reward || 0} STON added to your balance
🎉 *Status:* Completed

Keep completing tasks to earn more STON! 🚀`;

    case 'task_rejected':
      return `❌ *Task Rejected*

Your task submission has been rejected.

📝 *Task:* ${data.taskTitle || 'Unknown Task'}
📝 *Reason:* ${data.reason || 'Requirements not met'}

Please try again following the task requirements. 🔄`;

    case 'withdrawal_approved':
      return `✅ *Withdrawal Approved!*

Your withdrawal request has been approved!

💰 *Amount:* ${data.amount || 0} STON
💳 *Method:* ${data.method || 'Unknown'}
📍 *Address:* \`${data.address || 'Not provided'}\`
⏱️ *Processing Time:* 24-48 hours

Your tokens will be transferred soon! 🚀`;

    case 'withdrawal_rejected':
      return `❌ *Withdrawal Rejected*

Your withdrawal request has been rejected.

💰 *Amount:* ${data.amount || 0} STON
📝 *Reason:* ${data.reason || 'Invalid request'}

Your STON balance has been restored. Please try again. 🔄`;

    case 'successful_referral':
      return `🎉 *Successful Referral!*

Your friend joined SkyTON through your referral link!

👥 *New Member:* ${data.newUserName || 'Friend'}
💰 *Your Reward:* ${data.reward || 0} STON
🎰 *Bonus:* 1 Free Spin added

Keep sharing to earn more rewards! 🚀

*Share your link:* https://t.me/${getBotUsername()}?start=refID${data.referrerId}`;

    default:
      return null;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

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
      console.error('[BOT] Failed to send message:', error);
    }
  } catch (error) {
    console.error('[BOT] Error sending message:', error);
  }
}

async function answerCallbackQuery(callbackQueryId, text = null) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`;
  
  const payload = {
    callback_query_id: callbackQueryId
  };

  // Only include text if it's provided and not null
  if (text !== null && text !== undefined) {
    payload.text = text;
  }

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.error('[BOT] Error answering callback query:', error);
  }
}

function getBotUsername() {
  // Extract bot username from token or use environment variable
  return process.env.BOT_USERNAME || 'xSkyTON_Bot';
}

// =============================================================================
// EXPORT NOTIFICATION FUNCTIONS FOR EXTERNAL USE
// =============================================================================

export { notifyAdminDirect, notifyUserDirect };