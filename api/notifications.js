/**
 * Telegram Notification API
 * Handles sending notifications to admin and users via Telegram bot
 */

import { db } from '../src/lib/serverFirebase.js';
import { 
  collection, 
  doc,
  getDoc
} from 'firebase/firestore';

const BOT_TOKEN = process.env.TG_BOT_TOKEN;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.query;
  
  try {
    switch (action) {
      case 'admin':
        return await handleAdminNotification(req, res);
      
      case 'user':
        return await handleUserNotification(req, res);
      
      default:
        return res.status(400).json({ 
          error: 'Invalid action parameter',
          availableActions: ['admin', 'user']
        });
    }
  } catch (error) {
    console.error('Notification error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}

// Send notification to admin
async function handleAdminNotification(req, res) {
  console.log('[NOTIFICATIONS] handleAdminNotification called');
  console.log('[NOTIFICATIONS] Request body:', JSON.stringify(req.body, null, 2));
  
  const { api, type, data } = req.body;

  console.log('[NOTIFICATIONS] Extracted type:', type);
  console.log('[NOTIFICATIONS] Extracted data:', JSON.stringify(data, null, 2));

  // Verify API key (check both possible environment variables)
  const validApiKey = process.env.ADMIN_API_KEY || process.env.VITE_ADMIN_API_KEY;
  console.log('[NOTIFICATIONS] API key provided:', api ? 'Yes' : 'No');
  console.log('[NOTIFICATIONS] Expected API key:', validApiKey ? 'Configured' : 'Not configured');
  
  if (!api || api !== validApiKey) {
    console.error('[NOTIFICATIONS] API key validation failed');
    console.error('[NOTIFICATIONS] Provided:', api);
    console.error('[NOTIFICATIONS] Expected:', validApiKey);
    return res.status(403).json({ success: false, message: 'Invalid API key.' });
  }
  
  console.log('[NOTIFICATIONS] API key validation passed');

  if (!BOT_TOKEN) {
    return res.status(500).json({ success: false, message: 'Bot token not configured.' });
  }

  try {
    // Get admin chat ID from Firebase
    const adminConfigRef = doc(db, 'admin', 'config');
    const adminConfigSnap = await getDoc(adminConfigRef);
    
    if (!adminConfigSnap.exists()) {
      return res.status(404).json({ success: false, message: 'Admin config not found.' });
    }

    const adminConfig = adminConfigSnap.data();
    const adminChatId = adminConfig.adminChatId;

    console.log('[NOTIFICATIONS] Admin config:', {
      hasAdminChatId: !!adminChatId,
      adminChatId: adminChatId ? `${adminChatId.substring(0, 3)}***` : 'Not set'
    });

    if (!adminChatId) {
      console.error('[NOTIFICATIONS] Admin chat ID not configured in Firebase');
      return res.status(400).json({ 
        success: false, 
        message: 'Admin chat ID not configured. Please set your Telegram chat ID in Admin Settings.',
        setupRequired: true,
        instructions: [
          '1. Open Telegram and start a chat with @userinfobot',
          '2. Send /start to get your chat ID',
          '3. Go to Admin Settings and enter your chat ID',
          '4. Save the configuration'
        ]
      });
    }

    // Determine notification routing
    const routing = getNotificationTarget(type, adminConfig);
    console.log(`[NOTIFICATIONS] Routing for type '${type}':`, routing);
    
    // Generate notification message based on type
    const messageData = generateNotificationMessage(type, data);
    
    if (!messageData) {
      console.error('[NOTIFICATIONS] Invalid notification type:', type);
      return res.status(400).json({ success: false, message: 'Invalid notification type.' });
    }

    console.log(`[NOTIFICATIONS] Sending notification - Type: ${type}`);
    
    // Handle both old string format and new object format with keyboards
    let messageText, options = { parse_mode: 'HTML' }; // Always use HTML parse mode
    if (typeof messageData === 'string') {
      messageText = messageData;
      console.log(`[NOTIFICATIONS] Message preview: ${messageText.substring(0, 100)}...`);
      console.log(`[NOTIFICATIONS] Message length: ${messageText.length} characters`);
    } else {
      messageText = messageData.text;
      options.reply_markup = messageData.keyboard ? { inline_keyboard: messageData.keyboard } : undefined;
      console.log(`[NOTIFICATIONS] Message preview: ${messageText.substring(0, 100)}...`);
      console.log(`[NOTIFICATIONS] Message length: ${messageText.length} characters`);
      console.log(`[NOTIFICATIONS] Keyboard buttons: ${messageData.keyboard ? messageData.keyboard.length : 0} rows`);
      
      // Check callback data lengths
      if (messageData.keyboard) {
        messageData.keyboard.forEach((row, i) => {
          row.forEach((button, j) => {
            console.log(`[NOTIFICATIONS] Button [${i}][${j}]: "${button.text}" - callback_data length: ${button.callback_data?.length || 0}`);
            if (button.callback_data && button.callback_data.length > 64) {
              console.error(`[NOTIFICATIONS] Callback data too long: ${button.callback_data}`);
            }
          });
        });
      }
    }

    // Send notifications based on routing
    let channelSuccess = false;
    let adminSuccess = false;
    
    // Send to channel if configured
    if (routing.target !== 'admin') {
      console.log(`[NOTIFICATIONS] Sending to channel: ${routing.target}`);
      channelSuccess = await sendTelegramMessage(routing.target, messageText, options);
      console.log(`[NOTIFICATIONS] Channel notification result: ${channelSuccess}`);
    }
    
    // Send to admin if required
    if (routing.sendToAdmin) {
      console.log(`[NOTIFICATIONS] Sending to admin: ${adminChatId}`);
      adminSuccess = await sendTelegramMessage(adminChatId, messageText, options);
      console.log(`[NOTIFICATIONS] Admin notification result: ${adminSuccess}`);
    }
    
    // Determine overall success
    const overallSuccess = routing.target === 'admin' ? adminSuccess : 
                          (routing.sendToAdmin ? (channelSuccess && adminSuccess) : channelSuccess);
    
    if (overallSuccess) {
      console.log('[NOTIFICATIONS] Notification(s) sent successfully');
      return res.status(200).json({ 
        success: true, 
        message: 'Notification sent successfully.',
        details: {
          sentToChannel: routing.target !== 'admin' ? routing.target : null,
          sentToAdmin: routing.sendToAdmin,
          channelSuccess: routing.target !== 'admin' ? channelSuccess : null,
          adminSuccess: routing.sendToAdmin ? adminSuccess : null
        }
      });
    } else {
      console.error('[NOTIFICATIONS] Failed to send notification');
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send notification. Check Telegram API logs for details.',
        details: {
          target: routing.target,
          sendToAdmin: routing.sendToAdmin,
          channelSuccess: routing.target !== 'admin' ? channelSuccess : null,
          adminSuccess: routing.sendToAdmin ? adminSuccess : null,
          messageLength: messageText.length,
          hasKeyboard: !!options.reply_markup
        }
      });
    }

  } catch (error) {
    console.error('Admin notification error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// Send notification to user
async function handleUserNotification(req, res) {
  console.log('[USER NOTIFICATIONS] handleUserNotification called');
  console.log('[USER NOTIFICATIONS] Request body:', JSON.stringify(req.body, null, 2));
  
  const { api, userId, type, data } = req.body;

  // Verify API key (check both possible environment variables)
  const validApiKey = process.env.ADMIN_API_KEY || process.env.VITE_ADMIN_API_KEY;
  console.log('[USER NOTIFICATIONS] API key provided:', api ? 'Yes' : 'No');
  console.log('[USER NOTIFICATIONS] Expected API key:', validApiKey ? 'Configured' : 'Not configured');
  
  if (!api || api !== validApiKey) {
    console.error('[USER NOTIFICATIONS] API key validation failed');
    return res.status(403).json({ success: false, message: 'Invalid API key.' });
  }

  if (!BOT_TOKEN) {
    return res.status(500).json({ success: false, message: 'Bot token not configured.' });
  }

  if (!userId) {
    return res.status(400).json({ success: false, message: 'User ID required.' });
  }

  try {
    // Generate notification message based on type
    const message = generateUserMessage(type, data);
    
    if (!message) {
      return res.status(400).json({ success: false, message: 'Invalid notification type.' });
    }

    // Send notification to user
    const success = await sendTelegramMessage(userId, message);
    
    if (success) {
      return res.status(200).json({ success: true, message: 'User notification sent successfully.' });
    } else {
      return res.status(500).json({ success: false, message: 'Failed to send user notification.' });
    }

  } catch (error) {
    console.error('User notification error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// Determine notification routing
function getNotificationTarget(type, adminConfig) {
  // Define notification categories
  const generalNotifications = [
    'new_user', 'referral', 'referral_pending', 'referral_completed', 
    'energy_earned', 'mystery_box_earned', 'mystery_box_opened', 
    'task_completion', 'task_submission', 'game_reward'
  ];
  
  const withdrawalNotifications = [
    'withdrawal_request', 'withdrawal_approved', 'withdrawal_rejected'
  ];
  
  const paymentNotifications = [
    'card_purchase', 'payment_confirmed', 'payment_failed'
  ];
  
  // Route to appropriate channel or admin
  if (generalNotifications.includes(type) && adminConfig?.generalNotificationChannel) {
    return { target: adminConfig.generalNotificationChannel, sendToAdmin: false };
  } else if (withdrawalNotifications.includes(type)) {
    if (adminConfig?.withdrawalNotificationChannel) {
      return { target: adminConfig.withdrawalNotificationChannel, sendToAdmin: true }; // Also send to admin for important notifications
    }
  } else if (paymentNotifications.includes(type)) {
    if (adminConfig?.paymentNotificationChannel) {
      return { target: adminConfig.paymentNotificationChannel, sendToAdmin: true }; // Also send to admin for important notifications
    }
  }
  
  // Default to admin if no channel configured
  return { target: 'admin', sendToAdmin: true };
}

// Generate notification messages (using HTML parse mode consistently)
function generateNotificationMessage(type, data) {
  const timestamp = new Date().toLocaleString();
  
  switch (type) {
    case 'new_user':
      return `🎉 <b>New User Joined!</b>

👤 <b>User Info:</b>
• ID: <code>${data.userId}</code>
• Name: ${data.name || 'Unknown'}
• Username: @${data.username || 'None'}
${data.referrerId ? `• Referred by: <code>${data.referrerId}</code>` : ''}
${data.totalUsers ? `• Total Users: <b>${data.totalUsers.toLocaleString()}</b>` : ''}

🕐 <b>Time:</b> ${timestamp}`;

    case 'referral':
      return `💰 <b>New Referral!</b>

👥 <b>Referral Info:</b>
• Referrer: <code>${data.referrerId}</code> (${data.referrerName || 'Unknown'})
• New User: <code>${data.newUserId}</code> (${data.newUserName || 'Unknown'})
• Reward: ${data.reward || 0} STON + 1 Free Spin

🕐 <b>Time:</b> ${timestamp}`;

    case 'referral_pending':
      return `⏳ <b>Referral Pending!</b>

👥 <b>Referral Info:</b>
• Referrer: <code>${data.referrerId}</code> (${data.referrerName || 'Unknown'})
• New User: <code>${data.newUserId}</code> (${data.newUserName || 'Unknown'})
• Status: <b>Pending</b> (${data.tasksCompleted || 0}/${data.tasksRequired || 3} tasks completed)
• Potential Reward: ${data.userReward || 0} + ${data.referrerReward || 0} STON

🕐 <b>Time:</b> ${timestamp}`;

    case 'referral_completed':
      return `✅ <b>Referral Completed!</b>

👥 <b>Referral Info:</b>
• Referrer: <code>${data.referrerId}</code> (${data.referrerName || 'Unknown'})
• User: <code>${data.userId}</code> (${data.userName || 'Unknown'})
• Tasks Completed: <b>${data.tasksCompleted}/${data.tasksRequired}</b>
• Rewards Distributed: ${data.userReward || 0} + ${data.referrerReward || 0} STON

🕐 <b>Time:</b> ${timestamp}`;

    case 'energy_earned':
      return `⚡ <b>Energy Earned!</b>

👤 <b>User:</b> <code>${data.userId}</code> (${data.userName || 'Unknown'})
• Energy Gained: <b>+${data.energyGained || 0}</b>
• New Energy: <b>${data.newEnergy || 0}</b>
• Source: ${data.source || 'Ad Reward'}
• Daily Usage: ${data.dailyUsed || 0}/${data.dailyLimit || 10}
• Hourly Usage: ${data.hourlyUsed || 0}/${data.hourlyLimit || 3}

🕐 <b>Time:</b> ${timestamp}`;

    case 'mystery_box_earned':
      return `🎁 <b>Mystery Box Earned!</b>

👤 <b>User:</b> <code>${data.userId}</code> (${data.userName || 'Unknown'})
• Boxes Gained: <b>+${data.boxesGained || 0}</b>
• Total Boxes: <b>${data.newBoxCount || 0}</b>
• Source: ${data.source || 'Ad Reward'}
• Daily Usage: ${data.dailyUsed || 0}/${data.dailyLimit || 10}
• Hourly Usage: ${data.hourlyUsed || 0}/${data.hourlyLimit || 3}

🕐 <b>Time:</b> ${timestamp}`;

    case 'mystery_box_opened':
      return `🎉 <b>Mystery Box Opened!</b>

👤 <b>User:</b> <code>${data.userId}</code> (${data.userName || 'Unknown'})
• Reward: <b>+${data.reward || 0} STON</b>
• Balance Type: ${data.balanceType || 'Box (Withdrawal Only)'}
• Boxes Remaining: <b>${data.boxesRemaining || 0}</b>

🕐 <b>Time:</b> ${timestamp}`;

    case 'task_submission':
      return {
        text: `📋 <b>Task Submission!</b>

👤 <b>User Details:</b>
• ID: <code>${data.userId}</code>
• Name: ${data.userName || 'Unknown'}
• Username: @${data.username || 'None'}

📝 <b>Task Details:</b>
• Title: ${data.taskTitle || 'Unknown Task'}
• Type: ${data.taskType || 'Manual Task'}
• Reward: ${data.reward || 0} STON
• Target: ${data.target || 'N/A'}
• Submission: ${data.submission || 'No submission provided'}

🔍 <b>Action Required: Review and Process in Admin Panel</b>

🕐 <b>Time:</b> ${timestamp}`,
        keyboard: [
          [
            {
              text: '🎛️ Open Admin Panel',
              web_app: { url: `${process.env.NEXTAUTH_URL || 'https://skyton.vercel.app'}/admin` }
            }
          ]
        ]
      };

    case 'withdrawal_request':
      const stats = data.userStats || {};
      const breakdown = stats.balanceBreakdown || {};
      
      return {
        text: `💸 <b>Withdrawal Request!</b>

👤 <b>User Details:</b>
• ID: <code>${data.userId}</code>
• Name: ${data.userName || 'Unknown'}
• Username: @${data.username || 'None'}
• Joined: ${stats.joinedAt || 'Unknown'}

💰 <b>Withdrawal Details:</b>
• Amount: ${data.amount || 0} STON
• Method: ${data.method || 'Unknown'}
• Address: <code>${data.address || 'Not provided'}</code>
• Current Balance: ${data.currentBalance || 0} STON

📊 <b>Balance Breakdown:</b>
• Task Rewards: ${breakdown.task || 0} STON
• Box Rewards: ${breakdown.box || 0} STON  
• Referral Rewards: ${breakdown.referral || 0} STON
• Mining Rewards: ${breakdown.mining || 0} STON

📈 <b>User Statistics:</b>
• Total Referrals: ${stats.totalReferrals || 0}
• Boxes Opened: ${stats.totalBoxesOpened || 0}
• Ads Watched: ${stats.totalAdsWatched || 0}
• Mining Cards: ${stats.miningCards || 0}

🔍 <b>Action Required: Review and Process in Admin Panel</b>

🕐 <b>Time:</b> ${timestamp}`,
        keyboard: [
          [
            {
              text: '🎛️ Open Admin Panel',
              web_app: { url: `${process.env.NEXTAUTH_URL || 'https://skyton.vercel.app'}/admin` }
            }
          ]
        ]
      };

    case 'task_completion':
      return `✅ <b>Task Completed!</b>

👤 <b>User:</b> <code>${data.userId}</code> (${data.userName || 'Unknown'})
📝 <b>Task:</b> ${data.taskTitle || 'Unknown Task'}
💰 <b>Reward:</b> ${data.reward || 0} STON
📊 <b>Type:</b> ${data.taskType || 'Manual'}

🕐 <b>Time:</b> ${timestamp}`;

    case 'energy_earning':
      return `⚡ <b>Energy Earnings!</b>

👤 <b>User:</b> <code>${data.userId}</code> (${data.userName || 'Unknown'})
⚡ <b>Energy Earned:</b> ${data.energy || 0}
📺 <b>Source:</b> Ad Reward
💰 <b>STON Equivalent:</b> ${data.stonEquivalent || 0}

🕐 <b>Time:</b> ${timestamp}`;

    case 'box_opening':
      return `📦 <b>Box Opened!</b>

👤 <b>User:</b> <code>${data.userId}</code> (${data.userName || 'Unknown'})
📦 <b>Box Type:</b> ${data.boxType || 'Unknown'}
🎁 <b>Reward:</b> ${data.reward || 0} STON
📺 <b>Source:</b> ${data.source || 'Ad Reward'}

🕐 <b>Time:</b> ${timestamp}`;

    case 'user_level_achieve':
      return `🆙 <b>User Level Achievement!</b>

👤 <b>User Details:</b>
• ID: <code>${data.userId}</code>
• Name: ${data.userName || 'Unknown'}
• Username: @${data.username || 'None'}

🎉 <b>Achievement Details:</b>
• New Level: ${data.newLevel || 1}
• Previous Level: ${data.previousLevel || 0}
• Total STON Earned: ${data.totalEarned || 0}
• Level Bonus: ${data.levelBonus || 0} STON

🎊 User has leveled up and earned bonus rewards!

🕐 <b>Time:</b> ${timestamp}`;

    case 'game_reward':
      return `🎮 <b>Game Reward!</b>

👤 <b>User:</b> <code>${data.userId}</code> (${data.userName || 'Unknown'})
🎯 <b>Game:</b> ${data.gameType || 'Unknown'}
🎁 <b>Reward:</b> ${data.reward || 0} STON
${data.multiplier ? `✨ <b>Multiplier:</b> ${data.multiplier}` : ''}

🕐 <b>Time:</b> ${timestamp}`;

    case 'wallet_connect':
      return `🔗 <b>Wallet Connected!</b>

👤 <b>User Details:</b>
• ID: <code>${data.userId}</code>
• Name: ${data.userName || 'Unknown'}
• Username: @${data.username || 'None'}

💳 <b>Wallet Details:</b>
• Wallet Address: <code>${data.walletAddress || 'Not provided'}</code>
• Wallet Type: ${data.walletType || 'TON Wallet'}
• Connection Method: ${data.connectionMethod || 'Manual'}

🔐 User has successfully connected their wallet for withdrawals!

🕐 <b>Time:</b> ${timestamp}`;

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

Keep sharing to earn more rewards! 🚀

<b>Share your link:</b> https://t.me/${process.env.BOT_USERNAME || 'xSkyTON_Bot'}?start=refID${data.referrerId}`;

    default:
      return null;
  }
}

// Send Telegram message
async function sendTelegramMessage(chatId, message, options = {}) {
  try {
    console.log('[TELEGRAM] Sending message to chat:', chatId);
    console.log('[TELEGRAM] Message length:', message.length);
    console.log('[TELEGRAM] Options:', JSON.stringify(options, null, 2));
    
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    
    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      ...options
    };
    
    console.log('[TELEGRAM] Payload:', JSON.stringify(payload, null, 2));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log('[TELEGRAM] Response status:', response.status);
    console.log('[TELEGRAM] Response result:', JSON.stringify(result, null, 2));
    
    if (result.ok) {
      console.log('[TELEGRAM] Message sent successfully');
      return true;
    } else {
      console.error('[TELEGRAM] Failed to send message:', result.description || result.error_code);
      
      // If markdown parsing failed, try without markdown
      if (result.error_code === 400 && result.description?.includes('parse')) {
        console.log('[TELEGRAM] Retrying without markdown...');
        const fallbackPayload = {
          chat_id: chatId,
          text: message,
          ...options
        };
        
        const fallbackResponse = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fallbackPayload)
        });
        
        const fallbackResult = await fallbackResponse.json();
        console.log('[TELEGRAM] Fallback result:', JSON.stringify(fallbackResult, null, 2));
        
        return fallbackResult.ok;
      }
      
      return false;
    }
  } catch (error) {
    console.error('[TELEGRAM] Error sending Telegram message:', error);
    return false;
  }
}
