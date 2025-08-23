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

// Helper function to get admin configuration with retry logic
export const getServerAdminConfig = async (retryCount = 3) => {
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      console.log(`[ServerFirebase] Attempting to get admin config... (attempt ${attempt}/${retryCount})`);
      
      // Add timeout to the request
      const configDoc = await Promise.race([
        getDoc(doc(db, 'admin', 'config')),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout after 10 seconds')), 10000)
        )
      ]);
      
      if (configDoc.exists()) {
        console.log(`[ServerFirebase] Admin config loaded successfully on attempt ${attempt}`);
        return configDoc.data();
      } else {
        console.warn(`[ServerFirebase] Admin config document does not exist (attempt ${attempt})`);
        throw new Error('Admin configuration document not found in Firebase');
      }
    } catch (error) {
      console.error(`[ServerFirebase] Error on attempt ${attempt}/${retryCount}:`, error.message);
      
      if (attempt === retryCount) {
        // Last attempt failed
        console.error('[ServerFirebase] CRITICAL: All retry attempts failed');
        throw new Error(`Failed to retrieve admin configuration after ${retryCount} attempts: ${error.message}. Cannot proceed with financial operations without valid configuration.`);
      }
      
      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      console.log(`[ServerFirebase] Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};
