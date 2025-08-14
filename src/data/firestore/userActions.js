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
import { notifyNewUser, notifyTaskCompletion } from '@/utils/notifications';

// Create or return existing user
export const getOrCreateUser = async (telegramUserData, referrerId = null) => {
  console.log("🔍 getOrCreateUser called with:", { 
    userId: telegramUserData?.id, 
    referrerId: referrerId,
    referrerIdType: typeof referrerId 
  });
  console.log("🔍 URL when getOrCreateUser called:", window.location.href);
  console.log("🔍 URL search params:", window.location.search);
  
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
          !existingData.referralLink.includes('/app?start=refID') ||
          existingData.referralLink.includes('?start=User_')) { 
        updates.referralLink = generateReferralLink(userId);
      }

      // Handle referral for existing users who don't have a referrer yet
      if (referrerId && !existingData.invitedBy) {
        console.log("🔍 Existing user missing referrer, setting invitedBy:", referrerId);
        updates.invitedBy = referrerId;
        
        // Also process the referral API call for rewards
        try {
          console.log('✅ Processing referral for existing user:', { userId, referrerId });
          await processMiniAppReferral(userId, referrerId);
        } catch (error) {
          console.error('Error processing referral for existing user:', error);
        }
      } else if (referrerId && existingData.invitedBy && existingData.invitedBy !== referrerId) {
        console.log("🚨 Existing user already has different referrer:", {
          userId, 
          existingReferrer: existingData.invitedBy, 
          newReferrer: referrerId
        });
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
      console.log("🔍 Creating new user with referrerId:", referrerId);
      const newUser = defaultFirestoreUser(
        userId,
        telegramUserData.username,
        telegramUserData.firstName,
        telegramUserData.lastName,
        referrerId
      );
      console.log("🔍 New user object invitedBy:", newUser.invitedBy);
      newUser.profilePicUrl = telegramUserData.profilePicUrl;
      newUser.referralLink = generateReferralLink(userId);

      await setDoc(userRef, { ...newUser, joinedAt: serverTimestamp() });
      
      // Process any pending referral info for new user
      processReferralInfo(userId);
      
      // Send new user notification to admin
      try {
        await notifyNewUser(telegramUserData, referrerId);
      } catch (error) {
        console.error('Error sending new user notification:', error);
      }

      // Process Mini App referral if referrerId is provided
      if (referrerId) {
        // Double-check for self-referral before processing
        if (userId === referrerId || String(userId) === String(referrerId)) {
          console.error('❌ Self-referral detected and blocked:', { userId, referrerId });
        } else {
          try {
            console.log('✅ Processing Mini App referral:', { userId, referrerId });
            // Only call API for NEW users since we already set invitedBy in defaultFirestoreUser
            // The API will handle rewarding the referrer and creating bidirectional links
            await processMiniAppReferral(userId, referrerId);
          } catch (error) {
            console.error('Error processing Mini App referral:', error);
            // Don't fail user creation if referral processing fails
          }
        }
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

    // Send task completion notification to admin
    try {
      const userName = userData.firstName || userData.username || `User ${userId}`;
      await notifyTaskCompletion(userId, userName, task.title, task.reward);
    } catch (error) {
      console.error('Error sending task completion notification:', error);
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
        lastCheckIn: serverTimestamp(),
        [`tasks.${checkInTaskId}`]: true
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

// Process Mini App referral by calling the referral API
export const processMiniAppReferral = async (newUserId, referrerId) => {
  try {
    // Get the base URL for API calls
    const baseUrl = window.location.origin;
    const adminApiKey = import.meta.env.VITE_ADMIN_API_KEY;
    
    if (!adminApiKey) {
      console.error('❌ VITE_ADMIN_API_KEY not configured!');
      console.error('📝 Add VITE_ADMIN_API_KEY=adminsumon7891 to Vercel environment variables');
      return false;
    }
    
    console.log('🔑 Using admin API key:', adminApiKey.substring(0, 5) + '...');
    
    const referralUrl = `${baseUrl}/api/utils?action=refer&api=${encodeURIComponent(adminApiKey)}&new=${encodeURIComponent(newUserId)}&referreby=${encodeURIComponent(referrerId)}`;
    
    const response = await fetch(referralUrl);
    const result = await response.json();
    
    if (result.success) {
      console.log('Mini App referral processed successfully:', result.message);
      return true;
    } else {
      console.error('Mini App referral processing failed:', result.message);
      return false;
    }
  } catch (error) {
    console.error('Error processing Mini App referral:', error);
    return false;
  }
};
