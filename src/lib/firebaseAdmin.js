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
export { db };
