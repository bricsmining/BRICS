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
  let urlReferrerId = urlParams.get('referrer');
  const hasBonus = urlParams.get('bonus') === 'true';
  const isWelcome = urlParams.get('welcome') === 'true';
  const hasError = urlParams.get('error');
  const isFirstTime = urlParams.get('firstTime') === 'true';
  const urlUserId = urlParams.get('userId');
  
  // Check for Mini App start parameter (direct referral from Mini App link)
  const startParam = urlParams.get('start');
  if (startParam && !urlReferrerId) {
    if (startParam.startsWith('refID')) {
      // Extract referrer ID from Mini App start parameter
      urlReferrerId = startParam.replace('refID', '');
      console.log('Mini App referral detected:', { startParam, urlReferrerId });
    }
  }

  // Store referral info if present (either from webhook or Mini App)
  if ((isReferred && urlReferrerId) || (startParam && urlReferrerId)) {
    const referralKey = `referralInfo_${urlUserId || 'unknown'}`;
    const existingReferral = sessionStorage.getItem(referralKey);
    
    // For Mini App direct referrals, treat as first time and with bonus
    const isMiniAppReferral = startParam && startParam.startsWith('refID');
    const effectiveFirstTime = isFirstTime || isMiniAppReferral;
    const effectiveHasBonus = hasBonus || isMiniAppReferral;
    
    if (!existingReferral || effectiveFirstTime) {
      const referralData = {
        isReferred: true,
        referrerId: urlReferrerId,
        hasBonus: effectiveHasBonus,
        isFirstTime: effectiveFirstTime,
        isMiniAppReferral: isMiniAppReferral,
        userId: urlUserId,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem(referralKey, JSON.stringify(referralData));
      
      // Also store in general location for backward compatibility
      sessionStorage.setItem('referralInfo', JSON.stringify(referralData));
      
      console.log('Referral info detected and stored:', { 
        referrerId: urlReferrerId, 
        hasBonus: effectiveHasBonus, 
        isFirstTime: effectiveFirstTime,
        isMiniAppReferral 
      });
    } else {
      console.log('Referral info already exists, skipping duplicate welcome');
    }
  }

  // Store welcome info
  if (isWelcome) {
    const welcomeKey = `welcomeInfo_${urlUserId || 'unknown'}`;
    const existingWelcome = sessionStorage.getItem(welcomeKey);
    
    if (!existingWelcome || isFirstTime) {
      sessionStorage.setItem(welcomeKey, JSON.stringify({
        isWelcome: true,
        hasError: hasError,
        isFirstTime: isFirstTime,
        userId: urlUserId,
        timestamp: Date.now()
      }));
      
      // Also store in general location for backward compatibility
      sessionStorage.setItem('welcomeInfo', JSON.stringify({
        isWelcome: true,
        hasError: hasError,
        isFirstTime: isFirstTime,
        userId: urlUserId,
        timestamp: Date.now()
      }));
    }
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

  // Use Mini App referrer ID if detected and no standard referrer ID
  if (urlReferrerId && !referrerId) {
    referrerId = urlReferrerId;
    console.log('Using Mini App referrer ID:', referrerId);
  }

  return { telegramUser, referrerId };
};

export const clearTelegramSession = () => {
  // Clear general session data
  sessionStorage.removeItem('tgWebAppHash');
  sessionStorage.removeItem('tgWebAppDataRaw');
  sessionStorage.removeItem('userId');
  sessionStorage.removeItem('referralInfo');
  sessionStorage.removeItem('welcomeInfo');
  localStorage.removeItem('tgWebAppHash');
  localStorage.removeItem('tgWebAppDataRaw');
  localStorage.removeItem('userId');
  
  // Clear user-specific referral and welcome info
  const keys = Object.keys(sessionStorage);
  keys.forEach(key => {
    if (key.startsWith('referralInfo_') || key.startsWith('welcomeInfo_')) {
      sessionStorage.removeItem(key);
    }
  });
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
export const clearReferralInfo = (userId = null) => {
  sessionStorage.removeItem('referralInfo');
  if (userId) {
    sessionStorage.removeItem(`referralInfo_${userId}`);
  }
};

// Clear welcome info after it's been processed
export const clearWelcomeInfo = (userId = null) => {
  sessionStorage.removeItem('welcomeInfo');
  if (userId) {
    sessionStorage.removeItem(`welcomeInfo_${userId}`);
  }
};

export const generateReferralLink = (userId) => {
  if (!userId) return '';
  return `http://t.me/xSkyTON_Bot/app?start=refID${userId}`;
};
