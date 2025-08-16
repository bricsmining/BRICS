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

    // Generate notification message based on type
    const messageData = generateAdminMessage(type, data);
    
    if (!messageData) {
      console.error('[NOTIFICATIONS] Invalid notification type:', type);
      return res.status(400).json({ success: false, message: 'Invalid notification type.' });
    }

    console.log(`[NOTIFICATIONS] Sending notification - Type: ${type}`);
    
    // Handle both old string format and new object format with keyboards
    let messageText, options = {};
    if (typeof messageData === 'string') {
      messageText = messageData;
      console.log(`[NOTIFICATIONS] Message preview: ${messageText.substring(0, 100)}...`);
      console.log(`[NOTIFICATIONS] Message length: ${messageText.length} characters`);
    } else {
      messageText = messageData.text;
      options = messageData.keyboard ? { reply_markup: { inline_keyboard: messageData.keyboard } } : {};
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

    // Send notification to admin
    console.log(`[NOTIFICATIONS] About to send message to admin: ${adminChatId}`);
    const success = await sendTelegramMessage(adminChatId, messageText, options);
    
    if (success) {
      console.log('[NOTIFICATIONS] Admin notification sent successfully');
      return res.status(200).json({ success: true, message: 'Admin notification sent successfully.' });
    } else {
      console.error('[NOTIFICATIONS] Failed to send admin notification via Telegram API');
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to send admin notification. Check Telegram API logs for details.',
        details: {
          chatId: adminChatId,
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
${data.referrerId ? `• Referred by: \`${data.referrerId}\`` : ''}

🕐 *Time:* ${timestamp}`;

    case 'referral':
      return `💰 *New Referral!*

👥 *Referral Info:*
• Referrer: \`${data.referrerId}\` (${data.referrerName || 'Unknown'})
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
              callback_data: `approve_task_${data.taskId}_${data.userId}`
            },
            {
              text: '❌ Reject',
              callback_data: `reject_task_${data.taskId}_${data.userId}`
            }
          ],
          [
            {
              text: '📋 View Submission',
              callback_data: `view_task_${data.taskId}_${data.userId}`
            }
          ]
        ]
      };

    case 'withdrawal_request':
      const stats = data.userStats || {};
      const breakdown = stats.balanceBreakdown || {};
      
      return {
        text: `💸 *Withdrawal Request!*

👤 *User Details:*
• ID: \`${data.userId}\`
• Name: ${data.userName || 'Unknown'}
• Username: @${data.username || 'None'}
• Joined: ${stats.joinedAt || 'Unknown'}

💰 *Withdrawal Details:*
• Amount: ${data.amount || 0} STON
• Method: ${data.method || 'Unknown'}
• Address: \`${data.address || 'Not provided'}\`
• Current Balance: ${data.currentBalance || 0} STON

📊 *Balance Breakdown:*
• Task Rewards: ${breakdown.task || 0} STON
• Box Rewards: ${breakdown.box || 0} STON  
• Referral Rewards: ${breakdown.referral || 0} STON
• Mining Rewards: ${breakdown.mining || 0} STON

📈 *User Statistics:*
• Total Referrals: ${stats.totalReferrals || 0}
• Boxes Opened: ${stats.totalBoxesOpened || 0}
• Ads Watched: ${stats.totalAdsWatched || 0}
• Mining Cards: ${stats.miningCards || 0}

🔍 *Action Required: Review and Process*

🕐 *Time:* ${timestamp}`,
        keyboard: [
          [
            {
              text: '✅ Approve',
              callback_data: `approve_withdrawal_${data.withdrawalId}_${data.userId}`
            },
            {
              text: '❌ Reject',
              callback_data: `reject_withdrawal_${data.withdrawalId}_${data.userId}`
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

    case 'task_completion':
      return `✅ *Task Completed!*

👤 *User:* \`${data.userId}\` (${data.userName || 'Unknown'})
📝 *Task:* ${data.taskTitle || 'Unknown Task'}
💰 *Reward:* ${data.reward || 0} STON
📊 *Type:* ${data.taskType || 'Manual'}

🕐 *Time:* ${timestamp}`;

    case 'energy_earning':
      return `⚡ *Energy Earnings!*

👤 *User:* \`${data.userId}\` (${data.userName || 'Unknown'})
⚡ *Energy Earned:* ${data.energy || 0}
📺 *Source:* Ad Reward
💰 *STON Equivalent:* ${data.stonEquivalent || 0}

🕐 *Time:* ${timestamp}`;

    case 'box_opening':
      return `📦 *Box Opened!*

👤 *User:* \`${data.userId}\` (${data.userName || 'Unknown'})
📦 *Box Type:* ${data.boxType || 'Unknown'}
🎁 *Reward:* ${data.reward || 0} STON
📺 *Source:* ${data.source || 'Ad Reward'}

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

*Share your link:* https://t.me/${process.env.BOT_USERNAME || 'xSkyTON_Bot'}?start=refID${data.referrerId}`;

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
      parse_mode: 'Markdown',
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
