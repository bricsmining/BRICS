/**
 * Server-side Firebase configuration for API endpoints
 * This file is used by API routes that run on the server
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin SDK
let app;
let db;

try {
  // Check if Firebase Admin is already initialized
  if (getApps().length === 0) {
    // For Vercel deployment, use environment variables
    if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_ADMIN_CLIENT_EMAIL}`
      };

      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
    } else {
      // For local development, try to use the regular Firebase config
      // This is a fallback - in production you should use Firebase Admin SDK
      console.warn('Firebase Admin credentials not found, falling back to client SDK');
      
      // Import client SDK as fallback
      const { initializeApp: initializeClientApp } = await import('firebase/app');
      const { getFirestore: getClientFirestore } = await import('firebase/firestore');
      
      const firebaseConfig = {
        apiKey: process.env.VITE_FIREBASE_API_KEY,
        authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.VITE_FIREBASE_APP_ID
      };

      const clientApp = initializeClientApp(firebaseConfig);
      db = getClientFirestore(clientApp);
      
      // Export client SDK functions for compatibility
      module.exports = {
        db,
        // Re-export Firestore functions from client SDK
        collection: (await import('firebase/firestore')).collection,
        doc: (await import('firebase/firestore')).doc,
        getDocs: (await import('firebase/firestore')).getDocs,
        getDoc: (await import('firebase/firestore')).getDoc,
        addDoc: (await import('firebase/firestore')).addDoc,
        updateDoc: (await import('firebase/firestore')).updateDoc,
        deleteDoc: (await import('firebase/firestore')).deleteDoc,
        query: (await import('firebase/firestore')).query,
        where: (await import('firebase/firestore')).where,
        orderBy: (await import('firebase/firestore')).orderBy,
        limit: (await import('firebase/firestore')).limit,
        serverTimestamp: (await import('firebase/firestore')).serverTimestamp,
        increment: (await import('firebase/firestore')).increment,
        Timestamp: (await import('firebase/firestore')).Timestamp
      };
      
      return;
    }
  } else {
    app = getApps()[0];
  }

  // Initialize Firestore
  db = getFirestore(app);
  
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  
  // Fallback to client SDK for development
  try {
    const { initializeApp: initializeClientApp } = require('firebase/app');
    const { getFirestore: getClientFirestore } = require('firebase/firestore');
    
    const firebaseConfig = {
      apiKey: process.env.VITE_FIREBASE_API_KEY,
      authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.VITE_FIREBASE_APP_ID
    };

    const clientApp = initializeClientApp(firebaseConfig);
    db = getClientFirestore(clientApp);
    
    console.log('Fallback to Firebase Client SDK');
  } catch (fallbackError) {
    console.error('Failed to initialize Firebase Client SDK as fallback:', fallbackError);
    throw fallbackError;
  }
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
    const configDoc = await getDoc(doc(db, 'admin', 'config'));
    
    if (configDoc.exists()) {
      return configDoc.data();
    } else {
      // Return fallback values if no config exists
      return {
        adminChatId: process.env.VITE_ADMIN_CHAT_ID || '5063003944', // Fallback to env
        adminTgUsername: process.env.VITE_ADMIN_TG_USERNAME || '',
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
    // Return fallback with environment variables
    return {
      adminChatId: process.env.VITE_ADMIN_CHAT_ID || '5063003944',
      adminTgUsername: process.env.VITE_ADMIN_TG_USERNAME || '',
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
