// Secure server-side API for actions requiring admin privileges
// This replaces client-side API key usage which was a security vulnerability

import { db } from '../src/lib/serverFirebase.js';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';

// SECURITY: Validate request origin and basic auth
function validateRequest(req) {
  // Check if request is from authorized domain
  const allowedOrigins = [
    'https://skyton.vercel.app',
    'https://sky-ton-main-kyc8y9ndb-team-xtremes-projects-2496e4b3.vercel.app',
    process.env.VITE_WEB_APP_URL
  ].filter(Boolean);
  
  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000', 'http://localhost:5173');
  }
  
  const origin = req.headers.origin || req.headers.referer;
  return allowedOrigins.some(allowed => origin?.includes(allowed));
}

// SECURITY: Simple request signing (better than exposed API keys)
function validateRequestSignature(req) {
  const { timestamp, userId, action, signature } = req.body;
  
  // Check timestamp (request must be within 5 minutes)
  const now = Date.now();
  const requestTime = parseInt(timestamp);
  const fiveMinutes = 5 * 60 * 1000;
  
  if (Math.abs(now - requestTime) > fiveMinutes) {
    return false;
  }
  
  // Simple signature validation (you can enhance this)
  const expectedSignature = Buffer.from(`${timestamp}:${userId}:${action}`).toString('base64');
  return signature === expectedSignature;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || 'https://skyton.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // SECURITY: Validate request
  if (!validateRequest(req)) {
    return res.status(403).json({ error: 'Unauthorized origin' });
  }
  
  const { action, userId, data } = req.body;
  
  try {
    switch (action) {
      case 'send_notification':
        return await handleNotification(req, res);
      case 'update_balance':
        return await handleBalanceUpdate(req, res);
      case 'log_activity':
        return await handleActivityLog(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Secure action error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Handle notifications securely
async function handleNotification(req, res) {
  const { userId, type, data } = req.body;
  
  // Validate user exists
  if (userId) {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }
  }
  
  // Send notification via internal API (server-to-server)
  try {
    const notificationUrl = `${process.env.VITE_WEB_APP_URL || 'https://skyton.vercel.app'}/api/notifications?action=${userId ? 'user' : 'admin'}${userId ? `&userId=${userId}` : ''}`;
    
    const response = await fetch(notificationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ADMIN_API_KEY // Server-side only
      },
      body: JSON.stringify({
        userId,
        type,
        data
      })
    });
    
    if (response.ok) {
      return res.status(200).json({ success: true });
    } else {
      throw new Error('Notification failed');
    }
  } catch (error) {
    console.error('Notification error:', error);
    return res.status(500).json({ error: 'Notification failed' });
  }
}

// Handle balance updates securely
async function handleBalanceUpdate(req, res) {
  const { userId, amount, type, reason } = req.body;
  
  if (!userId || amount === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = userSnap.data();
    const currentBalance = userData.balance || 0;
    const newBalance = currentBalance + amount;
    
    if (newBalance < 0) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Update balance
    await updateDoc(userRef, {
      balance: newBalance,
      [`balanceBreakdown.${type}`]: (userData.balanceBreakdown?.[type] || 0) + amount,
      updatedAt: serverTimestamp()
    });
    
    // Log transaction
    console.log(`Balance update: User ${userId}, Amount: ${amount}, Type: ${type}, Reason: ${reason}`);
    
    return res.status(200).json({ 
      success: true, 
      newBalance,
      message: 'Balance updated successfully' 
    });
    
  } catch (error) {
    console.error('Balance update error:', error);
    return res.status(500).json({ error: 'Balance update failed' });
  }
}

// Handle activity logging
async function handleActivityLog(req, res) {
  const { userId, activity, details } = req.body;
  
  console.log(`Activity Log: User ${userId}, Activity: ${activity}, Details:`, details);
  
  // In a production app, you might want to store this in a separate logs collection
  // For now, just log it server-side
  
  return res.status(200).json({ success: true, message: 'Activity logged' });
}
