/**
 * Consolidated Admin API handler
 * Handles all admin-related operations in one endpoint
 */

import { db, getServerAdminConfig } from '../src/lib/serverFirebase.js';
import { 
  collection, 
  getDocs,
  doc,
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
      
      default:
        return res.status(400).json({ 
          error: 'Invalid action parameter',
          availableActions: ['notify', 'broadcast', 'verify', 'get-config']
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
      telegramChatId: config.telegramChatId || null,
      hasConfig: true
    });

  } catch (error) {
    console.error('Error in handleGetConfig:', error);
    return res.status(500).json({ error: 'Internal server error' });
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
