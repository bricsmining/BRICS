import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  Axe,
  Coins,
  Clock,
  Star,
  ShoppingCart,
  Zap,
  TrendingUp,
  Gift,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Timer,
  CreditCard,
  Wallet,
  Calendar,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { updateCurrentUser, getCurrentUser } from '@/data/userStore';
import { getPurchasableBalance, deductPurchasableBalance, updateUserBalanceByType } from '@/data';
import { Timestamp } from 'firebase/firestore';
import { getAdminConfig } from '@/data/firestore/adminConfig';
import PurchaseDialog from './PurchaseDialog';
import PaymentModal from './PaymentModal';

// Get individual card configurations from admin config
const getIndividualCards = (adminConfig) => {
  const tonToStonRate = 1 / (adminConfig?.stonToTonRate || 0.0000001); // Convert TON to STON
  
  return {
    1: {
      id: 1,
      name: 'Basic Miner Card',
      ratePerHour: adminConfig?.card1RatePerHour || 150,
      cryptoPrice: adminConfig?.card1CryptoPrice || 0.1,
      validityDays: adminConfig?.card1ValidityDays || 7,
      description: `${adminConfig?.card1ValidityDays || 7} days validity`,
      color: 'from-blue-600 to-blue-700',
      icon: Axe,
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
      color: 'from-purple-600 to-purple-700',
      icon: Database,
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
      color: 'from-yellow-600 to-orange-600',
      icon: Star,
      get price() {
        return this.cryptoPrice * tonToStonRate;
      }
    }
  };
};

// Mining level names based on cards owned
const MINING_LEVEL_NAMES = {
  0: 'No Mining',
  1: 'Basic Miner',
  2: 'Advanced Miner', 
  3: 'Pro Miner'
};



// Mining progress animation variants
const progressVariants = {
  initial: { width: 0 },
  animate: { width: '100%' },
};

const cardVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  hover: { scale: 1.02, y: -2 },
};

// Utility function to calculate countdown timer
const calculateCountdown = (expirationDate) => {
  const now = new Date().getTime();
  const expiry = (expirationDate instanceof Timestamp ? 
    expirationDate.toDate() : 
    new Date(expirationDate)
  ).getTime();
  
  const timeLeft = expiry - now;
  
  if (timeLeft <= 0) {
    return { expired: true, text: 'Expired', days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  
  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  
  return {
    expired: false,
    text: `${days}d ${hours}h ${minutes}m ${seconds}s`,
    days,
    hours,
    minutes,
    seconds
  };
};

const MiningSection = ({ user, refreshUserData }) => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState(user);
  const [miningProgress, setMiningProgress] = useState(0);
  const [pendingRewards, setPendingRewards] = useState(0);
  const [isClaimingRewards, setIsClaimingRewards] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeUntilNextReward, setTimeUntilNextReward] = useState('');
  const [cardExpiryTime, setCardExpiryTime] = useState('');
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [selectedCardLevel, setSelectedCardLevel] = useState(1);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmPurchaseData, setConfirmPurchaseData] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [adminConfig, setAdminConfig] = useState(null);

  // Get dynamic card configurations based on admin config
  const INDIVIDUAL_CARDS = useMemo(() => {
    return adminConfig ? getIndividualCards(adminConfig) : getIndividualCards({});
  }, [adminConfig]);

  // Load admin config on component mount
  useEffect(() => {
    const loadAdminConfig = async () => {
      try {
        const config = await getAdminConfig();
        setAdminConfig(config);
      } catch (error) {
        console.error('Error loading admin config:', error);
        setAdminConfig({}); // Use default values
      }
    };

    loadAdminConfig();
  }, []);

  // Timer for updating countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Calculate total mining rate from all owned cards (including multiple instances)
  const currentMiningStats = useMemo(() => {
    const userCardData = currentUser?.cardData || {};
    let totalRate = 0;
    let activeCards = [];
    let cardCounts = {};
    
    // Count instances of each card type and calculate total mining rate
    Object.keys(userCardData).forEach(cardKey => {
      const cardData = userCardData[cardKey];
      const cardId = parseInt(cardKey.split('_')[0]); // Extract card ID from key like "1_1", "1_2", etc.
      const cardConfig = INDIVIDUAL_CARDS[cardId];
      
      if (cardData && cardConfig) {
        const expirationDate = cardData.expirationDate instanceof Timestamp ? 
          cardData.expirationDate.toDate() : 
          new Date(cardData.expirationDate);
        
        // Only count cards that haven't expired
        if (expirationDate.getTime() > new Date().getTime()) {
          totalRate += cardConfig.ratePerHour * (cardData.quantity || 1);
          activeCards.push({...cardConfig, ...cardData, cardKey});
          cardCounts[cardId] = (cardCounts[cardId] || 0) + (cardData.quantity || 1);
        }
      }
    });
    
    // Calculate unique card types owned
    const uniqueCardsOwned = Object.keys(cardCounts).length;
    
    return {
      totalRatePerHour: totalRate,
      activeCards: activeCards,
      cardCounts: cardCounts,
      uniqueCardsOwned: uniqueCardsOwned,
      totalCardsOwned: Object.values(cardCounts).reduce((sum, count) => sum + count, 0),
      levelName: MINING_LEVEL_NAMES[uniqueCardsOwned] || 'No Mining',
      color: activeCards.length > 0 ? activeCards[activeCards.length - 1].color : 'from-gray-600 to-gray-700',
      icon: activeCards.length > 0 ? activeCards[activeCards.length - 1].icon : AlertCircle
    };
  }, [currentUser?.cardData]);

  // Helper function to format time duration
  const formatTimeDuration = useCallback((milliseconds) => {
    if (milliseconds <= 0) return 'Expired';
  
    const seconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
  
    return `${days}d:${hours.toString().padStart(2, '0')}h:${minutes.toString().padStart(2, '0')}m:${secs.toString().padStart(2, '0')}s`;
  }, []);

  // Calculate mining rewards based on current mining stats and time elapsed
  const calculateMiningRewards = useCallback(() => {
    if (!currentUser?.miningData?.lastClaimTime || currentMiningStats.totalRatePerHour === 0) {
      return { rewards: 0, timeDiffHours: 0 };
    }

    const lastClaimTime = currentUser.miningData.lastClaimTime instanceof Timestamp 
      ? currentUser.miningData.lastClaimTime.toDate() 
      : new Date(currentUser.miningData.lastClaimTime);
    
    const now = new Date();
    const timeDiffMs = now.getTime() - lastClaimTime.getTime();
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
    
    // Cap rewards at 24 hours
    const cappedHours = Math.min(timeDiffHours, 24);
    const rewards = Math.floor(cappedHours * currentMiningStats.totalRatePerHour);
    
    return { rewards, timeDiffHours };
  }, [currentUser, currentMiningStats]);

// Update mining progress and rewards every second
useEffect(() => {
  let mounted = true;

  const updateMiningData = () => {
    if (!mounted) return;

    // Always check for card expiry information, even if no active mining
    const userCardData = currentUser?.cardData || {};
    
    // Find cards that need renewal priority (less than 20% time left) and next expiring cards
    let priorityCard = null;
    let shortestExpiryCard = null;
    let shortestExpiryTime = null;
    let shortestProgress = 0;
    let hasActiveCards = currentMiningStats.totalRatePerHour > 0;
    
    // Check ALL cards (not just active ones) to find next expiring card
    Object.keys(userCardData).forEach(cardKey => {
      const cardData = userCardData[cardKey];
      const cardId = parseInt(cardKey.split('_')[0]);
      const cardConfig = INDIVIDUAL_CARDS[cardId];
      
      if (cardData && cardConfig) {
        const expirationDate = cardData.expirationDate instanceof Timestamp ? 
          cardData.expirationDate.toDate() : 
          new Date(cardData.expirationDate);
        
        const timeUntilExpiration = expirationDate.getTime() - new Date().getTime();
        const isCardActive = timeUntilExpiration > 0;
        
        // Calculate progress for this card
        const totalValidityMs = cardConfig.validityDays * 24 * 60 * 60 * 1000;
        const purchaseDate = cardData.purchaseDate instanceof Timestamp ? 
          cardData.purchaseDate.toDate() : 
          new Date(cardData.purchaseDate);
        const timeElapsedMs = new Date().getTime() - purchaseDate.getTime();
        const progress = Math.max(0, Math.min(100, (timeElapsedMs / totalValidityMs) * 100));
        
        // For active cards, check priority (less than 20% time left)
        if (isCardActive) {
          const timeLeftPercentage = ((timeUntilExpiration / totalValidityMs) * 100);
          
          if (timeLeftPercentage <= 20 && (priorityCard === null || timeUntilExpiration < priorityCard.timeUntilExpiration)) {
            priorityCard = {
              cardData,
              cardConfig,
              timeUntilExpiration,
              progress,
              cardId,
              cardKey,
              isActive: true
            };
          }
        }
        
        // Track the card with the longest remaining time (next to expire)
        // For expired cards, we want to show the most recently expired
        // For active cards, we want to show the soonest to expire
        if (shortestExpiryTime === null || 
            (isCardActive && timeUntilExpiration < shortestExpiryTime) ||
            (!hasActiveCards && timeUntilExpiration > shortestExpiryTime)) {
          shortestExpiryTime = timeUntilExpiration;
          shortestProgress = progress;
          shortestExpiryCard = {
            cardData,
            cardConfig,
            cardId,
            cardKey,
            isActive: isCardActive
          };
        }
      }
    });
    
    // Use priority card if available, otherwise use shortest expiring card
    const cardToDisplay = priorityCard || shortestExpiryCard;
    
    if (cardToDisplay) {
      const { cardConfig, timeUntilExpiration = shortestExpiryTime, progress = shortestProgress, isActive } = cardToDisplay;
      
      // Set card expiry time with card name and status
      let urgencyPrefix = '';
      let statusText = '';
      
      if (priorityCard) {
        urgencyPrefix = '⚠️ RENEW: ';
      } else if (!isActive) {
        urgencyPrefix = '🔄 EXPIRED: ';
        statusText = ' (Renew to continue mining)';
      }
      
      const timeDisplay = isActive ? formatTimeDuration(timeUntilExpiration) : 'Expired';
      setCardExpiryTime(`${urgencyPrefix}${cardConfig?.name || 'Card'} - ${timeDisplay}${statusText}`);
      setMiningProgress(isNaN(progress) ? (isActive ? 0 : 100) : progress);
    } else {
      setCardExpiryTime('No Cards Owned');
      setMiningProgress(0);
    }

    // Handle mining rewards and timing (only for active mining)
    if (hasActiveCards) {
      const { rewards, timeDiffHours } = calculateMiningRewards();
      
      // Calculate and set next reward time
      const nextRewardMs = (1 - (timeDiffHours % 1)) * 3600 * 1000;
      setTimeUntilNextReward(formatTimeDuration(nextRewardMs));
      
      // Update pending rewards
      setPendingRewards(prev => Math.max(prev, rewards));
    } else {
      setTimeUntilNextReward('--');
      setPendingRewards(0);
    }
  };

  const interval = setInterval(updateMiningData, 1000);
  updateMiningData(); // Initial update

  return () => {
    mounted = false;
    clearInterval(interval);
  };
  }, [calculateMiningRewards, currentMiningStats.totalRatePerHour, formatTimeDuration, currentUser]);



  // Handle payment status checking and activation (only for mining page)
  useEffect(() => {
    const purchase = searchParams.get('purchase');
    const payment = searchParams.get('payment');
    const trackId = searchParams.get('track_id') || searchParams.get('trackId');
    
    if (purchase === 'success' || payment === 'success' || payment === 'return') {
      // Show initial verification message
      toast({
        title: 'Payment Return Detected! ⏳',
        description: 'Verifying your payment status and checking card activation...',
        variant: 'default',
        className: 'bg-blue-800 text-white',
      });
      
      // Close payment modal if it's open
      setShowPaymentModal(false);
      setPaymentData(null);
      
      // Clear the URL parameters first
      searchParams.delete('purchase');
      searchParams.delete('payment');
      if (trackId) {
        searchParams.delete('track_id');
        searchParams.delete('trackId');
      }
      setSearchParams(searchParams);
      
      // Check payment status and activate card
      if (trackId && currentUser?.id) {
        checkPaymentStatusAndActivate(trackId, currentUser.id);
      } else {
        // Fallback: just refresh user data after delay
        setTimeout(async () => {
          try {
            const updatedUser = await getCurrentUser(currentUser?.id);
            if (updatedUser) {
              setCurrentUser(updatedUser);
              if (refreshUserData) refreshUserData(updatedUser);
            }
          } catch (error) {
            console.error('Error refreshing user data:', error);
            window.location.reload();
          }
        }, 3000);
      }
      
    } else if (purchase === 'failed' || payment === 'failed') {
      toast({
        title: 'Payment Failed ❌',
        description: 'Your payment could not be processed. Please try again.',
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white',
      });
      

      
      // Clear the URL parameters
      searchParams.delete('purchase');
      searchParams.delete('payment');
      setSearchParams(searchParams);
      
    } else if (purchase === 'cancelled' || payment === 'cancelled') {
      toast({
        title: 'Payment Cancelled',
        description: 'Your payment was cancelled. You can try again when ready.',
        variant: 'default',
        className: 'bg-[#1a1a1a] text-white',
      });
      

      
      // Clear the URL parameters
      searchParams.delete('purchase');
      searchParams.delete('payment');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams, toast, currentUser?.id, refreshUserData]);



  // Check payment status and activate card
  const checkPaymentStatusAndActivate = useCallback(async (trackId, userId) => {
    try {
      console.log(`Checking payment status for track ID: ${trackId}`);
      
      const response = await fetch('/api/oxapay?action=check-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackId,
          userId
        })
      });

      const result = await response.json();
      
      if (result.success && result.status === 'completed') {
        // Payment confirmed and card activated
        toast({
          title: 'Card Activated! ✅',
          description: `${result.data.cardName} has been added to your account!`,
          variant: 'success',
          className: 'bg-[#1a1a1a] text-white',
        });
        
        // Refresh user data to show new card
        setTimeout(async () => {
          try {
            const updatedUser = await getCurrentUser(userId);
            if (updatedUser) {
              setCurrentUser(updatedUser);
              if (refreshUserData) refreshUserData(updatedUser);
            }
          } catch (error) {
            console.error('Error refreshing user data:', error);
          }
        }, 1000);
        
      } else if (result.status === 'pending') {
        // Payment still pending, check again in a few seconds
        toast({
          title: 'Payment Processing... ⏳',
          description: 'Your payment is being confirmed. Please wait...',
          variant: 'default',
          className: 'bg-[#1a1a1a] text-white',
        });
        
        // Retry after 5 seconds, max 3 times
        setTimeout(() => {
          checkPaymentStatusWithRetry(trackId, userId, 1);
        }, 5000);
        
      } else {
        // Payment failed
        toast({
          title: 'Payment Failed ❌',
          description: result.message || 'Payment could not be verified. Please contact support.',
          variant: 'destructive',
          className: 'bg-[#1a1a1a] text-white',
        });
      }
      
    } catch (error) {
      console.error('Error checking payment status:', error);
      toast({
        title: 'Status Check Failed',
        description: 'Could not verify payment status. Please refresh the page.',
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white',
      });
    }
  }, [toast, refreshUserData]);

  // Retry payment status check with limited attempts
  const checkPaymentStatusWithRetry = useCallback(async (trackId, userId, attempt) => {
    if (attempt > 3) {
      toast({
        title: 'Payment Verification Timeout',
        description: 'Please refresh the page to check your payment status.',
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white',
      });
      return;
    }

    try {
      const response = await fetch('/api/oxapay?action=check-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          trackId,
          userId
        })
      });

      const result = await response.json();
      
      if (result.success && result.status === 'completed') {
        // Payment confirmed and card activated
        toast({
          title: 'Card Activated! ✅',
          description: `${result.data.cardName} has been added to your account!`,
          variant: 'success',
          className: 'bg-[#1a1a1a] text-white',
        });
        
        // Refresh user data
        setTimeout(async () => {
          try {
            const updatedUser = await getCurrentUser(userId);
            if (updatedUser) {
              setCurrentUser(updatedUser);
              if (refreshUserData) refreshUserData(updatedUser);
            }
          } catch (error) {
            console.error('Error refreshing user data:', error);
          }
        }, 1000);
        
      } else if (result.status === 'pending') {
        // Still pending, retry again
        setTimeout(() => {
          checkPaymentStatusWithRetry(trackId, userId, attempt + 1);
        }, 5000);
        
      } else {
        // Payment failed
        toast({
          title: 'Payment Failed ❌',
          description: result.message || 'Payment verification failed.',
          variant: 'destructive',
          className: 'bg-[#1a1a1a] text-white',
        });
      }
      
    } catch (error) {
      console.error('Error in retry check:', error);
      // Try again if not the last attempt
      if (attempt < 3) {
        setTimeout(() => {
          checkPaymentStatusWithRetry(trackId, userId, attempt + 1);
        }, 5000);
      }
    }
  }, [toast, refreshUserData]);

  // Payment modal handlers
  const handlePaymentSuccess = useCallback(async (paymentResult) => {
    console.log('Payment successful:', paymentResult);
    
    toast({
      title: 'Payment Successful! 🎉',
      description: `Your ${paymentData?.cardName || 'mining card'} has been activated!`,
      variant: 'default',
      className: 'bg-green-800 text-white',
    });

    // Close payment modal
    setShowPaymentModal(false);
    setPaymentData(null);

    // Refresh user data to show new card
    await refreshUserData();
  }, [toast, refreshUserData, paymentData]);

  const handlePaymentFailure = useCallback((error) => {
    console.log('Payment failed:', error);
    
    toast({
      title: 'Payment Failed ❌',
      description: error?.message || 'Payment could not be processed. Please try again.',
      variant: 'destructive',
    });

    // Close payment modal
    setShowPaymentModal(false);
    setPaymentData(null);
  }, [toast]);

  const handlePaymentCancel = useCallback((reason) => {
    console.log('🚫 Payment cancelled in MiningSection:', reason);
    
    // Show toast notification
    toast({
      title: 'Payment Cancelled 🚫',
      description: reason || 'Payment was cancelled. You can try again when ready.',
      variant: 'default',
      className: 'bg-[#1a1a1a] text-white',
    });



    // Close payment modal
    setShowPaymentModal(false);
    setPaymentData(null);
  }, [toast]);

  // Start mining (initialize mining start time and last claim time)
  const startMining = useCallback(async () => {
    if (!currentUser?.id || currentMiningStats.totalRatePerHour === 0) return;

    try {
      const now = Timestamp.now();
      const updates = {
        miningData: {
          ...currentUser.miningData,
          miningStartTime: now,
          lastClaimTime: now,
          isActive: true,
        }
      };

      await updateCurrentUser(currentUser.id, updates);
      
      const updatedUser = await getCurrentUser(currentUser.id);
      if (updatedUser) {
        setCurrentUser(updatedUser);
        if (refreshUserData) refreshUserData(updatedUser);
      }

      toast({
        title: 'Mining Started! ⛏️',
        description: `You're now mining ${currentMiningStats.totalRatePerHour} STON per hour`,
        variant: 'success',
        className: 'bg-[#1a1a1a] text-white',
      });
    } catch (error) {
      console.error('Error starting mining:', error);
      toast({
        title: 'Error',
        description: 'Failed to start mining. Please try again.',
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white',
      });
    }
  }, [currentUser, currentMiningStats, refreshUserData, toast]);

  // Claim mining rewards
  const claimRewards = useCallback(async () => {
    if (!currentUser?.id || pendingRewards <= 0 || isClaimingRewards) return;

    setIsClaimingRewards(true);
    try {
      const now = Timestamp.now();
      const newTotalMined = (currentUser.miningData?.totalMined || 0) + pendingRewards;

      // Add reward to mining balance type (can be used for purchases)
      await updateUserBalanceByType(currentUser.id, pendingRewards, 'mining');

      const updates = {
        miningData: {
          ...currentUser.miningData,
          lastClaimTime: now,
          totalMined: newTotalMined,
          isActive: true,
        }
      };

      await updateCurrentUser(currentUser.id, updates);
      
      const updatedUser = await getCurrentUser(currentUser.id);
      if (updatedUser) {
        setCurrentUser(updatedUser);
        if (refreshUserData) refreshUserData(updatedUser);
      }

      toast({
        title: 'Rewards Claimed! 🎉',
        description: `You earned ${pendingRewards.toLocaleString()} STON`,
        variant: 'success',
        className: 'bg-[#1a1a1a] text-white',
      });

      // Don't reset mining progress - it should continue from where it was
      setPendingRewards(0);
    } catch (error) {
      console.error('Error claiming rewards:', error);
      toast({
        title: 'Error',
        description: 'Failed to claim rewards. Please try again.',
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white',
      });
    } finally {
      setIsClaimingRewards(false);
    }
  }, [currentUser, pendingRewards, isClaimingRewards, refreshUserData, toast]);

  // Purchase individual mining card (allows multiple purchases of same card)
  const purchaseIndividualCard = useCallback(async (cardId, method = 'balance') => {
    if (!currentUser?.id || isPurchasing) return;

    if (cardId < 1 || cardId > 3) {
      toast({
        title: 'Invalid Card',
        description: 'Invalid card selection.',
        variant: 'default',
        className: 'bg-[#1a1a1a] text-white',
      });
      return;
    }

    const cardConfig = INDIVIDUAL_CARDS[cardId];
    const cardPrice = cardConfig[method === 'crypto' ? 'cryptoPrice' : 'price'];
    const currentPurchasableBalance = getPurchasableBalance(currentUser);

    if (method === 'balance') {
      // Show confirmation dialog for STON purchases
      setConfirmPurchaseData({ cardId, method, cardConfig, cardPrice, currentPurchasableBalance });
      setShowConfirmDialog(true);
    } else {
      // For crypto payments, just open purchase dialog
      // Payment attempt will be tracked when user actually initiates payment
      setSelectedCardLevel(cardId);
      setShowPurchaseDialog(true);
    }
  }, [currentUser, isPurchasing]);

  // Confirm and execute STON purchase
  const confirmStonPurchase = useCallback(async () => {
    if (!confirmPurchaseData || !currentUser?.id || isPurchasing) return;

    const { cardId, cardConfig, cardPrice, currentPurchasableBalance } = confirmPurchaseData;

      if (currentPurchasableBalance < cardPrice) {
        toast({
          title: 'Insufficient Purchasable Balance',
        description: `You need ${cardPrice.toLocaleString()} STON to purchase ${cardConfig.name}. Available for purchases: ${currentPurchasableBalance.toLocaleString()} STON (Tasks + Mining only)`,
          variant: 'destructive',
          className: 'bg-[#1a1a1a] text-white',
        });
      setShowConfirmDialog(false);
      setConfirmPurchaseData(null);
        return;
      }

      setIsPurchasing(true);
      try {
        // Deduct from purchasable balance (task + mining only)
        const deductSuccess = await deductPurchasableBalance(currentUser.id, cardPrice);
        if (!deductSuccess) {
          throw new Error('Failed to deduct balance');
        }
        const now = new Date();
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + cardConfig.validityDays);

      // Look for existing active card of the same type
      const currentCardData = currentUser.cardData || {};
      const existingCardKey = Object.keys(currentCardData)
        .find(key => key.startsWith(`${cardId}_`) && currentCardData[key].active !== false);
      
      let newCardKey;
      let cardDataUpdate = {};
      
      if (existingCardKey && currentCardData[existingCardKey]) {
        // Extend existing card validity
        newCardKey = existingCardKey;
        const existingCard = currentCardData[existingCardKey];
        const currentExpiration = existingCard.expirationDate.toDate ? 
          existingCard.expirationDate.toDate() : 
          new Date(existingCard.expirationDate);
        
        // Reset validity to full period from now (renewal gives full validity)
        const newExpirationDate = new Date(now);
        newExpirationDate.setDate(newExpirationDate.getDate() + cardConfig.validityDays);
        
        // Update existing card with extended validity and increased quantity
        cardDataUpdate[newCardKey] = {
          ...existingCard,
          expirationDate: Timestamp.fromDate(newExpirationDate),
          quantity: (existingCard.quantity || 1) + 1,
          lastRenewalDate: Timestamp.fromDate(now),
          renewalHistory: [
            ...(existingCard.renewalHistory || []),
            {
              renewedAt: Timestamp.fromDate(now),
              method: 'ston',
              validityReset: cardConfig.validityDays,
              newExpirationDate: Timestamp.fromDate(newExpirationDate)
            }
          ]
        };
      } else {
        // Create new card instance (first time purchase)
        const existingInstances = Object.keys(currentCardData)
          .filter(key => key.startsWith(`${cardId}_`))
          .length;
        
        newCardKey = `${cardId}_${existingInstances + 1}`;
        
        // Create new card
        cardDataUpdate[newCardKey] = {
          cardId: cardId,
          purchaseDate: Timestamp.fromDate(now),
          expirationDate: Timestamp.fromDate(expirationDate),
          validityDays: cardConfig.validityDays,
          quantity: 1,
          active: true,
          method: 'ston',
          renewalHistory: []
        };
      }

        const updates = {
          cardData: {
            ...currentCardData,
            ...cardDataUpdate
          },
          // Initialize mining data if it doesn't exist
          miningData: currentUser.miningData || {
            miningStartTime: null,
            lastClaimTime: null,
            isActive: false,
            totalMined: 0
          }
        };

        // Add purchase history entry
        const purchaseHistoryKey = `ston_${Date.now()}_${cardId}`;
        updates.cardPurchaseHistory = {
          ...(currentUser.cardPurchaseHistory || {}),
          [purchaseHistoryKey]: {
            purchasedAt: Timestamp.fromDate(now),
            method: 'ston',
            cardNumber: cardId,
            cardKey: newCardKey,
            amount: cardPrice,
            expiresAt: cardDataUpdate[newCardKey].expirationDate,
            action: existingCardKey ? 'renewal' : 'new_purchase'
          }
        };

        await updateCurrentUser(currentUser.id, updates);
        
        const updatedUser = await getCurrentUser(currentUser.id);
        if (updatedUser) {
          setCurrentUser(updatedUser);
          if (refreshUserData) refreshUserData(updatedUser);
        }

      const isFirstPurchase = !existingCardKey;
        
        toast({
        title: `${cardConfig.name} ${isFirstPurchase ? 'Purchased' : 'Extended'}! 🎉`,
        description: isFirstPurchase 
          ? `You now own ${cardConfig.name} and can mine ${cardConfig.ratePerHour} STON per hour!`
          : `${cardConfig.name} mining speed increased! Extended validity by ${cardConfig.validityDays} days.`,
          variant: 'success',
          className: 'bg-[#1a1a1a] text-white',
        });
      } catch (error) {
        console.error('Error purchasing card:', error);
        toast({
          title: 'Error',
          description: 'Failed to purchase card. Please try again.',
          variant: 'destructive',
          className: 'bg-[#1a1a1a] text-white',
        });
      } finally {
        setIsPurchasing(false);
      setShowConfirmDialog(false);
      setConfirmPurchaseData(null);
    }
  }, [confirmPurchaseData, currentUser, isPurchasing, refreshUserData, toast]);



  const hasStartedMining = currentUser?.miningData?.miningStartTime !== null && currentUser?.miningData?.miningStartTime !== undefined;

  return (
    <div
      className="relative w-full min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#1a1a1a] text-white overflow-y-auto"
      style={{
        touchAction: 'pan-y',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      }}
    >
      <div className="flex flex-col items-center px-4 py-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md flex flex-col items-center gap-4"
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <h2 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              STON Mining
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Earn STON automatically with mining cards
            </p>
          </motion.div>

          {/* Current Plan Card */}
          <motion.div
            variants={cardVariants}
            initial="initial"
            animate="animate"
            whileHover="hover"
            transition={{ delay: 0.3 }}
            className="w-full"
          >
            <Card className={`bg-gradient-to-r ${currentMiningStats.color} border-0 shadow-2xl`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <currentMiningStats.icon className="h-6 w-6 text-white" />
                    <div>
                      <h3 className="text-lg font-bold text-white">{currentMiningStats.levelName}</h3>
                      <p className="text-xs text-white/80">
                        {currentMiningStats.activeCards.length > 0 
                          ? `${currentMiningStats.activeCards.length} active card${currentMiningStats.activeCards.length > 1 ? 's' : ''}`
                          : 'No active cards'
                        }
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-white/20 text-white border-white/30">
                    {currentMiningStats.totalCardsOwned} Cards ({currentMiningStats.uniqueCardsOwned}/3 Types)
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="text-center">
                    <p className="text-xs text-white/80">Mining Rate</p>
                    <p className="text-lg font-bold text-white">
                      {currentMiningStats.totalRatePerHour.toLocaleString()}
                    </p>
                    <p className="text-xs text-white/80">STON/hour</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-white/80">Total Mined</p>
                    <p className="text-lg font-bold text-white">
                      {(currentUser?.miningData?.totalMined || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-white/80">STON</p>
                  </div>
                </div>

                {/* Mining Progress */}
                {(currentMiningStats.totalRatePerHour > 0 || cardExpiryTime) && (
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-white/80">Card Validity Status</span>
                      <span className="text-xs text-white/80">
                        {cardExpiryTime.includes('EXPIRED') ? 
                          'Expired - Renew needed' : 
                          `${isNaN(miningProgress) ? '0.0' : (100 - miningProgress).toFixed(1)}% remaining`
                        }
                      </span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className={`h-full ${cardExpiryTime.includes('EXPIRED') ? 
                          'bg-gradient-to-r from-red-500 to-orange-600' : 
                          'bg-gradient-to-r from-yellow-400 to-orange-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ 
                          width: cardExpiryTime.includes('EXPIRED') ? 
                            '100%' : 
                            `${isNaN(miningProgress) ? 100 : (100 - miningProgress)}%` 
                        }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    {(currentMiningStats.activeCards.length > 0 || cardExpiryTime) && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="text-center">
                          <p className="text-xs text-orange-300 font-medium">
                            {cardExpiryTime.includes('EXPIRED') ? 'Expired Card:' : 'Next Expiry:'}
                          </p>
                          <p className="text-xs text-white font-mono">{cardExpiryTime}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-green-300 font-medium">
                            {currentMiningStats.totalRatePerHour > 0 ? 'Next Reward In:' : 'Mining Status:'}
                          </p>
                          <p className="text-xs text-white font-mono">
                            {currentMiningStats.totalRatePerHour > 0 ? timeUntilNextReward : 'Inactive'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Pending Rewards */}
          {pendingRewards > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="w-full"
            >
              <Card className="border border-green-500/30" style={{ backgroundColor: 'hsl(239.54deg 33.72% 26.91%)' }}>
                <CardContent className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Coins className="h-5 w-5 text-green-400" />
                    <h3 className="text-lg font-bold text-green-400">Rewards Ready!</h3>
                  </div>
                  <p className="text-2xl font-bold text-white mb-2">
                    {pendingRewards.toLocaleString()} STON
                  </p>
                  <Button
                    onClick={claimRewards}
                    disabled={isClaimingRewards}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl"
                  >
                    {isClaimingRewards ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      <>
                        <Gift className="h-4 w-4 mr-2" />
                        Claim Rewards
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full space-y-3"
          >
            {/* Start Mining Button (only show if not started and has cards) */}
            {!hasStartedMining && currentMiningStats.totalRatePerHour > 0 && (
              <Button
                onClick={startMining}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl text-lg"
              >
                <Axe className="h-5 w-5 mr-2" />
                Start Mining
              </Button>
            )}

            {/* Your Mining Cards Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-full mb-6"
            >
              <h3 className="text-sm font-semibold text-center mb-3 text-gray-300">
                Your Mining Cards
              </h3>
              <div className="space-y-2">
                {Object.values(INDIVIDUAL_CARDS).map((card, index) => {
                  const cardCount = currentMiningStats.cardCounts[card.id] || 0;
                  const isOwned = cardCount > 0;
                  
                  // Find all instances of this card type
                  const cardInstances = Object.keys(currentUser?.cardData || {})
                    .filter(key => key.startsWith(`${card.id}_`))
                    .map(key => currentUser.cardData[key]);
                  
                  const activeInstances = cardInstances.filter(cardData => 
                    (cardData.expirationDate instanceof Timestamp ? 
                      cardData.expirationDate.toDate() : 
                      new Date(cardData.expirationDate)
                    ).getTime() > new Date().getTime()
                  );
                  
                  const isActive = activeInstances.length > 0;
                  
                  return (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + index * 0.1 }}
                      className={`p-3 rounded-xl border ${
                        isActive
                          ? 'bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/50'
                          : isOwned
                          ? 'bg-gradient-to-r from-orange-600/10 to-red-600/10 border-orange-500/30'
                          : 'bg-gradient-to-r from-gray-600/10 to-gray-700/10 border-gray-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <card.icon className={`h-5 w-5 ${
                            isActive ? 'text-green-400' : 
                            isOwned ? 'text-orange-400' : 'text-gray-400'
                          }`} />
                          <div>
                            <p className={`font-semibold text-sm ${
                              isActive ? 'text-green-400' : 
                              isOwned ? 'text-orange-400' : 'text-gray-400'
                            }`}>
                              {card.name}
                              {isOwned && ` (${cardCount}x)`}
                              {isOwned && (isActive ? ' - Active' : ' - Expired')}
                            </p>
                            <p className="text-xs text-gray-400">
                              {card.description} • {card.ratePerHour.toLocaleString()} STON/hour each
                            </p>
                            {isOwned && (
                              <p className={`text-xs ${isActive ? 'text-green-400' : 'text-orange-400'}`}>
                                {isActive 
                                  ? `Active: ${activeInstances.length}x, Total Rate: ${(card.ratePerHour * activeInstances.length).toLocaleString()} STON/hour`
                                  : `All ${cardCount} instances expired`
                                }
                              </p>
                            )}
                            {isActive && activeInstances.length > 0 && (
                              <div className="mt-1 space-y-1">
                                {activeInstances.map((instance, idx) => {
                                  const countdown = calculateCountdown(instance.expirationDate);
                                  const expiryDate = (instance.expirationDate instanceof Timestamp ? 
                                    instance.expirationDate.toDate() : 
                                    new Date(instance.expirationDate)
                                  ).toLocaleDateString();
                                  
                                  return (
                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                      <Calendar className="h-3 w-3 text-blue-400" />
                                      <div className="flex-1">
                                        <span className="text-blue-300">Expires: {expiryDate}</span>
                                        <div className={`font-mono ${countdown.expired ? 'text-red-400' : 'text-green-400'}`}>
                                          {countdown.expired ? 'EXPIRED' : countdown.text}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-sm ${
                            isActive ? 'text-green-400' : 
                            isOwned ? 'text-orange-400' : 'text-gray-400'
                          }`}>
                            {isActive ? (card.ratePerHour * activeInstances.length).toLocaleString() : '0'}
                          </p>
                          <p className="text-xs text-gray-400">STON/hour</p>
                        </div>
                      </div>
                      {!isOwned && (
                        <Badge className="mt-2 bg-gray-500/20 text-gray-400 border-gray-500/50">
                          Not Owned
                        </Badge>
                      )}
                      {isActive && (
                        <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-500/50">
                          {activeInstances.length}x Active
                        </Badge>
                      )}
                      {isOwned && !isActive && (
                        <Badge className="mt-2 bg-orange-500/20 text-orange-400 border-orange-500/50">
                          {cardCount}x Expired
                        </Badge>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Purchase Individual Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="space-y-3"
            >
              <h3 className="text-sm font-semibold text-center mb-3 text-gray-300">
                Purchase Mining Cards
              </h3>
              {Object.values(INDIVIDUAL_CARDS).map((card, index) => {
                const cardCount = currentMiningStats.cardCounts[card.id] || 0;
                const isOwned = cardCount > 0;
                const canAffordSton = (currentUser?.balance || 0) >= card.price;
                
                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-gradient-to-r ${
                      isOwned 
                        ? 'from-green-800/30 to-green-900/30 border-green-500/30' 
                        : 'from-gray-800/50 to-gray-900/50 border-gray-600/50'
                    } border rounded-xl p-4`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <card.icon className={`h-5 w-5 ${isOwned ? 'text-green-400' : 'text-blue-400'}`} />
                        <div>
                          <p className={`font-semibold text-sm ${isOwned ? 'text-green-400' : 'text-blue-400'}`}>
                            {card.name}
                            {isOwned && ` (${cardCount}x)`}
                          </p>
                          <p className="text-xs text-gray-400">
                            {card.ratePerHour.toLocaleString()} STON/hour each • {card.description}
                          </p>
                          {isOwned && (
                            <p className="text-xs text-green-300">
                              Total: {(card.ratePerHour * cardCount).toLocaleString()} STON/hour
                            </p>
                          )}
                          {isOwned && (
                            (() => {
                              // Find the card instances for this card type
                              const cardInstances = Object.keys(currentUser?.cardData || {})
                                .filter(key => key.startsWith(`${card.id}_`))
                                .map(key => currentUser.cardData[key]);
                              
                              const activeInstances = cardInstances.filter(cardData => 
                                (cardData.expirationDate instanceof Timestamp ? 
                                  cardData.expirationDate.toDate() : 
                                  new Date(cardData.expirationDate)
                                ).getTime() > new Date().getTime()
                              );
                              
                              if (activeInstances.length === 0) return null;
                              
                              return (
                                <div className="mt-1">
                                  {activeInstances.map((instance, idx) => {
                                    const countdown = calculateCountdown(instance.expirationDate);
                                    const expiryDate = (instance.expirationDate instanceof Timestamp ? 
                                      instance.expirationDate.toDate() : 
                                      new Date(instance.expirationDate)
                                    ).toLocaleDateString();
                                    
                                    return (
                                      <div key={idx} className="flex items-center gap-1 text-xs mt-1">
                                        <Timer className="h-3 w-3 text-blue-400" />
                                        <span className="text-blue-300">Valid until {expiryDate}</span>
                                        <span className={`font-mono ml-1 ${countdown.expired ? 'text-red-400' : 'text-green-400'}`}>
                                          ({countdown.expired ? 'EXPIRED' : countdown.text})
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                <Button
                        onClick={() => purchaseIndividualCard(card.id, 'balance')}
                        disabled={isPurchasing || !canAffordSton}
                  className={`w-full h-12 ${
                          canAffordSton
                      ? 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700'
                      : 'bg-gradient-to-r from-gray-600 to-gray-700'
                        } text-white font-medium rounded-xl text-xs disabled:opacity-50 flex flex-col items-center justify-center`}
                >
                  {isPurchasing ? (
                    <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-xs mt-1">Purchasing...</span>
                    </>
                  ) : (
                    <>
                            <div className="flex items-center">
                              <Wallet className="h-3 w-3 mr-1" />
                              <span>{isOwned ? 'Buy Again' : 'Buy'}</span>
                            </div>
                            <span className="text-xs opacity-90">{card.price.toLocaleString()} STON</span>
                    </>
                  )}
                </Button>

                <Button
                        onClick={() => purchaseIndividualCard(card.id, 'crypto')}
                  disabled={isPurchasing}
                        className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-medium rounded-xl text-xs disabled:opacity-50 flex flex-col items-center justify-center"
                      >
                        {isPurchasing ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-xs mt-1">Processing...</span>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center">
                              <CreditCard className="h-3 w-3 mr-1" />
                              <span>{isOwned ? 'Buy Again' : 'Buy'}</span>
                            </div>
                            <span className="text-xs opacity-90">{card.cryptoPrice} TON</span>
                          </>
                        )}
                </Button>
                    </div>
                    
                    {isOwned && (
                      <div className="text-center mt-2">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                          Owned {cardCount}x
                        </Badge>
              </div>
            )}
                  </motion.div>
                );
              })}
            </motion.div>
            
            {/* Purchase Dialog */}
            {showPurchaseDialog && (
              <PurchaseDialog
                isOpen={showPurchaseDialog}
                onClose={() => {
                  setShowPurchaseDialog(false);
                  // Don't clear payment attempt here since it's only set after successful redirect
                }}
                cardPrice={INDIVIDUAL_CARDS[selectedCardLevel]?.price}
                cardNumber={selectedCardLevel}
                currentBalance={currentUser?.balance || 0}
                user={currentUser}
                onSuccess={(method, paymentUrl, paymentInfo) => {
                  if (method === 'balance') {
                    purchaseIndividualCard(selectedCardLevel, 'balance');
                  } else if (method === 'crypto' && paymentUrl) {
                    // Show payment modal instead of redirecting
                    setPaymentData({
                      cardNumber: selectedCardLevel,
                      cardName: INDIVIDUAL_CARDS[selectedCardLevel]?.name,
                      amount: INDIVIDUAL_CARDS[selectedCardLevel]?.cryptoPrice,
                      currency: 'TON',
                      paymentUrl: paymentUrl,
                      trackId: paymentInfo?.trackId,
                      orderId: paymentInfo?.orderId
                    });
                    setShowPaymentModal(true);
                  }
                  setShowPurchaseDialog(false);
                }}
              />
            )}

            {/* Confirmation Dialog for STON purchases */}
            {showConfirmDialog && confirmPurchaseData && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-600/50 text-white w-full max-w-sm p-6 rounded-2xl shadow-2xl relative"
                >
                  <h2 className="text-xl font-bold mb-4 text-center">
                    Confirm Purchase
                  </h2>
                  
                  <div className="text-center mb-6">
                    <div className="flex items-center justify-center mb-3">
                      <confirmPurchaseData.cardConfig.icon className="h-8 w-8 text-blue-400 mr-2" />
                        <div>
                        <p className="text-lg font-semibold text-blue-400">
                          {confirmPurchaseData.cardConfig.name}
                        </p>
                        <p className="text-sm text-gray-400">
                          {confirmPurchaseData.cardConfig.ratePerHour.toLocaleString()} STON/hour • {confirmPurchaseData.cardConfig.description}
                        </p>
                        </div>
                      </div>
                    
                    <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/50 rounded-xl p-3 mb-4">
                      <p className="text-yellow-300 font-bold text-lg">
                        {confirmPurchaseData.cardPrice.toLocaleString()} STON
                      </p>
                      <p className="text-xs text-gray-400">
                        Available for purchases: {confirmPurchaseData.currentPurchasableBalance?.toLocaleString()} STON
                      </p>
                      <p className="text-xs text-orange-400 mt-1">
                        ✓ Tasks + Mining • ⚠ Boxes + Referrals (withdrawal only)
                      </p>
                      </div>
                    
                    <p className="text-sm text-gray-300">
                      Are you sure you want to purchase this card?
                    </p>
                    </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => {
                        setShowConfirmDialog(false);
                        setConfirmPurchaseData(null);
                      }}
                      className="w-full h-10 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold rounded-xl"
                    >
                      Cancel
                    </Button>
                    
                    <Button
                      onClick={confirmStonPurchase}
                      disabled={isPurchasing}
                      className="w-full h-10 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-xl disabled:opacity-50"
                    >
                      {isPurchasing ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Purchasing...
                        </>
                      ) : (
                        'Confirm Purchase'
                      )}
                    </Button>
                  </div>
                  </motion.div>
            </div>
            )}

            {/* Payment Modal */}
            {showPaymentModal && paymentData && (
              <PaymentModal
                isOpen={showPaymentModal}
                onClose={() => {
                  setShowPaymentModal(false);
                  setPaymentData(null);
                }}
                paymentUrl={paymentData.paymentUrl}
                onPaymentSuccess={handlePaymentSuccess}
                onPaymentFailure={handlePaymentFailure}
                onPaymentCancel={handlePaymentCancel}
                cardName={paymentData.cardName}
                amount={paymentData.amount}
                currency={paymentData.currency}
                trackId={paymentData.trackId}
                userId={currentUser?.id}
              />
            )}
          </motion.div>



          {/* Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="w-full"
          >
            <div className="bg-gradient-to-r from-orange-600/10 to-orange-800/10 backdrop-blur-sm border border-orange-500/20 p-3 rounded-2xl">
              <h3 className="text-sm font-semibold text-orange-400 mb-2 text-center flex items-center justify-center gap-1">
                <Sparkles className="h-4 w-4" />
                Mining Info
              </h3>
              <div className="space-y-1 text-xs text-gray-300">
                <p>• Mining runs automatically 24/7 once started</p>
                <p>• Cards have limited validity periods (7/15/30 days)</p>
                <p>• Maximum 24 hours of rewards can accumulate</p>
                <p>• Purchase more cards to increase mining speed</p>
                <p>• Claim rewards regularly to maximize earnings</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default MiningSection;
