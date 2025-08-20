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

  // Check if this is a direct API call (has action parameter) - skip secret validation
  const update = req.body;
  const isDirectApiCall = update.action;
  
  // Verify webhook secret for security (only for actual Telegram webhooks, not API calls)
  if (!isDirectApiCall) {
    const providedSecret = req.headers['x-telegram-bot-api-secret-token'];
    if (WEBHOOK_SECRET) {
      if (providedSecret !== WEBHOOK_SECRET) {
        console.error('Invalid webhook secret. Expected:', WEBHOOK_SECRET, 'Got:', providedSecret);
        return res.status(401).json({ error: 'Unauthorized' });
      } else {
        console.log('[WEBHOOK] Secret token verified successfully');
      }
    } else {
      console.warn('[WEBHOOK] No webhook secret configured - allowing request without secret validation');
    }
  } else {
    console.log('[API] Direct API call detected - skipping webhook secret validation');
  }

  if (!BOT_TOKEN) {
    console.error('Bot token not configured');
    return res.status(500).json({ error: 'Bot token not configured' });
  }

  try {
    // update is already declared above
    
    // Check if this is a direct notification call (not a webhook update)
    if (update.action) {
      console.log('[BOT] Processing direct action:', update.action);
      return await handleDirectAction(req, res, update);
    }
    
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

// Handle direct action calls (for API notifications)
async function handleDirectAction(req, res, update) {
  try {
    const { action, type, userId, data } = update;
    
    switch (action) {
      case 'notify_admin':
        console.log(`[BOT] Direct admin notification - Type: ${type}`);
        const adminResult = await notifyAdminDirect(type, data);
        return res.status(200).json({ 
          success: adminResult, 
          message: adminResult ? 'Admin notification sent' : 'Failed to send admin notification' 
        });
        
      case 'notify_user':
        console.log(`[BOT] Direct user notification - UserId: ${userId}, Type: ${type}`);
        const userResult = await notifyUserDirect(userId, type, data);
        return res.status(200).json({ 
          success: userResult, 
          message: userResult ? 'User notification sent' : 'Failed to send user notification' 
        });
        
      case 'check_referral_rewards':
        console.log(`[BOT] Checking referral rewards for user: ${userId}`);
        const rewardResult = await processPendingReferralRewards(userId);
        return res.status(200).json({ 
          success: rewardResult.success,
          message: rewardResult.message,
          rewardsDistributed: rewardResult.success,
          ...rewardResult
        });
        
      default:
        console.error('[BOT] Unknown direct action:', action);
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (error) {
    console.error('[BOT] Error handling direct action:', error);
    return res.status(500).json({ error: 'Internal server error' });
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
    console.log(`[BOT] /start command with parameter: ${text}`);
    const startParam = text.split(' ')[1];
    let referrerId = null;
    
    // Extract referrer ID from different formats
    if (startParam) {
      if (startParam.startsWith('refID')) {
        // New format: refID{tgID}
        referrerId = startParam.replace('refID', '');
        console.log(`[BOT] Extracted referrerId from refID: ${referrerId}`);
      } else if (startParam.startsWith('User_')) {
        // Old format: User_{tgID}
        referrerId = startParam.replace('User_', '');
        console.log(`[BOT] Extracted referrerId from User_: ${referrerId}`);
      } else {
        // Direct ID format
        referrerId = startParam;
        console.log(`[BOT] Using direct referrerId: ${referrerId}`);
      }
    }
    
    console.log(`[BOT] Calling handleStartWithReferral: userId=${userId}, referrerId=${referrerId}`);
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
    // Check if user exists first
    const userRef = doc(db, 'users', userId.toString());
    const userDoc = await getDoc(userRef);
    const isNewUser = !userDoc.exists();

    // If user exists, just show them the app
    if (!isNewUser) {
      console.log('[BOT] User already exists, showing app only');
      await handleStart(chatId, userId, userInfo);
      return;
    }

    // PROCESS REFERRAL - CREATE PENDING REWARDS FOR NEW USERS
    const referralResult = await processReferralDirect(userId, referrerId, userInfo);
    
    if (referralResult.success) {
      console.log('[BOT] NEW USER - Referral relationship established with pending rewards');
      
      // Send admin notification about new referral (pending rewards)
      await notifyAdminDirect('referral_pending', {
        newUserId: userId,
        newUserName: userInfo.first_name || 'Unknown',
        referrerId: referrerId,
        referrerReward: referralResult.referrerReward,
        welcomeBonus: referralResult.welcomeBonus,
        reward: referralResult.referrerReward
      });
      
      // Send welcome message with referral bonus (NO URL PARAMETERS FOR WELCOME)
      const webAppUrl = WEB_APP_URL; // Clean URL without parameters
      
      // Get admin configuration for dynamic buttons
      const adminConfig = await getAdminConfig();
      const channelLink = adminConfig?.telegramChannelLink || '@xSkyTON';
      const channelUsername = channelLink.replace('@', '');
      
      await sendMessage(chatId, `🎉 <b>Welcome to SkyTON!</b>

You've been invited by a friend! 

🎁 <b>Pending Referral Rewards:</b>
⏳ ${referralResult.welcomeBonus} STON bonus for you (after completing 3 tasks)
⏳ ${referralResult.referrerReward} STON reward for your referrer (after you complete 3 tasks)
⏳ Free spin reward for referrer (after you complete 3 tasks)

✅ <b>Complete 3 tasks to unlock all rewards!</b>

Start mining and completing tasks now! 🚀`, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 Open SkyTON Mining App", web_app: { url: webAppUrl } }],
            [{ text: "📢 Join Channel", url: `https://t.me/${channelUsername}` }],
            [
              { text: "🎯 Invite Friends", callback_data: "get_referral_link" },
              { text: "❓ Help", callback_data: "show_help" }
            ]
          ]
        }
      });
      
      // Notify referrer about PENDING referral (not immediate reward)
      await sendMessage(referrerId, `👥 <b>New Referral Joined!</b>

Someone joined SkyTON through your referral link!

👤 <b>New Member:</b> ${userInfo.first_name || 'Friend'}
⏳ <b>Status:</b> Pending (needs to complete 3 tasks)

🎁 <b>Rewards when they complete 3 tasks:</b>
• ${referralResult.referrerReward} STON for you
• 1 Free Spin for you  
• ${referralResult.welcomeBonus} STON welcome bonus for them

Keep sharing to get more referrals! 🚀

<b>Share your link:</b> https://t.me/${getBotUsername()}?start=refID${referrerId}`, {
        parse_mode: 'HTML'
      });
      
    } else {
      console.log('[BOT] Referral processing failed:', referralResult.message);
      
      // Send error notification to admin
      try {
        await notifyAdminDirect('referral_error', {
          newUserId: userId,
          referrerId: referrerId,
          error: `Referral processing failed: ${referralResult.message}`,
          stack: 'No stack trace - logic error'
        });
      } catch (notifError) {
        console.error('[BOT] Failed to send error notification:', notifError);
      }
      
      await handleStart(chatId, userId, userInfo);
    }
    
  } catch (error) {
    console.error('[BOT] Error processing referral:', error);
    
    // Send error notification to admin
    try {
      await notifyAdminDirect('referral_error', {
        newUserId: userId,
        referrerId: referrerId,
        error: error.message,
        stack: error.stack
      });
    } catch (notifError) {
      console.error('[BOT] Failed to send error notification:', notifError);
    }
    
    await handleStart(chatId, userId, userInfo);
  }
}

// Handle regular /start command
async function handleStart(chatId, userId, userInfo, customMessage = null) {
  // Check if user is new or existing
  const userRef = doc(db, 'users', userId.toString());
  const userDoc = await getDoc(userRef);
  const isNewUser = !userDoc.exists();

  // Send new user notification to admin only for new users (non-referral)
  if (userInfo && isNewUser) {
    await notifyAdminDirect('new_user', {
      userId: userId,
      name: userInfo.first_name || 'Unknown',
      username: userInfo.username || null
    });

    // Mark user as welcomed in database to prevent duplicate messages
    if (isNewUser) {
      await setDoc(userRef, {
        telegramId: userId.toString(),
        username: userInfo.username || null,
        firstName: userInfo.first_name || 'Unknown',
        lastName: userInfo.last_name || '',
        hasSeenWelcome: true,
        welcomeMessageShown: true,
        lastWelcomeDate: serverTimestamp(),
        balance: 0,
        balanceBreakdown: {
          task: 0,
          box: 0,
          referral: 0,
          mining: 0
        },
        energy: 500,
        referrals: 0,
        referralHistory: [],
        referralCode: userId.toString(),
        invitedBy: null,
        completedTasks: [],
        referredUsers: [],
        isBanned: false,
        isAdmin: false,
        freeSpins: 0,
        totalSpinsEarned: 0,
        cards: 0,
        miningData: {
          lastClaimTime: null,
          miningStartTime: null,
          isActive: false,
          totalMined: 0,
        },
        joinedAt: serverTimestamp()
      });
    }
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
  const keyboard = await buildInlineKeyboard(adminConfig, false, userId); // Don't show welcome URL params

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
async function buildInlineKeyboard(adminConfig, isNewUser = false, userId = null) {
  const channelLink = adminConfig?.telegramChannelLink || '@xSkyTON';
  // Remove @ if present to get clean username
  const channelUsername = channelLink.replace('@', '');
  
  // Build webapp URL with welcome parameters for new users
  let webAppUrl = WEB_APP_URL;
  if (isNewUser && userId) {
    webAppUrl = `${WEB_APP_URL}?welcome=true&firstTime=true&userId=${encodeURIComponent(userId)}`;
  }
  
  // Build keyboard layout: Open webapp, Join channel, Invite, Help
  const keyboard = [
    // First row: Open webapp
    [{ text: "🚀 Open SkyTON", web_app: { url: webAppUrl } }],
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
  console.log(`[BOT] processReferralDirect STARTED: newUser=${newUserId}, referrer=${referrerId}`);
  
  try {
    console.log(`[BOT] Creating Firebase references...`);
    const usersRef = collection(db, 'users');
    const tasksRef = collection(db, 'tasks');

    const newUserRef = doc(usersRef, newUserId.toString());
    const referredByRef = doc(usersRef, referrerId.toString());
    const referTaskRef = doc(tasksRef, 'task_refer_friend');

    console.log(`[BOT] Fetching documents from Firebase...`);
    const [newUserSnap, referredBySnap, referTaskSnap] = await Promise.all([
      getDoc(newUserRef),
      getDoc(referredByRef),
      getDoc(referTaskRef)
    ]);

    console.log(`[BOT] Documents fetched. Referrer exists: ${referredBySnap.exists()}`);
    if (!referredBySnap.exists()) {
      console.log(`[BOT] ERROR: Referrer ${referrerId} not found in database`);
      return { success: false, message: 'Referrer not found.' };
    }

    // Get admin config for dynamic referral rewards
    const adminConfigRef = doc(db, 'admin', 'config');
    const adminConfigSnap = await getDoc(adminConfigRef);
    
    let referrerReward = 100; // Default fallback for referrer
    let welcomeBonus = 50; // Default fallback for referred user
    
    if (adminConfigSnap.exists()) {
      const adminConfig = adminConfigSnap.data();
      referrerReward = adminConfig.referralReward || 100;
      welcomeBonus = adminConfig.welcomeBonus || 50;
    } else if (referTaskSnap.exists()) {
      // Fallback to task reward if admin config doesn't exist
      referrerReward = referTaskSnap.data().reward || 100;
      welcomeBonus = 50; // Default welcome bonus
    }

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
      
      // If user doesn't have a referrer yet, update with referral info and give welcome bonus
      if (!existingUserData.invitedBy) {
        // Initialize balanceBreakdown if it doesn't exist (for existing users)
        const currentBalance = existingUserData.balance || 0;
        const currentBreakdown = existingUserData.balanceBreakdown || {
          task: currentBalance,
          box: 0,
          referral: 0,
          mining: 0
        };

        await updateDoc(newUserRef, {
          invitedBy: referrerId,
          pendingReferralReward: {
            referrerId: referrerId,
            userReward: welcomeBonus,
            referrerReward: referrerReward,
            tasksCompleted: 0,
            tasksRequired: 3,
            status: 'pending',
            createdAt: new Date()
          },
          hasSeenWelcome: true,
          welcomeMessageShown: true,
          lastWelcomeDate: serverTimestamp()
        });
        console.log(`[BOT] Updated existing user ${newUserId} with pending referral rewards (${welcomeBonus} STON after 3 tasks)`);
      }
    } else {
      // Create the new user with referral metadata but NO immediate rewards
      const defaultUser = {
        telegramId: newUserId.toString(),
        username: userInfo.username || `user_${newUserId}`,
        firstName: userInfo.first_name || '',
        lastName: userInfo.last_name || '',
        balance: 0, // No starting balance
        balanceBreakdown: {
          task: 0, // No default starting balance
          box: 0,
          referral: 0, // No referral bonus yet - will be added after 3 tasks
          mining: 0
        },
        // PENDING REFERRAL REWARD SYSTEM
        pendingReferralReward: {
          referrerId: referrerId,
          userReward: welcomeBonus,
          referrerReward: referrerReward,
          tasksCompleted: 0,
          tasksRequired: 3,
          status: 'pending',
          createdAt: new Date()
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
      
      await setDoc(newUserRef, { 
        ...defaultUser, 
        joinedAt: serverTimestamp(),
        hasSeenWelcome: true,
        welcomeMessageShown: true,
        lastWelcomeDate: serverTimestamp()
      });
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
        reward: referrerReward,
        welcomeBonus: welcomeBonus,
        referrerReward: referrerReward,
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

    // Add to pending referrals (no immediate rewards)
    console.log(`[BOT] Adding ${newUserId} to referrer ${referrerId}'s pending referrals...`);
    const referrerUpdate = {
      pendingReferrals: arrayUnion({
        userId: newUserId.toString(),
        userReward: welcomeBonus,
        referrerReward: referrerReward,
        tasksCompleted: 0,
        tasksRequired: 3,
        status: 'pending',
        createdAt: new Date()
      })
    };

    if (needsReset) {
      referrerUpdate.weeklyReferralsLastReset = new Date();
    }

    console.log(`[BOT] Updating referrer document with pending referral:`, referrerUpdate);
    await updateDoc(referredByRef, referrerUpdate);
    console.log(`[BOT] Referrer ${referrerId} updated with pending referral!`);
    console.log(`[BOT] processReferralDirect COMPLETED - REWARDS PENDING!`);

    return {
      success: true,
      message: 'Referral relationship established - rewards pending 3 task completions',
      reward: referrerReward,
      welcomeBonus: welcomeBonus,
      referrerReward: referrerReward,
      status: 'pending'
    };

  } catch (error) {
    console.error('[BOT] ERROR in processReferralDirect:', error);
    console.error('[BOT] Error stack:', error.stack);

    // Send error notification to admin
    try {
      await notifyAdminDirect('referral_error', {
        newUserId: newUserId,
        referrerId: referrerId,
        error: error.message,
        stack: error.stack
      });
    } catch (notifError) {
      console.error('[BOT] Failed to send error notification:', notifError);
    }

    return {
      success: false,
      message: 'Server error processing referral'
    };
  }
}

// Process pending referral rewards when user completes required tasks
async function processPendingReferralRewards(userId) {
  console.log(`[BOT] Checking pending referral rewards for user ${userId}`);
  
  try {
    const userRef = doc(db, 'users', userId.toString());
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      console.log(`[BOT] User ${userId} not found`);
      return { success: false, message: 'User not found' };
    }
    
    const userData = userSnap.data();
    const pendingReward = userData.pendingReferralReward;
    
    if (!pendingReward || pendingReward.status !== 'pending') {
      console.log(`[BOT] No pending referral rewards for user ${userId}`);
      return { success: false, message: 'No pending referral rewards' };
    }
    
    // Count completed tasks (excluding daily check-in)
    const userTasks = userData.tasks || {};
    const completedTasks = Object.keys(userTasks).filter(taskId => 
      userTasks[taskId] === true && taskId !== 'task_daily_checkin'
    );
    const tasksCompleted = completedTasks.length;
    
    console.log(`[BOT] User ${userId} has completed ${tasksCompleted}/${pendingReward.tasksRequired} tasks`);
    
    if (tasksCompleted >= pendingReward.tasksRequired) {
      console.log(`[BOT] User ${userId} has completed enough tasks! Distributing rewards...`);
      
      // Give rewards to the referred user
      await updateDoc(userRef, {
        balance: increment(pendingReward.userReward),
        'balanceBreakdown.referral': increment(pendingReward.userReward),
        'pendingReferralReward.status': 'completed',
        'pendingReferralReward.completedAt': new Date()
      });
      
      // Give rewards to the referrer
      const referrerRef = doc(db, 'users', pendingReward.referrerId);
      const referrerSnap = await getDoc(referrerRef);
      
      if (referrerSnap.exists()) {
        const referrerData = referrerSnap.data();
        
        // Update referrer's rewards and stats
        await updateDoc(referrerRef, {
          referrals: increment(1),
          balance: increment(pendingReward.referrerReward),
          'balanceBreakdown.referral': increment(pendingReward.referrerReward),
          referredUsers: arrayUnion(userId.toString()),
          referralHistory: arrayUnion({
            userId: userId.toString(),
            timestamp: new Date(),
            reward: pendingReward.referrerReward,
            tasksCompleted: tasksCompleted
          }),
          freeSpins: increment(1), // Give 1 free spin
          weeklyReferrals: increment(1)
        });
        
        // Update referrer's pending referrals list
        const pendingReferrals = referrerData.pendingReferrals || [];
        const updatedPendingReferrals = pendingReferrals.map(pending => 
          pending.userId === userId.toString() 
            ? { ...pending, status: 'completed', completedAt: new Date(), tasksCompleted }
            : pending
        );
        
        await updateDoc(referrerRef, {
          pendingReferrals: updatedPendingReferrals
        });
        
        console.log(`[BOT] Rewards distributed! User: +${pendingReward.userReward} STON, Referrer: +${pendingReward.referrerReward} STON + 1 spin`);
        
        // Send notifications
        await notifyAdminDirect('referral_completed', {
          userId: userId,
          referrerId: pendingReward.referrerId,
          userReward: pendingReward.userReward,
          referrerReward: pendingReward.referrerReward,
          tasksCompleted: tasksCompleted
        });
        
        // Notify the referrer about the reward
        try {
          await sendMessage(pendingReward.referrerId, `🎉 <b>Referral Reward Earned!</b>

Your referred user has completed ${tasksCompleted} tasks!

💰 <b>You earned:</b>
• ${pendingReward.referrerReward} STON
• 1 Free Spin

🎯 <b>Total Referrals:</b> ${(referrerData.referrals || 0) + 1}

Keep sharing your referral link to earn more rewards! 🚀`, {
            parse_mode: 'HTML'
          });
        } catch (error) {
          console.error('[BOT] Failed to notify referrer:', error);
        }
        
        return {
          success: true,
          message: 'Referral rewards distributed successfully',
          userReward: pendingReward.userReward,
          referrerReward: pendingReward.referrerReward,
          tasksCompleted: tasksCompleted
        };
      } else {
        console.log(`[BOT] Referrer ${pendingReward.referrerId} not found`);
        // Still give reward to user even if referrer is not found
        return {
          success: true,
          message: 'User reward given, referrer not found',
          userReward: pendingReward.userReward,
          tasksCompleted: tasksCompleted
        };
      }
    } else {
      // Update task count but don't distribute rewards yet
      await updateDoc(userRef, {
        'pendingReferralReward.tasksCompleted': tasksCompleted
      });
      
      // Also update the referrer's pending referrals list with task count
      const referrerRef = doc(db, 'users', pendingReward.referrerId);
      const referrerSnap = await getDoc(referrerRef);
      
      if (referrerSnap.exists()) {
        const referrerData = referrerSnap.data();
        const pendingReferrals = referrerData.pendingReferrals || [];
        const updatedPendingReferrals = pendingReferrals.map(pending => 
          pending.userId === userId.toString() 
            ? { ...pending, tasksCompleted: tasksCompleted }
            : pending
        );
        
        await updateDoc(referrerRef, {
          pendingReferrals: updatedPendingReferrals
        });
        
        console.log(`[BOT] Updated task count for user ${userId} in referrer ${pendingReward.referrerId}'s pending list: ${tasksCompleted}/${pendingReward.tasksRequired}`);
      }
      
      console.log(`[BOT] User ${userId} needs ${pendingReward.tasksRequired - tasksCompleted} more tasks for referral rewards`);
      return {
        success: false,
        message: `Need ${pendingReward.tasksRequired - tasksCompleted} more tasks`,
        tasksCompleted: tasksCompleted,
        tasksRequired: pendingReward.tasksRequired
      };
    }
    
  } catch (error) {
    console.error('[BOT] Error processing pending referral rewards:', error);
    return {
      success: false,
      message: 'Error processing rewards',
      error: error.message
    };
  }
}

// =============================================================================
// NOTIFICATION FUNCTIONS
// =============================================================================

// Send notification to admin
async function notifyAdminDirect(type, data) {
  try {
    console.log(`[BOT] ===== ADMIN NOTIFICATION START =====`);
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
      options = { parse_mode: 'HTML' }; // Changed to HTML
      console.log(`[BOT] Message preview: ${messageText.substring(0, 100)}...`);
    } else {
      messageText = messageData.text;
      options = { 
        parse_mode: 'HTML', // Changed to HTML
        reply_markup: messageData.keyboard ? { inline_keyboard: messageData.keyboard } : undefined
      };
      console.log(`[BOT] Message preview: ${messageText.substring(0, 100)}...`);
      console.log(`[BOT] Keyboard buttons: ${messageData.keyboard ? messageData.keyboard.length : 0} rows`);
    }
    
    await sendMessage(adminChatId, messageText, options);
    console.log('[BOT] Admin notification sent successfully');
    console.log(`[BOT] ===== ADMIN NOTIFICATION END =====`);
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
    console.log(`[BOT] ===== USER NOTIFICATION START =====`);
    console.log(`[BOT] Sending user notification - UserId: ${userId}, Type: ${type}, Data:`, data);
    
    const message = generateUserMessage(type, data);
    if (!message) {
      console.log('[BOT] Invalid user notification type:', type);
      return false;
    }

    console.log(`[BOT] Generated message: ${message.substring(0, 100)}...`);
    await sendMessage(userId, message, { parse_mode: 'HTML' });
    console.log('[BOT] User notification sent successfully');
    console.log(`[BOT] ===== USER NOTIFICATION END =====`);
    return true;

  } catch (error) {
    console.error('[BOT] Error sending user notification:', error);
    console.error('[BOT] Stack trace:', error.stack);
    return false;
  }
}

// Generate admin notification messages
function generateAdminMessage(type, data) {
  const timestamp = new Date().toLocaleString();
  
  switch (type) {
    case 'new_user':
      return `🎉 <b>New User Joined!</b>

👤 <b>User Info:</b>
• ID: <code>${data.userId}</code>
• Name: ${data.name || 'Unknown'}
• Username: @${data.username || 'None'}

🕐 <b>Time:</b> ${timestamp}`;

    case 'referral':
      return `💰 <b>New Referral!</b>

👥 <b>Referral Info:</b>
• Referrer: <code>${data.referrerId}</code>
• New User: <code>${data.newUserId}</code> (${data.newUserName || 'Unknown'})
• Referrer Reward: ${data.referrerReward || data.reward || 0} STON + 1 Free Spin
• Welcome Bonus: ${data.welcomeBonus || 0} STON to new user

🕐 <b>Time:</b> ${timestamp}`;

    case 'referral_pending':
      return `⏳ <b>New Referral (Pending)</b>

👥 <b>Referral Info:</b>
• Referrer: <code>${data.referrerId}</code>
• New User: <code>${data.newUserId}</code> (${data.newUserName || 'Unknown'})
• Status: <b>Pending - Requires 3 task completions</b>
• Pending Referrer Reward: ${data.referrerReward || data.reward || 0} STON + 1 Free Spin
• Pending Welcome Bonus: ${data.welcomeBonus || 0} STON

🕐 <b>Time:</b> ${timestamp}`;

    case 'referral_completed':
      return `🎉 <b>Referral Rewards Distributed!</b>

👥 <b>Referral Info:</b>
• Referrer: <code>${data.referrerId}</code>
• New User: <code>${data.userId}</code>
• Tasks Completed: ${data.tasksCompleted}/3 ✅
• Referrer Reward: ${data.referrerReward || 0} STON + 1 Free Spin
• User Reward: ${data.userReward || 0} STON

🕐 <b>Time:</b> ${timestamp}`;

    case 'referral_error':
      return `❌ <b>Referral Error!</b>

🚨 <b>Error Info:</b>
• Failed User: <code>${data.newUserId || 'Unknown'}</code>
• Attempted Referrer: <code>${data.referrerId || 'Unknown'}</code>
• Error: ${data.error || 'Unknown error'}
• Stack: <code>${data.stack || 'No stack trace'}</code>

🕐 <b>Time:</b> ${timestamp}`;

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
      return `✅ <b>Task Completed!</b>

👤 <b>User Details:</b>
• ID: <code>${data.userId}</code>
• Name: ${data.userName || 'Unknown'}
• Username: @${data.username || 'None'}

📝 <b>Task Details:</b>
• Title: ${data.taskTitle || 'Unknown Task'}
• Type: ${data.taskType || 'Auto Task'}
• Reward: ${data.reward || 0} STON
• Completion Method: ${data.completionMethod || 'Auto'}

🎉 User has successfully completed a task and earned rewards!

🕐 <b>Time:</b> ${timestamp}`;

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

    case 'payout_success':
      return `✅ *Payout Successful!*

👤 *User Details:*
• ID: \`${data.userId}\`
• Name: ${data.username || 'Unknown'}

💰 *Payout Details:*
• Amount: ${data.amount} STON (${data.tonAmount} TON)
• Address: \`${data.address}\`
${data.memo ? `• Memo: \`${data.memo}\`` : ''}
• Track ID: \`${data.trackId}\`
• Status: ${data.status}
• Withdrawal ID: \`${data.withdrawalId}\`

🎉 Payout has been successfully processed through OxaPay!

🕐 *Time:* ${timestamp}`;

    case 'payout_failed':
      let failedMessage = `❌ <b>Payout Failed!</b>

👤 <b>User Details:</b>
• ID: <code>${data.userId}</code>
• Name: ${data.username || 'Unknown'}

💰 <b>Payout Details:</b>
• Amount: ${data.amount} STON (${data.tonAmount} TON)
• Address: <code>${data.address}</code>
${data.memo ? `• Memo: <code>${data.memo}</code>` : ''}
• Withdrawal ID: <code>${data.withdrawalId}</code>

❗ <b>Error Details:</b>
• Error: ${data.error}
• Details: ${data.errorDetails}`;

      // Add detailed OxaPay error information if available
      if (data.oxapayDetails?.error) {
        const oxError = data.oxapayDetails.error;
        failedMessage += `

🚨 <b>OxaPay API Error:</b>
• Type: <code>${oxError.type || 'Unknown'}</code>
• Key: <code>${oxError.key || 'Unknown'}</code>
• Message: ${oxError.message || 'No message'}`;

        if (oxError.key === 'amount_exceeds_balance') {
          failedMessage += `
💡 <b>Solution:</b> Check OxaPay wallet balance and fund if necessary.`;
        } else if (oxError.key === 'invalid_address') {
          failedMessage += `
💡 <b>Solution:</b> Verify the recipient wallet address format.`;
        } else if (oxError.key === 'invalid_amount') {
          failedMessage += `
💡 <b>Solution:</b> Check the withdrawal amount and limits.`;
        }
      }

      failedMessage += `

⚠️ User's balance was NOT deducted. Manual intervention may be required.

🕐 <b>Time:</b> ${timestamp}`;

      return failedMessage;

    default:
      return null;
  }
}

// Generate user notification messages
function generateUserMessage(type, data) {
  switch (type) {
    case 'task_approved':
      return `✅ <b>Task Approved!</b>

Your task submission has been approved!

📝 <b>Task:</b> ${data.taskTitle || 'Unknown Task'}
💰 <b>Reward:</b> ${data.reward || 0} STON added to your balance
🎉 <b>Status:</b> Completed

Keep completing tasks to earn more STON! 🚀`;

    case 'task_rejected':
      return `❌ <b>Task Rejected</b>

Your task submission has been rejected.

📝 <b>Task:</b> ${data.taskTitle || 'Unknown Task'}
📝 <b>Reason:</b> ${data.reason || 'Requirements not met'}

Please try again following the task requirements. 🔄`;

    case 'withdrawal_approved':
      return `✅ <b>Withdrawal Approved!</b>

Your withdrawal request has been approved!

💰 <b>Amount:</b> ${data.amount || 0} STON
💳 <b>Method:</b> ${data.method || 'Unknown'}
📍 <b>Address:</b> <code>${data.address || 'Not provided'}</code>
⏱️ <b>Processing Time:</b> 24-48 hours

Your tokens will be transferred soon! 🚀`;

    case 'withdrawal_rejected':
      return `❌ <b>Withdrawal Rejected</b>

Your withdrawal request has been rejected.

💰 <b>Amount:</b> ${data.amount || 0} STON
📝 <b>Reason:</b> ${data.reason || 'Invalid request'}

Your STON balance has been restored. Please try again. 🔄`;

    case 'successful_referral':
      return `🎉 <b>Successful Referral!</b>

Your friend joined SkyTON through your referral link!

👥 <b>New Member:</b> ${data.newUserName || 'Friend'}
💰 <b>Your Reward:</b> ${data.reward || 0} STON
🎰 <b>Bonus:</b> 1 Free Spin added
🎁 <b>Their Welcome:</b> ${data.welcomeBonus || 0} STON bonus

Keep sharing to earn more rewards! 🚀

<b>Share your link:</b> https://t.me/${getBotUsername()}?start=refID${data.referrerId}`;

    case 'task_status':
      return data.message || 'Task status update';

    case 'broadcast':
      return data.message || 'Broadcast message';

    case 'new_referral':
      return `🎉 <b>New Referral!</b>

Congratulations! Someone joined SkyTON using your referral link!

👥 <b>New Member:</b> ${data.newUserName || 'Friend'}
💰 <b>Your Reward:</b> ${data.reward || 0} STON
🎰 <b>Bonus:</b> 1 Free Spin added

Keep sharing to earn more rewards! 🚀

<b>Share your link:</b> https://t.me/${getBotUsername()}?start=refID${data.referrerId}`;

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