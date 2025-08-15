/**
 * Level Achievement Notification System
 */

import { getAdminConfig } from '@/data/firestore/adminConfig';

// Calculate user level based on balance and admin config
export function calculateUserLevel(balance, adminConfig) {
  const level5Threshold = adminConfig?.level5Threshold || 100000000;
  const level4Threshold = adminConfig?.level4Threshold || 50000000;
  const level3Threshold = adminConfig?.level3Threshold || 20000000;
  const level2Threshold = adminConfig?.level2Threshold || 5000000;
  
  if (balance >= level5Threshold) return 5;
  if (balance >= level4Threshold) return 4;
  if (balance >= level3Threshold) return 3;
  if (balance >= level2Threshold) return 2;
  return 1;
}

// Check if user leveled up and send notification
export async function checkAndNotifyLevelUp(userId, userName, previousBalance, newBalance) {
  try {
    const adminConfig = await getAdminConfig();
    
    const previousLevel = calculateUserLevel(previousBalance, adminConfig);
    const newLevel = calculateUserLevel(newBalance, adminConfig);
    
    // If level increased, send notification
    if (newLevel > previousLevel) {
      const apiBaseUrl = window.location.hostname === 'localhost' ? 'https://skyton.vercel.app' : '';
      
      await fetch(`${apiBaseUrl}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'admin',
          notificationType: 'user_level_achieve',
          data: {
            userId: userId,
            userName: userName,
            level: newLevel,
            previousLevel: previousLevel,
            totalBalance: newBalance
          }
        })
      });
      
      console.log(`Level up notification sent: User ${userId} reached level ${newLevel}`);
    }
  } catch (error) {
    console.error('Error checking/notifying level up:', error);
  }
}
