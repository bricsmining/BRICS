/**
 * Consolidated Admin API handler
 * Handles all admin-related operations in one endpoint
 */

import { db, getServerAdminConfig } from '../src/lib/serverFirebase.js';
import { 
  collection, 
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';

export default async function handler(req, res) {
  // Extract the action from query parameter
  const { action } = req.query;
  
  try {
    switch (action) {
      case 'notify':
        return await handleNotifyAdmin(req, res);
      
      case 'broadcast':
        return await handleBroadcast(req, res);
      
      case 'verify':
        return await handleVerifyAdmin(req, res);
      
      case 'get-config':
        return await handleGetConfig(req, res);
      
      case 'approve-withdrawal':
        return await handleApproveWithdrawal(req, res);
      
      case 'reject-withdrawal':
        return await handleRejectWithdrawal(req, res);
      
      case 'approve-task':
        return await handleApproveTask(req, res);
      
      case 'reject-task':
        return await handleRejectTask(req, res);
      
      default:
        return res.status(400).json({ 
          error: 'Invalid action parameter',
          availableActions: ['notify', 'broadcast', 'verify', 'get-config', 'approve-withdrawal', 'reject-withdrawal', 'approve-task', 'reject-task']
        });
    }
  } catch (error) {
    console.error('Error in consolidated admin handler:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      action: action || 'unknown'
    });
  }
}

// Admin notification handler
async function handleNotifyAdmin(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authentication - Require API key for security
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.ADMIN_API_KEY;

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
  }

  const { message, adminChatId: providedChatId } = req.body;
  
  // Get bot token from environment
  const botToken = process.env.VITE_TG_BOT_TOKEN || process.env.TG_BOT_TOKEN;

  if (!botToken) {
    console.error('Bot token not configured');
    return res.status(500).json({ error: 'Bot token not configured' });
  }

  // Get admin chat ID from database or use provided one
  let adminChatId = providedChatId;
  
  if (!adminChatId) {
    try {
      const adminConfig = await getServerAdminConfig();
      adminChatId = adminConfig.adminChatId;
    } catch (error) {
      console.error('Failed to get admin config:', error);
      adminChatId = null;
    }
  }

  // Validation
  if (!adminChatId) {
    console.error('Admin chat ID not configured');
    return res.status(500).json({ error: 'Admin chat ID not configured' });
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Invalid message' });
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: message.trim(),
          parse_mode: 'HTML',
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Telegram API error:', errorData);
      return res.status(500).json({ 
        error: 'Failed to send message to Telegram', 
        details: errorData 
      });
    }

    const result = await response.json();
    
    return res.status(200).json({ 
      success: true, 
      messageId: result.message_id,
      chatId: adminChatId 
    });
    
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return res.status(500).json({ 
      error: 'Failed to send notification', 
      details: error.message 
    });
  }
}

// Broadcast handler
async function handleBroadcast(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authentication - Require API key for security
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.ADMIN_API_KEY;

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
  }

  const { 
    message, 
    adminEmail, 
    mediaType = null, 
    mediaUrl = null, 
    buttons = null,
    parseMode = 'Markdown'
  } = req.body;

  if (!message || !adminEmail) {
    return res.status(400).json({ error: 'Missing message or adminEmail' });
  }

  try {
    // Get bot token from environment and admin config
    const botToken = process.env.VITE_TG_BOT_TOKEN || process.env.TG_BOT_TOKEN;
    
    if (!botToken) {
      console.error('Telegram bot token not configured');
      return res.status(500).json({ error: 'Telegram bot token not configured' });
    }

    // Get all users from database
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    let successCount = 0;
    let failCount = 0;
    const promises = [];
    
    console.log(`Broadcasting enhanced message to ${usersSnapshot.size} users...`);
    console.log(`Media type: ${mediaType}, Buttons: ${buttons ? buttons.length : 0}`);
    
    // Prepare broadcast options
    const broadcastOptions = {
      parse_mode: parseMode,
      ...(buttons && { reply_markup: { inline_keyboard: buttons } })
    };

    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const telegramId = userData.telegramId || userData.id;
      
      if (telegramId) {
        let promise;
        
        // Choose the appropriate sending method based on media type
        if (mediaType && mediaUrl) {
          switch (mediaType.toLowerCase()) {
            case 'photo':
              promise = sendTelegramMedia(botToken, 'sendPhoto', telegramId, {
                photo: mediaUrl,
                caption: message,
                ...broadcastOptions
              });
              break;
            case 'video':
              promise = sendTelegramMedia(botToken, 'sendVideo', telegramId, {
                video: mediaUrl,
                caption: message,
                ...broadcastOptions
              });
              break;
            case 'audio':
              promise = sendTelegramMedia(botToken, 'sendAudio', telegramId, {
                audio: mediaUrl,
                caption: message,
                ...broadcastOptions
              });
              break;
            case 'document':
              promise = sendTelegramMedia(botToken, 'sendDocument', telegramId, {
                document: mediaUrl,
                caption: message,
                ...broadcastOptions
              });
              break;
            default:
              promise = sendTelegramMedia(botToken, 'sendMessage', telegramId, {
                text: message,
                ...broadcastOptions
              });
          }
        } else {
          promise = sendTelegramMedia(botToken, 'sendMessage', telegramId, {
            text: message,
            ...broadcastOptions
          });
        }
        
        promise.then(response => {
          if (response.ok) {
            successCount++;
          } else {
            failCount++;
            console.error(`Failed to send broadcast to user ${telegramId}`);
          }
        }).catch((error) => {
          failCount++;
          console.error(`Error sending broadcast to user ${telegramId}:`, error);
        });
        
        promises.push(promise);
      }
    });
    
    // Wait for all messages to be sent
    await Promise.all(promises);
    
    // Log broadcast to database
    try {
      const broadcastRef = doc(collection(db, 'admin', 'config', 'broadcasts'));
      await setDoc(broadcastRef, {
        message,
        mediaType,
        mediaUrl,
        buttons,
        parseMode,
        sentBy: adminEmail,
        sentAt: serverTimestamp(),
        successCount,
        failCount,
        totalUsers: usersSnapshot.size
      });
    } catch (logError) {
      console.error('Failed to log broadcast:', logError);
      // Don't fail the entire operation if logging fails
    }
    
    console.log(`Enhanced broadcast completed: ${successCount} success, ${failCount} failed`);
    
    return res.status(200).json({
      success: true,
      successCount,
      failCount,
      totalUsers: usersSnapshot.size,
      mediaType,
      buttonsCount: buttons ? buttons.length : 0
    });
    
  } catch (error) {
    console.error('Error in broadcast API:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Admin verification handler
async function handleVerifyAdmin(req, res) {
  const { password } = req.body;

  const expected = process.env.ADMIN_CODE;

  if (!password || !expected) {
    return res.status(400).json({ success: false, message: 'Missing password or server config.' });
  }

  if (password === expected) {
    return res.status(200).json({ success: true });
  } else {
    return res.status(403).json({ success: false, message: 'Invalid password.' });
  }
}

// Get admin configuration
async function handleGetConfig(req, res) {
  try {
    const configRef = doc(db, 'admin', 'config');
    const configSnap = await getDoc(configRef);

    if (!configSnap.exists()) {
      return res.status(404).json({ error: 'Admin config not found' });
    }

    const config = configSnap.data();
    return res.status(200).json({
      telegramChatId: config.adminChatId || null,
      hasConfig: true
    });

  } catch (error) {
    console.error('Error in handleGetConfig:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Handle withdrawal approval
async function handleApproveWithdrawal(req, res) {
  console.log('[ADMIN API] handleApproveWithdrawal called');
  console.log('[ADMIN API] Request method:', req.method);
  console.log('[ADMIN API] Request body:', JSON.stringify(req.body, null, 2));
  
  if (req.method !== 'POST') {
    console.log('[ADMIN API] Invalid method, expected POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authentication
  const apiKey = req.body.api || req.headers['x-api-key'];
  const validApiKey = process.env.ADMIN_API_KEY || process.env.VITE_ADMIN_API_KEY;

  console.log('[ADMIN API] API Key provided:', apiKey ? 'Yes' : 'No');
  console.log('[ADMIN API] Valid API Key configured:', validApiKey ? 'Yes' : 'No');

  if (!apiKey || apiKey !== validApiKey) {
    console.log('[ADMIN API] Authentication failed');
    console.log('[ADMIN API] Provided key:', apiKey);
    console.log('[ADMIN API] Expected key:', validApiKey);
    return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
  }
  
  console.log('[ADMIN API] Authentication successful');

  const { withdrawalId, userId } = req.body;

  console.log('[ADMIN API] Withdrawal ID:', withdrawalId);
  console.log('[ADMIN API] User ID:', userId);

  if (!withdrawalId) {
    console.log('[ADMIN API] Missing withdrawalId');
    return res.status(400).json({ error: 'Missing withdrawalId' });
  }

  try {
    console.log('[ADMIN API] Importing required functions...');
    // Import the approval function
    const { approveWithdrawal } = await import('../src/data/firestore/adminActions.js');
    
    // Get withdrawal data first to get amount
    const { getDoc, doc } = await import('firebase/firestore');
    const { db } = await import('../src/lib/serverFirebase.js');
    
    console.log('[ADMIN API] Getting withdrawal document...');
    const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
    const withdrawalDoc = await getDoc(withdrawalRef);
    
    if (!withdrawalDoc.exists()) {
      console.log('[ADMIN API] Withdrawal document not found:', withdrawalId);
      return res.status(404).json({ error: 'Withdrawal not found' });
    }
    
    const withdrawalData = withdrawalDoc.data();
    console.log('[ADMIN API] Withdrawal data:', JSON.stringify(withdrawalData, null, 2));
    
    console.log('[ADMIN API] Calling approveWithdrawal function...');
    const success = await approveWithdrawal(withdrawalId, withdrawalData.userId, withdrawalData.amount);
    console.log('[ADMIN API] Approval result:', success);

    if (success) {
      console.log('[ADMIN API] Withdrawal approved successfully');
      return res.status(200).json({ success: true, message: 'Withdrawal approved successfully' });
    } else {
      console.log('[ADMIN API] Failed to approve withdrawal');
      return res.status(500).json({ success: false, error: 'Failed to approve withdrawal' });
    }
  } catch (error) {
    console.error('[ADMIN API] Error approving withdrawal:', error);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
}

// Handle withdrawal rejection  
async function handleRejectWithdrawal(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authentication
  const apiKey = req.body.api || req.headers['x-api-key'];
  const validApiKey = process.env.ADMIN_API_KEY || process.env.VITE_ADMIN_API_KEY;

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
  }

  const { withdrawalId } = req.body;

  if (!withdrawalId) {
    return res.status(400).json({ error: 'Missing withdrawalId' });
  }

  try {
    // Import the rejection function
    const { rejectWithdrawal } = await import('../src/data/firestore/adminActions.js');
    
    const success = await rejectWithdrawal(withdrawalId);

    if (success) {
      return res.status(200).json({ success: true, message: 'Withdrawal rejected successfully' });
    } else {
      return res.status(500).json({ success: false, error: 'Failed to reject withdrawal' });
    }
  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
}

// Handle task approval
async function handleApproveTask(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authentication
  const apiKey = req.body.api || req.headers['x-api-key'];
  const validApiKey = process.env.ADMIN_API_KEY || process.env.VITE_ADMIN_API_KEY;

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
  }

  const { taskId, userId } = req.body;

  if (!taskId || !userId) {
    return res.status(400).json({ error: 'Missing taskId or userId' });
  }

  try {
    // Import the approval function
    const { approveTask } = await import('../src/data/firestore/adminActions.js');
    
    const success = await approveTask(userId, taskId);

    if (success) {
      return res.status(200).json({ success: true, message: 'Task approved successfully' });
    } else {
      return res.status(500).json({ success: false, error: 'Failed to approve task' });
    }
  } catch (error) {
    console.error('Error approving task:', error);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
}

// Handle task rejection
async function handleRejectTask(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authentication
  const apiKey = req.body.api || req.headers['x-api-key'];
  const validApiKey = process.env.ADMIN_API_KEY || process.env.VITE_ADMIN_API_KEY;

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
  }

  const { taskId, userId } = req.body;

  if (!taskId || !userId) {
    return res.status(400).json({ error: 'Missing taskId or userId' });
  }

  try {
    // Import the rejection function
    const { rejectTask } = await import('../src/data/firestore/adminActions.js');
    
    const success = await rejectTask(userId, taskId);

    if (success) {
      return res.status(200).json({ success: true, message: 'Task rejected successfully' });
    } else {
      return res.status(500).json({ success: false, error: 'Failed to reject task' });
    }
  } catch (error) {
    console.error('Error rejecting task:', error);
    return res.status(500).json({ success: false, error: 'Internal server error', details: error.message });
  }
}

// Enhanced Telegram media sending helper
async function sendTelegramMedia(botToken, method, chatId, payload) {
  const url = `https://api.telegram.org/bot${botToken}/${method}`;
  
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      ...payload
    })
  });
}
