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
    await handleShowHelp(chatId, userId);
    return;
  }

  // Default response for unknown messages
  const adminConfig = await getAdminConfig();
  const keyboard = await buildInlineKeyboard(adminConfig);
  
  await sendMessage(chatId, `
Welcome to SkyTON! 🚀

Tap the button below to start mining STON tokens and earning rewards!
  `, {
    reply_markup: { inline_keyboard: keyboard }
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
      
      // Get admin configuration for dynamic buttons
      const adminConfig = await getAdminConfig();
      const channelLink = adminConfig?.telegramChannelLink || '@xSkyTON';
      const channelUsername = channelLink.replace('@', '');
      
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
            [{ text: "🚀 Open SkyTON Mining App", web_app: { url: webAppUrlWithReferral } }],
            [{ text: "📢 Join Channel", url: `https://t.me/${channelUsername}` }],
            [
              { text: "🎯 Invite Friends", callback_data: "get_referral_link" },
              { text: "❓ Help", callback_data: "show_help" }
            ]
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

  // Get admin configuration for dynamic buttons
  const adminConfig = await getAdminConfig();
  const keyboard = await buildInlineKeyboard(adminConfig);

  await sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: { inline_keyboard: keyboard }
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
    
    case 'join_channel':
      await answerCallbackQuery(callbackQuery.id, "📢 Opening channel...");
      await handleJoinChannel(chatId, userId);
      break;
    
    case 'show_help':
      await answerCallbackQuery(callbackQuery.id, "❓ Showing help information...");
      await handleShowHelp(chatId, userId);
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

// Handle join channel
async function handleJoinChannel(chatId, userId) {
  const adminConfig = await getAdminConfig();
  const channelLink = adminConfig?.telegramChannelLink || '@xSkyTON';
  const channelUsername = channelLink.replace('@', '');
  
  await sendMessage(chatId, `
📢 *Join Our Official Channel*

Stay updated with the latest news, announcements, and exclusive rewards!

🎁 *Channel Benefits:*
• Latest project updates
• Exclusive airdrops and bonuses
• Community events
• Important announcements

Join now to never miss out! 🚀
  `, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: "📢 Join Channel", url: `https://t.me/${channelUsername}` }],
        [{ text: "🚀 Open App", web_app: { url: WEB_APP_URL } }]
      ]
    }
  });
}

// Handle help with admin username
async function handleShowHelp(chatId, userId) {
  const adminConfig = await getAdminConfig();
  const adminUsername = adminConfig?.adminTgUsername || 'ExecutorHere';
  
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

*Need support?* Contact @${adminUsername}

Ready to start mining? Use the button below! 🚀
  `, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [[
        { text: "🚀 Open App", web_app: { url: WEB_APP_URL } }
      ]]
    }
  });
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Get admin configuration from Firebase
async function getAdminConfig() {
  try {
    const adminConfigRef = doc(db, 'admin', 'config');
    const adminConfigSnap = await getDoc(adminConfigRef);
    
    if (adminConfigSnap.exists()) {
      return adminConfigSnap.data();
    } else {
      // Return default values if no config exists
      return {
        telegramChannelLink: '@xSkyTON',
        adminTgUsername: 'ExecutorHere'
      };
    }
  } catch (error) {
    console.error('[BOT] Error getting admin config:', error);
    return {
      telegramChannelLink: '@xSkyTON',
      adminTgUsername: 'ExecutorHere'
    };
  }
}

// Build inline keyboard based on admin configuration
async function buildInlineKeyboard(adminConfig) {
  const channelLink = adminConfig?.telegramChannelLink || '@xSkyTON';
  // Remove @ if present to get clean username
  const channelUsername = channelLink.replace('@', '');
  
  // Build keyboard layout: Open webapp, Join channel, Invite, Help
  const keyboard = [
    // First row: Open webapp
    [{ text: "🚀 Open SkyTON", web_app: { url: WEB_APP_URL } }],
    // Second row: Join channel
    [{ text: "📢 Join Channel", url: `https://t.me/${channelUsername}` }],
    // Third row: Invite and Help
    [
      { text: "🎯 Invite Friends", callback_data: "get_referral_link" },
      { text: "❓ Help", callback_data: "show_help" }
    ]
  ];
  
  return keyboard;
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
    console.log(`[BOT] Attempting to send admin notification - Type: ${type}, Data:`, data);
    
    const adminConfigRef = doc(db, 'admin', 'config');
    const adminConfigSnap = await getDoc(adminConfigRef);
    
    if (!adminConfigSnap.exists()) {
      console.error('[BOT] Admin config document not found in Firebase');
      return false;
    }

    const adminConfig = adminConfigSnap.data();
    console.log('[BOT] Admin config loaded:', {
      hasAdminChatId: !!adminConfig.adminChatId,
      adminChatId: adminConfig.adminChatId ? `${adminConfig.adminChatId.substring(0, 3)}***` : 'Not set'
    });
    
    const adminChatId = adminConfig.adminChatId;

    if (!adminChatId) {
      console.error('[BOT] Admin chat ID not configured in Firebase admin config');
      return false;
    }

    const messageData = generateAdminMessage(type, data);
    if (!messageData) {
      console.error('[BOT] Invalid notification type:', type);
      return false;
    }

    console.log(`[BOT] Sending notification to admin chat ID: ${adminChatId.substring(0, 3)}***`);
    
    // Handle both old string format and new object format with keyboards
    let messageText, options;
    if (typeof messageData === 'string') {
      messageText = messageData;
      options = { parse_mode: 'Markdown' };
      console.log(`[BOT] Message preview: ${messageText.substring(0, 100)}...`);
    } else {
      messageText = messageData.text;
      options = { 
        parse_mode: 'Markdown',
        reply_markup: messageData.keyboard ? { inline_keyboard: messageData.keyboard } : undefined
      };
      console.log(`[BOT] Message preview: ${messageText.substring(0, 100)}...`);
      console.log(`[BOT] Keyboard buttons: ${messageData.keyboard ? messageData.keyboard.length : 0} rows`);
    }
    
    await sendMessage(adminChatId, messageText, options);
    console.log('[BOT] Admin notification sent successfully');
    return true;

  } catch (error) {
    console.error('[BOT] Error sending admin notification:', error);
    console.error('[BOT] Stack trace:', error.stack);
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
      return {
        text: `📋 *Task Submission!*

👤 *User Details:*
• ID: \`${data.userId}\`
• Name: ${data.userName || 'Unknown'}
• Username: @${data.username || 'None'}

📝 *Task Details:*
• Title: ${data.taskTitle || 'Unknown Task'}
• Type: ${data.taskType || 'Manual Task'}
• Reward: ${data.reward || 0} STON
• Target: ${data.target || 'N/A'}
• Submission: ${data.submission || 'No submission provided'}

🔍 *Action Required: Review and Process*

🕐 *Time:* ${timestamp}`,
        keyboard: [
          [
            {
              text: '✅ Approve',
              callback_data: `approve_task_${data.taskId || data.userId}_${Date.now()}`
            },
            {
              text: '❌ Reject',
              callback_data: `reject_task_${data.taskId || data.userId}_${Date.now()}`
            }
          ],
          [
            {
              text: '📋 View Submission',
              callback_data: `view_task_${data.taskId || data.userId}`
            }
          ]
        ]
      };

    case 'withdrawal_request':
      return {
        text: `💸 *Withdrawal Request!*

👤 *User Details:*
• ID: \`${data.userId}\`
• Name: ${data.userName || 'Unknown'}
• Username: @${data.username || 'None'}

💰 *Withdrawal Details:*
• Amount: ${data.amount || 0} STON
• Method: ${data.method || 'Unknown'}
• Address: \`${data.address || 'Not provided'}\`
• Current Balance: ${data.currentBalance || 0} STON

🔍 *Action Required: Review and Process*

🕐 *Time:* ${timestamp}`,
        keyboard: [
          [
            {
              text: '✅ Approve',
              callback_data: `approve_withdrawal_${data.withdrawalId || data.userId}_${Date.now()}`
            },
            {
              text: '❌ Reject',
              callback_data: `reject_withdrawal_${data.withdrawalId || data.userId}_${Date.now()}`
            }
          ],
          [
            {
              text: '📋 View Details',
              callback_data: `view_withdrawal_${data.withdrawalId || data.userId}`
            }
          ]
        ]
      };

    case 'payment_created':
      return `🧾 *Payment Invoice Created*

👤 *User Details:*
• User: \`${data.userId}\` (@${data.username})
• Card: ${data.cardType}
• Amount: ${data.amount} ${data.currency}

🔗 *Payment Details:*
• Order ID: \`${data.orderId}\`
• Payment ID: \`${data.paymentId}\`
• Payment URL: [Click to pay](${data.paymentUrl})

💰 Payment gateway invoice has been generated successfully!

🕐 *Time:* ${timestamp}`;

    case 'payment_completed':
      return `✅ *Payment Completed!*

💳 *Purchase Details:*
• User: \`${data.userId}\` (@${data.username})
• Card: ${data.cardType}
• Amount: ${data.amount} ${data.currency}
• Order ID: \`${data.orderId}\`
• Payment ID: \`${data.paymentId}\`

🎉 Mining card has been activated for the user!

🕐 *Time:* ${timestamp}`;

    case 'payment_failed':
      return `❌ *Payment Failed!*

💳 *Purchase Details:*
• User: \`${data.userId}\` (@${data.username})
• Card: ${data.cardType}
• Amount: ${data.amount} ${data.currency}
• Order ID: \`${data.orderId}\`
• Payment ID: \`${data.paymentId}\`
• Reason: ${data.reason}

⚠️ No mining card was activated.

🕐 *Time:* ${timestamp}`;

    case 'payment_pending':
      return `⏳ *Payment In Progress*

💳 *Purchase Details:*
• User: \`${data.userId}\` (@${data.username})
• Card: ${data.cardType}
• Amount: ${data.amount} ${data.currency}
• Order ID: \`${data.orderId}\`
• Payment ID: \`${data.paymentId}\`
• Status: ${data.status}

⏱️ Waiting for payment confirmation...

🕐 *Time:* ${timestamp}`;

    case 'payment_status_update':
      return `🔄 *Payment Status Update*

💳 *Purchase Details:*
• User: \`${data.userId}\` (@${data.username})
• Card: ${data.cardType}
• Amount: ${data.amount} ${data.currency}
• Order ID: \`${data.orderId}\`
• Payment ID: \`${data.paymentId}\`
• New Status: ${data.status}

🕐 *Time:* ${timestamp}`;

    case 'payment_webhook_unknown':
      return `⚠️ *Unknown Payment Webhook*

💳 *Payment Details:*
• Order ID: \`${data.orderId}\`
• Payment ID: \`${data.paymentId}\`
• Amount: ${data.amount} ${data.currency}
• Status: ${data.status}

🔍 Purchase record not found in database.

🕐 *Time:* ${timestamp}`;

    case 'user_level_achieve':
      return `🆙 *User Level Achievement!*

👤 *User Details:*
• ID: \`${data.userId}\`
• Name: ${data.userName || 'Unknown'}
• Username: @${data.username || 'None'}

🎉 *Achievement Details:*
• New Level: ${data.newLevel || 1}
• Previous Level: ${data.previousLevel || 0}
• Total STON Earned: ${data.totalEarned || 0}
• Level Bonus: ${data.levelBonus || 0} STON

🎊 User has leveled up and earned bonus rewards!

🕐 *Time:* ${timestamp}`;

    case 'wallet_connect':
      return `🔗 *Wallet Connected!*

👤 *User Details:*
• ID: \`${data.userId}\`
• Name: ${data.userName || 'Unknown'}
• Username: @${data.username || 'None'}

💳 *Wallet Details:*
• Wallet Address: \`${data.walletAddress || 'Not provided'}\`
• Wallet Type: ${data.walletType || 'TON Wallet'}
• Connection Method: ${data.connectionMethod || 'Manual'}

🔐 User has successfully connected their wallet for withdrawals!

🕐 *Time:* ${timestamp}`;

    case 'energy_earning':
      return `⚡ *Energy Earned from Ad!*

👤 *User Details:*
• ID: \`${data.userId}\`
• Name: ${data.userName || 'Unknown'}
• Username: @${data.username || 'None'}

⚡ *Energy Details:*
• Energy Earned: ${data.energyEarned || 0}
• STON Equivalent: ${data.stonEquivalent || 0}
• Ad Network: ${data.adNetwork || 'Unknown'}
• Campaign: ${data.campaign || 'N/A'}

📺 User successfully watched an ad and earned energy!

🕐 *Time:* ${timestamp}`;

    case 'box_earning':
      return `📦 *Box Earned from Ad!*

👤 *User Details:*
• ID: \`${data.userId}\`
• Name: ${data.userName || 'Unknown'}
• Username: @${data.username || 'None'}

📦 *Box Details:*
• Box Type: ${data.boxType || 'Unknown Box'}
• Box Number: ${data.boxNumber || 1}
• Reward: ${data.reward || 0} STON
• Ad Network: ${data.adNetwork || 'Unknown'}

🎁 User successfully watched an ad and earned a box!

🕐 *Time:* ${timestamp}`;

    case 'task_completion':
      return `✅ *Task Completed!*

👤 *User Details:*
• ID: \`${data.userId}\`
• Name: ${data.userName || 'Unknown'}
• Username: @${data.username || 'None'}

📝 *Task Details:*
• Title: ${data.taskTitle || 'Unknown Task'}
• Type: ${data.taskType || 'Auto Task'}
• Reward: ${data.reward || 0} STON
• Completion Method: ${data.completionMethod || 'Auto'}

🎉 User has successfully completed a task and earned rewards!

🕐 *Time:* ${timestamp}`;

    case 'payout_created':
      return `💸 *Payout Created*

🏦 *Withdrawal Details:*
• User: \`${data.userId}\`
• Withdrawal ID: \`${data.withdrawalId}\`
• Track ID: \`${data.trackId}\`
• Address: \`${data.address}\`
• Amount: ${data.amount} ${data.currency}
• Status: ${data.status}

💰 Payout has been submitted to OxaPay for processing.

🕐 *Time:* ${timestamp}`;

    case 'withdrawal_approval_failed':
      return `❌ *Withdrawal Approval Failed*

🏦 *Details:*
• User: \`${data.userId}\` (@${data.username})
• Amount: ${data.amount} STON (${data.tonAmount} TON)
• Wallet: \`${data.address}\`
• Error: ${data.error}

⚠️ User balance was NOT deducted.

🕐 *Time:* ${timestamp}`;

    case 'task_verification_log':
      return `🔍 *Task Verification Log*

${data.message}

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

    case 'task_status':
      return data.message || 'Task status update';

    case 'broadcast':
      return data.message || 'Broadcast message';

    case 'new_referral':
      return `🎉 *New Referral!*

Congratulations! Someone joined SkyTON using your referral link!

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
    console.log(`[BOT] Sending message to chat ${chatId}...`);
    
    if (!BOT_TOKEN) {
      console.error('[BOT] Bot token is not configured');
      return false;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[BOT] Failed to send message:', {
        status: response.status,
        statusText: response.statusText,
        error: error,
        chatId: chatId,
        messageLength: text.length
      });
      return false;
    } else {
      console.log(`[BOT] Message sent successfully to chat ${chatId}`);
      return true;
    }
  } catch (error) {
    console.error('[BOT] Error sending message:', error);
    console.error('[BOT] Chat ID:', chatId);
    console.error('[BOT] Message length:', text.length);
    return false;
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
// SIMPLIFIED NOTIFICATION SYSTEM
// =============================================================================
// Admin notifications now use webapp buttons instead of callback queries
// Removed all callback handlers - using webapp buttons instead

// =============================================================================
// EXPORT NOTIFICATION FUNCTIONS FOR EXTERNAL USE
// =============================================================================

export { notifyAdminDirect, notifyUserDirect };