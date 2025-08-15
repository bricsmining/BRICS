/**
 * Consolidated Utils API handler
 * Handles utility operations like referrals, telegram verification, etc.
 */

import { db } from '../src/lib/serverFirebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import { defaultFirestoreUser } from '../src/data/defaults.js';

const BOT_TOKEN = process.env.TG_BOT_TOKEN;

export default async function handler(req, res) {
  // Extract the action from query parameter
  const { action } = req.query;
  
  try {
    switch (action) {
      case 'refer':
        return await handleReferral(req, res);
      
      case 'verify-telegram':
        return await handleTelegramVerification(req, res);
      
      default:
        return res.status(400).json({ 
          error: 'Invalid action parameter',
          availableActions: ['refer', 'verify-telegram']
        });
    }
  } catch (error) {
    console.error('Error in consolidated utils handler:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      action: action || 'unknown'
    });
  }
}

// Referral handler
async function handleReferral(req, res) {
  const { api, new: newUserId, referreby: referredById } = req.query;

  if (!api || api !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ success: false, message: 'Invalid API key.' });
  }

  if (!newUserId || !referredById) {
    return res.status(400).json({ success: false, message: 'Missing user IDs.' });
  }

  // Prevent self-referral with multiple checks
  if (newUserId === referredById || 
      String(newUserId) === String(referredById) ||
      parseInt(newUserId) === parseInt(referredById)) {
    console.log(`Self-referral attempt blocked: ${newUserId} trying to refer themselves`);
    return res.status(400).json({ success: false, message: 'Self-referral not allowed.' });
  }

  try {
    const usersRef = db.collection('users');
    const tasksRef = db.collection('tasks');

    const newUserRef = usersRef.doc(newUserId);
    const referredByRef = usersRef.doc(referredById);
    const referTaskRef = tasksRef.doc('task_refer_friend');

    const [newUserSnap, referredBySnap, referTaskSnap] = await Promise.all([
      newUserRef.get(),
      referredByRef.get(),
      referTaskRef.get()
    ]);

    if (!referredBySnap.exists) {
      return res.status(404).json({ success: false, message: 'Referrer not found.' });
    }

    if (!referTaskSnap.exists) {
      return res.status(500).json({ success: false, message: 'Referral task config missing.' });
    }

    const rewardAmount = referTaskSnap.data().reward || 0;

    // Check if user already exists
    if (newUserSnap.exists) {
      const existingUserData = newUserSnap.data();
      
      // If user already has a different referrer, reject
      if (existingUserData.invitedBy && existingUserData.invitedBy !== referredById) {
        return res.status(409).json({ 
          success: false, 
          message: 'User already has a different referrer.' 
        });
      }
      
      // If user doesn't have a referrer yet, update with referral info
      if (!existingUserData.invitedBy) {
        await newUserRef.update({
          invitedBy: referredById
        });
        console.log(`Updated existing user ${newUserId} with referrer ${referredById}`);
      }
      
      // If user already has the correct referrer, continue to reward process
      if (existingUserData.invitedBy === referredById) {
        console.log(`User ${newUserId} already has correct referrer ${referredById}, processing rewards`);
      }
    } else {
      // Create the new user with referral metadata
      await newUserRef.set(defaultFirestoreUser(newUserId, null, null, null, referredById));
      console.log(`Created new user ${newUserId} with referrer ${referredById}`);
    }

    // Update referrer's stats with dynamic reward AND free spin
    const referrerData = referredBySnap.data();
    const currentDate = new Date();
    
    // Check if this user is already in referredUsers to prevent duplicate rewards
    const existingReferredUsers = referrerData.referredUsers || [];
    if (existingReferredUsers.includes(newUserId)) {
      console.log(`User ${newUserId} already referred by ${referredById}, skipping duplicate reward`);
      return res.status(200).json({
        success: true,
        message: 'Referral already processed (no duplicate rewards)',
        existingReferral: true
      });
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
    
    // Increment weekly referrals
    weeklyReferrals += 1;
    
    const updates = {
      referrals: FieldValue.increment(1),
      balance: FieldValue.increment(rewardAmount),
      referredUsers: FieldValue.arrayUnion(newUserId),
      freeSpins: FieldValue.increment(1), // Add 1 free spin for successful referral
      totalSpinsEarned: FieldValue.increment(1), // Track total spins earned
      lastReferralDate: currentDate,
      weeklyReferrals: weeklyReferrals,
      referralHistory: FieldValue.arrayUnion({
        userId: newUserId,
        joinedAt: currentDate,
        timestamp: currentDate
      })
    };
    
    if (needsReset || !lastReset) {
      updates.weeklyReferralsLastReset = currentDate;
    }
    
    await referredByRef.update(updates);

    // Send notifications
    try {
      // Get user data for notifications
      const newUserData = newUserSnap.exists ? newUserSnap.data() : null;
      const referrerData = referredBySnap.data();
      
      const newUserName = newUserData?.firstName || newUserData?.username || `User ${newUserId}`;
      const referrerName = referrerData?.firstName || referrerData?.username || `User ${referredById}`;
      
      // Send notifications (async, don't wait)
      sendNotifications(referredById, referrerName, newUserId, newUserName, rewardAmount);
    } catch (notifError) {
      console.error('Notification error (non-blocking):', notifError);
    }

    return res.status(200).json({
      success: true,
      message: `Referral successful. ${rewardAmount} STON and 1 free spin rewarded to referrer.`
    });

  } catch (error) {
    console.error('Referral error:', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// Telegram verification handler
async function handleTelegramVerification(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, channelUsername, taskId } = req.body;
  const botToken = process.env.TG_BOT_TOKEN;

  if (!botToken || !userId || !channelUsername) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const apiUrl = `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=@${channelUsername}&user_id=${userId}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data.ok) {
      const status = data.result.status;
      const isMember = ['member', 'administrator', 'creator'].includes(status);
      
      return res.status(200).json({ 
        success: true, 
        isMember,
        status 
      });
    } else {
      console.error('Telegram API error:', data);
      return res.status(400).json({ 
        success: false, 
        error: data.description || 'Failed to verify membership',
        errorCode: data.error_code 
      });
    }
  } catch (error) {
    console.error('Error verifying Telegram membership:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

// Send notifications for referral success
async function sendNotifications(referrerId, referrerName, newUserId, newUserName, rewardAmount) {
  if (!BOT_TOKEN) {
    console.warn('Bot token not configured for notifications');
    return;
  }

  try {
    // Get admin chat ID
    const adminConfigRef = db.collection('admin').doc('config');
    const adminConfigSnap = await adminConfigRef.get();
    
    if (!adminConfigSnap.exists) {
      console.warn('Admin config not found for notifications');
      return;
    }

    const adminConfig = adminConfigSnap.data();
    const adminChatId = adminConfig.adminChatId;

    if (!adminChatId) {
      console.warn('Admin chat ID not configured');
      return;
    }

    const timestamp = new Date().toLocaleString();

    // Notify admin about referral
    const adminMessage = `💰 *New Referral!*

👥 *Referral Info:*
• Referrer: \`${referrerId}\` (${referrerName})
• New User: \`${newUserId}\` (${newUserName})
• Reward: ${rewardAmount} STON + 1 Free Spin

🕐 *Time:* ${timestamp}`;

    await sendTelegramMessage(adminChatId, adminMessage);

    // Notify referrer about successful referral
    const userMessage = `🎉 *Successful Referral!*

Your friend joined SkyTON through your referral link!

👥 *New Member:* ${newUserName}
💰 *Your Reward:* ${rewardAmount} STON
🎰 *Bonus:* 1 Free Spin added

Keep sharing to earn more rewards! 🚀

*Share your link:* https://t.me/xSkyTON_Bot/app?start=refID${referrerId}`;

    await sendTelegramMessage(referrerId, userMessage);

  } catch (error) {
    console.error('Error sending referral notifications:', error);
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
    
    if (result.ok) {
      console.log(`✅ Notification sent to ${chatId}`);
    } else {
      console.error(`❌ Failed to send notification to ${chatId}:`, result.description);
    }
    
    return result.ok;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}
