
import React from 'react';
import {
  getAllUsers,
  setUserBanStatus,
} from '@/data/firestore/adminActions'; // Updated import path
import {
  completeTaskForUser,
  rejectManualVerificationForUser
} from '@/data/firestore/userActions'; // Updated import path

// Fetches all users for admin view
export const getAdminUsers = async () => {
  return await getAllUsers();
};

// Bans a user
export const banUser = async (userId) => {
  return await setUserBanStatus(userId, true);
};

// Unbans a user
export const unbanUser = async (userId) => {
  return await setUserBanStatus(userId, false);
};

// Approves a pending manual task verification for a user
export const approveTask = async (userId, taskId) => {
  return await completeTaskForUser(userId, taskId);
};

// Rejects a pending manual task verification for a user
export const rejectTask = async (userId, taskId) => {
  return await rejectManualVerificationForUser(userId, taskId);
};
  