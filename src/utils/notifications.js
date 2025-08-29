/**
 * Notification Utility Functions
 * Easy-to-use functions for sending Telegram notifications
 */

// Get base URL for API calls
function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : process.env.VITE_WEB_APP_URL || import.meta.env.VITE_WEB_APP_URL || 'https://skyton.vercel.app';
}

// Get admin API key
// SECURITY: No API keys exposed to client
// Use secure API endpoints instead

// Send admin notification
export async function notifyAdmin(type, data) {
  try {
    // SECURITY: Use secure API without exposing keys
    const { sendSecureNotification } = await import('@/utils/secureApi');
    const result = await sendSecureNotification(null, type, data);
    
    if (result.success) {
      console.log(`✅ Admin notification sent: ${type}`);
      return true;
    } else {
      console.error(`❌ Admin notification failed: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error('Error sending admin notification:', error);
    return false;
  }
}

// Send user notification
export async function notifyUser(userId, type, data) {
  try {
    const baseUrl = getBaseUrl();
    // SECURITY: No API key needed - using secure endpoint
    
    if (!userId) {
      console.warn('User ID is required for user notifications');
      return false;
    }

    // SECURITY: Use secure API without exposing keys
    const { sendSecureNotification } = await import('@/utils/secureApi');
    const result = await sendSecureNotification(userId, type, data);
    
    if (result.success) {
      console.log(`✅ User notification sent: ${type} to ${userId}`);
      return true;
    } else {
      console.error(`❌ User notification failed: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error('Error sending user notification:', error);
    return false;
  }
}

// Specific notification functions for common events

export async function notifyNewUser(userData, referrerId = null) {
  return await notifyAdmin('new_user', {
    userId: userData.id,
    name: userData.firstName || userData.username,
    username: userData.username,
    referrerId: referrerId
  });
}

export async function notifySuccessfulReferral(referrerId, referrerName, newUserId, newUserName, reward) {
  // Notify admin
  await notifyAdmin('referral', {
    referrerId,
    referrerName,
    newUserId,
    newUserName,
    reward
  });
  
  // Notify referrer
  await notifyUser(referrerId, 'successful_referral', {
    referrerId,
    newUserName,
    reward
  });
}

export async function notifyTaskSubmission(userId, userName, taskTitle, reward, target) {
  return await notifyAdmin('task_submission', {
    userId,
    userName,
    taskTitle,
    reward,
    target
  });
}

export async function notifyWithdrawalRequest(userId, userName, amount, method, address, currentBalance) {
  return await notifyAdmin('withdrawal_request', {
    userId,
    userName,
    amount,
    method,
    address,
    currentBalance
  });
}

export async function notifyTaskCompletion(userId, userName, taskTitle, reward, taskType = 'Auto') {
  return await notifyAdmin('task_completion', {
    userId,
    userName,
    taskTitle,
    reward,
    taskType
  });
}

export async function notifyEnergyEarning(userId, userName, energy, stonEquivalent) {
  return await notifyAdmin('energy_earning', {
    userId,
    userName,
    energy,
    stonEquivalent
  });
}

export async function notifyBoxOpening(userId, userName, boxType, reward, source = 'Ad Reward') {
  return await notifyAdmin('box_opening', {
    userId,
    userName,
    boxType,
    reward,
    source
  });
}

export async function notifyTaskApproval(userId, taskTitle, reward) {
  return await notifyUser(userId, 'task_approved', {
    taskTitle,
    reward
  });
}

export async function notifyTaskRejection(userId, taskTitle, reason) {
  return await notifyUser(userId, 'task_rejected', {
    taskTitle,
    reason
  });
}

export async function notifyWithdrawalApproval(userId, amount, method, address) {
  return await notifyUser(userId, 'withdrawal_approved', {
    amount,
    method,
    address
  });
}

export async function notifyWithdrawalRejection(userId, amount, reason) {
  return await notifyUser(userId, 'withdrawal_rejected', {
    amount,
    reason
  });
}
