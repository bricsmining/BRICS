
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, CalendarCheck, HelpCircle, Clock, Gamepad2, ArrowRight, Zap, Gift, Sparkles, Coins } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
  completeTask,
  performCheckIn,
  requestManualVerification,
  getCurrentUser,
  isCheckInDoneToday,
  updateUserEnergy,
  addUserBox,
  addEnergyFromAd,
  checkEnergyAdAvailability,
  addBoxFromAd,
  checkBoxAdAvailability
} from '@/data';
import { useNavigate, useLocation } from 'react-router-dom';
import { showRewardedAd } from '@/ads/adsController';

const ENERGY_REWARD_AMOUNT = 10; // Set how much energy to grant per ad
const BOX_REWARD_AMOUNT = 1; // Set how many boxes to grant per ad

// Number formatting utility
const formatNumber = (num) => {
  if (!num || num === 0) return '0';
  
  const absNum = Math.abs(num);
  
  if (absNum >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (absNum >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (absNum >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  
  return num.toString();
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

const pulseVariants = {
  initial: { scale: 1 },
  animate: { 
    scale: [1, 1.05, 1],
    transition: { 
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const sparkleVariants = {
  initial: { opacity: 0, scale: 0, rotate: 0 },
  animate: { 
    opacity: [0, 1, 0],
    scale: [0, 1, 0],
    rotate: [0, 180, 360],
    transition: { 
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut",
      staggerChildren: 0.2
    }
  }
};

// Animation variants for flying rewards - updated to fly to specific targets
const flyInVariants = {
  initial: { 
    scale: 0,
    opacity: 0,
    x: 0,
    y: 0,
    rotate: 0
  },
  animate: (targetPosition) => ({
    scale: [0, 1.5, 0.8, 0],
    opacity: [0, 1, 1, 0],
    x: [0, targetPosition.x * 0.3, targetPosition.x * 0.7, targetPosition.x],
    y: [0, targetPosition.y * 0.3, targetPosition.y * 0.7, targetPosition.y],
    rotate: [0, 180, 360, 540],
    transition: { 
      duration: 1.5,
      ease: "easeOut",
      times: [0, 0.3, 0.7, 1]
    }
  }),
  exit: { 
    scale: 0,
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

const counterPulseVariants = {
  initial: { scale: 1 },
  animate: { 
    scale: [1, 1.3, 1],
    transition: { 
      duration: 0.6,
      ease: "easeInOut"
    }
  }
};

// Top Stats Component - Updated for horizontal layout
const TopStats = ({ user, animationTriggers }) => {
  const [animatingCounters, setAnimatingCounters] = useState({});

  // Trigger counter animations when values change
  useEffect(() => {
    if (animationTriggers.energy) {
      setAnimatingCounters(prev => ({ ...prev, energy: true }));
      setTimeout(() => setAnimatingCounters(prev => ({ ...prev, energy: false })), 600);
    }
  }, [animationTriggers.energy]);

  useEffect(() => {
    if (animationTriggers.balance) {
      setAnimatingCounters(prev => ({ ...prev, balance: true }));
      setTimeout(() => setAnimatingCounters(prev => ({ ...prev, balance: false })), 600);
    }
  }, [animationTriggers.balance]);

  useEffect(() => {
    if (animationTriggers.boxes) {
      setAnimatingCounters(prev => ({ ...prev, boxes: true }));
      setTimeout(() => setAnimatingCounters(prev => ({ ...prev, boxes: false })), 600);
    }
  }, [animationTriggers.boxes]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="fixed top-4 left-4 right-4 z-50 flex justify-center"
    >
      <div className="bg-black/80 backdrop-blur-md border border-gray-600/50 rounded-2xl px-4 py-3 flex items-center gap-4 shadow-2xl">
        {/* Energy Counter */}
        <motion.div
          id="energy-counter"
          variants={counterPulseVariants}
          initial="initial"
          animate={animatingCounters.energy ? "animate" : "initial"}
          className="flex items-center gap-2"
        >
          <div className="bg-yellow-500/20 p-1.5 rounded-lg">
            <Zap className="h-4 w-4 text-yellow-400" />
          </div>
          <span className="text-white font-bold text-sm min-w-[40px]">
            {formatNumber(user?.energy || 0)}
          </span>
        </motion.div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-600/50"></div>

        {/* Balance Counter */}
        <motion.div
          id="balance-counter"
          variants={counterPulseVariants}
          initial="initial"
          animate={animatingCounters.balance ? "animate" : "initial"}
          className="flex items-center gap-2"
        >
          <div className="bg-green-500/20 p-1.5 rounded-lg">
            <Coins className="h-4 w-4 text-green-400" />
          </div>
          <span className="text-white font-bold text-sm min-w-[40px]">
            {formatNumber(user?.balance || 0)}
          </span>
        </motion.div>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-600/50"></div>

        {/* Mystery Boxes Counter */}
        <motion.div
          id="boxes-counter"
          variants={counterPulseVariants}
          initial="initial"
          animate={animatingCounters.boxes ? "animate" : "initial"}
          className="flex items-center gap-2"
        >
          <div className="bg-purple-500/20 p-1.5 rounded-lg">
            <Gift className="h-4 w-4 text-purple-400" />
          </div>
          <span className="text-white font-bold text-sm min-w-[40px]">
            {formatNumber(user?.mysteryBoxes || 0)}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Flying Animation Component - Updated to target specific counters
const FlyingReward = ({ type, amount, onComplete }) => {
  const [targetPosition, setTargetPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Calculate target position based on reward type
    const getTargetElement = () => {
      switch (type) {
        case 'energy':
          return document.getElementById('energy-counter');
        case 'balance':
          return document.getElementById('balance-counter');
        case 'boxes':
          return document.getElementById('boxes-counter');
        default:
          return null;
      }
    };

    const targetElement = getTargetElement();
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      setTargetPosition({
        x: rect.left + rect.width / 2 - centerX,
        y: rect.top + rect.height / 2 - centerY
      });
    }
  }, [type]);

  const getRewardConfig = () => {
    switch (type) {
      case 'energy':
        return {
          icon: Zap,
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/30',
          borderColor: 'border-yellow-500/60',
          glowColor: 'shadow-yellow-500/50'
        };
      case 'balance':
        return {
          icon: Coins,
          color: 'text-green-400',
          bgColor: 'bg-green-500/30',
          borderColor: 'border-green-500/60',
          glowColor: 'shadow-green-500/50'
        };
      case 'boxes':
        return {
          icon: Gift,
          color: 'text-purple-400',
          bgColor: 'bg-purple-500/30',
          borderColor: 'border-purple-500/60',
          glowColor: 'shadow-purple-500/50'
        };
      default:
        return {
          icon: Sparkles,
          color: 'text-white',
          bgColor: 'bg-gray-500/30',
          borderColor: 'border-gray-500/60',
          glowColor: 'shadow-gray-500/50'
        };
    }
  };

  const config = getRewardConfig();
  const Icon = config.icon;

  return (
    <motion.div
      variants={flyInVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      custom={targetPosition}
      onAnimationComplete={onComplete}
      className={`fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 ${config.bgColor} ${config.borderColor} border-2 rounded-xl px-4 py-3 flex items-center gap-2 shadow-2xl ${config.glowColor} backdrop-blur-md`}
    >
      <Icon className={`h-6 w-6 ${config.color}`} />
      <span className="text-white font-bold text-lg">+{amount}</span>
    </motion.div>
  );
};

const TasksSection = ({ tasks = [], user = {}, refreshUserData, isLoading }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [clickedTasks, setClickedTasks] = useState({});
  const [verifying, setVerifying] = useState({});
  const [isEnergyAdLoading, setIsEnergyAdLoading] = useState(false);
  const [isBoxAdLoading, setIsBoxAdLoading] = useState(false);
  
  // Animation states
  const [flyingRewards, setFlyingRewards] = useState([]);
  const [animationTriggers, setAnimationTriggers] = useState({
    energy: 0,
    balance: 0,
    boxes: 0
  });

  // Admin chat ID is now fetched from database via API

  // Function to trigger flying animation
  const triggerFlyingReward = useCallback((type, amount) => {
    const id = Date.now() + Math.random();
    setFlyingRewards(prev => [...prev, { id, type, amount }]);
    
    // Trigger counter animation after the flying animation reaches the target
    setTimeout(() => {
      setAnimationTriggers(prev => ({ ...prev, [type]: prev[type] + 1 }));
    }, 1200); // Matches the flying animation duration
  }, []);

  // Remove flying reward after animation
  const removeFlyingReward = useCallback((id) => {
    setFlyingRewards(prev => prev.filter(reward => reward.id !== id));
  }, []);

  // Memoized calculations
  const checkInDone = useMemo(() => isCheckInDoneToday(user?.lastCheckIn), [user?.lastCheckIn]);
  
  const completedTasksCount = useMemo(() => {
    return user.tasks ? Object.values(user.tasks).filter(Boolean).length : 0;
  }, [user.tasks]);

  const availableTasksCount = useMemo(() => {
    return tasks.filter(t => t.active && !user?.tasks?.[t.id]).length;
  }, [tasks, user?.tasks]);

  const pendingTasksCount = useMemo(() => {
    return user?.pendingVerificationTasks?.length || 0;
  }, [user?.pendingVerificationTasks]);

  // Check for highlight parameter
  useEffect(() => {
    if (location.search.includes('highlight=energy-ad')) {
      const element = document.getElementById('energy-ad-task');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (location.search.includes('highlight=mystery-box')) {
      const element = document.getElementById('mystery-box-task');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [location.search]);

  const handlePlayGame = useCallback(() => {
    if (user?.id) {
      sessionStorage.setItem('gameUserId', user.id);
      navigate('/game');
    }
  }, [user?.id, navigate]);

  const handleGoToTask = useCallback((taskId, url) => {
    window.open(url, '_blank');
    setClickedTasks(prev => ({ ...prev, [taskId]: true }));
  }, []);

  const handleCheckIn = useCallback(async () => {
    if (!user?.id) return;
    setVerifying(v => ({ ...v, checkin: true }));
    
    try {
      const result = await performCheckIn(user.id);
      if (result.success) {
        // Trigger flying animation for balance reward
        triggerFlyingReward('balance', result.reward);
        
        const updatedUser = await getCurrentUser(user.id);
        if (updatedUser) refreshUserData(updatedUser);
        toast({ 
          title: 'Daily Check-in Successful!', 
          description: `+${result.reward} STON`, 
          variant: 'success', 
          className: "bg-[#1a1a1a] text-white" 
        });
      } else {
        toast({ 
          title: 'Check-in Failed', 
          description: result.message || 'Try again later.', 
          variant: 'destructive', 
          className: "bg-[#1a1a1a] text-white" 
        });
      }
    } catch (error) {
      console.error('Check-in error:', error);
      toast({ 
        title: 'Check-in Failed', 
        description: 'Network error. Please try again.', 
        variant: 'destructive', 
        className: "bg-[#1a1a1a] text-white" 
      });
    } finally {
      setVerifying(v => ({ ...v, checkin: false }));
    }
  }, [user?.id, refreshUserData, toast, triggerFlyingReward]);

  // Admin notification via backend API
  const sendAdminNotification = useCallback(async (message) => {
    try {
      const response = await fetch('/api/notify-admin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_ADMIN_API_KEY
        },
        body: JSON.stringify({ message }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to send notification: ${response.status}`);
      }
    
      return true;
    } catch (err) {
      console.error("Failed to send admin notification:", err);
      
      toast({
        title: "Warning",
        description: "Admin notification failed, but your action was completed.",
        variant: "warning",
        className: "bg-[#1a1a1a] text-white",
      });
      return false;
    }
  }, [toast]);

  const handleEarnEnergyAd = useCallback(async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not found. Please refresh the page.",
        variant: 'destructive',
        className: "bg-[#1a1a1a] text-white"
      });
      return;
    }

    // Check energy ad availability first
    const availability = await checkEnergyAdAvailability(user.id);
    
    if (!availability.available) {
      let title = "Cannot Earn Energy";
      let description = availability.error;
      
      if (availability.type === 'energy_full') {
        title = "🔋 Energy Full!";
        description = "Your energy is already at maximum (500/500). Use some energy first!";
      } else if (availability.type === 'daily_limit') {
        title = "📅 Daily Limit Reached";
        description = `You've reached your daily energy ad limit (10). Try again in ${availability.resetTime} hours.`;
      } else if (availability.type === 'hourly_limit') {
        title = "⏰ Hourly Limit Reached";
        description = `You've reached your hourly energy ad limit (3). Try again in ${availability.resetTime} minutes.`;
      }
      
      toast({
        title,
        description,
        variant: 'destructive',
        className: "bg-[#1a1a1a] text-white"
      });
      return;
    }

    setIsEnergyAdLoading(true);

    showRewardedAd({
      onComplete: async () => {
        try {
          // Grant energy to user with new function
          const result = await addEnergyFromAd(user.id);
          
          if (result.success) {
            // Trigger flying animation
            triggerFlyingReward('energy', result.energyGained);
            
            const updatedUser = await getCurrentUser(user.id);
            if (updatedUser) refreshUserData(updatedUser);
            
            // Notify admin
            const userMention = user.username ? `@${user.username}` : `User ${user.id}`;
            await sendAdminNotification(
              `⚡ <b>Energy Ad Completed</b>\n${userMention} watched an ad and earned <b>+${result.energyGained} energy</b>\nDaily: ${result.dailyUsed}/10 | Hourly: ${result.hourlyUsed}/3`
            );

            toast({
              title: `⚡ Energy Earned!`,
              description: `+${result.energyGained} energy added! (${result.newEnergy}/500)\nDaily: ${result.dailyUsed}/10 | Hourly: ${result.hourlyUsed}/3`,
              variant: 'success',
              className: "bg-[#1a1a1a] text-white"
            });
          } else {
            // Handle error from addEnergyFromAd
            let title = "Energy Reward Failed";
            let description = result.error;
            
            if (result.type === 'energy_full') {
              title = "🔋 Energy Already Full!";
              description = "Your energy reached maximum while watching the ad!";
            }
            
            toast({
              title,
              description,
              variant: 'destructive',
              className: "bg-[#1a1a1a] text-white"
            });
          }
        } catch (error) {
          console.error('Energy reward error:', error);
          toast({
            title: "Reward Failed",
            description: "Failed to grant energy. Please try again.",
            variant: 'destructive',
            className: "bg-[#1a1a1a] text-white"
          });
        } finally {
          setIsEnergyAdLoading(false);
        }
      },
      onClose: () => {
        setIsEnergyAdLoading(false);
        toast({
          title: "Ad not completed",
          description: "Watch the full ad to earn energy.",
          variant: 'destructive',
          className: "bg-[#1a1a1a] text-white"
        });
      },
      onError: (err) => {
        setIsEnergyAdLoading(false);
        toast({
          title: "No Ad Available",
          description: err || "Try again later.",
          variant: 'destructive',
          className: "bg-[#1a1a1a] text-white"
        });
      }
    });
  }, [user?.id, user?.username, refreshUserData, sendAdminNotification, toast, triggerFlyingReward]);

  const handleEarnBoxAd = useCallback(async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not found. Please refresh the page.",
        variant: 'destructive',
        className: "bg-[#1a1a1a] text-white"
      });
      return;
    }

    // Check mystery box ad availability first
    const availability = await checkBoxAdAvailability(user.id);
    
    if (!availability.available) {
      let title = "Cannot Earn Mystery Box";
      let description = availability.error;
      
      if (availability.type === 'daily_limit') {
        title = "📅 Daily Limit Reached";
        description = `You've reached your daily mystery box ad limit (10). Try again in ${availability.resetTime} hours.`;
      } else if (availability.type === 'hourly_limit') {
        title = "⏰ Hourly Limit Reached";
        description = `You've reached your hourly mystery box ad limit (3). Try again in ${availability.resetTime} minutes.`;
      }
      
      toast({
        title,
        description,
        variant: 'destructive',
        className: "bg-[#1a1a1a] text-white"
      });
      return;
    }

    setIsBoxAdLoading(true);

    showRewardedAd({
      onComplete: async () => {
        try {
          // Grant box to user with new function
          const result = await addBoxFromAd(user.id);
          
          if (result.success) {
            // Trigger flying animation
            triggerFlyingReward('boxes', result.boxesGained);
            
            const updatedUser = await getCurrentUser(user.id);
            if (updatedUser) refreshUserData(updatedUser);
            
            // Notify admin
            const userMention = user.username ? `@${user.username}` : `User ${user.id}`;
            await sendAdminNotification(
              `🎁 <b>Mystery Box Ad Completed</b>\n${userMention} watched an ad and earned <b>+${result.boxesGained} Mystery Box</b>\nDaily: ${result.dailyUsed}/10 | Hourly: ${result.hourlyUsed}/3`
            );

            toast({
              title: `🎁 Mystery Box Earned!`,
              description: `+${result.boxesGained} mystery box added! (Total: ${result.newBoxCount})\nDaily: ${result.dailyUsed}/10 | Hourly: ${result.hourlyUsed}/3`,
              variant: 'success',
              className: "bg-[#1a1a1a] text-white"
            });
          } else {
            toast({
              title: "Mystery Box Reward Failed",
              description: result.error,
              variant: 'destructive',
              className: "bg-[#1a1a1a] text-white"
            });
          }
        } catch (error) {
          console.error('Box reward error:', error);
          toast({
            title: "Reward Failed",
            description: "Failed to grant mystery box. Please try again.",
            variant: 'destructive',
            className: "bg-[#1a1a1a] text-white"
          });
        } finally {
          setIsBoxAdLoading(false);
        }
      },
      onClose: () => {
        setIsBoxAdLoading(false);
        toast({
          title: "Ad not completed",
          description: "Watch the full ad to earn a mystery box.",
          variant: 'destructive',
          className: "bg-[#1a1a1a] text-white"
        });
      },
      onError: (err) => {
        setIsBoxAdLoading(false);
        toast({
          title: "No Ad Available",
          description: err || "Try again later.",
          variant: 'destructive',
          className: "bg-[#1a1a1a] text-white"
        });
      }
    });
  }, [user?.id, user?.username, refreshUserData, sendAdminNotification, toast, triggerFlyingReward]);

  const handleVerificationClick = useCallback(async (task) => {
    if (!user?.id || !task?.id) return;

    setVerifying(v => ({ ...v, [task.id]: true }));

    const isCompleted = user.tasks?.[task.id] === true;
    const isPending = user.pendingVerificationTasks?.includes(task.id);
    
    if (isCompleted || isPending) {
      setVerifying(v => ({ ...v, [task.id]: false }));
      return;
    }

    try {
      if (task.verificationType === 'auto' && task.type === 'telegram_join') {
        try {
          const response = await fetch('/api/verify-telegram-join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              channelUsername: task.target.replace('@', ''),
              taskId: task.id
            }),
          });

          const data = await response.json();

          if (data.success && data.isMember) {
            const verified = await completeTask(user.id, task.id);
            if (verified) {
              // Trigger flying animation for task reward
              triggerFlyingReward('balance', task.reward);
              
              const userMention = user.username ? `@${user.username}` : `User ${user.id}`;
              await sendAdminNotification(
                `✅ <b>Auto-Verification Success</b>\n${userMention} successfully joined <b>${task.title}</b> (${task.target})\nReward: +${task.reward} STON`
              );
              
              const updatedUser = await getCurrentUser(user.id);
              if (updatedUser) refreshUserData(updatedUser);
              toast({ 
                title: 'Joined Verified', 
                description: `+${task.reward} STON`, 
                variant: 'success', 
                className: "bg-[#1a1a1a] text-white" 
              });
              setVerifying(v => ({ ...v, [task.id]: false }));
              return;
            }
          } else if (!data.isMember) {
            toast({ 
              title: 'Not Verified', 
              description: 'Please join the channel first.', 
              variant: 'destructive', 
              className: "bg-[#1a1a1a] text-white" 
            });
            setClickedTasks(prev => ({ ...prev, [task.id]: false }));
            setVerifying(v => ({ ...v, [task.id]: false }));
            return;
          } else {
            throw new Error(data.error || 'Verification failed');
          }
        } catch (err) {
          console.error('Telegram verification error:', err);
          toast({ 
            title: 'Verification Error', 
            description: 'Failed to verify. Please try again later.', 
            variant: 'destructive', 
            className: "bg-[#1a1a1a] text-white" 
          });
          setClickedTasks(prev => ({ ...prev, [task.id]: false }));
          setVerifying(v => ({ ...v, [task.id]: false }));
          return;
        }
      }

      let success = false;
      if (task.verificationType === 'auto') {
        success = await completeTask(user.id, task.id);
        if (success) {
          // Trigger flying animation for task reward
          triggerFlyingReward('balance', task.reward);
          
          const userMention = user.username ? `@${user.username}` : `User ${user.id}`;
          await sendAdminNotification(
            `✅ <b>Auto-Verification Success</b>\n${userMention} completed <b>${task.title}</b>\nReward: +${task.reward} STON`
          );
        }
        toast({
          title: success ? 'Task Verified!' : 'Verification Failed',
          description: success ? `+${task.reward} STON` : 'Could not verify task completion.',
          variant: success ? 'success' : 'destructive',
          className: "bg-[#1a1a1a] text-white"
        });
      } else {
        success = await requestManualVerification(user.id, task.id);

        if (success) {
          const userMention = user.username ? `@${user.username}` : `User ${user.id}`;
          await sendAdminNotification(
            `🔍 <b>Manual Verification Request</b>\n${userMention} requested verification for <b>${task.title}</b>\nTarget: ${task.target || 'N/A'}\nReward: ${task.reward} STON`
          );
        }
        toast({
          title: success ? 'Verification Requested' : 'Request Failed',
          description: success ? `"${task.title}" sent for review.` : 'Try again later.',
          variant: success ? 'success' : 'destructive',
          className: "bg-[#1a1a1a] text-white"
        });
      }

      if (success) {
        const updatedUser = await getCurrentUser(user.id);
        if (updatedUser) refreshUserData(updatedUser);
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
        className: "bg-[#1a1a1a] text-white"
      });
    } finally {
      setVerifying(v => ({ ...v, [task.id]: false }));
    }
  }, [user, refreshUserData, sendAdminNotification, toast, triggerFlyingReward]);

  return (
    <div
      className="relative w-full min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#1a1a1a] text-white overflow-y-auto"
      style={{
        touchAction: "pan-y",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      }}
    >
      {/* Top Stats Display */}
      <TopStats user={user} animationTriggers={animationTriggers} />

      {/* Flying Reward Animations */}
      <AnimatePresence>
        {flyingRewards.map(reward => (
          <FlyingReward
            key={reward.id}
            type={reward.type}
            amount={reward.amount}
            onComplete={() => removeFlyingReward(reward.id)}
          />
        ))}
      </AnimatePresence>

      <div className="flex flex-col items-center px-4 py-4 pb-24 pt-24">
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
              Available Tasks
            </h2>
            <p className="text-xs text-gray-400 mt-1">Complete tasks to earn STON rewards</p>
          </motion.div>

          {/* Ad Rewards Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="w-full space-y-3"
          >
            {/* Energy Ad Task */}
            <motion.div
              variants={pulseVariants}
              initial="initial"
              animate="animate"
              className={`bg-gradient-to-r from-yellow-600/20 to-yellow-800/20 border border-yellow-500/30 p-4 rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl relative overflow-hidden ${
                location.search.includes('highlight=energy-ad') ? 'ring-2 ring-yellow-400 animate-pulse' : ''
              }`}
              id="energy-ad-task"
            >
              {/* Animated background sparkles */}
              <div className="absolute inset-0 pointer-events-none">
                <motion.div
                  variants={sparkleVariants}
                  initial="initial"
                  animate="animate"
                  className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full"
                />
                <motion.div
                  variants={sparkleVariants}
                  initial="initial"
                  animate="animate"
                  style={{ animationDelay: '0.5s' }}
                  className="absolute bottom-3 left-3 w-1.5 h-1.5 bg-yellow-300 rounded-full"
                />
                <motion.div
                  variants={sparkleVariants}
                  initial="initial"
                  animate="animate"
                  style={{ animationDelay: '1s' }}
                  className="absolute top-1/2 left-1/4 w-1 h-1 bg-yellow-500 rounded-full"
                />
              </div>

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3 flex-1">
                  <motion.div 
                    className="bg-yellow-500/20 p-2.5 rounded-xl"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Zap className="h-5 w-5 text-yellow-400" />
                  </motion.div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">Earn Energy</p>
                    <p className="text-xs text-yellow-300">Watch ad → Get {ENERGY_REWARD_AMOUNT} energy points!</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleEarnEnergyAd}
                  disabled={isEnergyAdLoading}
                  className="h-9 px-4 bg-yellow-500 hover:bg-yellow-600 text-black font-medium rounded-xl disabled:opacity-50 transition-all duration-200 hover:scale-105 min-w-[80px] flex items-center justify-center"
                >
                  {isEnergyAdLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-1" />
                      Watch
                    </>
                  )}
                </Button>
              </div>
            </motion.div>

            {/* Mystery Box Ad Task */}
            <motion.div
              variants={pulseVariants}
              initial="initial"
              animate="animate"
              style={{ animationDelay: '0.3s' }}
              className={`bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 p-4 rounded-2xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl relative overflow-hidden ${
                location.search.includes('highlight=mystery-box') ? 'ring-2 ring-purple-400 animate-pulse' : ''
              }`}
              id="mystery-box-task"
            >
              {/* Animated background sparkles */}
              <div className="absolute inset-0 pointer-events-none">
                <motion.div
                  variants={sparkleVariants}
                  initial="initial"
                  animate="animate"
                  style={{ animationDelay: '0.2s' }}
                  className="absolute top-3 right-4 w-2 h-2 bg-purple-400 rounded-full"
                />
                <motion.div
                  variants={sparkleVariants}
                  initial="initial"
                  animate="animate"
                  style={{ animationDelay: '0.7s' }}
                  className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-pink-400 rounded-full"
                />
                <motion.div
                  variants={sparkleVariants}
                  initial="initial"
                  animate="animate"
                  style={{ animationDelay: '1.2s' }}
                  className="absolute top-1/3 left-1/3 w-1 h-1 bg-purple-300 rounded-full"
                />
                <motion.div
                  variants={sparkleVariants}
                  initial="initial"
                  animate="animate"
                  style={{ animationDelay: '1.5s' }}
                  className="absolute bottom-1/3 right-1/3 w-1 h-1 bg-pink-300 rounded-full"
                />
              </div>

              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3 flex-1">
                  <motion.div 
                    className="bg-purple-500/20 p-2.5 rounded-xl"
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Gift className="h-5 w-5 text-purple-400" />
                  </motion.div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white flex items-center gap-1">
                      Mystery Box
                      <Sparkles className="h-3 w-3 text-pink-400" />
                    </p>
                    <p className="text-xs text-purple-300">Watch ad → Get {BOX_REWARD_AMOUNT} mystery box!</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleEarnBoxAd}
                  disabled={isBoxAdLoading}
                  className="h-9 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-xl disabled:opacity-50 transition-all duration-200 hover:scale-105 min-w-[80px] flex items-center justify-center"
                >
                  {isBoxAdLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Gift className="h-4 w-4 mr-1" />
                      Watch
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>

          {/* Play Game Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full"
          >
            <div className="bg-gradient-to-r from-sky-600/20 to-sky-800/20 backdrop-blur-sm border border-sky-500/30 p-4 rounded-2xl flex items-center justify-between shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center gap-3 flex-1">
                <motion.div 
                  className="bg-sky-500/20 p-2.5 rounded-xl"
                  whileHover={{ scale: 1.1, rotate: 10 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Gamepad2 className="h-5 w-5 text-sky-400" />
                </motion.div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Play Game</p>
                  <p className="text-xs text-gray-300">Catch STON gems and earn rewards!</p>
                </div>
              </div>
              <Button 
                size="sm" 
                onClick={handlePlayGame}
                className="h-9 px-4 bg-sky-600 hover:bg-sky-700 text-white font-medium rounded-xl transition-all duration-200 hover:scale-105 min-w-[80px] flex items-center justify-center"
              >
                <Gamepad2 className="mr-1 w-4 h-4" /> Play
              </Button>
            </div>
          </motion.div>

          {/* Tasks List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full space-y-3"
          >
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-gray-400 text-sm">Loading tasks...</span>
              </div>
            ) : (
              tasks.filter(t => t.active).map((task, index) => {
                const isCheckInTask = task.type === 'daily_checkin';
                const isCompleted = isCheckInTask ? checkInDone : user?.tasks?.[task.id] === true;
                const isPending = user?.pendingVerificationTasks?.includes(task.id);
                const targetUrl = task.type.includes('telegram')
                  ? `https://t.me/${(task.target || '').replace('@', '')}`
                  : (task.target || '#');
                const hasClicked = clickedTasks[task.id];

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-600/50 p-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-white truncate">
                            {task.title || 'Untitled Task'}
                          </p>
                          <Badge className="bg-green-600/20 text-green-300 border-green-600 text-xs px-2 py-0.5">
                            +{task.reward || 0} STON
                          </Badge>
                        </div>
                        <a
                          href={targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:underline block truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {task.description || 'No description provided.'}
                        </a>
                      </div>

                      <div className="ml-3 flex-shrink-0">
                        {isCompleted ? (
                          <Badge className="bg-green-600/20 text-green-300 border-green-600 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" /> Done
                          </Badge>
                        ) : isPending ? (
                          <Badge className="bg-yellow-600/20 text-yellow-300 border-yellow-600 text-xs">
                            <Clock className="h-3 w-3 mr-1" /> Pending
                          </Badge>
                        ) : isCheckInTask ? (
                          <Button
                            size="sm"
                            onClick={handleCheckIn}
                            disabled={isCompleted || verifying.checkin}
                            className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 min-w-[90px] flex items-center justify-center"
                          >
                            {verifying.checkin ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : (
                              <CalendarCheck className="mr-1 h-4 w-4" />
                            )}
                            {checkInDone ? 'Checked In' : 'Check In'}
                          </Button>
                        ) : task.type === 'referral' ? (
                          <Badge className="bg-purple-600/20 text-purple-300 border-purple-600 text-xs">
                            Via Invites
                          </Badge>
                        ) : !hasClicked ? (
                          <Button 
                            size="sm" 
                            onClick={() => handleGoToTask(task.id, targetUrl)}
                            className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl min-w-[70px] flex items-center justify-center"
                          >
                            Go <ArrowRight className="ml-1 h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleVerificationClick(task)}
                            disabled={verifying[task.id]}
                            className="h-9 px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl disabled:opacity-50 min-w-[80px] flex items-center justify-center"
                          >
                            {verifying[task.id] ? (
                              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                            ) : task.verificationType === 'auto' ? (
                              <>
                                <CheckCircle className="mr-1 h-4 w-4" /> Verify
                              </>
                            ) : (
                              <>
                                <HelpCircle className="mr-1 h-4 w-4" /> Request
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}

            {/* Empty State */}
            {!isLoading && tasks.filter(t => t.active).length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-center py-8"
              >
                <div className="bg-gray-800/50 border border-gray-600/50 rounded-2xl p-6">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 text-sm">No tasks available</p>
                  <p className="text-gray-500 text-xs mt-2">
                    Check back later for new tasks
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Stats Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="w-full"
          >
            <div className="bg-gradient-to-r from-purple-600/20 to-purple-800/20 backdrop-blur-sm border border-purple-500/30 p-3 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-300">Completed</p>
                  <p className="text-lg font-bold text-white">
                    {completedTasksCount}
                  </p>
                </div>
                <div className="w-px h-8 bg-purple-500/30"></div>
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-300">Available</p>
                  <p className="text-lg font-bold text-white">
                    {availableTasksCount}
                  </p>
                </div>
                <div className="w-px h-8 bg-purple-500/30"></div>
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-300">Pending</p>
                  <p className="text-lg font-bold text-white">
                    {pendingTasksCount}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Daily Check-in Streak */}
          {user?.checkInStreak && user.checkInStreak > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="w-full"
            >
              <div className="bg-gradient-to-r from-orange-600/20 to-orange-800/20 backdrop-blur-sm border border-orange-500/30 p-3 rounded-2xl text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CalendarCheck className="h-5 w-5 text-orange-400" />
                  <p className="text-sm font-semibold text-white">Check-in Streak</p>
                </div>
                <p className="text-2xl font-bold text-orange-400">
                  {user.checkInStreak} {user.checkInStreak === 1 ? 'day' : 'days'}
                </p>
                <p className="text-xs text-gray-300 mt-1">
                  Keep it up! Daily check-ins earn bonus rewards
                </p>
              </div>
            </motion.div>
          )}

          {/* Tips Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="w-full"
          >
            <div className="bg-gradient-to-r from-blue-600/10 to-blue-800/10 backdrop-blur-sm border border-blue-500/20 p-3 rounded-2xl">
              <h3 className="text-sm font-semibold text-blue-400 mb-2 text-center flex items-center justify-center gap-1">
                <Sparkles className="h-4 w-4" />
                Tips
              </h3>
              <div className="space-y-2 text-xs text-gray-300">
                <p>• Complete daily check-ins to build your streak</p>
                <p>• Join Telegram channels for instant verification</p>
                <p>• Manual tasks are reviewed by admins within 24 hours</p>
                <p>• Play the game daily for extra STON rewards</p>
                <p>• Watch ads to earn energy and mystery boxes</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default TasksSection;
