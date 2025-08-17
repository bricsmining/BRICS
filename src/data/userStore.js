
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

// Connects a wallet address for the user with optional memo
export const connectWallet = async (userId, walletAddress, memo) => {
  const updates = { 
    wallet: walletAddress,
    tonMemo: memo && memo.trim() !== '' ? memo.trim() : null // Store null if memo is empty
  };
  return await updateUser(userId, updates);
};

// Disconnects the wallet and clears memo
export const disconnectWallet = async (userId) => {
  return await updateUser(userId, { wallet: null, tonMemo: null });
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
  