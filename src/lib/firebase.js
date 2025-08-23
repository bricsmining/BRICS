// src/lib/firebase.js

import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Add connection retry logic
let retryAttempts = 0;
const MAX_RETRY_ATTEMPTS = 3;

const attemptReconnection = async () => {
  if (retryAttempts < MAX_RETRY_ATTEMPTS) {
    retryAttempts++;
    console.log(`[Firebase] Attempting to reconnect... (${retryAttempts}/${MAX_RETRY_ATTEMPTS})`);
    
    try {
      await enableNetwork(db);
      console.log('[Firebase] Successfully reconnected to Firestore');
      retryAttempts = 0; // Reset counter on successful reconnection
    } catch (error) {
      console.error(`[Firebase] Reconnection attempt ${retryAttempts} failed:`, error);
      
      if (retryAttempts < MAX_RETRY_ATTEMPTS) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.pow(2, retryAttempts) * 1000;
        setTimeout(attemptReconnection, delay);
      } else {
        console.error('[Firebase] Max reconnection attempts reached. Operating in offline mode.');
      }
    }
  }
};

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Firebase] Network back online, attempting reconnection...');
    attemptReconnection();
  });
  
  window.addEventListener('offline', () => {
    console.log('[Firebase] Network went offline');
  });
}

export { app, db, auth, attemptReconnection };
