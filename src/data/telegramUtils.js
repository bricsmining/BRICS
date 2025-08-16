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
  console.log('[WEBAPP] parseLaunchParams called');
  console.log('[WEBAPP] URL:', window.location.href);
  
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

  console.log('[WEBAPP] URL parameters:', {
    isReferred, urlReferrerId, hasBonus, isWelcome, hasError, isFirstTime, urlUserId
  });

  // For bot-first approach, check for start_param from Telegram Web App API
  let startParam = null;
  try {
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
      startParam = window.Telegram.WebApp.initDataUnsafe.start_param;
      console.log('[WEBAPP] Telegram start_param:', startParam);
    }
  } catch (error) {
    console.error('Error accessing Telegram WebApp API:', error);
  }
  
  // Extract referrer ID from start parameter
  if (startParam && startParam.startsWith('refID') && !urlReferrerId) {
    urlReferrerId = startParam.replace('refID', '');
    console.log('[WEBAPP] Extracted referrerId from start_param:', urlReferrerId);
  }

  // Store temporary referral parameters for later processing (after we get user ID)
  if ((isReferred && urlReferrerId) || (startParam && urlReferrerId)) {
    const isMiniAppReferral = startParam && startParam.startsWith('refID');
    // For Mini App referrals, treat as first time and bonus unless explicitly set otherwise
    const effectiveFirstTime = isFirstTime || isMiniAppReferral || (startParam && !isFirstTime);
    const effectiveHasBonus = hasBonus || isMiniAppReferral;
    
    // Store temporary referral data without user-specific key
    const tempReferralData = {
      isReferred: true,
      referrerId: urlReferrerId,
      hasBonus: effectiveHasBonus,
      isFirstTime: effectiveFirstTime,
      isMiniAppReferral: isMiniAppReferral,
      userId: urlUserId, // might be null for Mini App referrals
      timestamp: Date.now(),
      needsProcessing: true // flag to indicate this needs to be processed later
    };
    
    // Store temporarily - will be re-stored with proper user ID later
    sessionStorage.setItem('tempReferralInfo', JSON.stringify(tempReferralData));
    
    console.log('Temporary referral info stored for processing:', { 
      referrerId: urlReferrerId, 
      hasBonus: effectiveHasBonus, 
      isFirstTime: effectiveFirstTime,
      isMiniAppReferral 
    });
  }

  // Store temporary welcome info for later processing (similar to referral info)
  if (isWelcome) {
    const tempWelcomeData = {
      isWelcome: true,
      hasError: hasError,
      isFirstTime: isFirstTime,
      userId: urlUserId, // might be null
      timestamp: Date.now(),
      needsProcessing: true
    };
    
    sessionStorage.setItem('tempWelcomeInfo', JSON.stringify(tempWelcomeData));
    console.log('Temporary welcome info stored for processing:', { isWelcome: true, hasError: !!hasError, isFirstTime });
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
      // Don't set referrerId to current user's ID - this was causing self-referral bug
      // referrerId will be set from URL parameters instead

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
        // Don't set referrerId to current user's ID - this was causing self-referral bug
        // referrerId will be set from URL parameters instead

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

  // Use referrer ID if detected
  if (urlReferrerId) {
    referrerId = urlReferrerId;
  }

  console.log('[WEBAPP] Final result:', {
    telegramUserId: telegramUser?.id,
    referrerId: referrerId,
    source: startParam ? 'start_param' : (isReferred ? 'URL_params' : 'none')
  });

  return { telegramUser, referrerId };
};

// Process temporary referral and welcome info once we have the actual user ID
export const processReferralInfo = (userId) => {
  if (!userId) return { referralData: null, welcomeData: null };
  
  let processedReferral = null;
  let processedWelcome = null;
  
  // Process referral info
  const tempReferralData = sessionStorage.getItem('tempReferralInfo');
  if (tempReferralData) {
    try {
      const referralData = JSON.parse(tempReferralData);
      if (referralData.needsProcessing) {
        // Update referral data with actual user ID
        referralData.userId = userId;
        referralData.needsProcessing = false;
        
        // Store with user-specific key
        const referralKey = `referralInfo_${userId}`;
        const existingReferral = sessionStorage.getItem(referralKey);
        
        if (!existingReferral || referralData.isFirstTime) {
          sessionStorage.setItem(referralKey, JSON.stringify(referralData));
          
          // Also store in general location for backward compatibility
          sessionStorage.setItem('referralInfo', JSON.stringify(referralData));
          
          console.log('✅ Referral info processed and stored with user ID:', { 
            userId,
            referrerId: referralData.referrerId, 
            hasBonus: referralData.hasBonus, 
            isFirstTime: referralData.isFirstTime,
            isMiniAppReferral: referralData.isMiniAppReferral 
          });
          
          processedReferral = referralData;
        } else {
          console.log('Referral info already exists for user, skipping duplicate');
        }
        
        // Clear temporary data
        sessionStorage.removeItem('tempReferralInfo');
      }
    } catch (error) {
      console.error('Error processing referral info:', error);
      sessionStorage.removeItem('tempReferralInfo');
    }
  }
  
  // Process welcome info
  const tempWelcomeData = sessionStorage.getItem('tempWelcomeInfo');
  if (tempWelcomeData) {
    try {
      const welcomeData = JSON.parse(tempWelcomeData);
      if (welcomeData.needsProcessing) {
        // Update welcome data with actual user ID
        welcomeData.userId = userId;
        welcomeData.needsProcessing = false;
        
        // Store with user-specific key
        const welcomeKey = `welcomeInfo_${userId}`;
        const existingWelcome = sessionStorage.getItem(welcomeKey);
        
        if (!existingWelcome || welcomeData.isFirstTime) {
          sessionStorage.setItem(welcomeKey, JSON.stringify(welcomeData));
          
          // Also store in general location for backward compatibility
          sessionStorage.setItem('welcomeInfo', JSON.stringify(welcomeData));
          
          console.log('✅ Welcome info processed and stored with user ID:', { 
            userId,
            isWelcome: welcomeData.isWelcome, 
            hasError: welcomeData.hasError, 
            isFirstTime: welcomeData.isFirstTime
          });
          
          processedWelcome = welcomeData;
        } else {
          console.log('Welcome info already exists for user, skipping duplicate');
        }
        
        // Clear temporary data
        sessionStorage.removeItem('tempWelcomeInfo');
      }
    } catch (error) {
      console.error('Error processing welcome info:', error);
      sessionStorage.removeItem('tempWelcomeInfo');
    }
  }
  
  return { referralData: processedReferral, welcomeData: processedWelcome };
};

export const clearTelegramSession = () => {
  // Clear general session data
  sessionStorage.removeItem('tgWebAppHash');
  sessionStorage.removeItem('tgWebAppDataRaw');
  sessionStorage.removeItem('userId');
  sessionStorage.removeItem('referralInfo');
  sessionStorage.removeItem('welcomeInfo');
  sessionStorage.removeItem('tempReferralInfo');
  sessionStorage.removeItem('tempWelcomeInfo');
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
  const botUsername = import.meta.env.VITE_BOT_USERNAME || 'xSkyTON_Bot';
  // Bot-first approach: User goes to bot chat first, then bot launches Web App
  return `https://t.me/${botUsername}?start=refID${userId}`;
};
