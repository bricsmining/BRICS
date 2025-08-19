// src/contexts/AdTimerContext.jsx
// Context to manage ad timer state and prevent conflicts with spin popup

import React, { createContext, useContext, useState, useCallback } from 'react';

const AdTimerContext = createContext();

export const useAdTimer = () => {
  const context = useContext(AdTimerContext);
  if (!context) {
    throw new Error('useAdTimer must be used within an AdTimerProvider');
  }
  return context;
};

export const AdTimerProvider = ({ children }) => {
  const [isSpinPopupOpen, setIsSpinPopupOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentAdShowing, setCurrentAdShowing] = useState(null); // 'gigapub', 'monetag', 'adsgram', null

  // Function to pause ad timer (called when spin popup opens)
  const pauseAdTimer = useCallback(() => {
    console.log('🎯 Ad timer paused - spin popup opened');
    setIsSpinPopupOpen(true);
    setIsPaused(true);
  }, []);

  // Function to resume ad timer (called when spin popup closes)
  const resumeAdTimer = useCallback(() => {
    console.log('🎯 Ad timer resumed - spin popup closed');
    setIsSpinPopupOpen(false);
    setIsPaused(false);
  }, []);

  // Function to check if ads should be paused
  const shouldPauseAds = useCallback(() => {
    return isSpinPopupOpen || isPaused || currentAdShowing !== null;
  }, [isSpinPopupOpen, isPaused, currentAdShowing]);

  // Function to set ad as showing (prevents other ads)
  const setAdShowing = useCallback((adNetwork) => {
    console.log(`🔒 ${adNetwork} ad started - blocking other ads`);
    setCurrentAdShowing(adNetwork);
  }, []);

  // Function to clear ad showing status (allows other ads)
  const clearAdShowing = useCallback(() => {
    const previousAd = currentAdShowing;
    console.log(`🔓 ${previousAd} ad ended - unblocking other ads`);
    setCurrentAdShowing(null);
  }, [currentAdShowing]);

  // Function to check if any ad is currently showing
  const isAnyAdShowing = useCallback(() => {
    return currentAdShowing !== null;
  }, [currentAdShowing]);

  const value = {
    isSpinPopupOpen,
    isPaused,
    currentAdShowing,
    pauseAdTimer,
    resumeAdTimer,
    shouldPauseAds,
    setAdShowing,
    clearAdShowing,
    isAnyAdShowing
  };

  return (
    <AdTimerContext.Provider value={value}>
      {children}
    </AdTimerContext.Provider>
  );
};

export default AdTimerContext;
