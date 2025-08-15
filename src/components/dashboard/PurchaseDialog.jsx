import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  createPayment,
  generateOrderId,
  convertStonToCrypto
} from '@/services/oxapayService';
import { getPurchasableBalance } from '@/data';
import { getAdminConfig } from '@/data/firestore/adminConfig';

// Individual card configurations - will be loaded from admin config
const getCardConfigurations = (adminConfig) => {
  const tonToStonRate = 1 / (adminConfig?.stonToTonRate || 0.0000001); // Convert TON to STON
  
  return {
    1: {
      id: 1,
      name: 'Card 1',
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
      name: 'Card 2', 
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
      name: 'Card 3',
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
import {
  Loader2,
  Wallet,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight
} from 'lucide-react';

// Dialog Component for Card Purchase  
const PurchaseDialog = ({ isOpen, onClose, cardPrice, cardNumber, currentBalance, user, onSuccess }) => {
  const [purchaseMethod, setPurchaseMethod] = useState('balance');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cryptoAmount, setCryptoAmount] = useState(null);
  const [adminConfig, setAdminConfig] = useState(null);
  const [cardConfigs, setCardConfigs] = useState({});
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

  // Helper function to convert STON to TON using admin config
  const stonToTon = (stonAmount) => {
    const amount = parseFloat(stonAmount) || 0;
    const rate = adminConfig?.stonToTonRate || 0.0000001;
    return (amount * rate).toFixed(6);
  };

  useEffect(() => {
    // Get the correct TON price from card configs
    if (cardNumber && cardConfigs[cardNumber]) {
      setCryptoAmount(cardConfigs[cardNumber].cryptoPrice);
    }
  }, [cardNumber, cardConfigs]);

  const handlePurchaseWithBalance = async () => {
    if (!user || !cardPrice) return;

    try {
      setIsProcessing(true);

      // Check purchasable balance (only task + mining)
      if (purchasableBalance < cardPrice) {
        throw new Error('Insufficient purchasable balance. Only Task and Mining balance can be used for purchases.');
      }

      // Purchase will be handled by the parent component
      onSuccess('balance');
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

  const handlePurchaseWithCrypto = async () => {
    if (!user || !cardPrice) return;

    try {
      setIsProcessing(true);

      // Check if we're in development (localhost) and API route is not available
      const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      
      if (isDevelopment) {
        // Use client-side payment creation for development
        const orderId = generateOrderId('card');
        
        const payment = await createPayment({
          amount: cryptoAmount,
          currency: 'TON',
          orderId,
          description: `${cardConfigs[cardNumber]?.name || `Card ${cardNumber}`} Purchase`,
          callbackUrl: `${window.location.origin}/api/oxapay?action=webhook`,
          returnUrl: `${window.location.origin}/mining?payment=return`,
          userId: user.id,
          userEmail: user.email || `user${user.id}@example.com` // Ensure email is always provided
        });

        if (payment.success) {
          // Create purchase record
          const purchaseRef = doc(db, 'purchases', orderId);
          const oxapayPaymentId = payment.data.payment_id || payment.data.trackId || payment.data.id || orderId;
          
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
            createdAt: new Date(),
            oxapayResponse: payment.data
          });

          // OxaPay returns invoice URL in different format
          const paymentUrl = payment.data.payLink || payment.data.payment_url || payment.data.url;
          
          if (paymentUrl) {
            // Return payment URL to parent instead of redirecting
            onSuccess('crypto', paymentUrl, {
              trackId: payment.data.track_id || payment.data.trackId,
              orderId: orderId,
              paymentId: oxapayPaymentId
            });
            return;
          } else {
            console.error('No payment URL found in response:', payment.data);
            throw new Error('Payment URL not found in response');
          }
        } else {
          throw new Error(payment.error || 'Payment creation failed');
        }
      } else {
        // Use server-side API endpoint for production
        const response = await fetch('/api/oxapay?action=create-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            username: user.username,
            userEmail: user.email,
            cardNumber: cardNumber,
            currency: 'TON'
          })
        });

        const result = await response.json();

        if (result.success) {
          // OxaPay returns invoice URL in different format
          const paymentUrl = result.data.paymentUrl || result.data.payLink || result.data.url;
          if (paymentUrl) {
            // Return payment URL to parent instead of redirecting
            onSuccess('crypto', paymentUrl, {
              trackId: result.data.trackId,
              orderId: result.data.orderId,
              paymentId: result.data.paymentId
            });
            return;
          } else {
            console.error('No payment URL found in server response:', result.data);
            throw new Error('Payment URL not found in server response');
          }
        } else {
          throw new Error(result.error || 'Payment creation failed');
        }
      }

    } catch (error) {
      console.error('Crypto purchase error:', error);
      toast({
        title: 'Purchase failed',
        description: error.message,
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white',
      });
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-600/50 text-white w-full max-w-md p-6 rounded-2xl shadow-2xl relative"
      >
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          onClick={onClose}
          disabled={isProcessing}
        >
          <XCircle className="h-6 w-6" />
        </button>

        <h2 className="text-xl font-bold mb-4 text-center">
          Purchase {cardConfigs[cardNumber]?.name || `Card ${cardNumber || 1}`}
        </h2>
        {cardNumber && cardConfigs[cardNumber] && (
          <div className="text-center mb-4">
            <p className="text-sm text-gray-300">
              {cardConfigs[cardNumber].name} - {cardConfigs[cardNumber].description}
            </p>
            <p className="text-xs text-gray-400">
              {cardConfigs[cardNumber].ratePerHour.toLocaleString()} STON/hour mining rate
            </p>
          </div>
        )}

        <div className="space-y-4">
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
                    Rate: 10,000,000 STON = 1 TON
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
                    Redirecting to Payment...
                  </>
                ) : (
                  <>
                    Pay with Crypto
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PurchaseDialog;
