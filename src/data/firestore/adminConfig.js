import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase'; // Use existing Firebase instance

// Default admin configuration (stored in database)
const defaultConfig = {
  // Ad Networks (editable in admin panel)
  adsgramEnabled: true,
  adsgramBlockId: 'int-12066',
  monetagEnabled: true,
  monetagZoneId: '9475832',
  
  // Limits & Features (editable in admin panel)
  dailyEnergyAdLimit: 10,
  hourlyEnergyAdLimit: 3,
  dailyBoxAdLimit: 10,
  hourlyBoxAdLimit: 3,
  maxEnergy: 500,
  minWithdrawalAmount: 100000000, // 10 TON in STON
  
  // Feature Toggles (editable in admin panel)
  withdrawalEnabled: true,
  miningEnabled: true,
  tasksEnabled: true,
  referralEnabled: true,
  
  // Exchange & Rates (editable in admin panel)
  stonToTonRate: 0.0000001, // 1 STON = 0.0000001 TON
  usdToTonRate: 5.50, // 1 USD = 5.50 TON (example)
  
  // Telegram Settings (editable in admin panel)
  telegramJoinRequired: true,
  telegramChannelLink: '@skyton_official',
  adminChatId: '', // Admin chat ID for notifications (editable)
  adminTgUsername: '', // Admin Telegram username (editable)
  
  // App Settings (editable in admin panel)
  appName: 'SkyTON',
  appVersion: '1.0.0',
  maintenanceMode: false,
  
  // Updated timestamp
  updatedAt: null,
  updatedBy: null
};

// Get admin configuration
export const getAdminConfig = async () => {
  try {
    const configRef = doc(db, 'admin', 'config');
    const configDoc = await getDoc(configRef);
    
    if (configDoc.exists()) {
      return configDoc.data();
    } else {
      // Create default config if it doesn't exist
      await setDoc(configRef, {
        ...defaultConfig,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return defaultConfig;
    }
  } catch (error) {
    console.error('Error getting admin config:', error);
    return defaultConfig;
  }
};

// Update admin configuration
export const updateAdminConfig = async (updates, adminEmail = 'system') => {
  try {
    const configRef = doc(db, 'admin', 'config');
    await updateDoc(configRef, {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: adminEmail
    });
    
    console.log('Admin config updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating admin config:', error);
    return false;
  }
};

// Get environment variables (sensitive data only)
export const getEnvConfig = () => ({
  // Sensitive data from environment variables
  telegramBotToken: import.meta.env.VITE_TG_BOT_TOKEN || '',
  oxapayApiKey: import.meta.env.VITE_OXAPAY_API_KEY || '',
  oxapayPayoutApiKey: import.meta.env.VITE_OXAPAY_PAYOUT_API_KEY || '',
  referralApiKey: import.meta.env.VITE_REFERRAL_API_KEY || '', // For referral system
});

// Broadcast message to all users
export const broadcastMessage = async (message, adminEmail) => {
  try {
    const [envConfig, adminConfig] = await Promise.all([
      Promise.resolve(getEnvConfig()),
      getAdminConfig()
    ]);
    const botToken = envConfig.telegramBotToken;
    
    if (!botToken) {
      throw new Error('Telegram bot token not configured');
    }
    
    // Get all users
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);
    
    let successCount = 0;
    let failCount = 0;
    
    const promises = [];
    
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
          }
        }).catch(() => {
          failCount++;
        });
        
        promises.push(promise);
      }
    });
    
    await Promise.all(promises);
    
    // Log broadcast
    const broadcastRef = doc(collection(db, 'admin', 'config', 'broadcasts'));
    await setDoc(broadcastRef, {
      message,
      sentBy: adminEmail,
      sentAt: serverTimestamp(),
      successCount,
      failCount,
      totalUsers: usersSnapshot.size
    });
    
    return { successCount, failCount, totalUsers: usersSnapshot.size };
  } catch (error) {
    console.error('Error broadcasting message:', error);
    throw error;
  }
};

export default {
  getAdminConfig,
  updateAdminConfig,
  getEnvConfig,
  broadcastMessage
};
