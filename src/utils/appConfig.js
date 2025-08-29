/**
 * App Configuration Utility
 * Provides dynamic access to app name, token name, and webapp URL
 */

import { getAdminConfig, getEnvConfig } from '@/data/firestore/adminConfig';

let cachedAdminConfig = null;
let lastConfigFetch = 0;
const CONFIG_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get admin config with caching
export const getCachedAdminConfig = async () => {
  const now = Date.now();
  
  if (!cachedAdminConfig || (now - lastConfigFetch) > CONFIG_CACHE_DURATION) {
    try {
      cachedAdminConfig = await getAdminConfig();
      lastConfigFetch = now;
    } catch (error) {
      console.error('Error fetching admin config:', error);
      // Return default config if fetch fails
      cachedAdminConfig = {
        appName: 'SkyTON',
        tokenName: 'STON',
        telegramWebAppUrl: 'https://skyton.vercel.app'
      };
    }
  }
  
  return cachedAdminConfig;
};

// Get app name from admin config
export const getAppName = async () => {
  const config = await getCachedAdminConfig();
  return config.appName || 'SkyTON';
};

// Get token name from admin config
export const getTokenName = async () => {
  const config = await getCachedAdminConfig();
  return config.tokenName || 'STON';
};

// Get webapp URL - prioritize environment variable, then admin config, then default
export const getWebAppUrl = async () => {
  const envConfig = getEnvConfig();
  const adminConfig = await getCachedAdminConfig();
  
  // For admin/backend use: prioritize environment variable
  if (envConfig.webAppUrl && envConfig.webAppUrl !== 'https://skyton.vercel.app') {
    return envConfig.webAppUrl;
  }
  
  // For user-facing buttons: use admin config
  return adminConfig.telegramWebAppUrl || envConfig.webAppUrl || 'https://skyton.vercel.app';
};

// Get webapp URL specifically for user-facing buttons (always use admin config)
export const getUserWebAppUrl = async () => {
  const adminConfig = await getCachedAdminConfig();
  return adminConfig.telegramWebAppUrl || 'https://skyton.vercel.app';
};

// Get all app config at once
export const getAppConfig = async () => {
  const adminConfig = await getCachedAdminConfig();
  const envConfig = getEnvConfig();
  
  return {
    appName: adminConfig.appName || 'SkyTON',
    tokenName: adminConfig.tokenName || 'STON',
    webAppUrl: envConfig.webAppUrl || adminConfig.telegramWebAppUrl || 'https://skyton.vercel.app',
    userWebAppUrl: adminConfig.telegramWebAppUrl || 'https://skyton.vercel.app'
  };
};

// Clear cache (useful for admin panel after config updates)
export const clearConfigCache = () => {
  cachedAdminConfig = null;
  lastConfigFetch = 0;
};

// Synchronous getters for when config is already loaded (e.g., in React components with context)
export const getAppNameSync = (adminConfig) => {
  return adminConfig?.appName || 'SkyTON';
};

export const getTokenNameSync = (adminConfig) => {
  return adminConfig?.tokenName || 'STON';
};

export const getUserWebAppUrlSync = (adminConfig) => {
  return adminConfig?.telegramWebAppUrl || 'https://skyton.vercel.app';
};

