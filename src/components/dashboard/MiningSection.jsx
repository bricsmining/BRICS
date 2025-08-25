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
  const [selectedCardLevel, setSelectedCardLevel] = useState(1);

  const [adminConfig, setAdminConfig] = useState(null);

  // Handle payment return from URL params
  useEffect(() => {
    const payment = searchParams.get('payment');
    const orderId = searchParams.get('orderId');
    
    if (payment === 'return' && orderId) {
      console.log('🔄 User returned from payment, orderId:', orderId);
      
      // Show return message
      toast({
        title: 'Payment Processing',
        description: 'Your payment is being processed. Mining card will be activated shortly.',
        className: 'bg-[#1a1a1a] text-white',
      });
      
      // Clean up URL parameters
      setSearchParams({});
      
      // Refresh user data after a short delay to get updated cards
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
      }, 2000);
    }
  }, [searchParams, setSearchParams, currentUser?.id, refreshUserData, toast]);

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
      return `${days}d ${hours}h ${minutes}m`;
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
        setMiningProgress(Math.max(0, Math.min(100, 100 - percentage)));
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
    <motion.div
      className="p-4 space-y-4 bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#1a1a1a] min-h-screen pb-20"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Mining Overview Card */}
      <Card className={`${miningStats.bgColor} ${miningStats.borderColor} border-2 shadow-2xl`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full bg-gradient-to-r ${miningStats.color}`}>
                <miningStats.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{miningStats.levelName}</h2>
                <p className="text-sm text-gray-400">
                  {miningStats.totalActiveCards} Active Cards • {miningStats.totalMiningRate}/hr
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-white">{pendingRewards.toLocaleString()}</div>
              <div className="text-sm text-gray-400">STON Pending</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Next Expiry Progress</span>
              <span className="text-gray-400">{miningProgress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-3">
              <motion.div
                className={`h-3 rounded-full bg-gradient-to-r ${miningStats.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${miningProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="text-sm text-gray-400">{nextExpiryInfo}</div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 mt-6">
            <Button
              onClick={claimRewards}
              disabled={pendingRewards <= 0 || isClaimingRewards}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              {isClaimingRewards ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Coins className="h-4 w-4 mr-2" />
              )}
              Claim {pendingRewards.toLocaleString()} STON
            </Button>
            <Button
              onClick={() => setShowPurchaseDialog(true)}
              variant="outline"
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Buy Cards
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual Card Instances */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-white flex items-center">
          <CreditCard className="h-4 w-4 mr-2" />
          Your Mining Cards
        </h3>
        
        {/* Active Cards */}
        {miningStats.activeCards.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-base font-semibold text-green-400">Active Cards ({miningStats.activeCards.length})</h4>
            {miningStats.activeCards.map((card) => (
              <Card key={card.cardKey} className={`${card.bgColor} ${card.borderColor} border`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full bg-gradient-to-r ${card.color}`}>
                        <card.icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-white">{card.name} #{card.instanceNumber}</h5>
                        <p className="text-sm text-gray-400">{card.ratePerHour}/hr • Expires in {formatTimeDuration(card.timeUntilExpiry)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-green-400 border-green-400">
                        Active
                      </Badge>
                      <p className="text-xs text-gray-400 mt-1">
                        {card.expirationDate.toLocaleDateString()} {card.expirationDate.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Expired Cards */}
        {miningStats.expiredCards.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-base font-semibold text-red-400">Expired Cards ({miningStats.expiredCards.length})</h4>
            {miningStats.expiredCards.map((card) => (
              <Card key={card.cardKey} className="bg-red-600/10 border-red-500/50 border">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-full bg-red-600/30">
                        <X className="h-5 w-5 text-red-400" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-white">{card.name} #{card.instanceNumber}</h5>
                        <p className="text-sm text-gray-400">Expired {formatTimeDuration(Math.abs(card.timeUntilExpiry))} ago</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-red-400 border-red-400">
                        Expired
                      </Badge>
                      <p className="text-xs text-gray-400 mt-1">
                        {card.expirationDate.toLocaleDateString()} {card.expirationDate.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                onClick={() => setShowPurchaseDialog(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Buy Mining Cards
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Purchase Dialog */}
      {showPurchaseDialog && (
        <PurchaseDialog
          isOpen={showPurchaseDialog}
          onClose={() => setShowPurchaseDialog(false)}
          cardPrice={INDIVIDUAL_CARDS[selectedCardLevel]?.price || 0}
          cardNumber={selectedCardLevel}
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
    </motion.div>
  );
};

export default MiningSection;
