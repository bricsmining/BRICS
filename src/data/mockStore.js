
// This file is deprecated and will be removed in a future step.
// All functionality has been moved to separate files within the src/data directory.
// Please import functions from '@/data' instead.
import React from 'react';
console.warn("src/data/mockStore.js is deprecated. Import from '@/data' instead.");

// Exporting empty functions or null to avoid breaking old imports immediately,
// but they should be updated.
export const getMockUser = () => null;
export const updateMockUser = () => null;
export const connectMockWallet = () => null;
export const requestManualVerification = () => null;
export const completeMockTask = () => null;
export const performMockCheckIn = () => null;
export const getMockTasks = () => [];
export const addMockTask = () => [];
export const updateMockTask = () => [];
export const deleteMockTask = () => [];
export const getMockAdminUsers = () => [];
export const updateMockAdminUser = () => [];
export const approveMockTask = () => [];
export const rejectMockTask = () => [];
export const banMockUser = () => {};
export const unbanMockUser = () => {};
export const getMockLeaderboard = () => [];
  