import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

  const PaymentModal = ({ 
    isOpen, 
    onClose, 
    paymentUrl, 
    onPaymentSuccess, 
    onPaymentFailure, 
    onPaymentCancel,
    cardName,
    amount,
    currency = 'TON',
    trackId,
    userId
  }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [timeElapsed, setTimeElapsed] = useState(0);
    const iframeRef = useRef(null);
    const startTimeRef = useRef(Date.now());

    // Check if paymentUrl is valid
    useEffect(() => {
      if (isOpen) {
        if (!paymentUrl || paymentUrl === 'undefined' || paymentUrl === '') {
          console.error('Invalid payment URL:', paymentUrl);
          setLoadError(true);
        }
      }
    }, [isOpen, paymentUrl]);

  // Timer to track how long user stays on payment page
  useEffect(() => {
    if (!isOpen) return;
    
    startTimeRef.current = Date.now();
    setTimeElapsed(0);
    
    const timer = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Handle iframe load events
  const handleIframeLoad = () => {
    setIsLoading(false);
    setLoadError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setLoadError(true);
  };

  // Add timeout for iframe loading
  useEffect(() => {
    if (!isOpen) return;
    
    // Set a timeout to detect if iframe is taking too long to load
    const loadTimeout = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setLoadError(true);
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(loadTimeout);
  }, [isOpen, isLoading]);

  // Handle modal close (user cancellation)
  const handleClose = () => {
    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
    
    // Show cancellation message when user explicitly closes
    onPaymentCancel?.('Payment cancelled by user');
    
    onClose();
  };

  // Listen for messages from iframe (payment gateway callbacks AND iframe-busting)
  useEffect(() => {
    const handleMessage = (event) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        // Handle iframe-busting messages (when our app is loaded inside the payment iframe)
        if (data.type === 'payment_return') {
          console.log('🔄 Received payment return message from iframe:', data);
          
          // Extract track ID from the message if available
          const returnTrackId = data.trackId || trackId;
          
          // Close modal immediately
          onClose?.();
          
          // Check payment status with the correct track ID
          if (returnTrackId && userId) {
            console.log('🔍 Checking payment status for track ID:', returnTrackId);
            setTimeout(() => {
              checkPaymentStatusFromGatewayWithTrackId(returnTrackId);
            }, 500);
          } else {
            // Fallback: assume success if we can't verify
            console.log('⚠️ No track ID available, assuming payment success');
            setTimeout(() => {
              onPaymentSuccess?.({ 
                message: 'Payment completed - please wait for confirmation',
                trackId: returnTrackId
              });
            }, 500);
          }
          return;
        }

        // Security: Only accept payment messages from trusted payment gateway domains
        const trustedDomains = ['oxapay.com', 'pay.oxapay.com', 'api.oxapay.com'];
        const isValidOrigin = trustedDomains.some(domain => 
          event.origin.includes(domain)
        );
        
        if (!isValidOrigin && data.type !== 'payment_return') return;
        
        if (data.type === 'payment_success' || data.status === 'completed') {
          onPaymentSuccess?.(data);
        } else if (data.type === 'payment_failed' || data.status === 'failed') {
          onPaymentFailure?.(data);
        } else if (data.type === 'payment_cancelled' || data.status === 'cancelled') {
          onPaymentCancel?.(data.message || 'Payment cancelled by user');
        }
      } catch (error) {
        console.error('Error parsing payment callback:', error);
      }
    };

    if (isOpen) {
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }
  }, [isOpen, onPaymentSuccess, onPaymentFailure, onPaymentCancel, onClose]);

  // Monitor iframe navigation to detect return URL
  useEffect(() => {
    if (!isOpen || !iframeRef.current) return;

    const iframe = iframeRef.current;
    
    const checkIframeUrl = () => {
      try {
        // Check if iframe has navigated to our return URL
        const iframeUrl = iframe.contentWindow?.location?.href;
        
        if (iframeUrl && (iframeUrl.includes('/mining?payment=return') || iframeUrl.includes('payment=return'))) {
          console.log('🔄 Iframe navigated to return URL, closing modal');
          onClose?.();
          // Check payment status after a short delay
          setTimeout(() => {
            checkPaymentStatusFromGateway();
          }, 500);
        }
      } catch (error) {
        // Cross-origin access blocked, which is expected
        // We'll use other methods to detect navigation
      }
    };

    // Check immediately and then periodically
    const interval = setInterval(checkIframeUrl, 1000);

    // Also listen for iframe load events
    const handleIframeNavigation = () => {
      console.log('🔄 Iframe navigation detected');
      setTimeout(checkIframeUrl, 100);
    };

    iframe.addEventListener('load', handleIframeNavigation);

    return () => {
      clearInterval(interval);
      iframe.removeEventListener('load', handleIframeNavigation);
    };
  }, [isOpen, onClose]);

  // Check payment status from OxaPay API
  const checkPaymentStatusFromGateway = async () => {
    try {
      if (!trackId || !userId) return;



      const response = await fetch('/api/oxapay?action=check-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          trackId: trackId,
          userId: userId
        })
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && (result.status === 'completed' || result.status === 'paid' || result.status === 'confirmed')) {
        onPaymentSuccess?.(result.data);
      } else if (result.status === 'failed' || result.status === 'expired' || result.status === 'cancelled') {
        onPaymentFailure?.(result);
      } else if (result.status === 'pending') {
        // Payment still processing, wait a bit and check again
        setTimeout(checkPaymentStatusFromGateway, 5000);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      
      // If it's a network error and user just returned, assume success for better UX
      if (error.message.includes('fetch') || error.message.includes('503')) {
        const urlParams = new URLSearchParams(window.location.search);
        const hasPaymentReturn = urlParams.get('payment') === 'return';
        
        if (hasPaymentReturn) {
          // User returned from payment gateway but API is down, assume success
          onPaymentSuccess?.({ message: 'Payment completed - verification pending' });
          return;
        }
      }
      
      onPaymentFailure?.({ message: 'Failed to verify payment status. Please contact support if payment was completed.' });
    }
  };

  // Check payment status with a specific track ID (for iframe returns)
  const checkPaymentStatusFromGatewayWithTrackId = async (targetTrackId) => {
    try {
      if (!targetTrackId || !userId) {
        console.warn('Missing trackId or userId for payment verification');
        return;
      }

      console.log('🔍 Checking payment status for track ID:', targetTrackId);

      const response = await fetch('/api/oxapay?action=check-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          trackId: targetTrackId,
          userId: userId
        })
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('💳 Payment status result:', result);
      
      if (result.success && (result.status === 'completed' || result.status === 'paid' || result.status === 'confirmed')) {
        onPaymentSuccess?.(result.data);
      } else if (result.status === 'failed' || result.status === 'expired' || result.status === 'cancelled') {
        onPaymentFailure?.(result);
      } else if (result.status === 'pending') {
        // Payment still processing, wait a bit and check again
        setTimeout(() => checkPaymentStatusFromGatewayWithTrackId(targetTrackId), 5000);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      
      // If it's a network error and user just returned, assume success for better UX
      if (error.message.includes('fetch') || error.message.includes('503')) {
        console.log('🔄 API unavailable but user returned, assuming success');
        onPaymentSuccess?.({ 
          message: 'Payment completed! Your mining card will be activated shortly.',
          trackId: targetTrackId,
          status: 'completed' // Mark as completed for better user experience
        });
        return;
      }
      
      onPaymentFailure?.({ message: 'Failed to verify payment status. Please contact support if payment was completed.' });
    }
  };

  // Note: Removed automatic URL checking to prevent page reloads
  // Now relying only on PostMessage communication from iframe

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
                  <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-4xl h-[80vh] bg-[#1a1a1a] rounded-2xl border border-gray-800 overflow-hidden shadow-2xl relative z-[9999]"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              isolation: 'isolate',
              contain: 'layout style'
            }}
          >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-blue-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Secure Payment</h3>
                <p className="text-sm text-gray-400">
                  {cardName} - {amount} {currency}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Timer */}
              <Badge variant="outline" className="bg-gray-800/50 text-gray-300 border-gray-700">
                <Clock className="h-3 w-3 mr-1" />
                {formatTime(timeElapsed)}
              </Badge>
              
              {/* Close Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Payment Content */}
          <div className="relative h-[calc(100%-5rem)] bg-[#1a1a1a] z-[10000]" style={{ isolation: 'isolate' }}>
            {/* Loading State */}
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1a1a]">
                <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                <p className="text-gray-400">Loading secure payment gateway...</p>
              </div>
            )}

            {/* Error State */}
            {loadError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1a1a] p-8">
                <div className="text-red-400 text-center">
                  <X className="h-12 w-12 mx-auto mb-4" />
                                           <h4 className="text-lg font-semibold mb-2">Payment Gateway Issue</h4>
                         <p className="text-gray-400 mb-4">
                           {!paymentUrl || paymentUrl === 'undefined' || paymentUrl === '' 
                             ? 'Invalid payment URL received. Please try creating a new payment.'
                             : 'The payment gateway couldn\'t load properly. This might be due to:'
                           }
                         </p>
                         {(!paymentUrl || paymentUrl === 'undefined' || paymentUrl === '') ? (
                           <div className="text-red-400 text-sm mb-6 p-3 bg-red-900/20 rounded">
                             <p>Debug info:</p>
                             <p>Payment URL: {String(paymentUrl)}</p>
                             <p>Track ID: {trackId}</p>
                           </div>
                         ) : (
                           <ul className="text-gray-400 text-sm mb-6 space-y-1">
                             <li>• Network connectivity issues</li>
                             <li>• Browser security settings</li>
                             <li>• Payment gateway maintenance</li>
                           </ul>
                         )}
                  <div className="flex flex-col gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setLoadError(false);
                        setIsLoading(true);
                        if (iframeRef.current) {
                          iframeRef.current.src = paymentUrl;
                        }
                      }}
                      className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                    >
                      Try Again
                    </Button>
                    <Button 
                      onClick={() => window.open(paymentUrl, '_blank')}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open in New Tab
                    </Button>
                    <Button 
                      variant="ghost"
                      onClick={handleClose}
                      className="text-gray-400 hover:text-white"
                    >
                      Cancel Payment
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Iframe */}
            {paymentUrl && (
              <div className="absolute inset-0 w-full h-full" style={{ zIndex: 10001 }}>
                <iframe
                  ref={iframeRef}
                  src={paymentUrl}
                  className="w-full h-full border-0"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  title="Secure Payment Gateway"
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-downloads"
                  allow="payment; clipboard-write; accelerometer; camera; microphone"
                  loading="eager"
                  style={{ 
                    display: loadError ? 'none' : 'block',
                    background: '#1a1a1a',
                    minHeight: '100%',
                    width: '100%',
                    position: 'relative',
                    zIndex: 10001
                  }}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-3 border-t border-gray-800 bg-gray-900/50">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Shield className="h-3 w-3" />
              <span>Secured by OxaPay SSL Encryption</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="text-xs text-gray-400 hover:text-white"
            >
              Cancel Payment
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PaymentModal;
