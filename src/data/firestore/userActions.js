import React from 'react';
import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp
} from "firebase/firestore";
import { defaultFirestoreUser } from '@/data/defaults';
import { generateReferralLink, processReferralInfo } from '@/data/telegramUtils';
import { getTask } from '@/data/firestore/taskActions';
import { getAdminConfig } from '@/data/firestore/adminConfig';
// Removed botNotifications import - using backend API endpoints instead

// Create or return existing user
export const getOrCreateUser = async (telegramUserData, referrerId = null) => {
  console.log('[WEBAPP] getOrCreateUser called:', {
    userId: telegramUserData?.id,
    referrerId: referrerId,
    referrerType: typeof referrerId
  });
  
  if (!telegramUserData || !telegramUserData.id) {
    console.error("Missing Telegram data.");
    return null;
  }

  const userId = telegramUserData.id;
  const userRef = doc(db, "users", userId);

  try {
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const existingData = userSnap.data();
      const updates = {};

      if (!existingData.referralLink || 
          !existingData.referralLink.includes('?start=refID') ||
          existingData.referralLink.includes('?start=User_')) { 
        updates.referralLink = generateReferralLink(userId);
      }

      // Handle referral for existing users who don't have a referrer yet
      if (referrerId && !existingData.invitedBy) {
        updates.invitedBy = referrerId;
        
        // Also process the referral API call for rewards
        try {
          await processMiniAppReferral(userId, referrerId);
        } catch (error) {
          console.error('Error processing referral for existing user:', error);
        }
      }

      if (telegramUserData.username && existingData.username !== telegramUserData.username)
        updates.username = telegramUserData.username;
      if (telegramUserData.firstName && existingData.firstName !== telegramUserData.firstName)
        updates.firstName = telegramUserData.firstName;
      if (telegramUserData.lastName && existingData.lastName !== telegramUserData.lastName)
        updates.lastName = telegramUserData.lastName;
      if (telegramUserData.profilePicUrl && existingData.profilePicUrl !== telegramUserData.profilePicUrl)
        updates.profilePicUrl = telegramUserData.profilePicUrl;

      if (Object.keys(updates).length > 0) {
        await updateDoc(userRef, updates);
      }
      
      // Process any pending referral info for existing user
      processReferralInfo(userId);
      
      return { id: userId, ...existingData, ...(Object.keys(updates).length > 0 ? updates : {}) };
    } else {
      console.log('[WEBAPP] Creating new user with referrerId:', referrerId);
      const newUser = defaultFirestoreUser(
        userId,
        telegramUserData.username,
        telegramUserData.firstName,
        telegramUserData.lastName,
        referrerId
      );
      console.log('[WEBAPP] New user invitedBy field:', newUser.invitedBy);
      newUser.profilePicUrl = telegramUserData.profilePicUrl;
      newUser.referralLink = generateReferralLink(userId);

      await setDoc(userRef, { ...newUser, joinedAt: serverTimestamp() });
      
      // Process any pending referral info for new user
      processReferralInfo(userId);
      
      // Send new user notification to admin via backend API
      try {
        await fetch('/api/notifications?action=admin', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-api-key': import.meta.env.VITE_ADMIN_API_KEY
          },
          body: JSON.stringify({
            type: 'new_user',
            data: {
              userId: telegramUserData.id,
              userName: telegramUserData.firstName || telegramUserData.lastName || telegramUserData.username || 'Unknown',
              userTelegramUsername: telegramUserData.username,
              name: telegramUserData.firstName || 'Unknown',
              username: telegramUserData.username,
              referrerId: referrerId
            }
          })
        });
      } catch (error) {
        console.error('Error sending new user notification:', error);
      }

      // Note: Referral processing is now handled exclusively by Telegram bot
      // Web app referrals are disabled - all referrals go through bot system
      if (referrerId) {
        console.log('[WEBAPP] Referral detected but skipping processing - handled by Telegram bot:', { userId, referrerId });
      }
      
      return { id: userId, ...newUser };
    }
  } catch (error) {
    console.error("Error in getOrCreateUser:", error);
    return null;
  }
};

// Update user fields
export const updateUser = async (userId, updates) => {
  if (!userId) {
    console.error("User ID required for update.");
    return false;
  }
  try {
    await updateDoc(doc(db, "users", userId), updates);
    return true;
  } catch (error) {
    console.error(`Error updating user ${userId}:`, error);
    return false;
  }
};

// Fetch user by ID
export const getUser = async (userId) => {
  if (!userId) return null;
  try {
    const userSnap = await getDoc(doc(db, "users", userId));
    return userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null;
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
    return null;
  }
};

// Alias
export const getUserById = getUser;

// Mark a task complete and update balance
export const completeTaskForUser = async (userId, taskId) => {
  if (!userId || !taskId) return false;

  const userRef = doc(db, "users", userId);
  const task = await getTask(taskId);
  if (!task) return false;

  try {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists() && userSnap.data().tasks?.[taskId]) return true;

    const userData = userSnap.data();
    
    // Initialize balanceBreakdown if it doesn't exist (for existing users)
    if (!userData.balanceBreakdown) {
      await updateDoc(userRef, {
        balanceBreakdown: {
          task: userData.balance || 0, // Migrate existing balance to task
          box: 0,
          referral: 0,
          mining: 0
        }
      });
    }

    await updateDoc(userRef, {
      [`tasks.${taskId}`]: true,
      balance: increment(task.reward || 0),
      [`balanceBreakdown.task`]: increment(task.reward || 0),
      pendingVerificationTasks: arrayRemove(taskId)
    });

    // Note: Task completion notification is sent by the frontend (TasksSection.jsx)
    // to avoid duplicate notifications and provide accurate task type information

    // Check for pending referral rewards after task completion
    try {
      console.log(`[TASK] Checking referral rewards for user ${userId} after completing task ${taskId}`);
      
      const response = await fetch('/api/telegram-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_referral_rewards',
          userId: userId
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`[TASK] Referral rewards check result for user ${userId}:`, result);
        
        if (result.success && result.rewardsDistributed) {
          console.log(`[TASK] ✅ Referral rewards distributed for user ${userId}:`, result);
        } else if (result.tasksCompleted !== undefined) {
          console.log(`[TASK] User ${userId} progress: ${result.tasksCompleted}/${result.tasksRequired} tasks`);
        }
      } else {
        console.error(`[TASK] Failed to check referral rewards for user ${userId}:`, response.status, response.statusText);
      }
    } catch (error) {
      console.error('[TASK] Error checking referral rewards:', error);
    }

    return true;
  } catch (error) {
    console.error(`Error completing task ${taskId} for user ${userId}:`, error);
    return false;
  }
};

// Request manual task verification
export const requestManualVerificationForUser = async (userId, taskId) => {
  if (!userId || !taskId) return false;

  const userRef = doc(db, "users", userId);
  try {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.tasks?.[taskId]) return false;
      if (userData.pendingVerificationTasks?.includes(taskId)) return true;

      const task = await getTask(taskId);
      if (!task) return false;

      await updateDoc(userRef, {
        pendingVerificationTasks: arrayUnion(taskId),
        [`pendingVerificationDetails.${taskId}`]: {
          title: task.title,
          reward: task.reward,
          target: task.target
        }
      });
      return true;
    }
  } catch (error) {
    console.error(`Error requesting verification for ${taskId} by ${userId}:`, error);
    return false;
  }
};


// Reject manual verification
export const rejectManualVerificationForUser = async (userId, taskId) => {
  if (!userId || !taskId) return false;
  try {
    await updateDoc(doc(db, "users", userId), {
      pendingVerificationTasks: arrayRemove(taskId)
    });
    return true;
  } catch (error) {
    console.error(`Error rejecting verification for ${taskId} by ${userId}:`, error);
    return false;
  }
};

// Daily check-in
export const performCheckInForUser = async (userId) => {
  if (!userId) return { success: false, message: 'User ID required.' };

  const userRef = doc(db, "users", userId);
  const checkInTaskId = 'task_daily_checkin';
  const task = await getTask(checkInTaskId);
  const reward = task ? task.reward : 0;

  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return { success: false, message: 'User not found.' };

    const userData = userSnap.data();
    const lastCheckIn = userData.lastCheckIn;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let canCheckIn = true;
    if (lastCheckIn instanceof Timestamp) {
      const lastDate = lastCheckIn.toDate();
      lastDate.setHours(0, 0, 0, 0);
      if (lastDate.getTime() === today.getTime()) {
        canCheckIn = false;
      }
    }

    if (canCheckIn) {
      await updateDoc(userRef, {
        balance: increment(reward),
        'balanceBreakdown.task': increment(reward), // Add reward to task balance breakdown
        lastCheckIn: serverTimestamp()
        // Note: NOT setting tasks.task_daily_checkin = true because check-in doesn't count as task for referral
      });

      return { success: true, reward };
    } else {
      return { success: false, message: 'Already checked in today.' };
    }
  } catch (error) {
    console.error(`Check-in error for ${userId}:`, error);
    return { success: false, message: 'An error occurred.' };
  }
};

// Get all users
export const getAllUsers = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
};

// Toggle ban status
export const toggleUserBanStatus = async (telegramId, newStatus) => {
  try {
    await updateDoc(doc(db, "users", telegramId.toString()), {
      isBanned: newStatus
    });
    return true;
  } catch (error) {
    console.error(`Error updating ban status for ${telegramId}:`, error);
    return false;
  }
};

// NOTE: Web app referral processing has been removed
// All referrals are now handled exclusively by the Telegram bot system
// This ensures consistency and prevents duplicate referral processing
