// src/data/telegramUtils.js

import React from 'react';

// src/data/telegramUtils.js

// Restore Telegram Session: Copy from localStorage to sessionStorage if missing
export function restoreTelegramSession() {
  const keys = ['tgWebAppHash', 'tgWebAppDataRaw', 'userId'];
  keys.forEach((key) => {
    if (!sessionStorage.getItem(key) && localStorage.getItem(key)) {
      sessionStorage.setItem(key, localStorage.getItem(key));
    }
  });
}

// Call this IMMEDIATELY at the top of your app, before using any Telegram params!
restoreTelegramSession();

export const parseLaunchParams = () => {
  let hash = window.location.hash ? window.location.hash.slice(1) : '';

  // Check for direct referral URL parameters (new feature)
  const urlParams = new URLSearchParams(window.location.search);
  const isReferred = urlParams.get('referred') === 'true';
  const urlReferrerId = urlParams.get('referrer');
  const hasBonus = urlParams.get('bonus') === 'true';
  const isWelcome = urlParams.get('welcome') === 'true';
  const hasError = urlParams.get('error');

  // Store referral info if present
  if (isReferred && urlReferrerId) {
    sessionStorage.setItem('referralInfo', JSON.stringify({
      isReferred: true,
      referrerId: urlReferrerId,
      hasBonus: hasBonus,
      timestamp: Date.now()
    }));
    console.log('Referral info detected and stored:', { referrerId: urlReferrerId, hasBonus });
  }

  // Store welcome info
  if (isWelcome) {
    sessionStorage.setItem('welcomeInfo', JSON.stringify({
      isWelcome: true,
      hasError: hasError,
      timestamp: Date.now()
    }));
  }

  // 1. Get from URL hash or sessionStorage
  if (!hash) {
    hash = sessionStorage.getItem('tgWebAppHash') || '';
  }

  let params = null;
  if (hash) {
    params = new URLSearchParams(hash);
  } else {
    // 2. Fallback: Get from sessionStorage
    const tgWebAppDataRaw = sessionStorage.getItem('tgWebAppDataRaw');
    if (tgWebAppDataRaw) {
      params = new URLSearchParams();
      params.set('tgWebAppData', tgWebAppDataRaw);
    }
  }

  // 3. Fallback: Try Telegram WebApp JS SDK (works only inside Telegram)
  let tgWebAppData = params ? params.get('tgWebAppData') : null;
  let telegramUser = null;
  let referrerId = null;

  if (!tgWebAppData && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
    const unsafe = window.Telegram.WebApp.initDataUnsafe;
    if (unsafe && unsafe.user) {
      telegramUser = {
        id: String(unsafe.user.id),
        username: unsafe.user.username || null,
        firstName: unsafe.user.first_name || '',
        lastName: unsafe.user.last_name || '',
        fullName: `${unsafe.user.first_name || ''} ${unsafe.user.last_name || ''}`.trim(),
        profilePicUrl: unsafe.user.photo_url || null,
      };
      referrerId = String(unsafe.user.id);

      // Persist these details
      sessionStorage.setItem('userId', telegramUser.id);
      localStorage.setItem('userId', telegramUser.id);
    }
  }

  // 4. Standard hash/tgWebAppData parsing
  if (tgWebAppData) {
    try {
      // Persist hash and data for future reloads
      sessionStorage.setItem('tgWebAppHash', hash);
      sessionStorage.setItem('tgWebAppDataRaw', tgWebAppData);
      localStorage.setItem('tgWebAppHash', hash);
      localStorage.setItem('tgWebAppDataRaw', tgWebAppData);

      const dataParams = new URLSearchParams(tgWebAppData);
      const userParam = dataParams.get('user');

      if (userParam) {
        const userData = JSON.parse(decodeURIComponent(userParam));
        const firstName = userData.first_name || '';
        const lastName = userData.last_name || '';
        referrerId = String(userData.id);

        telegramUser = {
          id: String(userData.id),
          username: userData.username || null,
          firstName: firstName,
          lastName: lastName,
          fullName: `${firstName} ${lastName}`.trim(),
          profilePicUrl: userData.photo_url || null,
        };

        // Store userId for app-wide restoration
        sessionStorage.setItem('userId', telegramUser.id);
        localStorage.setItem('userId', telegramUser.id);
      }
    } catch (error) {
      console.error("Error parsing Telegram Web App data:", error);
      telegramUser = null;
    }
  }

  return { telegramUser, referrerId };
};

export const clearTelegramSession = () => {
  sessionStorage.removeItem('tgWebAppHash');
  sessionStorage.removeItem('tgWebAppDataRaw');
  sessionStorage.removeItem('userId');
  sessionStorage.removeItem('referralInfo');
  sessionStorage.removeItem('welcomeInfo');
  localStorage.removeItem('tgWebAppHash');
  localStorage.removeItem('tgWebAppDataRaw');
  localStorage.removeItem('userId');
};

// Get referral info from URL parameters
export const getReferralInfo = () => {
  try {
    const referralInfo = sessionStorage.getItem('referralInfo');
    if (referralInfo) {
      const parsed = JSON.parse(referralInfo);
      // Check if referral info is still fresh (within 24 hours)
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed;
      } else {
        sessionStorage.removeItem('referralInfo');
      }
    }
  } catch (error) {
    console.error('Error parsing referral info:', error);
    sessionStorage.removeItem('referralInfo');
  }
  return null;
};

// Get welcome info from URL parameters
export const getWelcomeInfo = () => {
  try {
    const welcomeInfo = sessionStorage.getItem('welcomeInfo');
    if (welcomeInfo) {
      const parsed = JSON.parse(welcomeInfo);
      // Check if welcome info is still fresh (within 1 hour)
      if (Date.now() - parsed.timestamp < 60 * 60 * 1000) {
        return parsed;
      } else {
        sessionStorage.removeItem('welcomeInfo');
      }
    }
  } catch (error) {
    console.error('Error parsing welcome info:', error);
    sessionStorage.removeItem('welcomeInfo');
  }
  return null;
};

// Clear referral info after it's been processed
export const clearReferralInfo = () => {
  sessionStorage.removeItem('referralInfo');
};

// Clear welcome info after it's been processed
export const clearWelcomeInfo = () => {
  sessionStorage.removeItem('welcomeInfo');
};

export const generateReferralLink = (userId) => {
  if (!userId) return '';
  return `http://t.me/xSkyTON_Bot?start=User_${userId}`;
};
