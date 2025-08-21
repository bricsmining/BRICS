// src/data/index.js

import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit, doc, updateDoc, increment, getDoc, addDoc, where, serverTimestamp, arrayUnion, writeBatch } from 'firebase/firestore';

// Re-export initialization
export { initializeAppData } from '@/data/storeInitialization';


// Re-export all named exports from individual stores
export * from '@/data/userStore';
export * from '@/data/taskStore';
export * from '@/data/adminStore';
export * from '@/data/leaderboardStore';

// Re-export default values and Telegram utilities
export * from '@/data/defaults';
export * from '@/data/telegramUtils';

// Firestore function for leaderboard data with time period filtering
export const getLeaderboardData = async (timePeriod = 'all') => {
  try {
    console.log(`[LEADERBOARD_DATA] Fetching leaderboard for period: ${timePeriod}`);
    let q;
    const currentDate = new Date();
    
    if (timePeriod === 'weekly') {
      // Get start of current week (Monday)
      const startOfWeek = new Date(currentDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      startOfWeek.setDate(diff);
      startOfWeek.setHours(0, 0, 0, 0);

      console.log(`[LEADERBOARD_DATA] Week starts: ${startOfWeek.toISOString()}`);

      // Simplified query to avoid composite index issues - get all non-banned users and filter client-side
      q = query(
        collection(db, 'users'),
        where('isBanned', '!=', true),
        orderBy('isBanned'),
        limit(100) // Get more users to filter from
      );
    } else {
      // All time leaderboard - get more users for client-side sorting by referrals + balance
      q = query(
        collection(db, 'users'),
        where('isBanned', '!=', true),
        orderBy('isBanned'),
        limit(100) // Get more users to sort properly by referrals + balance
      );
    }

    console.log(`[LEADERBOARD_DATA] Executing Firestore query...`);
    const querySnapshot = await getDocs(q);
    const data = [];

    console.log(`[LEADERBOARD_DATA] Query returned ${querySnapshot.size} documents`);

    querySnapshot.forEach(doc => {
      const user = doc.data();
      
      // For weekly, use weeklyReferrals if available, otherwise calculate from recent referrals
      let referralCount = user.referrals || 0;
      if (timePeriod === 'weekly') {
        referralCount = user.weeklyReferrals || 0;
        
        console.log(`[LEADERBOARD_DATA] User ${doc.id}: weeklyReferrals=${user.weeklyReferrals}, totalReferrals=${user.referrals}`);
        
        // If weeklyReferrals is not set, try to calculate from referralHistory
        if (referralCount === 0 && user.referralHistory && user.referralHistory.length > 0) {
          const startOfWeek = new Date();
          const day = startOfWeek.getDay();
          const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
          startOfWeek.setDate(diff);
          startOfWeek.setHours(0, 0, 0, 0);
          
          const weeklyFromHistory = user.referralHistory.filter(referral => {
            const referralDate = referral.timestamp?.toDate ? referral.timestamp.toDate() : 
                                 referral.joinedAt?.toDate ? referral.joinedAt.toDate() : 
                                 new Date(referral.timestamp || referral.joinedAt);
            return referralDate >= startOfWeek;
          }).length;
          
          if (weeklyFromHistory > 0) {
            referralCount = weeklyFromHistory;
            console.log(`[LEADERBOARD_DATA] Calculated weekly referrals from history: ${weeklyFromHistory}`);
          }
        }
      }

      data.push({
        id: doc.id,
        username: user.username || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        referrals: referralCount,
        totalReferrals: user.referrals || 0, // Always include total for context
        balance: user.balance || 0, // Include balance for secondary ranking
        profilePicUrl: user.profilePicUrl || null,
        isBanned: user.isBanned || false
      });
    });

    // Sort by referrals first, then by balance as secondary criteria
    data.sort((a, b) => {
      // Primary: Sort by referrals (descending)
      if (b.referrals !== a.referrals) {
        return b.referrals - a.referrals;
      }
      // Secondary: If referrals are equal, sort by balance (descending)
      return b.balance - a.balance;
    });

    // Filter and limit data based on time period
    let finalData = data;
    if (timePeriod === 'weekly') {
      finalData = data.filter(user => user.referrals > 0).slice(0, 20);
      console.log(`[LEADERBOARD_DATA] Filtered weekly data: ${finalData.length} users with referrals > 0`);
    } else {
      // For all-time, keep users with referrals OR balance > 100 (to show active users)
      finalData = data.filter(user => user.referrals > 0 || user.balance > 100).slice(0, 20);
      console.log(`[LEADERBOARD_DATA] Filtered all-time data: ${finalData.length} users with activity`);
    }

    console.log(`[LEADERBOARD_DATA] Final sorted data for ${timePeriod}:`, finalData.slice(0, 3).map(u => ({ id: u.id, name: u.firstName, referrals: u.referrals, balance: u.balance })));

    return finalData;
  } catch (error) {
    console.error(`[LEADERBOARD_DATA] Failed to fetch ${timePeriod} leaderboard:`, error);
    return [];
  }
};

// Function to initialize missing weekly referrals fields for existing users
export const initializeWeeklyReferralsForExistingUsers = async () => {
  try {
    console.log('[WEEKLY_INIT] Starting initialization of weekly referrals for existing users...');
    
    // Get all users that don't have weeklyReferrals field
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('weeklyReferrals', '==', null));
    
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    let updateCount = 0;
    
    querySnapshot.forEach((doc) => {
      const userRef = doc.ref;
      batch.update(userRef, {
        weeklyReferrals: 0,
        weeklyReferralsLastReset: null,
        referralHistory: [] // Initialize if missing
      });
      updateCount++;
    });
    
    if (updateCount > 0) {
      await batch.commit();
      console.log(`[WEEKLY_INIT] Initialized weekly referrals for ${updateCount} users`);
    } else {
      console.log('[WEEKLY_INIT] All users already have weekly referrals fields');
    }
    
    return { success: true, updatedUsers: updateCount };
  } catch (error) {
    console.error('[WEEKLY_INIT] Failed to initialize weekly referrals:', error);
    return { success: false, error: error.message };
  }
};

// ENERGY FUNCTIONS
// Function to update user energy
export const updateUserEnergy = async (userId, energyAmount) => {
  if (!userId || !energyAmount || energyAmount <= 0) {
    console.error('Invalid parameters for updateUserEnergy');
    return false;
  }

  try {
    const userRef = doc(db, 'users', userId);
    
    // Check if user exists first
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      console.error('User not found:', userId);
      return false;
    }

    // Update user energy using increment
    await updateDoc(userRef, {
      energy: increment(energyAmount),
      lastEnergyUpdate: new Date()
    });

    console.log(`Successfully added ${energyAmount} energy to user ${userId}`);
    return true;
  } catch (error) {
    console.error('Failed to update user energy:', error);
    return false;
  }
};

// Function to update user balance (legacy - for backward compatibility)
export const updateUserBalance = async (userId, balanceAmount) => {
  if (!userId || !balanceAmount || balanceAmount <= 0) {
    console.error('Invalid parameters for updateUserBalance');
    return false;
  }

  try {
    const userRef = doc(db, 'users', userId);
    
    // Check if user exists first
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      console.error('User not found:', userId);
      return false;
    }

    // Update user balance using increment
    await updateDoc(userRef, {
      balance: increment(balanceAmount),
      lastBalanceUpdate: new Date()
    });

    console.log(`Successfully added ${balanceAmount} STON to user ${userId}`);
    return true;
  } catch (error) {
    console.error('Failed to update user balance:', error);
    return false;
  }
};

// Function to update specific balance type
export const updateUserBalanceByType = async (userId, balanceAmount, balanceType) => {
  if (!userId || !balanceAmount || balanceAmount <= 0) {
    console.error('Invalid parameters for updateUserBalanceByType');
    return false;
  }

  const validTypes = ['task', 'box', 'referral', 'mining'];
  if (!validTypes.includes(balanceType)) {
    console.error('Invalid balance type:', balanceType);
    return false;
  }

  try {
    const userRef = doc(db, 'users', userId);
    
    // Check if user exists first
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      console.error('User not found:', userId);
      return false;
    }

    const userData = userDoc.data();
    
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

    // Update specific balance type and total balance
    await updateDoc(userRef, {
      [`balanceBreakdown.${balanceType}`]: increment(balanceAmount),
      balance: increment(balanceAmount), // Keep legacy balance in sync
      lastBalanceUpdate: new Date()
    });

    console.log(`Successfully added ${balanceAmount} STON to user ${userId} (${balanceType} balance)`);
    return true;
  } catch (error) {
    console.error('Failed to update user balance by type:', error);
    return false;
  }
};

// Function to get purchasable balance (task + mining only)
export const getPurchasableBalance = (user) => {
  if (!user) return 0;
  
  // If user has balanceBreakdown, use it
  if (user.balanceBreakdown) {
    return (user.balanceBreakdown.task || 0) + (user.balanceBreakdown.mining || 0);
  }
  
  // Fallback to legacy balance
  return user.balance || 0;
};

// Function to get total withdrawable balance (all types)
export const getWithdrawableBalance = (user) => {
  if (!user) return 0;
  
  // If user has balanceBreakdown, sum all types
  if (user.balanceBreakdown) {
    const breakdown = user.balanceBreakdown;
    return (breakdown.task || 0) + (breakdown.box || 0) + (breakdown.referral || 0) + (breakdown.mining || 0);
  }
  
  // Fallback to legacy balance
  return user.balance || 0;
};

// Function to deduct balance for purchases (only from task and mining)
export const deductPurchasableBalance = async (userId, amount) => {
  if (!userId || !amount || amount <= 0) {
    console.error('Invalid parameters for deductPurchasableBalance');
    return false;
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('User not found:', userId);
      return false;
    }

    const userData = userDoc.data();
    const breakdown = userData.balanceBreakdown || {
      task: userData.balance || 0,
      box: 0,
      referral: 0,
      mining: 0
    };

    const availableForPurchase = (breakdown.task || 0) + (breakdown.mining || 0);
    
    if (availableForPurchase < amount) {
      console.error('Insufficient purchasable balance');
      return false;
    }

    // Deduct from task first, then mining
    let remainingToDeduct = amount;
    const updates = {};
    
    if (breakdown.task > 0 && remainingToDeduct > 0) {
      const deductFromTask = Math.min(breakdown.task, remainingToDeduct);
      updates[`balanceBreakdown.task`] = increment(-deductFromTask);
      remainingToDeduct -= deductFromTask;
    }
    
    if (breakdown.mining > 0 && remainingToDeduct > 0) {
      const deductFromMining = Math.min(breakdown.mining, remainingToDeduct);
      updates[`balanceBreakdown.mining`] = increment(-deductFromMining);
      remainingToDeduct -= deductFromMining;
    }

    // Update legacy balance too
    updates.balance = increment(-amount);
    updates.lastBalanceUpdate = new Date();

    await updateDoc(userRef, updates);
    
    console.log(`Successfully deducted ${amount} STON from user ${userId} purchasable balance`);
    return true;
  } catch (error) {
    console.error('Failed to deduct purchasable balance:', error);
    return false;
  }
};

// Function to deduct user energy (for game usage)
export const deductUserEnergy = async (userId, energyAmount) => {
  if (!userId || !energyAmount || energyAmount <= 0) {
    console.error('Invalid parameters for deductUserEnergy');
    return false;
  }

  try {
    const userRef = doc(db, 'users', userId);
    
    // Check if user exists and has enough energy
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      console.error('User not found:', userId);
      return false;
    }

    const userData = userDoc.data();
    const currentEnergy = userData.energy || 0;

    if (currentEnergy < energyAmount) {
      console.error('Insufficient energy:', { current: currentEnergy, required: energyAmount });
      return false;
    }

    // Deduct energy using increment with negative value
    await updateDoc(userRef, {
      energy: increment(-energyAmount),
      lastEnergyUsed: new Date()
    });

    console.log(`Successfully deducted ${energyAmount} energy from user ${userId}`);
    return true;
  } catch (error) {
    console.error('Failed to deduct user energy:', error);
    return false;
  }
};

// Function to check user energy level
export const getUserEnergy = async (userId) => {
  if (!userId) {
    console.error('Invalid userId for getUserEnergy');
    return 0;
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('User not found:', userId);
      return 0;
    }

    const userData = userDoc.data();
    return userData.energy || 0;
  } catch (error) {
    console.error('Failed to get user energy:', error);
    return 0;
  }
};

// Function to set maximum energy limit (optional)
export const setUserEnergyLimit = async (userId, maxEnergy = 500) => {
  if (!userId || maxEnergy <= 0) {
    console.error('Invalid parameters for setUserEnergyLimit');
    return false;
  }

  try {
    const userRef = doc(db, 'users', userId);
    
    // Check if user exists
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      console.error('User not found:', userId);
      return false;
    }

    const userData = userDoc.data();
    const currentEnergy = userData.energy || 0;

    // Only update if current energy exceeds the limit
    if (currentEnergy > maxEnergy) {
      await updateDoc(userRef, {
        energy: maxEnergy,
        maxEnergyLimit: maxEnergy,
        lastEnergyLimitUpdate: new Date()
      });
      console.log(`Energy capped at ${maxEnergy} for user ${userId}`);
    } else {
      await updateDoc(userRef, {
        maxEnergyLimit: maxEnergy,
        lastEnergyLimitUpdate: new Date()
      });
    }

    return true;
  } catch (error) {
    console.error('Failed to set user energy limit:', error);
    return false;
  }
};

// Function to reset daily energy (if you have daily limits)
export const resetDailyEnergy = async (userId, dailyEnergyAllowance = 500) => {
  if (!userId || dailyEnergyAllowance <= 0) {
    console.error('Invalid parameters for resetDailyEnergy');
    return false;
  }

  try {
    const userRef = doc(db, 'users', userId);
    
    // Check if user exists
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      console.error('User not found:', userId);
      return false;
    }

    await updateDoc(userRef, {
      energy: dailyEnergyAllowance,
      lastDailyEnergyReset: new Date(),
      dailyEnergyAllowance: dailyEnergyAllowance
    });

    console.log(`Daily energy reset to ${dailyEnergyAllowance} for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Failed to reset daily energy:', error);
    return false;
  }
};

// Function to log energy transactions (for analytics)
export const logEnergyTransaction = async (userId, type, amount, source = 'unknown') => {
  if (!userId || !type || !amount) {
    console.error('Invalid parameters for logEnergyTransaction');
    return false;
  }

  try {
    const transactionRef = collection(db, 'energyTransactions');
    await addDoc(transactionRef, {
      userId,
      type, // 'earned', 'spent', 'reset'
      amount,
      source, // 'ad', 'game', 'daily_reset', 'admin'
      timestamp: new Date(),
      createdAt: new Date()
    });

    console.log(`Energy transaction logged: ${type} ${amount} for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Failed to log energy transaction:', error);
    return false;
  }
};

import { getAdminConfig } from '@/data/firestore/adminConfig';

// Energy Management Constants (fallback values)
const DEFAULT_MAX_ENERGY = 500;
const DEFAULT_ENERGY_REWARD_AMOUNT = 10;
const DEFAULT_DAILY_ENERGY_AD_LIMIT = 10; // Maximum energy ads per day
const DEFAULT_HOURLY_ENERGY_AD_LIMIT = 3; // Maximum energy ads per hour

// Mystery Box Management Constants (fallback values)
const DEFAULT_BOX_REWARD_AMOUNT = 1;
const DEFAULT_DAILY_BOX_AD_LIMIT = 10; // Maximum mystery box ads per day
const DEFAULT_HOURLY_BOX_AD_LIMIT = 3; // Maximum mystery box ads per hour

// Function to add energy from ads with limits
export const addEnergyFromAd = async (userId) => {
  if (!userId) {
    console.error('Invalid userId for addEnergyFromAd');
    return { success: false, error: 'Invalid user ID' };
  }

  try {
    // Get admin config for dynamic limits
    const adminConfig = await getAdminConfig();
    const MAX_ENERGY = adminConfig?.maxEnergy || DEFAULT_MAX_ENERGY;
    const DAILY_ENERGY_AD_LIMIT = adminConfig?.dailyEnergyAdLimit || DEFAULT_DAILY_ENERGY_AD_LIMIT;
    const HOURLY_ENERGY_AD_LIMIT = adminConfig?.hourlyEnergyAdLimit || DEFAULT_HOURLY_ENERGY_AD_LIMIT;
    const ENERGY_REWARD_AMOUNT = adminConfig?.energyRewardAmount || DEFAULT_ENERGY_REWARD_AMOUNT;

    const userRef = doc(db, 'users', userId);
    
    // Check if user exists
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      console.error('User not found:', userId);
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const currentEnergy = userData.energy || 0;

    // Check if energy is already at maximum
    if (currentEnergy >= MAX_ENERGY) {
      return { 
        success: false, 
        error: `Energy is already full! Maximum energy is ${MAX_ENERGY}.`,
        type: 'energy_full'
      };
    }

    // Check daily and hourly limits
    const now = new Date();
    const today = now.toDateString();
    const currentHour = now.getHours();
    
    const energyAdHistory = userData.energyAdHistory || {};
    const todayHistory = energyAdHistory[today] || {};
    const hourlyHistory = todayHistory[currentHour] || 0;
    const dailyTotal = Object.values(todayHistory).reduce((sum, count) => sum + count, 0);

    // Check daily limit
    if (dailyTotal >= DAILY_ENERGY_AD_LIMIT) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const hoursUntilReset = Math.ceil((tomorrow - now) / (1000 * 60 * 60));
      
      return { 
        success: false, 
        error: `Daily energy ad limit reached! Resets in ${hoursUntilReset} hours.`,
        type: 'daily_limit',
        resetTime: hoursUntilReset
      };
    }

    // Check hourly limit
    if (hourlyHistory >= HOURLY_ENERGY_AD_LIMIT) {
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      const minutesUntilReset = Math.ceil((nextHour - now) / (1000 * 60));
      
      return { 
        success: false, 
        error: `Hourly energy ad limit reached! Resets in ${minutesUntilReset} minutes.`,
        type: 'hourly_limit',
        resetTime: minutesUntilReset
      };
    }

    // Calculate new energy (cap at maximum)
    const newEnergy = Math.min(currentEnergy + ENERGY_REWARD_AMOUNT, MAX_ENERGY);
    const actualEnergyGained = newEnergy - currentEnergy;

    // Update user energy and ad history
    const updatedHistory = {
      ...energyAdHistory,
      [today]: {
        ...todayHistory,
        [currentHour]: hourlyHistory + 1
      }
    };

    await updateDoc(userRef, {
      energy: newEnergy,
      energyAdHistory: updatedHistory,
      lastEnergyAdTime: now
    });

    // Log the transaction
    await logEnergyTransaction(userId, 'earned', actualEnergyGained, 'ad');

    console.log(`Successfully added ${actualEnergyGained} energy from ad for user ${userId}`);
    return { 
      success: true, 
      energyGained: actualEnergyGained,
      newEnergy: newEnergy,
      dailyUsed: dailyTotal + 1,
      hourlyUsed: hourlyHistory + 1
    };
  } catch (error) {
    console.error('Failed to add energy from ad:', error);
    return { success: false, error: 'Failed to process energy reward' };
  }
};

// Function to check energy ad availability
export const checkEnergyAdAvailability = async (userId) => {
  if (!userId) {
    return { available: false, error: 'Invalid user ID' };
  }

  try {
    // Get admin config for dynamic limits
    const adminConfig = await getAdminConfig();
    const MAX_ENERGY = adminConfig?.maxEnergy || DEFAULT_MAX_ENERGY;
    const DAILY_ENERGY_AD_LIMIT = adminConfig?.dailyEnergyAdLimit || DEFAULT_DAILY_ENERGY_AD_LIMIT;
    const HOURLY_ENERGY_AD_LIMIT = adminConfig?.hourlyEnergyAdLimit || DEFAULT_HOURLY_ENERGY_AD_LIMIT;
    const ENERGY_REWARD_AMOUNT = adminConfig?.energyRewardAmount || DEFAULT_ENERGY_REWARD_AMOUNT;

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { available: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const currentEnergy = userData.energy || 0;

    // Check if energy is full
    if (currentEnergy >= MAX_ENERGY) {
      return { 
        available: false, 
        error: 'Energy is already full!',
        type: 'energy_full' 
      };
    }

    const now = new Date();
    const today = now.toDateString();
    const currentHour = now.getHours();
    
    const energyAdHistory = userData.energyAdHistory || {};
    const todayHistory = energyAdHistory[today] || {};
    const hourlyHistory = todayHistory[currentHour] || 0;
    const dailyTotal = Object.values(todayHistory).reduce((sum, count) => sum + count, 0);

    // Check limits
    const dailyRemaining = DAILY_ENERGY_AD_LIMIT - dailyTotal;
    const hourlyRemaining = HOURLY_ENERGY_AD_LIMIT - hourlyHistory;

    if (dailyRemaining <= 0) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const hoursUntilReset = Math.ceil((tomorrow - now) / (1000 * 60 * 60));
      
      return { 
        available: false, 
        error: `Daily limit reached! Resets in ${hoursUntilReset} hours.`,
        type: 'daily_limit',
        resetTime: hoursUntilReset
      };
    }

    if (hourlyRemaining <= 0) {
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      const minutesUntilReset = Math.ceil((nextHour - now) / (1000 * 60));
      
      return { 
        available: false, 
        error: `Hourly limit reached! Resets in ${minutesUntilReset} minutes.`,
        type: 'hourly_limit',
        resetTime: minutesUntilReset
      };
    }

    return { 
      available: true,
      dailyRemaining,
      hourlyRemaining,
      energyReward: Math.min(ENERGY_REWARD_AMOUNT, MAX_ENERGY - currentEnergy)
    };
  } catch (error) {
    console.error('Failed to check energy ad availability:', error);
    return { available: false, error: 'Failed to check availability' };
  }
};

// Function to add mystery box from ads with limits
export const addBoxFromAd = async (userId) => {
  if (!userId) {
    console.error('Invalid userId for addBoxFromAd');
    return { success: false, error: 'Invalid user ID' };
  }

  try {
    // Get admin config for dynamic limits
    const adminConfig = await getAdminConfig();
    const DAILY_BOX_AD_LIMIT = adminConfig?.dailyBoxAdLimit || DEFAULT_DAILY_BOX_AD_LIMIT;
    const HOURLY_BOX_AD_LIMIT = adminConfig?.hourlyBoxAdLimit || DEFAULT_HOURLY_BOX_AD_LIMIT;
    const BOX_REWARD_AMOUNT = adminConfig?.boxRewardAmount || DEFAULT_BOX_REWARD_AMOUNT;

    const userRef = doc(db, 'users', userId);
    
    // Check if user exists
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      console.error('User not found:', userId);
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();

    // Check daily and hourly limits
    const now = new Date();
    const today = now.toDateString();
    const currentHour = now.getHours();
    
    const boxAdHistory = userData.boxAdHistory || {};
    const todayHistory = boxAdHistory[today] || {};
    const hourlyHistory = todayHistory[currentHour] || 0;
    const dailyTotal = Object.values(todayHistory).reduce((sum, count) => sum + count, 0);

    // Check daily limit
    if (dailyTotal >= DAILY_BOX_AD_LIMIT) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const hoursUntilReset = Math.ceil((tomorrow - now) / (1000 * 60 * 60));
      
      return { 
        success: false, 
        error: `Daily mystery box ad limit reached! Resets in ${hoursUntilReset} hours.`,
        type: 'daily_limit',
        resetTime: hoursUntilReset
      };
    }

    // Check hourly limit
    if (hourlyHistory >= HOURLY_BOX_AD_LIMIT) {
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      const minutesUntilReset = Math.ceil((nextHour - now) / (1000 * 60));
      
      return { 
        success: false, 
        error: `Hourly mystery box ad limit reached! Resets in ${minutesUntilReset} minutes.`,
        type: 'hourly_limit',
        resetTime: minutesUntilReset
      };
    }

    const currentBoxes = userData.mysteryBoxes || 0;

    // Add mystery box to user
    const newBoxCount = currentBoxes + BOX_REWARD_AMOUNT;

    // Update user boxes and ad history
    const updatedHistory = {
      ...boxAdHistory,
      [today]: {
        ...todayHistory,
        [currentHour]: hourlyHistory + 1
      }
    };

    await updateDoc(userRef, {
      mysteryBoxes: newBoxCount,
      boxAdHistory: updatedHistory,
      lastBoxAdTime: now
    });

    console.log(`Successfully added ${BOX_REWARD_AMOUNT} mystery box from ad for user ${userId}`);
    return { 
      success: true, 
      boxesGained: BOX_REWARD_AMOUNT,
      newBoxCount: newBoxCount,
      dailyUsed: dailyTotal + 1,
      hourlyUsed: hourlyHistory + 1
    };
  } catch (error) {
    console.error('Failed to add mystery box from ad:', error);
    return { success: false, error: 'Failed to process mystery box reward' };
  }
};

// Function to check mystery box ad availability
export const checkBoxAdAvailability = async (userId) => {
  if (!userId) {
    return { available: false, error: 'Invalid user ID' };
  }

  try {
    // Get admin config for dynamic limits
    const adminConfig = await getAdminConfig();
    const DAILY_BOX_AD_LIMIT = adminConfig?.dailyBoxAdLimit || DEFAULT_DAILY_BOX_AD_LIMIT;
    const HOURLY_BOX_AD_LIMIT = adminConfig?.hourlyBoxAdLimit || DEFAULT_HOURLY_BOX_AD_LIMIT;
    const BOX_REWARD_AMOUNT = adminConfig?.boxRewardAmount || DEFAULT_BOX_REWARD_AMOUNT;

    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { available: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const now = new Date();
    const today = now.toDateString();
    const currentHour = now.getHours();
    
    const boxAdHistory = userData.boxAdHistory || {};
    const todayHistory = boxAdHistory[today] || {};
    const hourlyHistory = todayHistory[currentHour] || 0;
    const dailyTotal = Object.values(todayHistory).reduce((sum, count) => sum + count, 0);

    // Check limits
    const dailyRemaining = DAILY_BOX_AD_LIMIT - dailyTotal;
    const hourlyRemaining = HOURLY_BOX_AD_LIMIT - hourlyHistory;

    if (dailyRemaining <= 0) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const hoursUntilReset = Math.ceil((tomorrow - now) / (1000 * 60 * 60));
      
      return { 
        available: false, 
        error: `Daily limit reached! Resets in ${hoursUntilReset} hours.`,
        type: 'daily_limit',
        resetTime: hoursUntilReset
      };
    }

    if (hourlyRemaining <= 0) {
      const nextHour = new Date(now);
      nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
      const minutesUntilReset = Math.ceil((nextHour - now) / (1000 * 60));
      
      return { 
        available: false, 
        error: `Hourly limit reached! Resets in ${minutesUntilReset} minutes.`,
        type: 'hourly_limit',
        resetTime: minutesUntilReset
      };
    }

    return { 
      available: true,
      dailyRemaining,
      hourlyRemaining,
      boxReward: BOX_REWARD_AMOUNT
    };
  } catch (error) {
    console.error('Failed to check mystery box ad availability:', error);
    return { available: false, error: 'Failed to check availability' };
  }
};

// MYSTERY BOX FUNCTIONS
// Function to add mystery boxes to user
export const addUserBox = async (userId, boxCount = 1) => {
  if (!userId || !boxCount || boxCount <= 0) {
    console.error('Invalid parameters for addUserBox');
    return false;
  }

  try {
    const userRef = doc(db, 'users', userId);
    
    // Check if user exists first
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      console.error('User not found:', userId);
      return false;
    }

    // Update user mystery boxes using increment
    await updateDoc(userRef, {
      mysteryBoxes: increment(boxCount),
      lastBoxEarned: new Date()
    });

    console.log(`Successfully added ${boxCount} mystery box(es) to user ${userId}`);
    return true;
  } catch (error) {
    console.error('Failed to add mystery box:', error);
    return false;
  }
};

// Function to get user's mystery box count
export const getUserBoxCount = async (userId) => {
  if (!userId) {
    console.error('Invalid userId for getUserBoxCount');
    return 0;
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('User not found:', userId);
      return 0;
    }

    const userData = userDoc.data();
    return userData.mysteryBoxes || 0;
  } catch (error) {
    console.error('Failed to get user box count:', error);
    return 0;
  }
};

// Function to open/consume mystery boxes
export const openMysteryBox = async (userId, boxesToOpen = 1) => {
  if (!userId || !boxesToOpen || boxesToOpen <= 0) {
    console.error('Invalid parameters for openMysteryBox');
    return { success: false, error: 'Invalid parameters' };
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('User not found:', userId);
      return { success: false, error: 'User not found' };
    }

    const userData = userDoc.data();
    const currentBoxes = userData.mysteryBoxes || 0;

    if (currentBoxes < boxesToOpen) {
      console.error('Insufficient boxes:', { current: currentBoxes, required: boxesToOpen });
      return { 
        success: false, 
        error: 'Not enough boxes',
        currentBoxes: currentBoxes,
        required: boxesToOpen
      };
    }

    // Deduct boxes using increment with negative value
    await updateDoc(userRef, {
      mysteryBoxes: increment(-boxesToOpen),
      lastBoxOpened: new Date(),
      totalBoxesOpened: increment(boxesToOpen) // Track total boxes opened
    });

    console.log(`Successfully opened ${boxesToOpen} mystery box(es) for user ${userId}`);
    return { 
      success: true, 
      remainingBoxes: currentBoxes - boxesToOpen,
      openedBoxes: boxesToOpen
    };
  } catch (error) {
    console.error('Failed to open mystery box:', error);
    return { success: false, error: 'Database error' };
  }
};

// Function to log mystery box transactions (for analytics)
export const logBoxTransaction = async (userId, type, amount, source = 'unknown') => {
  if (!userId || !type || !amount) {
    console.error('Invalid parameters for logBoxTransaction');
    return false;
  }

  try {
    const transactionRef = collection(db, 'boxTransactions');
    await addDoc(transactionRef, {
      userId,
      type, // 'earned', 'opened'
      amount,
      source, // 'ad', 'task', 'admin', 'purchase'
      timestamp: new Date(),
      createdAt: new Date()
    });

    console.log(`Box transaction logged: ${type} ${amount} for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Failed to log box transaction:', error);
    return false;
  }
};

// Function to get user's mystery box statistics
export const getUserBoxStats = async (userId) => {
  if (!userId) {
    console.error('Invalid userId for getUserBoxStats');
    return { current: 0, totalEarned: 0, totalOpened: 0 };
  }

  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('User not found:', userId);
      return { current: 0, totalEarned: 0, totalOpened: 0 };
    }

    const userData = userDoc.data();
    return {
      current: userData.mysteryBoxes || 0,
      totalEarned: userData.totalBoxesEarned || 0,
      totalOpened: userData.totalBoxesOpened || 0,
      lastBoxEarned: userData.lastBoxEarned || null,
      lastBoxOpened: userData.lastBoxOpened || null
    };
  } catch (error) {
    console.error('Failed to get user box stats:', error);
    return { current: 0, totalEarned: 0, totalOpened: 0 };
  }
};

// WEEKLY REFERRALS FUNCTIONS
// Function to reset weekly referrals for all users (should be called weekly via cron job)
export const resetWeeklyReferrals = async () => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        weeklyReferrals: 0,
        weeklyReferralsLastReset: new Date()
      });
    });
    
    await batch.commit();
    console.log('Weekly referrals reset for all users');
    return true;
  } catch (error) {
    console.error('Failed to reset weekly referrals:', error);
    return false;
  }
};

// Function to update weekly referrals when a new user is referred
export const updateWeeklyReferrals = async (referrerUserId, newUserId) => {
  try {
    const userRef = doc(db, 'users', referrerUserId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      console.error('Referrer user not found:', referrerUserId);
      return false;
    }
    
    const userData = userDoc.data();
    const currentDate = new Date();
    
    // Check if we need to reset weekly referrals (if it's been more than a week)
    const lastReset = userData.weeklyReferralsLastReset?.toDate ? 
      userData.weeklyReferralsLastReset.toDate() : 
      userData.weeklyReferralsLastReset ? new Date(userData.weeklyReferralsLastReset) : null;
    
    let weeklyReferrals = userData.weeklyReferrals || 0;
    let needsReset = false;
    
    if (lastReset) {
      const daysSinceReset = (currentDate - lastReset) / (1000 * 60 * 60 * 24);
      if (daysSinceReset >= 7) {
        weeklyReferrals = 0;
        needsReset = true;
      }
    }
    
    // Increment weekly referrals
    weeklyReferrals += 1;
    
    // Update referral history
    const referralHistoryEntry = {
      userId: newUserId,
      joinedAt: currentDate,
      timestamp: serverTimestamp()
    };
    
    const updates = {
      weeklyReferrals: weeklyReferrals,
      referrals: increment(1), // Also increment total referrals
      referralHistory: arrayUnion(referralHistoryEntry)
    };
    
    if (needsReset || !lastReset) {
      updates.weeklyReferralsLastReset = currentDate;
    }
    
    await updateDoc(userRef, updates);
    
    console.log(`Updated weekly referrals for user ${referrerUserId}: ${weeklyReferrals}`);
    return true;
  } catch (error) {
    console.error('Failed to update weekly referrals:', error);
    return false;
  }
};

// Function to get current week's start date
export const getCurrentWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};
