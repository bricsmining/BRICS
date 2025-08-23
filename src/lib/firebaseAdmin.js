// lib/firebaseAdmin.js
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getApps } from 'firebase-admin/app';

const app =
  getApps().length === 0
    ? initializeApp({
        credential: applicationDefault(), // Or use cert({}) with service account
      })
    : getApps()[0];

const db = getFirestore(app);

// Helper function to get admin configuration using Admin SDK (server-side only)
export const getAdminConfigServerSide = async () => {
  try {
    console.log('[FirebaseAdmin] Attempting to get admin config using Admin SDK...');
    const configRef = db.collection('admin').doc('config');
    const configDoc = await configRef.get();
    
    if (!configDoc.exists) {
      console.error('[FirebaseAdmin] Admin configuration document not found');
      throw new Error('Admin configuration document not found in Firebase');
    }
    
    const configData = configDoc.data();
    console.log('[FirebaseAdmin] Admin config loaded successfully using Admin SDK');
    
    // Validate critical financial configuration
    if (!configData.stonToTonRate || configData.stonToTonRate <= 0) {
      throw new Error('Critical admin configuration missing or invalid: stonToTonRate');
    }
    
    return configData;
  } catch (error) {
    console.error('[FirebaseAdmin] CRITICAL: Error getting admin config with Admin SDK:', error);
    throw new Error(`Failed to retrieve admin configuration: ${error.message}. Cannot proceed with financial operations without valid configuration.`);
  }
};

export { db };
