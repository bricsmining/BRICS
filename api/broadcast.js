/**
 * Broadcast message to all users API endpoint
 * POST /api/broadcast
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authentication - Require API key for security
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.ADMIN_API_KEY;

  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({ error: 'Unauthorized - Invalid API key' });
  }

  const { message, adminEmail } = req.body;

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
    
    console.log(`Broadcasting message to ${usersSnapshot.size} users...`);
    
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const telegramId = userData.telegramId || userData.id;
      
      if (telegramId) {
        const promise = fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegramId,
            text: message,
            parse_mode: 'HTML'
          })
        }).then(response => {
          if (response.ok) {
            successCount++;
          } else {
            failCount++;
            console.error(`Failed to send message to user ${telegramId}`);
          }
        }).catch((error) => {
          failCount++;
          console.error(`Error sending message to user ${telegramId}:`, error);
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
    
    console.log(`Broadcast completed: ${successCount} success, ${failCount} failed`);
    
    return res.status(200).json({
      success: true,
      successCount,
      failCount,
      totalUsers: usersSnapshot.size
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
