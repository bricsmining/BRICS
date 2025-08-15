/**
 * Server-side Firebase configuration for API endpoints
 * This file is used by API routes that run on the server
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Initialize Firebase Client SDK for server-side usage
let db;

try {
  const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID
  };

  const app = initializeApp(firebaseConfig, 'server-app');
  db = getFirestore(app);
  
  console.log('Firebase initialized successfully for server');
} catch (error) {
  console.error('Error initializing Firebase:', error);
  throw error;
}

export { db };

// For compatibility with both Admin and Client SDK
export {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  Timestamp
} from 'firebase/firestore';

// Helper function to get admin configuration for server-side usage
export const getServerAdminConfig = async () => {
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const configDoc = await getDoc(doc(db, 'admin', 'config'));
    
    if (configDoc.exists()) {
      return configDoc.data();
    } else {
      // Return fallback values if no config exists (no env vars for these)
      return {
        adminChatId: '', // Must be set in admin panel
        adminTgUsername: '', // Must be set in admin panel
        stonToTonRate: 0.0000001,
        maxEnergy: 500,
        dailyEnergyAdLimit: 10,
        hourlyEnergyAdLimit: 3,
        dailyBoxAdLimit: 10,
        hourlyBoxAdLimit: 3,
        minWithdrawalAmount: 100000000,
        withdrawalEnabled: true,
        miningEnabled: true,
        tasksEnabled: true,
        referralEnabled: true
      };
    }
  } catch (error) {
    console.error('Error getting server admin config:', error);
    // Return fallback values (no env vars for these)
    return {
      adminChatId: '', // Must be set in admin panel
      adminTgUsername: '', // Must be set in admin panel
      stonToTonRate: 0.0000001,
      maxEnergy: 500,
      dailyEnergyAdLimit: 10,
      hourlyEnergyAdLimit: 3,
      dailyBoxAdLimit: 10,
      hourlyBoxAdLimit: 3,
      minWithdrawalAmount: 100000000,
      withdrawalEnabled: true,
      miningEnabled: true,
      tasksEnabled: true,
      referralEnabled: true
    };
  }
};
