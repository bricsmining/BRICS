import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { doc, setDoc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { updateCurrentUser, getCurrentUser } from '@/data/userStore';
import { deductPurchasableBalance, getPurchasableBalance } from '@/data';
import { getAdminConfig } from '@/data/firestore/adminConfig';
import PaymentModal from './PaymentModal';
import {
  Loader2,
  Wallet,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  X
} from 'lucide-react';

// Individual card configurations from admin config
const getCardConfigurations = (adminConfig) => {
  const tonToStonRate = 1 / (adminConfig?.stonToTonRate || 0.0000001);
  
  return {
    1: {
      id: 1,
      name: 'Basic Miner Card',
      ratePerHour: adminConfig?.card1RatePerHour || 150,
      cryptoPrice: adminConfig?.card1CryptoPrice || 0.1,
      validityDays: adminConfig?.card1ValidityDays || 7,
      description: `${adminConfig?.card1ValidityDays || 7} days validity`,
      get price() {
        return this.cryptoPrice * tonToStonRate;
      }
    },
    2: {
      id: 2,
      name: 'Advanced Miner Card', 
      ratePerHour: adminConfig?.card2RatePerHour || 250,
      cryptoPrice: adminConfig?.card2CryptoPrice || 0.25,
      validityDays: adminConfig?.card2ValidityDays || 15,
      description: `${adminConfig?.card2ValidityDays || 15} days validity`,
      get price() {
        return this.cryptoPrice * tonToStonRate;
      }
    },
    3: {
      id: 3,
      name: 'Pro Miner Card',
      ratePerHour: adminConfig?.card3RatePerHour || 600,
      cryptoPrice: adminConfig?.card3CryptoPrice || 0.5,
      validityDays: adminConfig?.card3ValidityDays || 30,
      description: `${adminConfig?.card3ValidityDays || 30} days validity`,
      get price() {
        return this.cryptoPrice * tonToStonRate;
      }
    }
  };
};

// Dialog Component for Card Purchase  
const PurchaseDialog = ({ isOpen, onClose, cardPrice, cardNumber, currentBalance, user, onSuccess, cardName }) => {
  const [purchaseMethod, setPurchaseMethod] = useState('balance');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cryptoAmount, setCryptoAmount] = useState(null);
  const [adminConfig, setAdminConfig] = useState(null);
  const [cardConfigs, setCardConfigs] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const { toast } = useToast();

  // Load admin config on mount
  useEffect(() => {
    const loadAdminConfig = async () => {
      try {
        const config = await getAdminConfig();
        setAdminConfig(config);
        setCardConfigs(getCardConfigurations(config));
      } catch (error) {
        console.error('Error loading admin config:', error);
      }
    };
    
    loadAdminConfig();
  }, []);

  // Get purchasable balance (only task + mining)
  const purchasableBalance = getPurchasableBalance(user);

  useEffect(() => {
    // Get the correct TON price from card configs
    if (cardNumber && cardConfigs[cardNumber]) {
      setCryptoAmount(cardConfigs[cardNumber].cryptoPrice);
    }
  }, [cardNumber, cardConfigs]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Generate order ID
  const generateOrderId = (prefix = 'card') => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  };

  // Handle purchase with STON balance
  const handlePurchaseWithBalance = async () => {
    if (!user || !cardPrice || !cardConfigs[cardNumber]) return;

    try {
      setIsProcessing(true);

      // Check purchasable balance (only task + mining)
      if (purchasableBalance < cardPrice) {
        throw new Error('Insufficient purchasable balance. Only Task and Mining balance can be used for purchases.');
      }

      // Deduct balance
      const deductSuccess = await deductPurchasableBalance(user.id, cardPrice);
      if (!deductSuccess) {
        throw new Error('Failed to deduct balance. Please try again.');
      }

      // Create new card instance
      const now = new Date();
      const cardConfig = cardConfigs[cardNumber];
      const expirationDate = new Date(now);
      expirationDate.setDate(expirationDate.getDate() + cardConfig.validityDays);

      // Find next available instance number
      const userDoc = await getDoc(doc(db, 'users', user.id));
      const userData = userDoc.data();
      const existingInstances = Object.keys(userData?.cardData || {})
        .filter(key => key.startsWith(`${cardNumber}_`))
        .length;
      
      const newCardKey = `${cardNumber}_${existingInstances + 1}`;
      
      const cardDataUpdate = {
        [`cardData.${newCardKey}`]: {
          cardId: cardNumber,
          purchaseDate: Timestamp.fromDate(now),
          expirationDate: Timestamp.fromDate(expirationDate),
          validityDays: cardConfig.validityDays,
          active: true,
          method: 'balance',
          instanceNumber: existingInstances + 1
        }
      };

      // Initialize mining data if not exists
      const miningDataUpdate = {
        miningData: {
          ...userData?.miningData,
          lastClaimTime: userData?.miningData?.lastClaimTime || Timestamp.fromDate(now),
          totalMined: userData?.miningData?.totalMined || 0,
          isActive: true,
        }
      };

      await updateCurrentUser(user.id, { ...cardDataUpdate, ...miningDataUpdate });

      toast({
        title: 'Card Purchased! 🎉',
        description: `${cardConfig.name} #${existingInstances + 1} activated for ${cardConfig.validityDays} days`,
        variant: 'success',
        className: 'bg-[#1a1a1a] text-white',
      });

      onSuccess?.();
      onClose();

    } catch (error) {
      console.error('Purchase error:', error);
      toast({
        title: 'Purchase failed',
        description: error.message,
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle purchase with TON crypto
  const handlePurchaseWithCrypto = async () => {
    if (!user || !cardPrice || !cardConfigs[cardNumber] || !adminConfig) return;

    try {
      setIsProcessing(true);

      const orderId = generateOrderId('card');
      const cardConfig = cardConfigs[cardNumber];
      
      // Create payment with OxaPay
      const response = await fetch('/api/oxapay?action=create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: cryptoAmount,
          currency: 'TON',
          orderId: orderId,
          description: `${cardConfig.name} Purchase`,
          // IMPORTANT: Proper callback/return URL usage 
          callbackUrl: `${window.location.origin}/api/oxapay?action=webhook`, // For backend confirmation
          returnUrl: `${window.location.origin}/mining?payment=return&orderId=${orderId}`, // For user return
          userId: user.id,
          userEmail: user.email || `user${user.id}@skyton.app`,
          username: user.username || user.firstName || `user${user.id}`,
          cardNumber: cardNumber,
          cardPrice: cardPrice,
          validityDays: cardConfig.validityDays
        })
      });

      const result = await response.json();

      if (result.success) {
        // Create purchase record in Firebase
        const purchaseRef = doc(db, 'purchases', orderId);
        const oxapayPaymentId = result.data.payment_id || result.data.trackId || result.data.id || orderId;
        
        await setDoc(purchaseRef, {
          userId: user.id,
          orderId,
          oxapayPaymentId,
          amount: cryptoAmount,
          stonAmount: cardPrice,
          currency: 'TON',
          status: 'pending',
          type: 'mining_card',
          cardNumber: cardNumber,
          cardConfig: cardConfig,
          createdAt: new Date(),
          oxapayResponse: result.data
        });

        // Extract payment URL
        const paymentUrl = result.data.payLink || result.data.payment_url || result.data.url;
        
        if (paymentUrl) {
          // Set payment data and show payment modal
          setPaymentData({
            paymentUrl,
            trackId: result.data.track_id || result.data.trackId || oxapayPaymentId,
            orderId: orderId,
            paymentId: oxapayPaymentId,
            amount: cryptoAmount,
            currency: 'TON'
          });
          setShowPaymentModal(true);
          setIsProcessing(false);
        } else {
          console.error('No payment URL found in response:', result.data);
          throw new Error('Payment URL not found in response');
        }
      } else {
        throw new Error(result.error || 'Payment creation failed');
      }

    } catch (error) {
      console.error('Crypto purchase error:', error);
      toast({
        title: 'Payment Creation Failed',
        description: error.message,
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white',
      });
      setIsProcessing(false);
    }
  };

  // Handle payment success from PaymentModal
  const handlePaymentSuccess = async (paymentResult) => {
    console.log('🎉 Payment successful:', paymentResult);
    
    toast({
      title: 'Payment Successful! 🎉',
      description: 'Your mining card will be activated shortly.',
      variant: 'success',
      className: 'bg-[#1a1a1a] text-white',
    });

    // Close modals
    setShowPaymentModal(false);
    onClose();
    
    // Trigger parent refresh
    onSuccess?.();
  };

  // Handle payment failure
  const handlePaymentFailure = (error) => {
    console.error('💥 Payment failed:', error);
    
    toast({
      title: 'Payment Failed',
      description: error?.message || 'Payment was not completed successfully.',
      variant: 'destructive',
      className: 'bg-[#1a1a1a] text-white',
    });

    setShowPaymentModal(false);
  };

  // Handle payment cancellation
  const handlePaymentCancel = (reason) => {
    console.log('🚫 Payment cancelled:', reason);
    
    toast({
      title: 'Payment Cancelled',
      description: reason || 'Payment was cancelled by user.',
      className: 'bg-[#1a1a1a] text-white',
    });

    setShowPaymentModal(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Purchase Dialog */}
      <AnimatePresence>
        {isOpen && !showPaymentModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-600/50 text-white w-full max-w-md max-h-[90vh] p-6 rounded-2xl shadow-2xl relative overflow-y-auto"
            >
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                onClick={onClose}
                disabled={isProcessing}
              >
                <X className="h-6 w-6" />
              </button>

              <div className="flex flex-col max-h-full">
                <h2 className="text-xl font-bold mb-4 text-center flex-shrink-0">
                  Purchase {cardName || cardConfigs[cardNumber]?.name || `Card ${cardNumber || 1}`}
                </h2>
                
                {cardNumber && cardConfigs[cardNumber] && (
                  <div className="text-center mb-4 flex-shrink-0">
                    <p className="text-sm text-gray-300">
                      {cardConfigs[cardNumber].name} - {cardConfigs[cardNumber].description}
                    </p>
                    <p className="text-xs text-gray-400">
                      {cardConfigs[cardNumber].ratePerHour.toLocaleString()} STON/hour mining rate
                    </p>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto">
                  <div className="space-y-4 pb-4">
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    onClick={() => setPurchaseMethod('balance')}
                    className={`p-4 rounded-xl border transition-all ${
                      purchaseMethod === 'balance'
                        ? 'bg-blue-600/20 border-blue-500/50 text-blue-400'
                        : 'bg-gray-800/50 border-gray-600/50 text-gray-400'
                    }`}
                  >
                    <Wallet className="h-5 w-5 mb-2 mx-auto" />
                    <p className="text-xs font-medium">STON Balance</p>
                    <p className="text-sm font-bold mt-1">
                      {cardPrice?.toLocaleString()} STON
                    </p>
                    {cardNumber && cardConfigs[cardNumber] && (
                      <p className="text-xs text-gray-400 mt-1">
                        {cardConfigs[cardNumber].description}
                      </p>
                    )}
                  </button>

                  <button
                    onClick={() => setPurchaseMethod('crypto')}
                    className={`p-4 rounded-xl border transition-all ${
                      purchaseMethod === 'crypto'
                        ? 'bg-green-600/20 border-green-500/50 text-green-400'
                        : 'bg-gray-800/50 border-gray-600/50 text-gray-400'
                    }`}
                  >
                    <CreditCard className="h-5 w-5 mb-2 mx-auto" />
                    <p className="text-xs font-medium">TON Payment</p>
                    <p className="text-sm font-bold mt-1">
                      {cryptoAmount ? `${cryptoAmount} TON` : '...'} 
                    </p>
                    {cardNumber && cardConfigs[cardNumber] && (
                      <p className="text-xs text-gray-400 mt-1">
                        {cardConfigs[cardNumber].description}
                      </p>
                    )}
                  </button>
                </div>

                {purchaseMethod === 'balance' ? (
                  <>
                    <div className="bg-gradient-to-r from-blue-600/20 to-blue-800/20 border border-blue-500/50 rounded-xl p-3">
                      <p className="text-sm text-center text-blue-300 mb-2">
                        {purchasableBalance >= cardPrice ? (
                          <>
                            <CheckCircle className="h-4 w-4 inline mr-2" />
                            Sufficient purchasable balance
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 inline mr-2" />
                            Insufficient purchasable balance
                          </>
                        )}
                      </p>
                      <div className="text-xs text-gray-300 text-center">
                        <p>Available for purchases: {purchasableBalance?.toLocaleString()} STON</p>
                        <p className="text-gray-400 mt-1">
                          ✓ Tasks + Mining • ⚠ Boxes + Referrals (withdrawal only)
                        </p>
                      </div>
                    </div>

                    <Button
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 rounded-xl font-semibold"
                      onClick={handlePurchaseWithBalance}
                      disabled={isProcessing || purchasableBalance < cardPrice}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Purchase with Balance
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="bg-gradient-to-r from-green-600/20 to-green-800/20 border border-green-500/50 rounded-xl p-3">
                      <p className="text-sm text-center text-green-300 mb-2">
                        <Clock className="h-4 w-4 inline mr-2" />
                        Pay with TON cryptocurrency
                      </p>
                      <div className="text-center">
                        <p className="text-xs text-gray-300">
                          Equivalent: {cardPrice?.toLocaleString()} STON = {cryptoAmount} TON
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Rate: {adminConfig?.stonToTonRate ? (1 / adminConfig.stonToTonRate).toLocaleString() : '10,000,000'} STON = 1 TON
                        </p>
                      </div>
                    </div>

                    <Button
                      className="w-full h-12 bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 rounded-xl font-semibold"
                      onClick={handlePurchaseWithCrypto}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Creating Payment...
                        </>
                      ) : (
                        <>
                          Pay with TON
                          <ArrowRight className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </>
                )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Modal */}
      {showPaymentModal && paymentData && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          paymentUrl={paymentData.paymentUrl}
          trackId={paymentData.trackId}
          userId={user.id}
          cardName={cardConfigs[cardNumber]?.name || `Card ${cardNumber}`}
          amount={paymentData.amount}
          currency={paymentData.currency}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentFailure={handlePaymentFailure}
          onPaymentCancel={handlePaymentCancel}
        />
      )}
    </>
  );
};

export default PurchaseDialog;