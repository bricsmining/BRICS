// src/ads/networks/monetag.js
let isInitialized = false;
let config = null;
let sdkCheckInterval = null;

/**
 * Initialize Monetag SDK
 * @param {Object} adsConfig - Configuration object with zoneId
 */
export function initialize(adsConfig) {
  // Allow re-initialization if config changed
  if (isInitialized && config && config.zoneId === adsConfig.zoneId) {
    console.log('Monetag already initialized with same config');
    return;
  }
  
  if (!adsConfig.zoneId) {
    console.log('Monetag initialization skipped - no zoneId provided');
    return;
  }

  config = adsConfig;
  console.log('Starting Monetag initialization with zone ID:', config.zoneId);

  // Wait for Monetag SDK to load with timeout
  let attempts = 0;
  const maxAttempts = 50; // 5 seconds max wait
  
  const checkSDK = () => {
    attempts++;
    
    // Check if the show function exists (this is how Monetag SDK works)
    const showFunctionName = `show_${config.zoneId}`;
    
    if (typeof window[showFunctionName] === 'function') {
      try {
        console.log('Monetag SDK loaded successfully, function available:', showFunctionName);
        isInitialized = true;
        console.log('Monetag initialized successfully with zone ID:', config.zoneId);
        
        if (sdkCheckInterval) {
          clearInterval(sdkCheckInterval);
          sdkCheckInterval = null;
        }
      } catch (error) {
        console.error('Failed to initialize Monetag:', error);
        isInitialized = false;
      }
    } else if (attempts >= maxAttempts) {
      console.error('Monetag SDK failed to load after', maxAttempts * 100, 'ms');
      console.error('Expected function name:', showFunctionName);
      console.error('Available window functions:', Object.keys(window).filter(key => key.startsWith('show_')));
      if (sdkCheckInterval) {
        clearInterval(sdkCheckInterval);
        sdkCheckInterval = null;
      }
    } else {
      console.log(`Waiting for Monetag SDK to load... (attempt ${attempts}/${maxAttempts})`);
      console.log(`Looking for function: ${showFunctionName}`);
    }
  };

  // Start checking immediately, then every 100ms
  checkSDK();
  if (!isInitialized && attempts < maxAttempts) {
    sdkCheckInterval = setInterval(checkSDK, 100);
  }
}

/**
 * Show rewarded ad
 * @param {Object} handlers - Event handlers
 */
export function showAd({ onComplete, onClose, onError }) {
  console.log('Monetag showAd called:', { 
    isInitialized, 
    hasConfig: !!config,
    zoneId: config?.zoneId
  });

  if (!isInitialized) {
    const errorMsg = 'Monetag not initialized. Please check your zone ID configuration.';
    console.error(errorMsg);
    if (onError) onError(errorMsg);
    return;
  }

  if (!config?.zoneId) {
    const errorMsg = 'Monetag zone ID not configured.';
    console.error(errorMsg);
    if (onError) onError(errorMsg);
    return;
  }

  const showFunctionName = `show_${config.zoneId}`;
  
  if (typeof window[showFunctionName] !== 'function') {
    const errorMsg = `Monetag show function not available: ${showFunctionName}`;
    console.error(errorMsg);
    if (onError) onError(errorMsg);
    return;
  }

  try {
    console.log('Attempting to show Monetag ad with function:', showFunctionName);
    
    // Generate unique identifier for tracking
    const ymid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Call the Monetag show function with proper error handling
    window[showFunctionName]({ ymid })
      .then(() => {
        console.log('Monetag ad completed successfully - user rewarded');
        if (onComplete) onComplete();
      })
      .catch((error) => {
        console.error('Monetag ad error or skipped:', error);
        handleMontagError(error, onError);
      });

  } catch (error) {
    console.error('Monetag show error:', error);
    const errorMsg = `Failed to show Monetag ad: ${error.message || 'Unknown error'}`;
    if (onError) onError(errorMsg);
  }
}

/**
 * Preload ad for better performance
 * @param {string} ymid - Unique identifier for tracking
 */
export function preloadAd(ymid = null) {
  if (!isInitialized || !config?.zoneId) {
    console.log('Cannot preload: Monetag not initialized');
    return Promise.reject('Monetag not initialized');
  }

  const showFunctionName = `show_${config.zoneId}`;
  
  if (typeof window[showFunctionName] !== 'function') {
    return Promise.reject('Show function not available');
  }

  const trackingId = ymid || `preload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('Preloading Monetag ad...');
  
  return window[showFunctionName]({ 
    type: 'preload', 
    ymid: trackingId 
  }).then(() => {
    console.log('Monetag ad preloaded successfully');
    return trackingId; // Return the tracking ID for later use
  }).catch((error) => {
    console.error('Monetag preload failed:', error);
    throw error;
  });
}

/**
 * Handle Monetag specific errors
 */
function handleMontagError(error, onError) {
  let errorMessage = 'Failed to show ad';
  
  if (error && typeof error === 'object') {
    if (error.message?.includes('no ads') || error.code === 'NO_ADS') {
      errorMessage = 'No ads available right now.';
    } else if (error.message?.includes('network') || error.code === 'NETWORK_ERROR') {
      errorMessage = 'Network error. Please check your connection.';
    } else if (error.message?.includes('blocked') || error.code === 'AD_BLOCKED') {
      errorMessage = 'Ad blocker detected. Please disable it to watch ads.';
    } else if (error.message?.includes('skipped') || error.code === 'USER_SKIPPED') {
      errorMessage = 'Ad was skipped by user.';
    } else {
      errorMessage = `Monetag error: ${error.message || error.code || 'Unknown error'}`;
    }
  } else if (typeof error === 'string') {
    errorMessage = `Monetag error: ${error}`;
  }
  
  if (onError) onError(errorMessage);
}

/**
 * Check if Monetag is available
 */
export function isAvailable() {
  if (!config?.zoneId) {
    return false;
  }
  
  const showFunctionName = `show_${config.zoneId}`;
  const available = typeof window[showFunctionName] === 'function' && isInitialized;
  
  console.log('Monetag availability check:', {
    functionName: showFunctionName,
    functionExists: typeof window[showFunctionName] === 'function',
    initialized: isInitialized,
    overall: available,
    hasConfig: !!config,
    zoneId: config?.zoneId ? '***' + config.zoneId.slice(-4) : 'Not set'
  });
  
  return available;
}

/**
 * Get Monetag status for debugging
 */
export function getStatus() {
  const showFunctionName = config?.zoneId ? `show_${config.zoneId}` : 'unknown';
  
  return {
    functionName: showFunctionName,
    functionExists: typeof window[showFunctionName] === 'function',
    initialized: isInitialized,
    zoneId: config?.zoneId ? '***' + config.zoneId.slice(-4) : 'Not set',
    config: config ? { ...config, zoneId: '***' + config.zoneId?.slice(-4) } : null,
    availableShowFunctions: Object.keys(window).filter(key => key.startsWith('show_'))
  };
}

/**
 * Reset Monetag instance (for debugging)
 */
export function reset() {
  console.log('Resetting Monetag instance...');
  isInitialized = false;
  config = null;
  
  if (sdkCheckInterval) {
    clearInterval(sdkCheckInterval);
    sdkCheckInterval = null;
  }
}

/**
 * Force re-initialization (for debugging)
 */
export function reinitialize(adsConfig) {
  console.log('Force re-initializing Monetag...');
  reset();
  initialize(adsConfig);
}

/**
 * Test if Monetag SDK is working
 */
export function testSDK() {
  console.log('=== Monetag SDK Test ===');
  console.log('Config:', config);
  console.log('Initialized:', isInitialized);
  
  if (config?.zoneId) {
    const showFunctionName = `show_${config.zoneId}`;
    console.log('Expected function:', showFunctionName);
    console.log('Function exists:', typeof window[showFunctionName]);
    console.log('Function type:', typeof window[showFunctionName]);
  }
  
  console.log('All show_ functions:', Object.keys(window).filter(key => key.startsWith('show_')));
  console.log('========================');
}
