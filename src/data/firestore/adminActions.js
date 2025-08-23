import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDoc,
  increment,
  serverTimestamp
} from "firebase/firestore";
import {
  updateUser,
  completeTaskForUser,
  rejectManualVerificationForUser
} from '@/data/firestore/userActions';
// Removed botNotifications import - using backend API endpoints instead

// Fetch all users, ordered by join date
export const getAllUsers = async () => {
  const usersColRef = collection(db, "users");
  try {
    const q = query(usersColRef, orderBy("joinedAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching all users:", error);
    return [];
  }
};

// Toggle ban status for a user
export const setUserBanStatus = async (userId, isBanned) => {
  try {
    await updateUser(userId, { isBanned });
    console.log(`User ${userId} ban status set to: ${isBanned}`);
    return true;
  } catch (error) {
    console.error(`Error updating ban status for user ${userId}:`, error);
    return false;
  }
};

// Toggle admin status for a user
export const setUserAdminStatus = async (userId, isAdmin) => {
  try {
    await updateUser(userId, { isAdmin });
    console.log(`User ${userId} admin status set to: ${isAdmin}`);
    return true;
  } catch (error) {
    console.error(`Error updating admin status for user ${userId}:`, error);
    return false;
  }
};

// Fetches all users with pending manual tasks
export const getPendingVerifications = async () => {
  const usersColRef = collection(db, "users");
  try {
    const snapshot = await getDocs(query(usersColRef));
    const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const pendingItems = [];

    for (const user of allUsers) {
      if (Array.isArray(user.pendingVerificationTasks) && user.pendingVerificationTasks.length > 0) {
        for (const taskId of user.pendingVerificationTasks) {
          // --- NEW: Get details from pendingVerificationDetails if present ---
          const details = user.pendingVerificationDetails?.[taskId] || {};
          pendingItems.push({
            userId: user.id,
            username: user.username || user.firstName || `User ${user.id}`,
            taskId,
            title: details.title || '',
            target: details.target || undefined,
            reward: details.reward || undefined
          });
        }
      }
    }

    return pendingItems;
  } catch (error) {
    console.error("Error fetching pending verifications:", error);
    return [];
  }
};

// Approve a task (mark it complete and reward user)
export const approveTask = async (userId, taskId) => {
  const success = await completeTaskForUser(userId, taskId);
  
  if (success) {
    try {
      // Get task and user info for notification
      const taskRef = doc(db, 'tasks', taskId);
      const taskSnap = await getDoc(taskRef);
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (taskSnap.exists() && userSnap.exists()) {
        const task = taskSnap.data();
        const user = userSnap.data();
        
        // Send user notification via backend API
        try {
          await fetch('/api/notifications?action=user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api: import.meta.env.VITE_ADMIN_API_KEY,
              userId: userId,
              type: 'task_approved',
              data: {
                taskTitle: task.title,
                reward: task.reward
              }
            })
          });
        } catch (notifError) {
          console.error('Failed to send user notification:', notifError);
        }
        
        // Check for pending referral rewards after manual task approval
        try {
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
            if (result.success && result.rewardsDistributed) {
              console.log(`Referral rewards distributed for user ${userId} after manual task approval:`, result);
            }
          }
        } catch (error) {
          console.error('Error checking referral rewards after task approval:', error);
        }
      }
    } catch (error) {
      console.error('Error sending task approval notification:', error);
    }
  }
  
  return success;
};

// Reject a task (remove it from pending list)
export const rejectTask = async (userId, taskId, reason = 'Requirements not met') => {
  const success = await rejectManualVerificationForUser(userId, taskId);
  
  if (success) {
    try {
      // Get task info for notification
      const taskRef = doc(db, 'tasks', taskId);
      const taskSnap = await getDoc(taskRef);
      
      if (taskSnap.exists()) {
        const task = taskSnap.data();
        // Send user notification via backend API
        try {
          await fetch('/api/notifications?action=user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api: import.meta.env.VITE_ADMIN_API_KEY,
              userId: userId,
              type: 'task_rejected',
              data: {
                taskTitle: task.title,
                reason: reason
              }
            })
          });
        } catch (notifError) {
          console.error('Failed to send user notification:', notifError);
        }
      }
    } catch (error) {
      console.error('Error sending task rejection notification:', error);
    }
  }
  
  return success;
};

// ==================== WITHDRAWAL FUNCTIONS ====================

// Get all pending withdrawal requests
export const getPendingWithdrawals = async () => {
  try {
    console.log('Fetching pending withdrawals...'); // Debug log
    const withdrawalsRef = collection(db, 'withdrawals');
    
    // First, let's try to get all documents to see what's there
    const allDocsQuery = query(withdrawalsRef);
    const allDocsSnapshot = await getDocs(allDocsQuery);
    
    console.log('Total withdrawal documents found:', allDocsSnapshot.size); // Debug log
    
    // Log all documents to see their structure
    allDocsSnapshot.forEach((doc) => {
      console.log('Document ID:', doc.id, 'Data:', doc.data());
    });
    
    // Now try the specific query for pending withdrawals
    const q = query(withdrawalsRef, where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const withdrawals = [];
    querySnapshot.forEach((doc) => {
      withdrawals.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log('getPendingWithdrawals result:', withdrawals); // Debug log
    return withdrawals;
  } catch (error) {
    console.error('Error fetching pending withdrawals:', error);
    
    // If the orderBy query fails, try without orderBy
    try {
      console.log('Retrying without orderBy...');
      const withdrawalsRef = collection(db, 'withdrawals');
      const q = query(withdrawalsRef, where('status', '==', 'pending'));
      const querySnapshot = await getDocs(q);
      
      const withdrawals = [];
      querySnapshot.forEach((doc) => {
        withdrawals.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('getPendingWithdrawals result (without orderBy):', withdrawals);
      return withdrawals;
    } catch (retryError) {
      console.error('Error in retry attempt:', retryError);
      return [];
    }
  }
};

// Helper function to convert STON to TON (will use admin config rate)
const stonToTon = (ston, adminConfig = null) => {
  const amount = parseFloat(ston) || 0;
  const stonToTonRate = adminConfig?.stonToTonRate || 0.0000001; // Default: 10M STON = 1 TON
  return (amount * stonToTonRate).toFixed(6);
};

// Approve a withdrawal request and initiate OxaPay payout
export const approveWithdrawal = async (withdrawalId, userId, amount) => {
  try {
    console.log(`Approving withdrawal: ${withdrawalId} for user: ${userId}, amount: ${amount}`);
    
    // Get withdrawal data first
    const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
    const withdrawalDoc = await getDoc(withdrawalRef);
    
    if (!withdrawalDoc.exists()) {
      throw new Error('Withdrawal request not found');
    }
    
    const withdrawalData = withdrawalDoc.data();
    const { walletAddress, username } = withdrawalData;
    
    if (!walletAddress) {
      throw new Error('No wallet address found in withdrawal request');
    }

    // Get user data to retrieve TON memo
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const tonMemo = userData.tonMemo;
    
    // Memo is now optional - no need to check for existence

    // Get admin config for dynamic exchange rate with fallback
    let adminConfig;
    try {
      const { getServerAdminConfig } = await import('@/lib/serverFirebase');
      adminConfig = await getServerAdminConfig();
    } catch (configError) {
      console.error('Failed to get admin config, using default:', configError);
      // Use default admin config if server config fails
      adminConfig = {
        stonToTonRate: 0.0000001, // Default: 10M STON = 1 TON
        minWithdrawalAmount: 10000000,
        maxWithdrawalAmount: 1000000000,
        withdrawalEnabled: true
      };
    }
    
    // Convert STON to TON for payout
    const tonAmount = stonToTon(amount, adminConfig);
    
    console.log(`Initiating OxaPay payout: ${tonAmount} TON to ${walletAddress}`);

    // Call OxaPay payout API with v1 specification
    try {
      const payoutData = {
        address: walletAddress,
        amount: parseFloat(tonAmount),
        currency: 'TON',
        network: 'TON',
        description: `SkyTON withdrawal for ${username || userId}`,
        withdrawalId: withdrawalId,
        userId: userId
      };

      // Only include memo if it exists
      if (tonMemo && tonMemo.trim() !== '') {
        payoutData.memo = tonMemo;
        console.log(`Including TON memo in payout: ${tonMemo}`);
      } else {
        console.log('No memo provided - processing withdrawal without memo');
      }

      const payoutResponse = await fetch('/api/oxapay?action=payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payoutData)
      });

      const payoutResult = await payoutResponse.json();

      if (!payoutResult.success) {
        console.error('OxaPay payout failed:', payoutResult);
        const detailedError = new Error(payoutResult.error || 'Payout creation failed');
        detailedError.oxapayDetails = payoutResult.oxapayDetails;
        detailedError.fullResponse = payoutResult;
        throw detailedError;
      }

      console.log('OxaPay payout created successfully:', payoutResult.data);

      // Update withdrawal status with payout information
      await updateDoc(withdrawalRef, {
        status: 'approved',
        approvedAt: serverTimestamp(),
        processedBy: 'admin',
        payoutTrackId: payoutResult.data.track_id,
        payoutStatus: payoutResult.data.status,
        tonAmount: parseFloat(tonAmount),
        payoutCreatedAt: serverTimestamp()
      });

      // Remove pending withdrawal amount (balance was already deducted during request)
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        pendingWithdrawal: increment(-parseFloat(amount)) // Remove from pending
      });

      // Send user notification about approval via telegram bot
      try {
        await fetch('/api/telegram-bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'notify_user',
            userId: userId,
            type: 'withdrawal_approved',
            data: {
              amount: parseFloat(amount),
              tonAmount: parseFloat(tonAmount),
              address: walletAddress,
              trackId: payoutResult.data.track_id
            }
          })
        });
      } catch (notificationError) {
        console.error('Failed to send approval notification to user:', notificationError);
      }

      // Send detailed success notification to admin
      try {
        await fetch('/api/telegram-bot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'notify_admin',
            type: 'payout_success',
            data: {
              userId: userId,
              username: username || userId,
              amount: parseFloat(amount),
              tonAmount: parseFloat(tonAmount),
              address: walletAddress,
              memo: tonMemo || null,
              trackId: payoutResult.data.track_id,
              withdrawalId: withdrawalId,
              status: payoutResult.data.status
            }
          })
        });
      } catch (notificationError) {
        console.error('Failed to send admin success notification:', notificationError);
      }

      console.log(`Withdrawal ${withdrawalId} approved and payout initiated for user ${userId}`);
      return { success: true };

    } catch (payoutError) {
      console.error('Error creating OxaPay payout:', payoutError);
      
      // Update withdrawal status to indicate payout failure
      await updateDoc(withdrawalRef, {
        status: 'payout_failed',
        approvedAt: serverTimestamp(),
        processedBy: 'admin',
        payoutError: payoutError.message,
        payoutFailedAt: serverTimestamp()
      });

      // Send detailed failure notification to admin via telegram bot
      try {
        await fetch('/api/notifications?action=admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api: process.env.ADMIN_API_KEY,
            type: 'payout_failed',
            data: {
              userId: userId,
              userName: userData.firstName || userData.lastName || userData.username || username || 'Unknown',
              userTelegramUsername: userData.username,
              username: username || userId,
              amount: parseFloat(amount),
              tonAmount: parseFloat(tonAmount),
              address: walletAddress,
              memo: tonMemo || null,
              withdrawalId: withdrawalId,
              error: payoutError.message,
              errorDetails: payoutError.details || 'No additional details available',
              oxapayDetails: payoutError.oxapayDetails || null,
              fullResponse: payoutError.fullResponse || null
            }
          })
        });
      } catch (notificationError) {
        console.error('Failed to send failure notification:', notificationError);
      }

      // Return error object instead of false to allow proper error handling in UI
      return { 
        success: false, 
        error: payoutError.message,
        oxapayDetails: payoutError.oxapayDetails,
        fullResponse: payoutError.fullResponse
      };
    }

  } catch (error) {
    console.error('Error approving withdrawal:', error);
    
    // Try to send failure notification even for main process errors
    try {
      await fetch('/api/notifications?action=admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api: process.env.ADMIN_API_KEY,
          type: 'payout_failed',
          data: {
            userId: userId,
            userName: 'Unknown', // We may not have userData in this scope
            userTelegramUsername: null,
            username: userId,
            amount: parseFloat(amount),
            tonAmount: 0,
            address: 'Unknown',
            memo: null,
            withdrawalId: withdrawalId,
            error: error.message,
            errorDetails: 'System error during withdrawal approval process',
            oxapayDetails: null,
            fullResponse: null
          }
        })
      });
    } catch (notificationError) {
      console.error('Failed to send main error notification:', notificationError);
    }
    
    return { 
      success: false, 
      error: error.message,
      oxapayDetails: null,
      fullResponse: null
    };
  }
};

// Reject a withdrawal request
export const rejectWithdrawal = async (withdrawalId) => {
  try {
    console.log(`Rejecting withdrawal: ${withdrawalId}`);
    
    // Get withdrawal data to refund the correct amount
    const withdrawalRef = doc(db, 'withdrawals', withdrawalId);
    const withdrawalDoc = await getDoc(withdrawalRef);
    
    if (!withdrawalDoc.exists()) {
      throw new Error('Withdrawal request not found');
    }
    
    const withdrawalData = withdrawalDoc.data();
    const { userId, amount } = withdrawalData;
    
    // Update withdrawal status
    await updateDoc(withdrawalRef, {
      status: 'rejected',
      rejectedAt: serverTimestamp(),
      processedBy: 'admin'
    });

    // Refund the balance to user
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      balance: increment(parseFloat(amount)), // Refund the amount
      pendingWithdrawal: increment(-parseFloat(amount)) // Remove from pending
    });

    // Send user notification about rejection
    try {
      
      // Send user notification via backend API
      await fetch('/api/notifications?action=user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api: import.meta.env.VITE_ADMIN_API_KEY,
          userId: withdrawalData.userId,
          type: 'withdrawal_rejected',
          data: {
            amount: withdrawalData.amount,
            reason: 'Administrative decision'
          }
        })
      });
    } catch (notificationError) {
      console.error('Failed to send rejection notification to user:', notificationError);
    }

    console.log(`Withdrawal ${withdrawalId} rejected`);
    return true;
  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    return false;
  }
};

// Create a withdrawal request (to be used in ProfileSection)
export const createWithdrawalRequest = async (userId, amount, walletAddress, userBalance, username) => {
  try {
    console.log(`Creating withdrawal request for user ${userId}, amount: ${amount} STON`);
    
    // Check if user has sufficient balance first
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    const currentBalance = userData.balance || 0;
    
    if (currentBalance < amount) {
      throw new Error('Insufficient balance for withdrawal');
    }
    
    // Cut the balance immediately as pending withdrawal
    await updateDoc(userRef, {
      balance: increment(-parseFloat(amount)),
      pendingWithdrawal: increment(parseFloat(amount)) // Track pending amount
    });
    
    const withdrawalsRef = collection(db, 'withdrawals');
    const docRef = await addDoc(withdrawalsRef, {
      userId: userId.toString(), // Ensure userId is a string
      username: username || null,
      amount: parseFloat(amount),
      walletAddress,
      userBalance: currentBalance, // Store balance before deduction
      balanceAfterDeduction: currentBalance - parseFloat(amount),
      status: 'pending',
      createdAt: serverTimestamp()
    });
    
    console.log(`Withdrawal request created with ID: ${docRef.id} for user ${userId}, amount: ${amount} STON - Balance cut immediately`);
    
    // Return the document ID so the caller can send notification with correct ID
    return {
      success: true,
      withdrawalId: docRef.id
    };
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get withdrawal history for a specific user
export const getUserWithdrawalHistory = async (userId) => {
  try {
    console.log(`Fetching withdrawal history for user: ${userId}`);
    
    const withdrawalsRef = collection(db, 'withdrawals');
    
    // First, let's try to get all documents for this user to see what's there
    const allUserDocsQuery = query(withdrawalsRef, where('userId', '==', userId.toString()));
    const allUserDocsSnapshot = await getDocs(allUserDocsQuery);
    
    console.log(`Total withdrawal documents found for user ${userId}:`, allUserDocsSnapshot.size);
    
    // Log all documents to see their structure
    allUserDocsSnapshot.forEach((doc) => {
      console.log('User withdrawal document ID:', doc.id, 'Data:', doc.data());
    });
    
    // Now try the specific query with orderBy
    try {
      const q = query(withdrawalsRef, where('userId', '==', userId.toString()), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const withdrawals = [];
      querySnapshot.forEach((doc) => {
        withdrawals.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('getUserWithdrawalHistory result:', withdrawals);
      return withdrawals;
    } catch (orderByError) {
      console.log('OrderBy failed, trying without orderBy...');
      
      // If orderBy fails, return the results without ordering
      const withdrawals = [];
      allUserDocsSnapshot.forEach((doc) => {
        withdrawals.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort manually by createdAt
      withdrawals.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      
      console.log('getUserWithdrawalHistory result (manual sort):', withdrawals);
      return withdrawals;
    }
  } catch (error) {
    console.error('Error fetching user withdrawal history:', error);
    return [];
  }
};

// Get all withdrawal history for admin (all users, all statuses)
export const getAllWithdrawalHistory = async () => {
  try {
    console.log('Fetching all withdrawal history for admin...');
    
    const withdrawalsRef = collection(db, 'withdrawals');
    
    // First, let's try to get all documents to see what's there
    const allDocsQuery = query(withdrawalsRef);
    const allDocsSnapshot = await getDocs(allDocsQuery);
    
    console.log('Total withdrawal documents found:', allDocsSnapshot.size);
    
    // Log all documents to see their structure
    allDocsSnapshot.forEach((doc) => {
      console.log('Withdrawal document ID:', doc.id, 'Data:', doc.data());
    });
    
    // Now try the specific query with orderBy
    try {
      const q = query(withdrawalsRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const withdrawals = [];
      querySnapshot.forEach((doc) => {
        withdrawals.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log('getAllWithdrawalHistory result:', withdrawals);
      return withdrawals;
    } catch (orderByError) {
      console.log('OrderBy failed, trying without orderBy...');
      
      // If orderBy fails, return the results without ordering
      const withdrawals = [];
      allDocsSnapshot.forEach((doc) => {
        withdrawals.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      // Sort manually by createdAt (newest first)
      withdrawals.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      
      console.log('getAllWithdrawalHistory result (manual sort):', withdrawals);
      return withdrawals;
    }
  } catch (error) {
    console.error('Error fetching all withdrawal history:', error);
    return [];
  }
};
      
