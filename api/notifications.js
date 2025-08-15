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
  const { api, type, data } = req.body;

  // Verify API key
  if (!api || api !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ success: false, message: 'Invalid API key.' });
  }

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
      return res.status(400).json({ success: false, message: 'Admin chat ID not configured.' });
    }

    // Generate notification message based on type
    const message = generateAdminMessage(type, data);
    
    if (!message) {
      console.error('[NOTIFICATIONS] Invalid notification type:', type);
      return res.status(400).json({ success: false, message: 'Invalid notification type.' });
    }

    console.log(`[NOTIFICATIONS] Sending notification - Type: ${type}`);
    console.log(`[NOTIFICATIONS] Message preview: ${message.substring(0, 100)}...`);

    // Send notification to admin
    const success = await sendTelegramMessage(adminChatId, message);
    
    if (success) {
      return res.status(200).json({ success: true, message: 'Admin notification sent successfully.' });
    } else {
      return res.status(500).json({ success: false, message: 'Failed to send admin notification.' });
    }

  } catch (error) {
    console.error('Admin notification error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// Send notification to user
async function handleUserNotification(req, res) {
  const { api, userId, type, data } = req.body;

  // Verify API key
  if (!api || api !== process.env.ADMIN_API_KEY) {
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
      return `🎯 *Level Achievement!*

👤 *User:* \`${data.userId}\` (${data.userName || 'Unknown'})
📈 *New Level:* ${data.level || 0}
⭐ *Previous Level:* ${data.previousLevel || 0}
💰 *Total Balance:* ${data.totalBalance || 0} STON

🕐 *Time:* ${timestamp}`;

    case 'wallet_connect':
      return `🔗 *Wallet Connected!*

👤 *User:* \`${data.userId}\` (${data.userName || 'Unknown'})
💳 *Wallet Address:* \`${data.walletAddress || 'Unknown'}\`
🔗 *Wallet Type:* ${data.walletType || 'TON Wallet'}

🕐 *Time:* ${timestamp}`;

    case 'card_purchase':
      return `💳 *Card Purchase!*

👤 *User:* \`${data.userId}\` (${data.userName || 'Unknown'})
🃏 *Card:* ${data.cardName || 'Unknown Card'}
💰 *Payment Method:* ${data.paymentMethod || 'Unknown'}
💵 *Amount:* ${data.amount || 0} ${data.currency || 'TON'}
⚡ *Mining Rate:* ${data.miningRate || 0} STON/hour

🕐 *Time:* ${timestamp}`;

    case 'webapp_error':
      return `🚨 *WebApp Error!*

👤 *User:* \`${data.userId}\` (${data.userName || 'Unknown'})
❌ *Error Type:* ${data.errorType || 'Unknown'}
📝 *Error Message:* ${data.errorMessage || 'No details'}
📍 *Location:* ${data.location || 'Unknown'}
🌐 *User Agent:* ${data.userAgent || 'Unknown'}

🕐 *Time:* ${timestamp}`;

    case 'payment_status':
      return `💳 *Payment Status Update!*

👤 *User:* \`${data.userId}\` (${data.userName || 'Unknown'})
💰 *Amount:* ${data.amount || 0} ${data.currency || 'TON'}
📊 *Status:* ${data.status || 'Unknown'}
🔗 *Transaction ID:* \`${data.transactionId || 'N/A'}\`
💳 *Payment Method:* ${data.paymentMethod || 'Unknown'}

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

    case 'broadcast':
      return data.message || 'Broadcast message from admin';

    default:
      return null;
  }
}

// Send Telegram message
async function sendTelegramMessage(chatId, message) {
  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const result = await response.json();
    return result.ok;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}
