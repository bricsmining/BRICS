import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { UserContext } from '@/App';
import DisabledFeature from '@/components/DisabledFeature';
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
  X,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { updateCurrentUser, getCurrentUser } from '@/data/userStore';
import { updateUserBalanceByType, getPurchasableBalance } from '@/data';
import { Timestamp } from 'firebase/firestore';
import { getAdminConfig } from '@/data/firestore/adminConfig';
import PurchaseDialog from './PurchaseDialog';

// Get individual card configurations from admin config
const getIndividualCards = (adminConfig) => {
  const tonToStonRate = 1 / (adminConfig?.stonToTonRate || 0.0000001);
  
  return {
    1: {
      id: 1,
      name: 'Basic Miner Card',
      ratePerHour: adminConfig?.card1RatePerHour || 150,
      cryptoPrice: adminConfig?.card1CryptoPrice || 0.1,
      validityDays: adminConfig?.card1ValidityDays || 7,
      description: `${adminConfig?.card1ValidityDays || 7} days validity`,
      color: 'from-blue-600 to-blue-700',
      bgColor: 'bg-blue-600/20',
      borderColor: 'border-blue-500',
      icon: Axe,
      level: 1,
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
      bgColor: 'bg-purple-600/20',
      borderColor: 'border-purple-500',
      icon: Database,
      level: 2,
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
      bgColor: 'bg-yellow-600/20',
      borderColor: 'border-yellow-500',
      icon: Star,
      level: 3,
      get price() {
        return this.cryptoPrice * tonToStonRate;
      }
    }
  };
};

// Mining level names based on highest card type owned
const MINING_LEVEL_NAMES = {
  0: 'No Mining',
  1: 'Basic Miner',
  2: 'Advanced Miner', 
  3: 'Pro Miner'
};

// Progress bar variants
const progressVariants = {
  initial: { width: 0 },
  animate: { width: '100%' },
};

const cardVariants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0.9, opacity: 0 },
};

const MiningSection = ({ user, refreshUserData }) => {
  const { toast } = useToast();
  const { adminConfig: globalAdminConfig } = useContext(UserContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState(user);
  const [miningProgress, setMiningProgress] = useState(0);
  const [pendingRewards, setPendingRewards] = useState(0);
  const [isClaimingRewards, setIsClaimingRewards] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [timeUntilNextReward, setTimeUntilNextReward] = useState('');
  const [nextExpiryInfo, setNextExpiryInfo] = useState('');
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showCardSelection, setShowCardSelection] = useState(false);
  const [selectedCardLevel, setSelectedCardLevel] = useState(1);

  const [adminConfig, setAdminConfig] = useState(null);

  // Handle payment return from URL params (fallback for direct navigation)
  useEffect(() => {
    const payment = searchParams.get('payment');
    const orderId = searchParams.get('orderId');
    
    if (payment === 'return' && orderId) {
      console.log('🔄 Direct navigation from payment return, orderId:', orderId);
      
      // Clean up URL parameters immediately
      setSearchParams({});
      
      // Note: PaymentModal should handle payment verification automatically
      // This is just a fallback for direct URL navigation
      setTimeout(async () => {
        try {
          const updatedUser = await getCurrentUser(currentUser.id);
          if (updatedUser) {
            setCurrentUser(updatedUser);
            if (refreshUserData) refreshUserData(updatedUser);
          }
        } catch (error) {
          console.error('Error refreshing user data after payment return:', error);
        }
      }, 1000);
    }
  }, [searchParams, setSearchParams, currentUser?.id, refreshUserData]);

  // Prevent body scroll when dialogs are open
  useEffect(() => {
    if (showCardSelection || showPurchaseDialog) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showCardSelection, showPurchaseDialog]);

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
        setAdminConfig({});
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

  // NEW REALISTIC MINING SYSTEM - Calculate individual card instances
  const miningStats = useMemo(() => {
    const userCardData = currentUser?.cardData || {};
    const now = new Date();
    let activeCards = [];
    let expiredCards = [];
    let totalMiningRate = 0;
    let cardsByType = { 1: [], 2: [], 3: [] };
    let highestCardLevel = 0;

    // Process each card instance separately
    Object.entries(userCardData).forEach(([cardKey, cardData]) => {
      const cardId = parseInt(cardKey.split('_')[0]);
      const cardConfig = INDIVIDUAL_CARDS[cardId];
      
      if (!cardData || !cardConfig) return;

      const expirationDate = cardData.expirationDate instanceof Timestamp ? 
        cardData.expirationDate.toDate() : 
        new Date(cardData.expirationDate);
      
      const purchaseDate = cardData.purchaseDate instanceof Timestamp ? 
        cardData.purchaseDate.toDate() : 
        new Date(cardData.purchaseDate);

      const timeUntilExpiry = expirationDate.getTime() - now.getTime();
      const isActive = timeUntilExpiry > 0;
      
      const cardInstance = {
        ...cardConfig,
        cardKey,
        purchaseDate,
        expirationDate,
        timeUntilExpiry,
        isActive,
        instanceNumber: parseInt(cardKey.split('_')[1]) || 1
      };

      if (isActive) {
        activeCards.push(cardInstance);
        totalMiningRate += cardConfig.ratePerHour;
        cardsByType[cardId].push(cardInstance);
        highestCardLevel = Math.max(highestCardLevel, cardConfig.level);
      } else {
        expiredCards.push(cardInstance);
      }
    });

    // Sort active cards by expiry time (earliest first)
    activeCards.sort((a, b) => a.timeUntilExpiry - b.timeUntilExpiry);
    
    // Get card design based on highest level
    const designCard = INDIVIDUAL_CARDS[highestCardLevel] || INDIVIDUAL_CARDS[1];
    
    return {
      activeCards,
      expiredCards,
      totalMiningRate,
      totalActiveCards: activeCards.length,
      cardsByType,
      highestCardLevel,
      levelName: MINING_LEVEL_NAMES[highestCardLevel] || 'No Mining',
      color: activeCards.length > 0 ? designCard.color : 'from-gray-600 to-gray-700',
      bgColor: activeCards.length > 0 ? designCard.bgColor : 'bg-gray-600/20',
      borderColor: activeCards.length > 0 ? designCard.borderColor : 'border-gray-500',
      icon: activeCards.length > 0 ? designCard.icon : AlertCircle,
      nextToExpire: activeCards[0] || null
    };
  }, [currentUser?.cardData, INDIVIDUAL_CARDS, currentTime]);

  // Calculate mining rewards
  const calculateMiningRewards = useCallback(() => {
    if (!currentUser?.miningData?.lastClaimTime || miningStats.totalMiningRate === 0) {
      return { rewards: 0, timeDiffHours: 0 };
    }

    const lastClaimTime = currentUser.miningData.lastClaimTime instanceof Timestamp ? 
      currentUser.miningData.lastClaimTime.toDate() : 
      new Date(currentUser.miningData.lastClaimTime);

    const now = new Date();
    const timeDiffMs = now.getTime() - lastClaimTime.getTime();
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);
    
    // Only calculate rewards for the time cards were actually active
    const rewards = Math.floor(miningStats.totalMiningRate * timeDiffHours);
    
    return { rewards: Math.max(0, rewards), timeDiffHours };
  }, [currentUser?.miningData?.lastClaimTime, miningStats.totalMiningRate]);

  // Format time duration
  const formatTimeDuration = useCallback((milliseconds) => {
    if (milliseconds <= 0) return 'Expired';
  
    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  // Update mining data every second
  useEffect(() => {
    let mounted = true;

    const updateMiningData = () => {
      if (!mounted) return;

      // Calculate pending rewards
      const rewardData = calculateMiningRewards();
      if (miningStats.totalMiningRate > 0) {
        setPendingRewards(rewardData.rewards);
        
        // Calculate time until next reward hour
        const nextRewardMs = (1 - (rewardData.timeDiffHours % 1)) * 3600 * 1000;
        setTimeUntilNextReward(formatTimeDuration(nextRewardMs));
      } else {
        setPendingRewards(0);
        setTimeUntilNextReward('--');
      }

      // Set next expiry info - ONLY for active cards
      if (miningStats.nextToExpire && miningStats.nextToExpire.isActive) {
        const card = miningStats.nextToExpire;
        const timeLeft = card.timeUntilExpiry;
        const percentage = Math.max(0, (timeLeft / (card.validityDays * 24 * 60 * 60 * 1000)) * 100);
        
        let status = '';
        if (percentage <= 20) {
          status = '⚠️ EXPIRING SOON: ';
        }
        
        setNextExpiryInfo(`${status}${card.name} #${card.instanceNumber} - ${formatTimeDuration(timeLeft)}`);
        setMiningProgress(Math.max(0, Math.min(100, percentage)));
      } else if (miningStats.activeCards.length === 0) {
        setNextExpiryInfo('No Active Cards');
        setMiningProgress(0);
      } else {
        setNextExpiryInfo('All Cards Active');
        setMiningProgress(0);
      }
    };

    const interval = setInterval(updateMiningData, 1000);
    updateMiningData();

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [calculateMiningRewards, miningStats, formatTimeDuration]);

  // Check for disabled features
  if (globalAdminConfig && globalAdminConfig.miningDisabled) {
    return <DisabledFeature feature="Mining" reason={globalAdminConfig.miningDisabledReason} />;
  }

  // Claim mining rewards
  const claimRewards = useCallback(async () => {
    if (!currentUser?.id || pendingRewards <= 0 || isClaimingRewards) return;

    setIsClaimingRewards(true);
    try {
      const now = Timestamp.now();
      const newTotalMined = (currentUser.miningData?.totalMined || 0) + pendingRewards;

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



  return (
    <>
      <motion.div
        className="p-4 space-y-6 bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 min-h-screen pb-20 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>
      {/* Mining Overview Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="relative"
      >
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 relative overflow-hidden">
          {/* Glassmorphism glow effect */}
          <div className={`absolute inset-0 bg-gradient-to-r ${miningStats.color} opacity-20 blur-xl`}></div>
          <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <motion.div 
                className={`p-3 rounded-2xl bg-gradient-to-r ${miningStats.color} shadow-lg`}
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <miningStats.icon className="h-6 w-6 text-white drop-shadow-lg" />
              </motion.div>
              <div>
                <h2 className="text-xl font-bold text-white drop-shadow-lg">{miningStats.levelName}</h2>
                <p className="text-sm text-gray-300/80">
                  {miningStats.totalActiveCards} Active Cards • {miningStats.totalMiningRate}/hr
                </p>
              </div>
            </div>
            <div className="text-right">
              <motion.div 
                className="text-2xl font-bold text-white drop-shadow-lg"
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                {(currentUser?.miningData?.totalMined || 0).toLocaleString()}
              </motion.div>
              <div className="text-sm text-gray-300/80">Total Mined</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-3 bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300/90">Next Expiry Progress</span>
              <span className="text-white font-semibold">{miningProgress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden shadow-inner">
              <motion.div
                className="h-3 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-full shadow-lg"
                initial={{ width: 0 }}
                animate={{ width: `${miningProgress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <div className="text-sm text-gray-300/90 font-medium">{nextExpiryInfo}</div>
          </div>

          {/* Pending Rewards Display */}
          <motion.div 
            className="text-center mt-6 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/30"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <motion.div 
              className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent drop-shadow-lg"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {pendingRewards.toLocaleString()} STON
            </motion.div>
            <div className="text-sm text-gray-300/90 font-medium">Available to Claim</div>
          </motion.div>

          <div className="flex space-x-4 mt-6">
            <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={claimRewards}
                disabled={pendingRewards <= 0 || isClaimingRewards}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 backdrop-blur-sm border border-green-500/30 shadow-lg hover:shadow-green-500/20 transition-all duration-300"
              >
                {isClaimingRewards ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Coins className="h-4 w-4 mr-2" />
                )}
                Claim Now
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={() => setShowCardSelection(true)}
                className="bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 shadow-lg hover:shadow-purple-500/20 transition-all duration-300"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Buy Cards
              </Button>
            </motion.div>
          </div>
        </CardContent>
        </Card>
      </motion.div>

      {/* Individual Card Instances */}
      <motion.div 
        className="space-y-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <h3 className="text-xl font-bold text-white flex items-center drop-shadow-lg">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <CreditCard className="h-5 w-5 mr-3 text-cyan-400" />
          </motion.div>
          Your Mining Cards
        </h3>
        
        {/* Active Cards */}
        {miningStats.activeCards.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-green-400 flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
              Active Cards ({miningStats.activeCards.length})
            </h4>
            {miningStats.activeCards.map((card, index) => (
              <motion.div
                key={card.cardKey}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="group"
              >
                <Card className="bg-white/5 backdrop-blur-xl border border-white/10 hover:border-green-500/30 shadow-lg hover:shadow-green-500/20 transition-all duration-300 relative overflow-hidden">
                  {/* Card glow effect */}
                  <div className={`absolute inset-0 bg-gradient-to-r ${card.color} opacity-10 group-hover:opacity-20 transition-opacity duration-300`}></div>
                  <CardContent className="p-4 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <motion.div 
                          className={`p-2 rounded-full bg-gradient-to-r ${card.color} shadow-lg`}
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.5 }}
                        >
                          <card.icon className="h-5 w-5 text-white" />
                        </motion.div>
                        <div>
                          <h5 className="font-semibold text-white drop-shadow-sm">{card.name} #{card.instanceNumber}</h5>
                          <p className="text-sm text-gray-300/80">{card.ratePerHour}/hr • Expires in {formatTimeDuration(card.timeUntilExpiry)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 backdrop-blur-sm">
                          Active
                        </Badge>
                        <p className="text-xs text-gray-300/70 mt-1">
                          {card.expirationDate.toLocaleDateString()} {card.expirationDate.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}



        {/* No Cards Message */}
        {miningStats.activeCards.length === 0 && miningStats.expiredCards.length === 0 && (
          <Card className="bg-gray-800/50 border-gray-600/50">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-base font-semibold text-white mb-2">No Mining Cards</h4>
              <p className="text-gray-400 mb-4">Purchase your first mining card to start earning STON!</p>
              <Button
                onClick={() => setShowCardSelection(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Buy Mining Cards
              </Button>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Available Cards for Purchase */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Available Mining Cards
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.values(INDIVIDUAL_CARDS).map((card) => (
            <Card key={card.id} className={`${card.bgColor} ${card.borderColor} border hover:scale-105 transition-transform cursor-pointer`}
                  onClick={() => {
                    setSelectedCardLevel(card.id);
                    setShowPurchaseDialog(true);
                  }}>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className={`p-4 rounded-full bg-gradient-to-r ${card.color} mx-auto w-fit mb-4`}>
                    <card.icon className="h-8 w-8 text-white" />
                  </div>
                  <h4 className="text-base font-semibold text-white mb-2">{card.name}</h4>
                  <p className="text-sm text-gray-400 mb-3">{card.description}</p>
                  <div className="space-y-2">
                    <div className="text-lg font-bold text-white">{card.ratePerHour}/hr</div>
                    <div className="text-base text-yellow-400">{card.price.toLocaleString()} STON</div>
                    <div className="text-xs text-gray-500">{card.cryptoPrice} TON</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Expired Cards - Shown at the bottom */}
      {miningStats.expiredCards.length > 0 && (
        <motion.div 
          className="space-y-4"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3 className="text-xl font-bold text-white flex items-center drop-shadow-lg">
            <motion.div
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <X className="h-5 w-5 mr-3 text-red-400" />
            </motion.div>
            Expired Mining Cards
          </h3>
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-red-400 flex items-center">
              <div className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse"></div>
              Expired Cards ({miningStats.expiredCards.length})
            </h4>
            {miningStats.expiredCards.map((card, index) => (
              <motion.div
                key={card.cardKey}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ scale: 1.01 }}
                className="group"
              >
                <Card className="bg-white/5 backdrop-blur-xl border border-red-500/20 hover:border-red-500/40 shadow-lg hover:shadow-red-500/20 transition-all duration-300 relative overflow-hidden opacity-75">
                  {/* Card glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600/10 to-red-800/10 group-hover:from-red-600/20 group-hover:to-red-800/20 transition-all duration-300"></div>
                  <CardContent className="p-4 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-full bg-red-600/30 backdrop-blur-sm">
                          <X className="h-5 w-5 text-red-400" />
                        </div>
                        <div>
                          <h5 className="font-semibold text-white drop-shadow-sm">{card.name} #{card.instanceNumber}</h5>
                          <p className="text-sm text-gray-300/80">Expired {formatTimeDuration(Math.abs(card.timeUntilExpiry))} ago</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 backdrop-blur-sm">
                          Expired
                        </Badge>
                        <p className="text-xs text-gray-300/70 mt-1">
                          {card.expirationDate.toLocaleDateString()} {card.expirationDate.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>

    {/* Card Selection Dialog */}
    {showCardSelection && (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-600/50 text-white w-full max-w-4xl max-h-[90vh] p-6 rounded-2xl shadow-2xl relative overflow-y-auto"
        >
          <button
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
            onClick={() => setShowCardSelection(false)}
          >
            <X className="h-6 w-6" />
          </button>

          <div className="flex flex-col max-h-full">
            <h2 className="text-xl font-bold mb-6 text-center flex-shrink-0">Choose Your Mining Card</h2>
            
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4">
                {Object.values(INDIVIDUAL_CARDS).map((card) => (
                  <Card key={card.id} className={`${card.bgColor} ${card.borderColor} border hover:scale-105 transition-transform cursor-pointer h-64`}
                        onClick={() => {
                          setSelectedCardLevel(card.id);
                          setShowCardSelection(false);
                          setShowPurchaseDialog(true);
                        }}>
                    <CardContent className="p-4 h-full flex flex-col justify-between">
                      <div className="text-center flex-1 flex flex-col justify-center">
                        <div className={`p-3 rounded-full bg-gradient-to-r ${card.color} mx-auto w-fit mb-3`}>
                          <card.icon className="h-6 w-6 text-white" />
                        </div>
                        <h4 className="text-sm font-semibold text-white mb-2">{card.name}</h4>
                        <p className="text-xs text-gray-400 mb-3 line-clamp-2">{card.description}</p>
                      </div>
                      <div className="space-y-1 text-center">
                        <div className="text-base font-bold text-white">{card.ratePerHour}/hr</div>
                        <div className="text-sm text-yellow-400">{card.price.toLocaleString()} STON</div>
                        <div className="text-xs text-gray-500">{card.cryptoPrice} TON</div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    )}

    {/* Purchase Dialog */}
    {showPurchaseDialog && (
      <PurchaseDialog
        isOpen={showPurchaseDialog}
        onClose={() => setShowPurchaseDialog(false)}
        cardPrice={INDIVIDUAL_CARDS[selectedCardLevel]?.price || 0}
        cardNumber={selectedCardLevel}
        cardName={INDIVIDUAL_CARDS[selectedCardLevel]?.name}
        currentBalance={getPurchasableBalance(currentUser)}
        user={currentUser}
        onSuccess={() => {
          setShowPurchaseDialog(false);
          // Refresh user data after purchase
          getCurrentUser(currentUser.id).then(updatedUser => {
            if (updatedUser) {
              setCurrentUser(updatedUser);
              if (refreshUserData) refreshUserData(updatedUser);
            }
          });
        }}
      />
    )}
    </>
  );
};

export default MiningSection;
