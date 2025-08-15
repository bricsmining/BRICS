
import React from 'react';
import {
  getUser,
  updateUser,
  completeTaskForUser,
  requestManualVerificationForUser,
  performCheckInForUser
} from '@/data/firestore/userActions'; // Updated import path
import { Timestamp } from 'firebase/firestore';

// Fetches the current user's data
export const getCurrentUser = async (userId) => {
  return await getUser(userId);
};

// Updates the current user's data
export const updateCurrentUser = async (userId, updates) => {
  return await updateUser(userId, updates);
};

// Connects a wallet address for the user
export const connectWallet = async (userId, walletAddress) => {
  const success = await updateUser(userId, { wallet: walletAddress });
  
  // Send wallet connection notification to admin
  if (success) {
    try {
      const { getCurrentUser } = await import('./firestore/userActions');
      const user = await getCurrentUser(userId);
      const userName = user?.firstName || user?.username || `User ${userId}`;
      
      const apiBaseUrl = window.location.hostname === 'localhost' ? 'https://skyton.vercel.app' : '';
      
      await fetch(`${apiBaseUrl}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'admin',
          notificationType: 'wallet_connect',
          data: {
            userId: userId,
            userName: userName,
            walletAddress: walletAddress,
            walletType: 'TON Wallet'
          }
        })
      });
    } catch (error) {
      console.error('Failed to send wallet connection notification:', error);
    }
  }
  
  return success;
};

// Disconnects the wallet
export const disconnectWallet = async (userId) => {
  return await updateUser(userId, { wallet: null });
};

// Requests manual verification for a task
export const requestManualVerification = async (userId, taskId) => {
  return await requestManualVerificationForUser(userId, taskId);
};

// Completes a task automatically (if applicable)
export const completeTask = async (userId, taskId) => {
  return await completeTaskForUser(userId, taskId);
};

// Performs the daily check-in
export const performCheckIn = async (userId) => {
  return await performCheckInForUser(userId);
};

// Helper to check if check-in is done today based on Firestore Timestamp
export const isCheckInDoneToday = (lastCheckInTimestamp) => {
    if (!lastCheckInTimestamp) return false;

    if (!(lastCheckInTimestamp instanceof Timestamp)) {
        console.warn("lastCheckIn is not a Firestore Timestamp:", lastCheckInTimestamp);
        try {
          lastCheckInTimestamp = new Timestamp(lastCheckInTimestamp.seconds, lastCheckInTimestamp.nanoseconds);
        } catch (e) {
          return false;
        }
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastCheckInDate = lastCheckInTimestamp.toDate();
    lastCheckInDate.setHours(0, 0, 0, 0);

    return lastCheckInDate.getTime() === today.getTime();
};
  