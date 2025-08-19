// src/ads/networks/gigapub.js
// GigaPub Ad Network Integration

let isInitialized = false;
let config = null;
let scriptLoadAttempted = false;
let scriptLoaded = false;

/**
 * Initialize GigaPub SDK
 * @param {Object} adsConfig - Configuration object with projectId
 */
export function initialize(adsConfig) {
  // Allow re-initialization if config changed
  if (isInitialized && config && config.projectId === adsConfig.projectId) {
    console.log('GigaPub already initialized with same config');
    return;
  }
  
  if (!adsConfig.projectId) {
    console.log('GigaPub initialization skipped - no projectId provided');
    return;
  }

  config = adsConfig;
  console.log('Starting GigaPub initialization with project ID:', config.projectId);
  
  // Load GigaPub script if not already loaded
  if (!scriptLoadAttempted) {
    loadGigaPubScript();
  }
}

/**
 * Load GigaPub script dynamically with enhanced reliability
 */
function loadGigaPubScript() {
  if (scriptLoadAttempted) {
    console.log('GigaPub script loading already attempted');
    return;
  }
  
  scriptLoadAttempted = true;
  console.log('Loading GigaPub script for project ID:', config.projectId);
  
  try {
    // Try the simple approach first
    const script = document.createElement('script');
    script.src = `https://ad.gigapub.tech/script?id=${config.projectId}`;
    script.async = true;
    
    script.onload = function() {
      console.log('GigaPub SDK loaded successfully');
      scriptLoaded = true;
      waitForGigaPubSDK();
    };
    
    script.onerror = function() {
      console.error('Primary GigaPub server failed, trying enhanced reliability script...');
      loadEnhancedScript();
    };
    
    document.head.appendChild(script);
    
    // Also set a timeout to try enhanced script if primary doesn't load
    setTimeout(() => {
      if (!scriptLoaded) {
        console.log('Primary script taking too long, trying enhanced reliability...');
        loadEnhancedScript();
      }
    }, 5000);
    
  } catch (error) {
    console.error('Failed to load GigaPub script:', error);
    loadEnhancedScript();
  }
}

/**
 * Load enhanced reliability script as fallback
 */
function loadEnhancedScript() {
  if (scriptLoaded) return;
  
  console.log('Loading GigaPub enhanced reliability script...');
  
  try {
    // Create the enhanced reliability script element
    const script = document.createElement('script');
    script.setAttribute('data-project-id', config.projectId);
    
    // Enhanced reliability script from GigaPub documentation  
    script.innerHTML = `
      !function(){
        var s=document.currentScript,p=s.getAttribute('data-project-id')||'default';
        var d=['https://ad.gigapub.tech','https://ru-ad.gigapub.tech'],i=0,t,sc;
        function l(){
          sc=document.createElement('script');
          sc.async=true;
          sc.src=d[i]+'/script?id='+p;
          clearTimeout(t);
          t=setTimeout(function(){
            sc.onload=sc.onerror=null;
            sc.src='';
            if(++i<d.length)l();
          },15000);
          sc.onload=function(){
            clearTimeout(t);
            console.log('GigaPub SDK loaded successfully from:', d[i]);
            window.gigapubReady = true;
          };
          sc.onerror=function(){
            console.error('GigaPub SDK failed to load from:', d[i]);
            clearTimeout(t);
            if(++i<d.length)l();
          };
          document.head.appendChild(sc);
        }
        l();
      }();
    `;
    
    document.head.appendChild(script);
    
    // Wait for GigaPub SDK to load
    waitForGigaPubSDK();
    
  } catch (error) {
    console.error('Failed to inject enhanced GigaPub script:', error);
  }
}

/**
 * Wait for GigaPub SDK to load with timeout
 */
function waitForGigaPubSDK() {
  let attempts = 0;
  const maxAttempts = 200; // 20 seconds max wait
  
  const checkSDK = () => {
    attempts++;
    
    // Check for both showGiga function and gigapubReady flag
    if (typeof window.showGiga === 'function' || window.gigapubReady) {
      console.log('GigaPub SDK loaded successfully');
      scriptLoaded = true;
      isInitialized = true;
      console.log('GigaPub initialized successfully with project ID:', config.projectId);
      
      // Double check that showGiga is available
      if (typeof window.showGiga !== 'function') {
        console.warn('GigaPub ready flag set but showGiga function not available');
        // Give it a bit more time
        setTimeout(() => {
          if (typeof window.showGiga === 'function') {
            console.log('GigaPub showGiga function now available');
          } else {
            console.error('GigaPub showGiga function still not available after ready flag');
          }
        }, 1000);
      }
      
      return; // Exit the polling
    } else if (attempts >= maxAttempts) {
      console.error('GigaPub SDK failed to load after', maxAttempts * 100, 'ms');
      console.error('window.showGiga function not available');
      console.error('window.gigapubReady:', window.gigapubReady);
      console.error('Available window functions:', Object.keys(window).filter(key => key.toLowerCase().includes('giga')));
    } else {
      if (attempts % 20 === 0) { // Log every 2 seconds
        console.log(`Waiting for GigaPub SDK to load... (attempt ${attempts}/${maxAttempts})`);
        console.log('Current state:', {
          showGiga: typeof window.showGiga,
          gigapubReady: window.gigapubReady
        });
      }
      setTimeout(checkSDK, 100);
    }
  };
  
  checkSDK();
}

/**
 * Show rewarded ad
 * @param {Object} handlers - Event handlers
 */
export function showAd({ onComplete, onClose, onError }) {
  console.log('GigaPub showAd called:', { 
    isInitialized, 
    scriptLoaded,
    hasShowGiga: typeof window.showGiga === 'function',
    projectId: config?.projectId
  });

  if (!isInitialized || !scriptLoaded) {
    const errorMsg = 'GigaPub not initialized. Please check your project ID configuration.';
    console.error(errorMsg);
    if (onError) onError(errorMsg);
    return;
  }

  if (!config?.projectId) {
    const errorMsg = 'GigaPub project ID not configured.';
    console.error(errorMsg);
    if (onError) onError(errorMsg);
    return;
  }

  if (typeof window.showGiga !== 'function') {
    const errorMsg = 'GigaPub showGiga function not available';
    console.error(errorMsg);
    if (onError) onError(errorMsg);
    return;
  }

  try {
    console.log('Attempting to show GigaPub ad...');
    
    // Call the GigaPub showGiga function
    window.showGiga()
      .then(() => {
        console.log('GigaPub ad completed successfully - user rewarded');
        if (onComplete) {
          try {
            onComplete();
          } catch (error) {
            console.error('Error in GigaPub onComplete handler:', error);
          }
        }
      })
      .catch((error) => {
        console.error('GigaPub ad error:', error);
        handleGigaPubError(error, onError);
      });

  } catch (error) {
    console.error('GigaPub show error:', error);
    const errorMsg = `Failed to show GigaPub ad: ${error.message || 'Unknown error'}`;
    if (onError) {
      try {
        onError(errorMsg);
      } catch (handlerError) {
        console.error('Error in GigaPub onError handler:', handlerError);
      }
    }
  }
}

/**
 * Handle GigaPub specific errors
 */
function handleGigaPubError(error, onError) {
  let errorMessage = 'Failed to show ad';
  
  if (error && typeof error === 'object') {
    if (error.message?.includes('no ads') || error.code === 'NO_ADS') {
      errorMessage = 'No ads available right now.';
    } else if (error.message?.includes('network') || error.code === 'NETWORK_ERROR') {
      errorMessage = 'Network error. Please check your connection.';
    } else if (error.message?.includes('blocked') || error.code === 'AD_BLOCKED') {
      errorMessage = 'Ad blocker detected. Please disable it to watch ads.';
    } else if (error.message?.includes('timeout') || error.code === 'TIMEOUT') {
      errorMessage = 'Ad request timed out. Please try again.';
    } else if (error.message?.includes('invalid') || error.code === 'INVALID_CONFIG') {
      errorMessage = 'Invalid project configuration.';
    } else {
      errorMessage = `GigaPub error: ${error.message || error.code || 'Unknown error'}`;
    }
  } else if (typeof error === 'string') {
    errorMessage = `GigaPub error: ${error}`;
  }
  
  if (onError) {
    try {
      onError(errorMessage);
    } catch (handlerError) {
      console.error('Error in GigaPub onError handler:', handlerError);
    }
  }
}

/**
 * Check if GigaPub is available
 */
export function isAvailable() {
  const available = typeof window.showGiga === 'function' && 
                   isInitialized && 
                   scriptLoaded && 
                   config?.projectId;
  
  console.log('GigaPub availability check:', {
    showGigaFunction: typeof window.showGiga === 'function',
    initialized: isInitialized,
    scriptLoaded: scriptLoaded,
    hasProjectId: !!config?.projectId,
    overall: available
  });
  
  return available;
}

/**
 * Get GigaPub status for debugging
 */
export function getStatus() {
  return {
    scriptLoadAttempted,
    scriptLoaded,
    initialized: isInitialized,
    showGigaFunction: typeof window.showGiga === 'function',
    projectId: config?.projectId ? '***' + config.projectId.slice(-4) : 'Not set',
    config: config ? { ...config, projectId: '***' + config.projectId?.slice(-4) } : null,
    windowGigaFunctions: Object.keys(window).filter(key => key.toLowerCase().includes('giga'))
  };
}

/**
 * Reset GigaPub instance (for debugging)
 */
export function reset() {
  console.log('Resetting GigaPub instance...');
  isInitialized = false;
  scriptLoaded = false;
  scriptLoadAttempted = false;
  config = null;
  
  // Remove any existing scripts (optional cleanup)
  const existingScripts = document.querySelectorAll('script[data-project-id]');
  existingScripts.forEach(script => {
    try {
      script.remove();
    } catch (e) {
      console.log('Could not remove existing script:', e);
    }
  });
}

/**
 * Force re-initialization (for debugging)
 */
export function reinitialize(adsConfig) {
  console.log('Force re-initializing GigaPub...');
  reset();
  initialize(adsConfig);
}

/**
 * Test if GigaPub SDK is working
 */
export function testSDK() {
  console.log('=== GigaPub SDK Test ===');
  console.log('Config:', config);
  console.log('Initialized:', isInitialized);
  console.log('Script loaded:', scriptLoaded);
  console.log('Script load attempted:', scriptLoadAttempted);
  console.log('showGiga function:', typeof window.showGiga);
  console.log('Available Giga functions:', Object.keys(window).filter(key => key.toLowerCase().includes('giga')));
  console.log('=========================');
  
  return {
    config,
    initialized: isInitialized,
    scriptLoaded,
    scriptLoadAttempted,
    showGigaFunction: typeof window.showGiga === 'function'
  };
}

/**
 * Setup fallback mechanism (as suggested in GigaPub docs)
 */
export function setupFallback(fallbackAdFunction) {
  if (typeof fallbackAdFunction === 'function') {
    window.AdGigaFallback = fallbackAdFunction;
    
    // If showGiga is not available, use fallback
    if (typeof window.showGiga === 'undefined') {
      window.showGiga = () => window.AdGigaFallback();
      console.log('GigaPub fallback mechanism activated');
    }
  }
}
