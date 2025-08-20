/**
 * Bot Notification Utilities
 * Send notifications through Telegram bot from webapp/API
 */

const BOT_TOKEN = import.meta.env.VITE_TG_BOT_TOKEN;

// Send message through Telegram bot
async function sendTelegramMessage(chatId, text, options = {}) {
  if (!BOT_TOKEN) {
    console.error('[NOTIFICATIONS] Bot token not configured');
    return false;
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  const payload = {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown',
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
      console.error('[NOTIFICATIONS] Failed to send message:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[NOTIFICATIONS] Error sending message:', error);
    return false;
  }
}

// Get admin chat ID from Firebase
async function getAdminChatId() {
  try {
    // This will be called from client-side, so we use fetch to get admin info
    const response = await fetch('/api/admin?action=get-config');
    if (!response.ok) return null;
    
    const config = await response.json();
    return config.telegramChatId || null;
  } catch (error) {
    console.error('[NOTIFICATIONS] Error getting admin chat ID:', error);
    return null;
  }
}

// Send notification to admin
export async function notifyAdmin(type, data) {
  try {
    const adminChatId = await getAdminChatId();
    if (!adminChatId) {
      console.log('[NOTIFICATIONS] Admin chat ID not configured');
      return false;
    }

    const message = generateAdminMessage(type, data);
    if (!message) {
      console.log('[NOTIFICATIONS] Invalid notification type:', type);
      return false;
    }

    return await sendTelegramMessage(adminChatId, message);
  } catch (error) {
    console.error('[NOTIFICATIONS] Error sending admin notification:', error);
    return false;
  }
}

// Send notification to user
export async function notifyUser(userId, type, data) {
  try {
    const message = generateUserMessage(type, data);
    if (!message) {
      console.log('[NOTIFICATIONS] Invalid user notification type:', type);
      return false;
    }

    return await sendTelegramMessage(userId, message);
  } catch (error) {
    console.error('[NOTIFICATIONS] Error sending user notification:', error);
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
${data.referrerId ? `• Referred by: \`${data.referrerId}\`` : ''}

🕐 <b>Time:</b> ${timestamp}`;

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

    case 'game_reward':
      return `🎮 <b>Game Reward!</b>

👤 <b>User:</b> <code>${data.userId}</code> (${data.userName || 'Unknown'})
🎯 <b>Game:</b> ${data.gameType || 'Unknown'}
🎁 <b>Reward:</b> ${data.reward || 0} STON
${data.multiplier ? `✨ <b>Multiplier:</b> ${data.multiplier}x` : ''}

🕐 <b>Time:</b> ${timestamp}`;

    case 'withdrawal_request':
      return `💸 <b>Withdrawal Request!</b>

👤 <b>User:</b> <code>${data.userId}</code> (${data.userName || 'Unknown'})
💰 <b>Amount:</b> ${data.amount || 0} STON
💳 <b>Method:</b> ${data.method || 'Unknown'}
📍 <b>Address:</b> \`${data.address || 'Not provided'}\`

<b>Action Required: Process withdrawal</b>

🕐 <b>Time:</b> ${timestamp}`;

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

    case 'broadcast':
      return data.message || 'No message content';

    default:
      return null;
  }
}
