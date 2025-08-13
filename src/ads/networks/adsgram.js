// src/ads/networks/adsgram.js

let adsgramInstance = null;
let isInitialized = false;
let config = null;

/**
 * Initialize Adsgram SDK
 * @param {Object} adsConfig - Configuration object with blockId
 */
export function initialize(adsConfig) {
  // Allow re-initialization if config changed
  if (isInitialized && config && config.blockId === adsConfig.blockId) {
    console.log('Adsgram already initialized with same config');
    return;
  }
  
  if (!adsConfig.blockId) {
    console.log('Adsgram initialization skipped - no blockId provided');
    return;
  }

  config = adsConfig;

  try {
    // Check if Adsgram SDK is loaded
    if (typeof window.Adsgram === "undefined") { // FIXED: was === "" should be === "undefined"
      console.error('Adsgram SDK not found. Make sure the script is loaded in index.html');
      return;
    }

    console.log('Initializing Adsgram with block ID:', config.blockId);

    // Initialize Adsgram instance
    adsgramInstance = window.Adsgram.init({
      blockId: config.blockId,
      debug: import.meta.env.DEV, // Enable debug in development
    });
    
    isInitialized = true;
    console.log('Adsgram initialized successfully with block ID:', config.blockId);
  } catch (error) {
    console.error('Failed to initialize Adsgram:', error);
    isInitialized = false;
    adsgramInstance = null;
  }
}

/**
 * Show rewarded ad
 * @param {Object} handlers - Event handlers
 */
export function showAd({ onComplete, onClose, onError }) {
  console.log('Adsgram showAd called:', { 
    isInitialized, 
    hasInstance: !!adsgramInstance 
  });

  if (!isInitialized || !adsgramInstance) {
    const errorMsg = 'Adsgram not initialized. Please check your block ID configuration.';
    console.error(errorMsg);
    if (onError) onError(errorMsg);
    return;
  }

  try {
    console.log('Showing Adsgram ad...');
    
    adsgramInstance.show().then(() => {
      // Ad completed successfully
      console.log('Adsgram ad completed successfully');
      if (onComplete) {
        try {
          onComplete();
        } catch (error) {
          console.error('Error in Adsgram onComplete handler:', error);
        }
      }
    }).catch((error) => {
      console.error('Adsgram ad error:', error);
      
      // Handle specific Adsgram errors
      let errorMessage = 'Failed to show ad';
      
      if (error && error.message) {
        switch (error.message) {
          case 'AdBlock':
            errorMessage = 'Ad blocker detected. Please disable it to watch ads.';
            break;
          case 'NotReady':
            errorMessage = 'Ad not ready. Please try again in a moment.';
            break;
          case 'NotAllowed':
            errorMessage = 'Ads not allowed in this context.';
            break;
          case 'NoAds':
            errorMessage = 'No ads available right now.';
            break;
          case 'InvalidBlockId':
            errorMessage = 'Invalid block ID. Please check your configuration.';
            break;
          case 'NetworkError':
            errorMessage = 'Network error. Please check your connection.';
            break;
          default:
            errorMessage = `Adsgram error: ${error.message}`;
        }
      } else if (typeof error === 'string') {
        errorMessage = `Adsgram error: ${error}`;
      } else {
        errorMessage = 'Unknown Adsgram error occurred';
      }
      
      if (onError) {
        try {
          onError(errorMessage);
        } catch (handlerError) {
          console.error('Error in Adsgram onError handler:', handlerError);
        }
      }
    });
  } catch (error) {
    console.error('Adsgram show error:', error);
    const errorMsg = `Failed to show Adsgram ad: ${error.message || 'Unknown error'}`;
    if (onError) {
      try {
        onError(errorMsg);
      } catch (handlerError) {
        console.error('Error in Adsgram onError handler:', handlerError);
      }
    }
  }
}

/**
 * Check if Adsgram is available
 */
export function isAvailable() {
  const available = typeof window.Adsgram !== "undefined" && 
                   isInitialized && 
                   adsgramInstance !== null;
  
  console.log('Adsgram availability check:', {
    sdkLoaded: typeof window.Adsgram !== "undefined",
    initialized: isInitialized,
    instanceReady: adsgramInstance !== null,
    overall: available
  });
  
  return available;
}

/**
 * Get Adsgram status for debugging
 */
export function getStatus() {
  return {
    sdkLoaded: typeof window.Adsgram !== "undefined",
    initialized: isInitialized,
    instanceReady: adsgramInstance !== null,
    blockId: config?.blockId ? '***' + config.blockId.slice(-4) : 'Not set',
    config: config ? { ...config, blockId: '***' + config.blockId?.slice(-4) } : null,
    windowAdsgram: typeof window.Adsgram
  };
}

/**
 * Reset Adsgram instance (for debugging)
 */
export function reset() {
  console.log('Resetting Adsgram instance...');
  adsgramInstance = null;
  isInitialized = false;
  config = null;
}

/**
 * Force re-initialization (for debugging)
 */
export function reinitialize(adsConfig) {
  console.log('Force re-initializing Adsgram...');
  reset();
  initialize(adsConfig);
}

/**
 * Test if Adsgram SDK is properly loaded
 */
export function testSDK() {
  console.log('Testing Adsgram SDK:', {
    windowAdsgram: typeof window.Adsgram,
    adsgramInit: typeof window.Adsgram?.init,
    config: config
  });
  
  return {
    sdkLoaded: typeof window.Adsgram !== "undefined",
    hasInitMethod: typeof window.Adsgram?.init === "function",
    currentConfig: config
  };
}
