// /pages/api/refer.js
import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  writeBatch,
  increment,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';

export default async function handler(req, res) {
  const { api, new: newUserId, referreby, tgWebAppData } = req.query;

  // Use Vercel environment variable for API key
  const VALID_API_KEY = import.meta.env.NEXT_PUBLIC_REFER_API_KEY;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Only GET method is allowed.' });
  }

  // Check if the request is from Telegram or if a valid API key is provided
  const isTelegram = tgWebAppData !== undefined;
  const hasValidApiKey = api === VALID_API_KEY;

  if (!isTelegram && !hasValidApiKey) {
    return res.status(403).json({ error: 'Access denied. This API is only accessible via Telegram or with a valid API key.' });
  }

  if (!newUserId) {
    return res.status(400).json({ error: 'Missing new user ID.' });
  }

  const newUserRef = doc(db, 'users', newUserId);

  try {
    const newUserSnap = await getDoc(newUserRef);

    // If the new user doesn't exist, create their doc
    if (!newUserSnap.exists()) {
      const batch = writeBatch(db);

      batch.set(newUserRef, {
        id: newUserId,
        createdViaReferral: referreby || null,
        joinedAt: serverTimestamp(),
        balance: 0,
        referrals: 0,
        referredUsers: [],
        tasks: {},
        pendingVerificationTasks: [],
      });

      // Update referrer stats
      if (referreby) {
        const referrerRef = doc(db, 'users', referreby);
        const referrerSnap = await getDoc(referrerRef);

        if (referrerSnap.exists()) {
          batch.update(referrerRef, {
            referrals: increment(1),
            referredUsers: arrayUnion(newUserId),
          });
        }
      }

      await batch.commit();
      return res.status(200).json({ success: true, message: 'Referral processed and user created.' });
    }

    return res.status(200).json({ success: true, message: 'User already exists. No action taken.' });
  } catch (error) {
    console.error('Referral API Error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
}
