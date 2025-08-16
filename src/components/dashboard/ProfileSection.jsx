import React, { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Wallet,
  Link as LinkIcon,
  Gift,
  Zap,
  Users,
  CheckCircle2,
  Copy,
  Unlink,
  X,
  AlertTriangle,
  Send,
  History,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  HelpCircle,
  Sparkles,
  Star,
  Coins,
  TrendingUp,
  Award,
  Crown,
  Flame,
  Shield,
  Rocket,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronRight,
  Activity,
  Target,
  Gem,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { 
  connectWallet, 
  disconnectWallet, 
  getCurrentUser,
  openMysteryBox,
  updateUserBalance,
  updateUserBalanceByType,
  getPurchasableBalance,
  getWithdrawableBalance
} from "@/data";
import {
  createWithdrawalRequest,
  getUserWithdrawalHistory,
} from "@/data/firestore/adminActions";
import { getAdminConfig } from "@/data/firestore/adminConfig";

// Animation variants
const boxVariants = {
  closed: {
    scale: 1,
    rotateY: 0,
    rotateX: 0,
    boxShadow: "0 4px 20px rgba(127, 5, 237, 0)",
    background: "linear-gradient(135deg, rgba(139, 92, 246, 0) 0%, rgba(236, 72, 153, 0) 100%)",
  },
  hover: {
    scale: 1.08,
    rotateY: 8,
    rotateX: 3,
    boxShadow: "0 12px 40px rgba(127, 5, 237, 0)",
    background: "linear-gradient(135deg, rgba(168, 85, 247, 0) 0%, rgba(244, 114, 182, 0) 100%)",
    transition: { 
      duration: 0.4,
      type: "spring",
      stiffness: 300,
      damping: 15
    }
  },
  opening: {
    scale: [1, 1.4, 1.2, 1.6, 1.1, 1.3, 1],
    rotateY: [0, 45, 180, 270, 360, 405, 360],
    rotateX: [0, 15, -10, 20, -5, 10, 0],
    rotateZ: [0, -5, 8, -12, 3, -6, 0],
    boxShadow: [
      "0 4px 20px rgba(127, 5, 237, 0)",
      "0 20px 60px rgba(127, 5, 237, 0)",
      "0 30px 80px rgba(127, 5, 237, 0)",
      "0 40px 100px rgba(127, 5, 237, 0)",
      "0 25px 70px rgba(127, 5, 237, 0)",
      "0 15px 50px rgba(127, 5, 237, 0)",
      "0 8px 30px rgba(127, 5, 237, 0)"
    ],
    background: [
      "linear-gradient(135deg, rgba(139, 92, 246, 0) 0%, rgba(236, 72, 153, 0) 100%)",
      "linear-gradient(135deg, rgba(168, 85, 247, 0) 0%, rgba(244, 114, 182, 0) 100%)",
      "linear-gradient(135deg, rgba(192, 132, 252, 0) 0%, rgba(251, 113, 133, 0) 100%)",
      "linear-gradient(135deg, rgba(251, 191, 36, 0) 0%, rgba(249, 115, 22, 0) 100%)",
      "linear-gradient(135deg, rgba(34, 197, 94, 0) 0%, rgba(59, 130, 246, 0) 100%)",
      "linear-gradient(135deg, rgba(168, 85, 247, 0) 0%, rgba(244, 114, 182, 0) 100%)",
      "linear-gradient(135deg, rgba(139, 92, 246, 0) 0%, rgba(236, 72, 153, 0) 100%)"
    ],
    transition: { 
      duration: 2.5, 
      ease: "easeInOut",
      times: [0, 0.15, 0.3, 0.5, 0.7, 0.85, 1]
    }
  }
};

const sparkleVariants = {
  initial: { opacity: 0, scale: 0, rotate: 0 },
  animate: { 
    opacity: [0, 1, 0.8, 1, 0],
    scale: [0, 1.2, 0.8, 1.5, 0],
    rotate: [0, 90, 180, 270, 360],
    transition: { 
      duration: 1.8,
      repeat: Infinity,
      ease: "easeInOut",
      staggerChildren: 0.15
    }
  }
};

const rewardVariants = {
  initial: { 
    opacity: 0, 
    scale: 0, 
    y: 80,
    rotateX: -90,
    rotateY: 180
  },
  animate: { 
    opacity: [0, 1, 1, 1],
    scale: [0, 1.3, 0.9, 1],
    y: [80, -10, 5, 0],
    rotateX: [-90, 15, -5, 0],
    rotateY: [180, -10, 5, 0],
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 25,
      delay: 1.8,
      duration: 1.2
    }
  },
  exit: { 
    opacity: [1, 0.8, 0],
    scale: [1, 1.1, 0],
    y: [0, -20, -80],
    rotateY: [0, 45, 90],
    transition: { 
      duration: 0.8,
      ease: "easeIn"
    }
  }
};

const confettiVariants = {
  initial: { opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 },
  animate: (i) => ({
    opacity: [0, 1, 0.8, 0.6, 0],
    scale: [0, 1.5, 1.2, 0.8, 0],
    x: [0, (Math.random() - 0.5) * 300, (Math.random() - 0.5) * 400],
    y: [0, -150 - Math.random() * 100, -250 - Math.random() * 150],
    rotate: [0, Math.random() * 720, Math.random() * 1080],
    transition: {
      duration: 3,
      delay: i * 0.08,
      ease: [0.25, 0.46, 0.45, 0.94]
    }
  })
};

// Enhanced box opening sparkles
const openingSparkleVariants = {
  initial: { opacity: 0, scale: 0, x: 0, y: 0 },
  animate: (i) => ({
    opacity: [0, 1, 0.7, 0.4, 0],
    scale: [0, 2, 1.5, 1, 0],
    x: [0, (Math.random() - 0.5) * 200],
    y: [0, (Math.random() - 0.5) * 200],
    rotate: [0, 360 + Math.random() * 360],
    transition: {
      duration: 2.2,
      delay: i * 0.05,
      ease: "easeOut"
    }
  })
};

// Magic particles during opening
const magicParticleVariants = {
  initial: { opacity: 0, scale: 0 },
  animate: {
    opacity: [0, 1, 0.8, 0],
    scale: [0, 1, 1.2, 0],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const profileCardVariants = {
  initial: { opacity: 0, y: 50, scale: 0.9 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: "spring", 
      stiffness: 300, 
      damping: 30,
      staggerChildren: 0.1 
    }
  }
};

const statCardVariants = {
  initial: { opacity: 0, scale: 0.8, y: 20 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 25 
    }
  },
  hover: { 
    scale: 1.05, 
    y: -5,
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 15 
    }
  },
  tap: { scale: 0.95 }
};

const floatingVariants = {
  initial: { y: 0 },
  animate: {
    y: [0, -2, 0],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const glowVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: [0, 0.4, 0],
    scale: [1, 1.05, 1],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const cardGlowVariants = {
  initial: { opacity: 0 },
  animate: {
    opacity: [0, 0.3, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

const balanceCounterVariants = {
  initial: { scale: 1 },
  animate: { 
    scale: [1, 1.1, 1],
    transition: { 
      duration: 0.3,
      ease: "easeOut"
    }
  }
};

// Crown variants with gentle sway
const crownVariants = {
  initial: { rotate: 15, y: -10, opacity: 0, scale: 0.8 },
  animate: { 
    rotate: 15, 
    y: 0, 
    opacity: 1, 
    scale: 1,
    transition: { delay: 0.8, type: "spring", stiffness: 200 }
  },
  sway: {
    rotate: [15, 20, 12, 18, 15],
    y: [0, -1, 0.5, -0.5, 0],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Achievement badge variants
const achievementBadgeVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: { 
      type: "spring", 
      stiffness: 500, 
      damping: 25,
      delay: 0.8
    }
  },
  pulse: {
    scale: [1, 1.1, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// Mystery Box Component
const MysteryBoxSection = ({ user, refreshUserData, navigate }) => {
  const [isOpening, setIsOpening] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast } = useToast();

  const mysteryBoxCount = user?.mysteryBoxes || 0;

  const generateRandomReward = () => {
    return Math.floor(Math.random() * (1000 - 500 + 1)) + 500;
  };

  const handleOpenBox = useCallback(async () => {
    if (!user?.id || mysteryBoxCount <= 0 || isOpening) return;

    setIsOpening(true);

    try {
      // Open the box
      const result = await openMysteryBox(user.id, 1);
      
      if (result.success) {
        // Generate random reward
        const reward = generateRandomReward();
        setRewardAmount(reward);

        // Add reward to user balance (box type - withdrawal only)
        await updateUserBalanceByType(user.id, reward, 'box');

        // Show reward animation after box opening animation
        setTimeout(() => {
          setShowReward(true);
          setShowConfetti(true);
          
          // Hide reward and refresh data after showing
          setTimeout(() => {
            setShowReward(false);
            setShowConfetti(false);
            setIsOpening(false);
            
            // Refresh user data
            getCurrentUser(user.id).then(updatedUser => {
              if (updatedUser) refreshUserData(updatedUser);
            });
            
            toast({
              title: "🎉 Mystery Box Opened!",
              description: `You received ${reward} STON!`,
              variant: "success",
              className: "bg-[#1a1a1a] text-white"
            });
          }, 3000);
        }, 1500);

      } else {
        setIsOpening(false);
        toast({
          title: "Failed to Open Box",
          description: result.error || "Please try again.",
          variant: "destructive",
          className: "bg-[#1a1a1a] text-white"
        });
      }
    } catch (error) {
      setIsOpening(false);
      console.error('Error opening mystery box:', error);
      toast({
        title: "Error",
        description: "Failed to open mystery box. Please try again.",
        variant: "destructive",
        className: "bg-[#1a1a1a] text-white"
      });
    }
  }, [user?.id, mysteryBoxCount, isOpening, refreshUserData, toast]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="w-full"
    >
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-purple-500/30 p-4 rounded-2xl relative overflow-hidden">
        {/* Background sparkles */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            variants={sparkleVariants}
            initial="initial"
            animate="animate"
            className="absolute top-2 right-2 w-2 h-2 bg-purple-400 rounded-full"
          />
          <motion.div
            variants={sparkleVariants}
            initial="initial"
            animate="animate"
            style={{ animationDelay: '0.5s' }}
            className="absolute bottom-3 left-3 w-1.5 h-1.5 bg-pink-400 rounded-full"
          />
          <motion.div
            variants={sparkleVariants}
            initial="initial"
            animate="animate"
            style={{ animationDelay: '1s' }}
            className="absolute top-1/2 left-1/4 w-1 h-1 bg-purple-300 rounded-full"
          />
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-center mb-3">
            <Gift className="h-6 w-6 text-purple-400 mr-2" />
            <h3 className="text-lg font-bold text-white">Mystery Boxes</h3>
            <Sparkles className="h-5 w-5 text-pink-400 ml-2" />
          </div>

          <div className="text-center mb-4">
            <p className="text-3xl font-bold text-white mb-1">{mysteryBoxCount}</p>
            <p className="text-sm text-purple-300">
              {mysteryBoxCount === 1 ? 'Box Available' : 'Boxes Available'}
            </p>
          </div>

          {/* Mystery Box Visual */}
          <div className="flex justify-center mb-4 relative">
            <motion.div
              variants={boxVariants}
              initial="closed"
              whileHover={mysteryBoxCount > 0 && !isOpening ? "hover" : "closed"}
              animate={isOpening ? "opening" : "closed"}
              className="relative cursor-pointer"
              onClick={handleOpenBox}
              style={{ perspective: "1000px" }}
            >
              <motion.div 
                className="w-24 h-24 rounded-3xl flex items-center justify-center relative overflow-hidden border-3 border-white/30 shadow-2xl"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
                  transformStyle: "preserve-3d"
                }}
              >
                {/* Animated background overlay */}
                <motion.div
                  className="absolute inset-0 opacity-30"
                  animate={isOpening ? {
                    background: [
                      "linear-gradient(45deg, #8b5cf6, #ec4899)",
                      "linear-gradient(90deg, #a855f7, #f472b6)",
                      "linear-gradient(135deg, #c084fc, #fb7185)",
                      "linear-gradient(180deg, #fbbf24, #f97316)",
                      "linear-gradient(225deg, #22c55e, #3b82f6)",
                      "linear-gradient(270deg, #a855f7, #f472b6)",
                      "linear-gradient(315deg, #8b5cf6, #ec4899)"
                    ]
                  } : {}}
                  transition={{ duration: 2.5, ease: "easeInOut" }}
                />

                {/* Gift icon with enhanced animation */}
                {!isOpening ? (
                  <motion.div
                    animate={{
                      y: [0, -2, 0],
                      rotateY: [0, 5, -5, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Gift className="h-12 w-12 text-white drop-shadow-lg" />
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{
                      scale: [1, 1.5, 0.8, 1.3, 1],
                      rotateY: [0, 180, 360, 540, 720],
                      rotateX: [0, 20, -20, 15, 0],
                      opacity: [1, 0.7, 1, 0.8, 1]
                    }}
                    transition={{ 
                      duration: 2.5, 
                      ease: "easeInOut",
                      times: [0, 0.25, 0.5, 0.75, 1]
                    }}
                  >
                    <Gift className="h-12 w-12 text-white drop-shadow-lg" />
                  </motion.div>
                )}
                
                {/* Enhanced sparkle effects during opening */}
                <AnimatePresence>
                  {isOpening && (
                    <>
                      {[...Array(20)].map((_, i) => (
                        <motion.div
                          key={`sparkle-${i}`}
                          custom={i}
                          variants={openingSparkleVariants}
                          initial="initial"
                          animate="animate"
                          className={`absolute w-3 h-3 rounded-full ${
                            [
                              'bg-yellow-400', 'bg-pink-400', 'bg-purple-400', 
                              'bg-green-400', 'bg-blue-400', 'bg-orange-400',
                              'bg-red-400', 'bg-indigo-400'
                            ][i % 8]
                          } shadow-lg`}
                          style={{
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)'
                          }}
                        />
                      ))}
                      
                      {/* Magic particles around the box */}
                      {[...Array(12)].map((_, i) => (
                        <motion.div
                          key={`magic-${i}`}
                          variants={magicParticleVariants}
                          initial="initial"
                          animate="animate"
                          className="absolute w-2 h-2 bg-white rounded-full"
                          style={{
                            left: `${20 + (i * 60) % 80}%`,
                            top: `${15 + (i * 70) % 80}%`,
                          }}
                        />
                      ))}
                    </>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Multi-layered glow effects during opening */}
              <AnimatePresence>
              {isOpening && (
                  <>
                    {/* Inner glow */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ 
                        opacity: [0, 0.8, 0.6, 1, 0], 
                        scale: [0.5, 1.2, 1.8, 2.5, 3] 
                      }}
                      exit={{ opacity: 0, scale: 3 }}
                      transition={{ 
                        duration: 2.5, 
                        ease: "easeOut"
                      }}
                      className="absolute inset-0 bg-gradient-to-r from-purple-400/40 via-pink-400/50 to-yellow-400/40 rounded-3xl blur-lg"
                    />
                    
                    {/* Outer glow */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                        opacity: [0, 0.6, 0.4, 0.8, 0], 
                        scale: [0.8, 2, 3, 4, 5] 
                      }}
                      exit={{ opacity: 0, scale: 5 }}
                      transition={{ 
                        duration: 2.5, 
                        ease: "easeOut",
                        delay: 0.2
                      }}
                      className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/30 to-pink-400/20 rounded-3xl blur-2xl"
                    />
                    
                    {/* Ring wave effect */}
                    <motion.div
                      initial={{ opacity: 0, scale: 1 }}
                      animate={{ 
                        opacity: [0, 1, 0], 
                        scale: [1, 6] 
                  }}
                  transition={{ 
                    duration: 1.5, 
                        repeat: 2,
                        ease: "easeOut"
                  }}
                      className="absolute inset-0 border-4 border-white/30 rounded-full"
                />
                  </>
              )}
              </AnimatePresence>
            </motion.div>

            {/* Enhanced Confetti Animation */}
            <AnimatePresence>
              {showConfetti && (
                <div className="absolute inset-0 pointer-events-none overflow-visible">
                  {[...Array(30)].map((_, i) => (
                    <motion.div
                      key={`confetti-${i}`}
                      custom={i}
                      variants={confettiVariants}
                      initial="initial"
                      animate="animate"
                      exit="initial"
                      className={`absolute rounded-full shadow-lg ${
                        [
                          'bg-gradient-to-r from-yellow-400 to-orange-400 w-3 h-3',
                          'bg-gradient-to-r from-pink-400 to-rose-400 w-2 h-2', 
                          'bg-gradient-to-r from-purple-400 to-violet-400 w-4 h-4',
                          'bg-gradient-to-r from-green-400 to-emerald-400 w-2 h-2',
                          'bg-gradient-to-r from-blue-400 to-cyan-400 w-3 h-3',
                          'bg-gradient-to-r from-red-400 to-pink-400 w-2 h-2',
                          'bg-gradient-to-r from-indigo-400 to-purple-400 w-3 h-3',
                          'bg-gradient-to-r from-amber-400 to-yellow-400 w-4 h-4'
                        ][i % 8]
                      }`}
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)'
                      }}
                    />
                  ))}
                  
                  {/* Star-shaped confetti */}
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={`star-confetti-${i}`}
                      custom={i + 30}
                      variants={confettiVariants}
                      initial="initial"
                      animate="animate"
                      exit="initial"
                      className="absolute"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)'
                      }}
                    >
                      <Star className={`h-4 w-4 ${
                        ['text-yellow-400', 'text-pink-400', 'text-purple-400', 'text-green-400'][i % 4]
                      } drop-shadow-lg`} />
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>

            {/* Enhanced Reward Display */}
            <AnimatePresence>
              {showReward && (
                <motion.div
                  variants={rewardVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full z-30"
                  style={{ perspective: "1000px" }}
                >
                  <motion.div 
                    className="relative"
                    animate={{
                      rotateY: [0, 5, -5, 0],
                      rotateX: [0, 2, -2, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    {/* Reward glow effect */}
                    <motion.div
                      animate={{
                        opacity: [0.5, 1, 0.5],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute inset-0 bg-gradient-to-r from-yellow-400/50 to-orange-400/50 rounded-2xl blur-lg"
                    />
                    
                    {/* Main reward card - Smaller size */}
                    <div className="relative bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 text-white px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 border-2 border-yellow-300/50 backdrop-blur-sm">
                      {/* Animated coins icon */}
                      <motion.div
                        animate={{
                          rotateY: [0, 360],
                          scale: [1, 1.1, 1]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <Coins className="h-5 w-5 drop-shadow-lg" />
                      </motion.div>
                      
                      {/* Reward amount with counting effect */}
                      <motion.span 
                        className="font-bold text-lg drop-shadow-lg"
                        animate={{
                          scale: [1, 1.05, 1],
                          textShadow: [
                            "0 0 10px rgba(255,255,255,0.5)",
                            "0 0 20px rgba(255,255,255,0.8)",
                            "0 0 10px rgba(255,255,255,0.5)"
                          ]
                        }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        +{rewardAmount} STON
                      </motion.span>
                      
                      {/* Animated star icon */}
                      <motion.div
                        animate={{
                          rotate: [0, 360],
                          scale: [1, 1.2, 1]
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <Star className="h-4 w-4 drop-shadow-lg" />
                      </motion.div>
                  </div>
                    
                    {/* Sparkles around reward */}
                    {[...Array(6)].map((_, i) => (
                      <motion.div
                        key={`reward-sparkle-${i}`}
                        animate={{
                          scale: [0, 1, 0],
                          opacity: [0, 1, 0],
                          rotate: [0, 360]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.3,
                          ease: "easeInOut"
                        }}
                        className="absolute w-2 h-2 bg-white rounded-full"
                        style={{
                          left: `${20 + (i * 60) % 80}%`,
                          top: `${10 + (i * 70) % 80}%`,
                        }}
                      />
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Button */}
          <div className="text-center">
            {mysteryBoxCount > 0 ? (
              <Button
                onClick={handleOpenBox}
                disabled={isOpening}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-8 rounded-xl disabled:opacity-50 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                {isOpening ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Opening Magic...
                  </>
                ) : (
                  <>
                    <Gift className="mr-2 h-5 w-5" />
                    Open Mystery Box
                  </>
                )}
              </Button>
            ) : (
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-3">No boxes available</p>
                <Button
                  onClick={() => navigate("/tasks?highlight=mystery-box")}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-2 px-6 rounded-xl text-sm transition-all duration-300 hover:scale-105"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Earn More Boxes
                </Button>
              </div>
            )}
          </div>

          {/* Box Info */}
          <div className="mt-4 text-center">
            <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/30 rounded-xl p-2">
              <p className="text-xs text-yellow-300 font-medium">
                🎁 Each box contains 500-1000 STON randomly
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// TON memo validation function
const validateTonMemo = (memo) => {
  if (!memo || memo.trim() === '') {
    return { valid: false, error: 'Memo is required for TON wallet connection' }; // Memo is mandatory
  }
  
  const trimmedMemo = memo.trim();
  
  // TON memo should be alphanumeric and can contain some special characters
  // Length should be reasonable (typically 1-120 characters)
  if (trimmedMemo.length < 1) {
    return { valid: false, error: 'Memo cannot be empty' };
  }
  
  if (trimmedMemo.length > 120) {
    return { valid: false, error: 'Memo must be 120 characters or less' };
  }
  
  // Allow alphanumeric, spaces, and common punctuation
  const validMemoRegex = /^[a-zA-Z0-9\s\-_.,!@#$%^&*()+=[\]{}|;:'"<>?/\\~`]+$/;
  if (!validMemoRegex.test(trimmedMemo)) {
    return { valid: false, error: 'Memo contains invalid characters' };
  }
  
  return { valid: true, error: null };
};

// Separate components for better organization (keeping existing ones)
const WalletDialog = ({ isOpen, onClose, onConnect }) => {
  const [walletInput, setWalletInput] = useState("");
  const [memoInput, setMemoInput] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [memoError, setMemoError] = useState("");

  const handleMemoChange = (e) => {
    const memo = e.target.value;
    setMemoInput(memo);
    
    const validation = validateTonMemo(memo);
    setMemoError(validation.valid ? "" : validation.error);
  };

  const handleConnect = async () => {
    // Validate memo before connecting
    const memoValidation = validateTonMemo(memoInput);
    if (!memoValidation.valid) {
      setMemoError(memoValidation.error);
      return;
    }

    setIsConnecting(true);
    try {
      await onConnect(walletInput, memoInput.trim() || null);
      setWalletInput("");
      setMemoInput("");
      setMemoError("");
    } finally {
      setIsConnecting(false);
    }
  };

  if (!isOpen) return null;

  const isValidWallet = walletInput.length === 48 && (walletInput.startsWith("EQ") || walletInput.startsWith("UQ"));
  const isValidMemo = memoInput.trim() !== '' && !memoError;
  const canConnect = isValidWallet && isValidMemo && !isConnecting;

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
          aria-label="Close dialog"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold mb-2">Connect TON Wallet</h2>
          <p className="text-sm text-gray-400">
            Connect your TON wallet for secure withdrawals
          </p>
        </div>

        {/* Warning Section */}
        <div className="bg-red-900/20 border border-red-600/30 rounded-xl p-4 mb-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-500 mb-1">Critical - Read Carefully</h3>
              <p className="text-xs text-red-200">
                Both wallet address AND memo are REQUIRED. Double-check both fields carefully. Incorrect information WILL result in lost funds and failed transactions.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Wallet Address Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              TON Wallet Address *
            </label>
            <Input
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              placeholder="EQ... or UQ..."
              className="h-12 text-white placeholder:text-gray-500 bg-gray-800/50 border border-gray-600/50 rounded-xl focus:border-blue-500 transition-colors"
              aria-label="TON wallet address"
            />
            {walletInput && !isValidWallet && (
              <p className="text-red-400 text-xs mt-1">
                TON address must be 48 characters starting with EQ or UQ
              </p>
            )}
          </div>

          {/* Memo Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Memo (Required) *
            </label>
            <Input
              value={memoInput}
              onChange={handleMemoChange}
              placeholder="Enter your wallet memo (required)"
              className="h-12 text-white placeholder:text-gray-500 bg-gray-800/50 border border-gray-600/50 rounded-xl focus:border-blue-500 transition-colors"
              aria-label="TON memo"
              required
            />
            {memoError && (
              <p className="text-red-400 text-xs mt-1">{memoError}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              Memo is required for all TON wallet transactions
            </p>
          </div>
        </div>

        <Button
          className="w-full h-12 mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleConnect}
          disabled={!canConnect}
        >
          {isConnecting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <LinkIcon className="w-5 h-5 mr-2" /> Connect Wallet
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
};

const WithdrawDialog = ({ isOpen, onClose, user, onWithdraw, stonToTon, adminConfig }) => {
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [verifying, setVerifying] = useState(false);
  const navigate = useNavigate();

  const handleMaxClick = () => {
    setWithdrawAmount(user.balance?.toString() || "0");
  };

  const handleWithdraw = async () => {
    setVerifying(true);
    try {
      await onWithdraw(withdrawAmount);
      setWithdrawAmount("");
    } finally {
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  const amount = parseFloat(withdrawAmount) || 0;
  const minWithdrawal = adminConfig?.minWithdrawalAmount || 100;
  const isValidAmount = amount >= minWithdrawal && amount <= (user.balance || 0);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-600/50 text-white w-full max-w-sm p-4 rounded-2xl shadow-2xl relative max-h-[80vh] overflow-y-auto"
      >
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold mb-4 text-center">
          Withdraw STON
        </h2>

        <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-500/50 rounded-xl p-2 mb-4">
          <p className="text-yellow-300 text-xs text-center">
            ⚠️ All withdrawals require manual verification by admin before
            processing.
          </p>
        </div>

        {user.wallet ? (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-1 font-medium">
                Withdrawal Address:
              </p>
              <div className="bg-gray-800/50 border border-gray-600/50 p-2 rounded-xl">
                <p className="text-xs font-mono text-white break-all">
                  {user.wallet}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-1 font-medium">
                Amount to Withdraw:
              </p>
              <div className="relative">
                <Input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter STON amount"
                  className="h-10 text-white placeholder:text-gray-400 bg-gray-800/50 border border-gray-600/50 rounded-xl pr-20 focus:border-blue-500"
                  aria-label="Withdrawal amount"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute right-2 top-2 h-8 px-3 text-xs bg-blue-600/20 border-blue-500/50 text-blue-400 hover:bg-blue-600/30"
                  onClick={handleMaxClick}
                >
                  Max
                </Button>
              </div>
            </div>

            <div className="mb-4">
              <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-500/50 rounded-xl p-2">
                <p className="text-sm text-gray-300 text-center">
                  Available Balance
                </p>
                <p className="text-lg font-bold text-white text-center">
                  {user.balance?.toLocaleString() || "0"} STON
                </p>
              </div>
            </div>

            <div className="mb-4">
              <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/50 rounded-xl p-2">
                <p className="text-blue-300 text-sm mb-1 text-center font-medium">
                  Auto Conversion:
                </p>
                <p className="text-white font-bold text-lg text-center">
                  {withdrawAmount || "0"} STON ={" "}
                  {stonToTon(withdrawAmount)} TON
                </p>
                <p className="text-xs text-gray-400 mt-1 text-center">
                  Rate: 10,000,000 STON = 1 TON
                </p>
                <p className="text-xs text-yellow-400 mt-1 text-center">
                  Minimum: 10,000,000 STON (1 TON)
                </p>
              </div>
            </div>

            <Button
              className="w-full h-10 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleWithdraw}
              disabled={verifying || !isValidAmount}
            >
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                "Request Withdrawal"
              )}
            </Button>
          </>
        ) : (
          <div className="text-center py-8">
            <Wallet className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-red-500 mb-4">
              Please set your wallet address first via the wallet
              connection feature.
            </p>
            <Button
              variant="outline"
              className="w-full h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl"
              onClick={() => {
                onClose();
                navigate("/profile?action=connect-wallet");
              }}
            >
              <Wallet className="mr-2 h-5 w-5" />
              Connect Wallet
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const ProfileSection = ({ user, refreshUserData }) => {
  const [showWalletDialog, setShowWalletDialog] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [copying, setCopying] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMysteryBoxModal, setShowMysteryBoxModal] = useState(false);
  const [adminConfig, setAdminConfig] = useState(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const adminUsername = adminConfig?.adminTgUsername || import.meta.env.VITE_ADMIN_TG_USERNAME || 'ExecutorHere';
  const isBanned = user.isBanned;

  // Load admin config on mount
  React.useEffect(() => {
    const loadAdminConfig = async () => {
      try {
        const config = await getAdminConfig();
        setAdminConfig(config);
      } catch (error) {
        console.error('Error loading admin config:', error);
      }
    };
    
    loadAdminConfig();
  }, []);

  // Memoized calculations
  const tasksDone = useMemo(() => {
    return user.tasks ? Object.values(user.tasks).filter(Boolean).length : 0;
  }, [user.tasks]);

  const displayName = useMemo(() => {
    return user.firstName
      ? `${user.firstName} ${user.lastName || ""}`.trim()
      : user.username || `User ${user.id}`;
  }, [user.firstName, user.lastName, user.username, user.id]);

  const fallbackAvatar = useMemo(() => {
    return displayName.substring(0, 2).toUpperCase();
  }, [displayName]);

  const userLevel = useMemo(() => {
    const balance = user.balance || 0;
    // Use admin config for level thresholds if available, otherwise use defaults
    const level5Threshold = adminConfig?.level5Threshold || 100000000;
    const level4Threshold = adminConfig?.level4Threshold || 50000000;
    const level3Threshold = adminConfig?.level3Threshold || 20000000;
    const level2Threshold = adminConfig?.level2Threshold || 5000000;
    
    if (balance >= level5Threshold) return { 
      level: 5, 
      title: "Legendary Miner", 
      icon: Gem, 
      color: "from-yellow-400 to-orange-500",
      nextLevel: null,
      progressPercent: 100
    };
    if (balance >= level4Threshold) return { 
      level: 4, 
      title: "Master Miner", 
      icon: Award, 
      color: "from-purple-400 to-pink-500",
      nextLevel: level5Threshold,
      progressPercent: ((balance - level4Threshold) / (level5Threshold - level4Threshold)) * 100
    };
    if (balance >= level3Threshold) return { 
      level: 3, 
      title: "Expert Miner", 
      icon: Shield, 
      color: "from-blue-400 to-cyan-500",
      nextLevel: level4Threshold,
      progressPercent: ((balance - level3Threshold) / (level4Threshold - level3Threshold)) * 100
    };
    if (balance >= level2Threshold) return { 
      level: 2, 
      title: "Advanced Miner", 
      icon: Target, 
      color: "from-green-400 to-emerald-500",
      nextLevel: level3Threshold,
      progressPercent: ((balance - level2Threshold) / (level3Threshold - level2Threshold)) * 100
    };
    return { 
      level: 1, 
      title: "Novice Miner", 
      icon: Activity, 
      color: "from-gray-400 to-gray-600",
      nextLevel: level2Threshold,
      progressPercent: (balance / level2Threshold) * 100
    };
  }, [user.balance, adminConfig]);

  // Achievement system
  const achievements = useMemo(() => {
    const tasks = user.tasks || {};
    const tasksDone = Object.values(tasks).filter(task => task?.completed).length;
    const referrals = user.referrals?.length || 0;
    const balance = user.balance || 0;
    
    const earnedAchievements = [];
    
    // Task achievements
    if (tasksDone >= 50) earnedAchievements.push({ id: 'tasks_50', icon: '🏆', title: '50 Tasks Master' });
    else if (tasksDone >= 25) earnedAchievements.push({ id: 'tasks_25', icon: '🥇', title: '25 Tasks Champion' });
    else if (tasksDone >= 10) earnedAchievements.push({ id: 'tasks_10', icon: '⭐', title: '10 Tasks Completed' });
    
    // Referral achievements
    if (referrals >= 100) earnedAchievements.push({ id: 'ref_100', icon: '👑', title: 'Network King' });
    else if (referrals >= 50) earnedAchievements.push({ id: 'ref_50', icon: '🌟', title: 'Super Recruiter' });
    else if (referrals >= 10) earnedAchievements.push({ id: 'ref_10', icon: '🤝', title: 'Team Builder' });
    
    // Balance achievements
    if (balance >= 1000000) earnedAchievements.push({ id: 'balance_1m', icon: '💎', title: 'Millionaire' });
    else if (balance >= 100000) earnedAchievements.push({ id: 'balance_100k', icon: '💰', title: 'Rich Miner' });
    
    return earnedAchievements;
  }, [user.tasks, user.referrals, user.balance]);

  // Energy bar color calculation
  const getEnergyBarColor = useCallback((energy, maxEnergy = 500) => {
    const percentage = (energy / maxEnergy) * 100;
    if (percentage >= 70) return { from: 'from-green-400', to: 'to-emerald-500', glow: 'shadow-green-400/50' };
    if (percentage >= 40) return { from: 'from-yellow-400', to: 'to-orange-500', glow: 'shadow-yellow-400/50' };
    return { from: 'from-red-400', to: 'to-red-600', glow: 'shadow-red-400/50' };
  }, []);

  const totalEarnings = useMemo(() => {
    return getWithdrawableBalance(user) + (user.totalWithdrawn || 0);
  }, [user]);

  const purchasableBalance = useMemo(() => {
    return getPurchasableBalance(user);
  }, [user]);

  const balanceBreakdown = useMemo(() => {
    if (user.balanceBreakdown) {
      return user.balanceBreakdown;
    }
    // For users without breakdown, assume all balance is from tasks
    return {
      task: user.balance || 0,
      box: 0,
      referral: 0,
      mining: 0
    };
  }, [user]);

  // Utility functions
  const stonToTon = useCallback((ston) => {
    const amount = parseFloat(ston) || 0;
    const rate = adminConfig?.stonToTonRate || 0.0000001;
    return (amount * rate).toFixed(6);
  }, [adminConfig]);

  const handleRefresh = useCallback(async () => {
    if (!user?.id || refreshing) return;
    
    setRefreshing(true);
    try {
      const updatedUser = await getCurrentUser(user.id);
      if (updatedUser) {
        refreshUserData(updatedUser);
        toast({
          title: "Profile Updated! ✨",
          description: "Your latest data has been loaded.",
          variant: "success",
          className: "bg-[#1a1a1a] text-white",
        });
      }
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Refresh Failed",
        description: "Could not update your profile data.",
        variant: "destructive",
        className: "bg-[#1a1a1a] text-white",
      });
    } finally {
      setRefreshing(false);
    }
  }, [user?.id, refreshUserData, refreshing, toast]);

  const formatDate = useCallback((timestamp) => {
    if (!timestamp) return "Unknown";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  }, []);

  const getStatusBadge = useCallback((status) => {
    const badges = {
      pending: (
        <Badge className="bg-yellow-600/20 text-yellow-300 border-yellow-600 hover:bg-yellow-600/30">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      ),
      approved: (
        <Badge className="bg-green-600/20 text-green-300 border-green-600 hover:bg-green-600/30">
          <CheckCircle className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      ),
      rejected: (
        <Badge className="bg-red-600/20 text-red-300 border-red-600 hover:bg-red-600/30">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      ),
    };
    return badges[status] || (
      <Badge className="bg-gray-600/20 text-gray-300 border-gray-600">
        Unknown
      </Badge>
    );
  }, []);

  // API call to backend for admin notification with enhanced system
  const sendAdminNotification = useCallback(async (type, data) => {
    try {
      const response = await fetch("/api/notifications?action=admin", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          api: import.meta.env.VITE_ADMIN_API_KEY,
          type: type,
          data: data
        })
      });

      if (!response.ok) {
        throw new Error("Failed to send notification");
      }
      
      const result = await response.json();
      return result.success;
    } catch (err) {
      console.error("Failed to send admin notification:", err);
      toast({
        title: "Warning",
        description: "Admin notification failed, but your request was submitted.",
        variant: "warning",
        className: "bg-[#1a1a1a] text-white",
      });
      return false;
    }
  }, [toast]);

  const handleConnectWallet = useCallback(async (walletInput, memoInput) => {
    if (!user?.id) return;
    
    // Validate wallet address
    if (
      !walletInput ||
      walletInput.length !== 48 ||
      (!walletInput.startsWith("EQ") && !walletInput.startsWith("UQ"))
    ) {
      toast({
        title: "Invalid Wallet Address",
        description: "TON address must be 48 characters starting with EQ or UQ.",
        variant: "destructive",
        className: "bg-[#1a1a1a] text-white",
      });
      return;
    }

    // Validate memo (required)
    if (!memoInput || memoInput.trim() === '') {
      toast({
        title: "Memo Required",
        description: "Memo is required for TON wallet connection.",
        variant: "destructive",
        className: "bg-[#1a1a1a] text-white",
      });
      return;
    }

    try {
      const success = await connectWallet(user.id, walletInput, memoInput);
      if (success) {
        const updatedUser = await getCurrentUser(user.id);
        if (updatedUser) refreshUserData(updatedUser);
        setShowWalletDialog(false);
        toast({
          title: "Wallet Connected ✅",
          description: `Wallet ${walletInput.substring(
            0,
            6
          )}...${walletInput.substring(walletInput.length - 4)} with memo connected successfully.`,
          variant: "success",
          className: "bg-[#1a1a1a] text-white",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: "Failed to connect wallet. Please try again.",
          variant: "destructive",
          className: "bg-[#1a1a1a] text-white",
        });
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect wallet. Please try again.",
        variant: "destructive",
        className: "bg-[#1a1a1a] text-white",
      });
    }
  }, [user?.id, refreshUserData, toast]);

  const handleDisconnectWallet = useCallback(async () => {
    if (!user?.id) return;
    
    if (!confirm("Are you sure you want to disconnect your wallet?")) return;
    
    setIsDisconnecting(true);
    try {
      const success = await disconnectWallet(user.id);
      if (success) {
        const updatedUser = await getCurrentUser(user.id);
        if (updatedUser) refreshUserData(updatedUser);
        toast({
          title: "Wallet Disconnected",
          description: "Your wallet has been successfully disconnected.",
          variant: "default",
          className: "bg-[#1a1a1a] text-white",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to disconnect wallet. Please try again.",
          variant: "destructive",
          className: "bg-[#1a1a1a] text-white",
        });
      }
    } finally {
      setIsDisconnecting(false);
    }
  }, [user?.id, refreshUserData, toast]);

  const handleCopyWallet = useCallback(async () => {
    if (!user.wallet) return;
    try {
      await navigator.clipboard.writeText(user.wallet);
      setCopying(true);
      toast({
        title: "Wallet copied!",
        description: user.wallet,
        className: "bg-[#1a1a1a] text-white break-all whitespace-pre-line",
      });
      setTimeout(() => setCopying(false), 1200);
    } catch {
      toast({
        title: "Copy failed!",
        description: "Unable to copy wallet address to clipboard.",
        variant: "destructive",
        className: "bg-[#1a1a1a] text-white",
      });
    }
  }, [user.wallet, toast]);

  const handleWithdraw = useCallback(async (withdrawAmount) => {
    if (!user?.id || !withdrawAmount) return;

    const amount = parseFloat(withdrawAmount);
    const minWithdrawal = adminConfig?.minWithdrawalAmount || 100;

    if (amount < minWithdrawal || amount > (user.balance || 0)) {
      toast({
        title: "Invalid Amount",
        description: `Minimum withdrawal is ${minWithdrawal.toLocaleString()} STON (1 TON) and must be within your balance.`,
        variant: "destructive",
        className: "bg-[#1a1a1a] text-white",
      });
      return;
    }

    const result = await createWithdrawalRequest(
      user.id,
      amount,
      user.wallet,
      user.balance,
      user.username
    );

    if (result.success) {
      // Calculate user statistics for enhanced notification
      const totalReferrals = user.referrals || 0;
      const totalBoxesOpened = user.totalBoxesOpened || 0;
      const miningCards = user.cards || 0;
      
      // Calculate total ads watched from ad history
      const calculateTotalAds = (adHistory) => {
        if (!adHistory) return 0;
        let total = 0;
        Object.values(adHistory).forEach(dayData => {
          Object.values(dayData).forEach(hourCount => {
            total += hourCount;
          });
        });
        return total;
      };
      
      const totalEnergyAds = calculateTotalAds(user.energyAdHistory);
      const totalBoxAds = calculateTotalAds(user.boxAdHistory);
      const totalAdsWatched = totalEnergyAds + totalBoxAds;
      
      // Balance breakdown details
      const balanceBreakdown = user.balanceBreakdown || {};
      const taskBalance = balanceBreakdown.task || 0;
      const boxBalance = balanceBreakdown.box || 0;
      const referralBalance = balanceBreakdown.referral || 0;
      const miningBalance = balanceBreakdown.mining || 0;
      
      // Send notification with enhanced details
      await sendAdminNotification('withdrawal_request', {
        userId: user.id,
        userName: user.username || user.first_name || user.last_name || 'Unknown',
        username: user.username || 'None',
        amount: amount,
        method: 'TON Wallet',
        address: user.wallet,
        currentBalance: user.totalBalance || 0,
        withdrawalId: result.withdrawalId, // Use the real document ID
        // Enhanced user statistics
        userStats: {
          totalReferrals: totalReferrals,
          totalBoxesOpened: totalBoxesOpened,
          totalAdsWatched: totalAdsWatched,
          miningCards: miningCards,
          balanceBreakdown: {
            task: taskBalance,
            box: boxBalance, 
            referral: referralBalance,
            mining: miningBalance
          },
          joinedAt: user.joinedAt ? new Date(user.joinedAt.seconds * 1000).toLocaleDateString() : 'Unknown'
        }
      });

      toast({
        title: "Withdrawal Requested",
        description: `You have requested to withdraw ${amount.toLocaleString()} STON. Admin will review your request.`,
        variant: "success",
        className: "bg-[#1a1a1a] text-white",
      });
      setShowWithdrawDialog(false);
    } else {
      toast({
        title: "Withdrawal Failed",
        description: result.error || "Could not process your withdrawal request. Please try again later.",
        variant: "destructive",
        className: "bg-[#1a1a1a] text-white",
      });
    }
  }, [user, stonToTon, sendAdminNotification, toast]);

  const handleShowHistory = useCallback(async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User ID not found",
        variant: "destructive",
        className: "bg-[#1a1a1a] text-white",
      });
      return;
    }

    setLoadingHistory(true);
    setShowHistoryDialog(true);

    try {
      const history = await getUserWithdrawalHistory(user.id);
      setWithdrawalHistory(history || []);
    } catch (error) {
      console.error("Error fetching withdrawal history:", error);
      toast({
        title: "Error",
        description: "Failed to load withdrawal history",
        variant: "destructive",
        className: "bg-[#1a1a1a] text-white",
      });
      setWithdrawalHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [user?.id, toast]);

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
      {/* Fixed warning at the top */}
      {isBanned && (
        <div className="fixed top-0 left-0 w-full z-50 flex justify-center p-2">
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-start gap-2 bg-gradient-to-r from-red-700 via-red-600 to-red-500 border-2 border-red-400 rounded-xl p-2 shadow-2xl w-full max-w-md mx-auto"
          >
            <div className="flex-shrink-0 mt-1">
              <AlertTriangle className="text-yellow-300 bg-red-900 rounded-full p-1 w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm text-white mb-1">
                Account Banned
              </div>
              <div className="text-white/90 text-xs mb-2">
                Your account has been{" "}
                <span className="font-semibold text-yellow-200">banned</span>.
                If you believe this is a mistake, please contact the admin for
                assistance.
              </div>
              <a
                href={`https://t.me/${adminUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-sky-200 font-semibold transition-all duration-200"
              >
                <Send className="w-4 h-4" />
                Contact Admin
              </a>
            </div>
          </motion.div>
        </div>
      )}

      {/* Main scrollable content */}
      <div
        className="flex flex-col items-center px-4 py-4 pb-24"
        style={{ paddingTop: isBanned ? "140px" : "32px" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md flex flex-col items-center gap-4"
        >


          {/* Enhanced User Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm border border-gray-600/30 rounded-2xl p-6 relative overflow-hidden"
          >
            {/* Help Button - Top Right Corner */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              whileHover={{ 
                scale: 1.1,
                backgroundColor: "rgba(255, 255, 255, 0.1)"
              }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                window.open(`https://t.me/${adminUsername}`, "_blank");
              }}
              className="absolute top-4 right-4 p-2 rounded-full bg-transparent hover:bg-white/10 transition-all duration-300 z-30 border border-white/10 hover:border-white/20"
              aria-label="Contact Admin"
            >
              <HelpCircle className="h-4 w-4 text-gray-400 hover:text-white transition-colors" />
            </motion.button>

            {/* Background animation */}
            <motion.div
              animate={{
                x: [-50, 50],
                opacity: [0, 0.1, 0]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10"
            />
            
            <div className="relative z-10">
              {/* Profile Picture Section */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
                className="flex justify-center mb-4"
              >
                <div className="relative">
                  {/* Profile Glow Effect */}
                  <motion.div
                    variants={glowVariants}
                    initial="initial"
                    animate="animate"
                    className={`absolute inset-0 rounded-full bg-gradient-to-r ${userLevel.color} blur-xl opacity-30`}
                  />
                  
                  {/* Floating Animation */}
                  <motion.div
                    variants={floatingVariants}
                    initial="initial"
                    animate="animate"
            className="relative"
          >
                    <Avatar className="h-24 w-24 border-4 border-white/20 shadow-2xl relative z-10 ring-2 ring-white/10">
              <AvatarImage
                src={
                  user.profilePicUrl ||
                  `https://avatar.vercel.sh/${user.username || user.id}.png`
                }
                alt={user.username || user.id}
                        className="object-cover"
              />
                      <AvatarFallback className={`bg-gradient-to-br ${userLevel.color} text-white text-xl font-bold`}>
                {fallbackAvatar}
              </AvatarFallback>
            </Avatar>
                    
                    {/* Crown Effect for High Levels - Worn by Profile */}
                    {userLevel.level >= 3 && (
                      <motion.div
                        variants={crownVariants}
                        initial="initial"
                        animate={["animate", "sway"]}
                        className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20"
                        style={{
                          transform: "translateX(-50%) translateY(-12px) rotate(15deg)",
                        }}
                      >
                        <motion.div className="relative">
                          {/* Main Crown with enhanced 3D effect */}
                          <motion.div
                            className="relative z-30"
                            style={{
                              filter: "drop-shadow(2px 4px 8px rgba(0, 0, 0, 0.5))",
                            }}
                          >
                            <Crown 
                              className={`h-12 w-12 ${
                                userLevel.level >= 5 ? 'text-yellow-400' : 
                                userLevel.level >= 4 ? 'text-amber-400' : 
                                'text-yellow-500'
                              }`}
                              style={{
                                filter: `drop-shadow(0 0 8px ${
                                  userLevel.level >= 5 ? '#fbbf24' : 
                                  userLevel.level >= 4 ? '#f59e0b' : 
                                  '#eab308'
                                })`
                              }}
                            />
                          </motion.div>
                          
                          {/* Enhanced Crown glow effect with 3D shadow */}
                          <motion.div
                            animate={{
                              opacity: [0.3, 0.8, 0.3],
                              scale: [1, 1.4, 1]
                            }}
                            transition={{
                              duration: 3,
                              repeat: Infinity,
                              ease: "easeInOut"
                            }}
                            className={`absolute inset-0 ${
                              userLevel.level >= 5 ? 'bg-yellow-400/50' : 
                              userLevel.level >= 4 ? 'bg-amber-400/50' : 
                              'bg-yellow-500/50'
                            } rounded-full blur-lg`}
                          />
                          
                          {/* Enhanced Sparkle effects for highest levels */}
                          {userLevel.level >= 5 && (
                            <>
                              <motion.div
                                animate={{
                                  rotate: [0, 360],
                                  opacity: [0.5, 1, 0.5],
                                  scale: [0.8, 1.2, 0.8]
                                }}
                                transition={{
                                  duration: 6,
                                  repeat: Infinity,
                                  ease: "linear"
                                }}
                                className="absolute -top-2 -left-2 w-3 h-3 bg-yellow-300 rounded-full blur-sm"
                              />
                              <motion.div
                                animate={{
                                  rotate: [360, 0],
                                  opacity: [0.3, 1, 0.3],
                                  scale: [0.6, 1, 0.6]
                                }}
                                transition={{
                                  duration: 4,
                                  repeat: Infinity,
                                  ease: "linear"
                                }}
                                className="absolute -top-2 -right-2 w-2 h-2 bg-orange-300 rounded-full blur-sm"
                              />
                            </>
                          )}
                        </motion.div>
                      </motion.div>
                    )}

                    {/* Level Badge - Positioned to avoid crown conflict */}
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
                      className={`absolute ${userLevel.level >= 3 ? 'bottom-0 -right-1' : '-top-1 -right-1'} bg-gradient-to-r ${userLevel.color} rounded-full p-2 border-3 border-white shadow-lg z-20`}
                    >
                      <userLevel.icon className="h-3 w-3 text-white" />
                    </motion.div>
                  </motion.div>
            </div>
          </motion.div>

              {/* User Name and Info Section */}
              <div className="text-center mb-4">
          <motion.div
                  initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="mb-3"
                >
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <motion.h1 
                      className={`text-2xl font-bold bg-gradient-to-r ${userLevel.color} bg-clip-text text-transparent relative`}
                      style={{
                        textShadow: `0 0 20px rgba(255, 255, 255, 0.${Math.min(userLevel.level * 2, 8)}), 
                                     0 0 40px rgba(${userLevel.level >= 3 ? '168, 85, 247' : userLevel.level >= 2 ? '34, 197, 94' : '156, 163, 175'}, 0.${Math.min(userLevel.level * 3, 9)})`,
                        filter: `drop-shadow(0 0 ${userLevel.level * 8}px rgba(255, 255, 255, 0.${Math.min(userLevel.level * 2, 6)}))`
                      }}
                      whileHover={{ scale: 1.05 }}
                    >
                      <span className="relative z-10 mix-blend-normal text-white">{displayName}</span>
                      <motion.div
                        className={`absolute inset-0 bg-gradient-to-r ${userLevel.color} bg-clip-text text-transparent opacity-80`}
                        animate={{
                          opacity: [0.6, 1, 0.6],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        {displayName}
                      </motion.div>
                    </motion.h1>
                    <motion.button
                      whileHover={{ scale: 1.15, rotate: 180 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={handleRefresh}
                      disabled={refreshing}
                      className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 border border-white/20"
                      aria-label="Refresh Profile"
                    >
                      <RefreshCw className={`h-4 w-4 text-gray-300 ${refreshing ? 'animate-spin' : ''}`} />
                    </motion.button>
                  </div>
                  
                  {/* Username with enhanced styling */}
                  <motion.div
                    className="flex items-center justify-center gap-2 mb-3"
                    whileHover={{ scale: 1.02 }}
                  >
                    <span className="text-blue-400 font-semibold">@{user.username || "telegram_user"}</span>
                    <motion.div
                      animate={{ 
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ duration: 4, repeat: Infinity }}
                    >
                      <Gem className="h-4 w-4 text-blue-400" />
                    </motion.div>
                  </motion.div>
          </motion.div>

                {/* Level Badge with enhanced styling */}
          <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                  className="flex justify-center mb-3"
                >
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className={`bg-gradient-to-r ${userLevel.color} text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg border border-white/30 relative overflow-hidden`}
                  >
                    {/* Badge glow effect */}
                    <motion.div
                      animate={{
                        opacity: [0.3, 0.7, 0.3],
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className={`absolute inset-0 bg-gradient-to-r ${userLevel.color} blur-sm`}
                    />
                    <span className="flex items-center gap-2 relative z-10">
                      <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <userLevel.icon className="h-4 w-4" />
                      </motion.div>
                      Level {userLevel.level} • {userLevel.title}
                    </span>
                  </motion.div>
                </motion.div>
                
                {/* Level Progress Bar with enhanced styling */}
                {userLevel.nextLevel && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "100%", opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className="w-40 mx-auto bg-gray-700/60 rounded-full h-2 overflow-hidden mb-2 border border-gray-600/50"
                  >
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{ width: `${Math.min(userLevel.progressPercent, 100)}%` }}
                      transition={{ delay: 0.8, duration: 1.5, ease: "easeOut" }}
                      className={`h-full bg-gradient-to-r ${userLevel.color} rounded-full relative`}
                    >
                      {/* Enhanced progress glow */}
                      <motion.div
                        animate={{
                          opacity: [0.6, 1, 0.6],
                          boxShadow: [
                            "0 0 5px rgba(59, 130, 246, 0.5)",
                            "0 0 15px rgba(59, 130, 246, 0.8)",
                            "0 0 5px rgba(59, 130, 246, 0.5)"
                          ]
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className={`absolute inset-0 bg-gradient-to-r ${userLevel.color} rounded-full`}
                      />
                    </motion.div>
                  </motion.div>
                )}
                
                {/* Progress percentage with animation */}
                {userLevel.nextLevel && (
                  <motion.p
                    initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="text-sm text-gray-300 mb-4 font-medium"
                  >
                    <motion.span
                      key={Math.round(userLevel.progressPercent)}
                      initial={{ scale: 1.2, color: "#60a5fa" }}
                      animate={{ scale: 1, color: "#d1d5db" }}
                      transition={{ duration: 0.5 }}
                    >
                      {Math.round(userLevel.progressPercent)}%
                    </motion.span>
                    {" "}to Level {userLevel.level + 1}
                  </motion.p>
                )}
              </div>

              {/* Status and Additional Info Grid */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="grid grid-cols-2 gap-3 mb-4"
              >
                {/* Active Status */}
                <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.7, 1, 0.7]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    </motion.div>
                    <span className="text-xs text-gray-300 font-medium">Status</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <motion.div
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.7, 1, 0.7]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-2 h-2 bg-green-400 rounded-full"
                    />
                    <span className="text-sm font-bold text-green-400">
                      {isBanned ? 'Banned' : 'Active'}
                </span>
              </div>
                </div>
                
                {/* User ID */}
                <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="h-4 w-4 text-blue-300" />
                    <span className="text-xs text-gray-300 font-medium">User ID</span>
                  </div>
                  <p className="text-sm font-bold text-white truncate">#{user.id}</p>
                </div>
              </motion.div>
              
              {/* Join Date with enhanced styling */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs text-gray-300 font-medium">Joined</span>
                  </div>
                  <p className="text-sm font-bold text-white">
                    {user.createdAt ? new Date(user.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'Unknown'}
                  </p>
            </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Enhanced Stats Grid */}
          <motion.div
            variants={profileCardVariants}
            initial="initial"
            animate="animate"
            className="grid grid-cols-2 gap-3 w-full"
          >
            {/* Enhanced Balance Card with Breakdown */}
            <motion.div
              variants={statCardVariants}
              whileHover="hover"
              whileTap="tap"
              className="col-span-2 bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm p-4 rounded-2xl border border-blue-500/30 hover:border-blue-400/50 transition-all duration-300 relative overflow-hidden group"
            >
              {/* Card Glow Effect */}
              <motion.div
                variants={cardGlowVariants}
                initial="initial"
                animate="animate"
                className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-2xl"
              />
              
              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-blue-400" />
                    <span className="text-white font-semibold">Balance Breakdown</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setBalanceVisible(!balanceVisible)}
                    className="p-1 rounded hover:bg-white/10 transition-colors"
                  >
                    {balanceVisible ? 
                      <Eye className="h-4 w-4 text-gray-400" /> : 
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    }
                  </motion.button>
                </div>

                {/* Total Balance */}
                <div className="text-center mb-4">
                  <motion.p
                    variants={balanceCounterVariants}
                    key={getWithdrawableBalance(user)}
                    initial="initial"
                    animate="animate"
                    className="text-2xl font-bold text-white mb-1"
                  >
                    {balanceVisible 
                      ? getWithdrawableBalance(user).toLocaleString()
                      : "•••••••"
                    }
                  </motion.p>
                  <p className="text-sm text-blue-300 flex items-center justify-center gap-1">
                    <Coins className="h-4 w-4" />
                    Total STON
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    ≈ {stonToTon(getWithdrawableBalance(user))} TON
                  </p>
                </div>

                {/* Balance Types Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {/* Task Balance */}
                  <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                    <div className="flex items-center gap-1 mb-1">
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                      <span className="text-xs text-gray-300">Tasks</span>
                      <span className="text-xs text-green-400">✓</span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {balanceVisible ? balanceBreakdown.task?.toLocaleString() || "0" : "•••"}
                    </p>
                  </div>

                  {/* Mining Balance */}
                  <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                    <div className="flex items-center gap-1 mb-1">
                      <Gem className="h-3 w-3 text-purple-400" />
                      <span className="text-xs text-gray-300">Mining</span>
                      <span className="text-xs text-green-400">✓</span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {balanceVisible ? balanceBreakdown.mining?.toLocaleString() || "0" : "•••"}
                    </p>
                  </div>

                  {/* Box Balance */}
                  <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                    <div className="flex items-center gap-1 mb-1">
                      <Gift className="h-3 w-3 text-purple-400" />
                      <span className="text-xs text-gray-300">Boxes</span>
                      <span className="text-xs text-orange-400">⚠</span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {balanceVisible ? balanceBreakdown.box?.toLocaleString() || "0" : "•••"}
                    </p>
                  </div>

                  {/* Referral Balance */}
                  <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                    <div className="flex items-center gap-1 mb-1">
                      <Users className="h-3 w-3 text-blue-400" />
                      <span className="text-xs text-gray-300">Referrals</span>
                      <span className="text-xs text-orange-400">⚠</span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {balanceVisible ? balanceBreakdown.referral?.toLocaleString() || "0" : "•••"}
                    </p>
                  </div>
                </div>

                {/* Usage Information */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-green-400">✓ Purchasable:</span>
                    <span className="text-white font-medium">
                      {balanceVisible ? purchasableBalance.toLocaleString() : "•••"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-cyan-400">💳 Withdrawable:</span>
                    <span className="text-white font-medium">
                      {balanceVisible ? getWithdrawableBalance(user).toLocaleString() : "•••"}
                    </span>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-2 pt-2 border-t border-white/10 text-xs text-gray-400">
                  <span className="text-green-400">✓</span> = Can purchase mining plans • 
                  <span className="text-orange-400">⚠</span> = Withdrawal only
                </div>
              </div>
            </motion.div>

            {/* Energy Card */}
            <motion.div
              variants={statCardVariants}
              whileHover="hover"
              whileTap="tap"
              className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 backdrop-blur-sm p-3 rounded-2xl text-center border border-yellow-500/30 hover:border-yellow-400/50 transition-all duration-300 relative overflow-hidden"
            >
              {/* Card Glow Effect */}
              <motion.div
                variants={cardGlowVariants}
                initial="initial"
                animate="animate"
                className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 rounded-2xl"
              />
              
              <div className="relative z-10">
              <div className="flex items-center justify-center mb-1">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                <Zap className="h-5 w-5 text-yellow-400 mr-1" />
                  </motion.div>
                  <span className="text-gray-300 font-medium text-xs">Energy</span>
              </div>
                <p className="text-lg font-bold text-white">{user.energy || 0}/500</p>
                
                {/* Enhanced Energy Progress Bar */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="w-full bg-gray-700/50 rounded-full h-2 my-2 overflow-hidden relative"
                >
                  {(() => {
                    const energyColors = getEnergyBarColor(user.energy || 0, 500);
                    return (
                      <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: `${Math.min(((user.energy || 0) / 500) * 100, 100)}%` }}
                        transition={{ delay: 0.7, duration: 1, ease: "easeOut" }}
                        className={`h-full bg-gradient-to-r ${energyColors.from} ${energyColors.to} rounded-full relative`}
                      >
                        {/* Energy bar glow effect */}
                        <motion.div
                          animate={{
                            opacity: [0.6, 1, 0.6],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                          className={`absolute inset-0 rounded-full ${energyColors.glow} blur-sm`}
                        />
                      </motion.div>
                    );
                  })()}
                </motion.div>
                
              <Button
                size="sm"
                  className="mt-1 w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-xl text-xs py-1 h-6"
                onClick={() => navigate("/tasks?highlight=energy-ad")}
              >
                ⚡ Earn Energy
              </Button>
            </div>
            </motion.div>

            {/* Tasks Card */}
            <motion.div
              variants={statCardVariants}
              whileHover="hover"
              whileTap="tap"
              className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm p-3 rounded-2xl text-center border border-green-500/30 hover:border-green-400/50 transition-all duration-300 cursor-pointer relative overflow-hidden"
              onClick={() => navigate("/tasks")}
            >
              {/* Card Glow Effect */}
              <motion.div
                variants={cardGlowVariants}
                initial="initial"
                animate="animate"
                className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20 rounded-2xl"
              />
              
              <div className="relative z-10">
              <div className="flex items-center justify-center mb-1">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                <CheckCircle2 className="h-5 w-5 text-green-400 mr-1" />
                  </motion.div>
                <span className="text-gray-300 font-medium text-xs">Tasks</span>
                  <ChevronRight className="h-3 w-3 text-green-300 ml-1" />
              </div>
                <div className="flex items-center justify-center gap-2">
              <p className="text-lg font-bold text-white">{tasksDone}</p>
                  {/* Task Achievement Badge */}
                  {achievements.find(a => a.id.startsWith('tasks_')) && (
                    <motion.div
                      variants={achievementBadgeVariants}
                      initial="initial"
                      animate={["animate", "pulse"]}
                      className="text-xs bg-gradient-to-r from-green-400 to-emerald-500 text-white px-1.5 py-0.5 rounded-full font-bold shadow-lg"
                      title={achievements.find(a => a.id.startsWith('tasks_'))?.title}
                    >
                      {achievements.find(a => a.id.startsWith('tasks_'))?.icon}
                    </motion.div>
                  )}
                </div>
              <p className="text-xs text-green-300">Completed</p>
            </div>
            </motion.div>

            {/* Referrals Card */}
            <motion.div
              variants={statCardVariants}
              whileHover="hover"
              whileTap="tap"
              className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm p-3 rounded-2xl text-center border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 cursor-pointer relative overflow-hidden"
              onClick={() => navigate("/invite")}
            >
              {/* Card Glow Effect */}
              <motion.div
                variants={cardGlowVariants}
                initial="initial"
                animate="animate"
                className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-2xl"
              />
              
              <div className="relative z-10">
              <div className="flex items-center justify-center mb-1">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      x: [0, 1, -1, 0]
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                <Users className="h-5 w-5 text-purple-400 mr-1" />
                  </motion.div>
                  <span className="text-gray-300 font-medium text-xs">Referrals</span>
                  <ChevronRight className="h-3 w-3 text-purple-300 ml-1" />
              </div>
                <div className="flex items-center justify-center gap-2">
              <p className="text-lg font-bold text-white">
                    {user.referrals?.length || 0}
                  </p>
                  {/* Referral Achievement Badge */}
                  {achievements.find(a => a.id.startsWith('ref_')) && (
                    <motion.div
                      variants={achievementBadgeVariants}
                      initial="initial"
                      animate={["animate", "pulse"]}
                      className="text-xs bg-gradient-to-r from-purple-400 to-pink-500 text-white px-1.5 py-0.5 rounded-full font-bold shadow-lg"
                      title={achievements.find(a => a.id.startsWith('ref_'))?.title}
                    >
                      {achievements.find(a => a.id.startsWith('ref_'))?.icon}
                    </motion.div>
                  )}
                </div>
              <p className="text-xs text-purple-300">Friends</p>
            </div>
            </motion.div>

            {/* Mystery Box Card */}
            <motion.div
              variants={statCardVariants}
              whileHover="hover"
              whileTap="tap"
              className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm p-3 rounded-2xl text-center border border-purple-500/30 hover:border-purple-400/50 transition-all duration-300 cursor-pointer relative overflow-hidden"
              onClick={() => setShowMysteryBoxModal(true)}
            >
              {/* Card Glow Effect */}
              <motion.div
                variants={cardGlowVariants}
                initial="initial"
                animate="animate"
                className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-2xl"
              />
              
              <div className="relative z-10">
                <div className="flex items-center justify-center mb-1">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotateY: [0, 10, -10, 0]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Gift className="h-5 w-5 text-purple-400 mr-1" />
                  </motion.div>
                  <span className="text-gray-300 font-medium text-xs">Mystery</span>
                  <ChevronRight className="h-3 w-3 text-purple-300 ml-1" />
                </div>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-lg font-bold text-white">{user.mysteryBoxes || 0}</p>
                </div>
                <p className="text-xs text-purple-300">Boxes</p>
              </div>
            </motion.div>
          </motion.div>





          {/* Wallet Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full"
          >
            <h3 className="text-sm font-semibold text-center mb-2 text-gray-300">
              TON Wallet
            </h3>
            {user.wallet ? (
              <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-2">
                <div className="flex items-center justify-between gap-2">
                  <Wallet className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  <span
                    className="flex-1 font-mono text-white text-center px-1 select-text"
                    title={user.wallet}
                    style={{ userSelect: "text" }}
                  >
                    {user.wallet.substring(0, 12)}...
                    {user.wallet.substring(user.wallet.length - 6)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="flex items-center justify-center p-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 transition-all duration-200 active:scale-95"
                      aria-label="Copy Wallet Address"
                      title={copying ? "Copied!" : "Copy Wallet Address"}
                      onClick={handleCopyWallet}
                    >
                      <Copy
                        className={`h-4 w-4 ${
                          copying ? "text-green-400" : "text-blue-400"
                        } transition-colors`}
                      />
                    </button>
                    <button
                      type="button"
                      className="flex items-center justify-center p-1 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 transition-all duration-200 active:scale-95 disabled:opacity-50"
                      aria-label="Disconnect Wallet"
                      title="Disconnect Wallet"
                      onClick={handleDisconnectWallet}
                      disabled={isDisconnecting}
                    >
                      {isDisconnecting ? (
                        <Loader2 className="h-4 w-4 text-red-400 animate-spin" />
                      ) : (
                        <Unlink className="h-4 w-4 text-red-400" />
                      )}
                    </button>
                  </div>
                </div>
                {user.tonMemo && (
                  <div className="mt-2 px-3 py-2 bg-gray-700/30 rounded-xl border border-gray-600/30">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Memo:</span>
                      <span className="text-xs font-mono text-gray-300 flex-1 break-all">
                        {user.tonMemo}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Button
                className="w-full h-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                onClick={() => setShowWalletDialog(true)}
              >
                <Wallet className="mr-2 h-5 w-5" /> Connect Wallet
              </Button>
            )}
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="w-full space-y-2"
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
          >
            <Button
                className="w-full h-10 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
              onClick={() => setShowWithdrawDialog(true)}
            >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-green-400/20 to-emerald-400/20"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6 }}
                />
                <div className="relative z-10 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Gift className="mr-2 h-5 w-5" />
                  </motion.div>
                  Claim Rewards
                </div>
            </Button>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
            <Button
              variant="outline"
                className="w-full h-10 bg-transparent border-2 border-blue-500/50 text-blue-400 hover:bg-blue-600/20 hover:border-blue-400 font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden group"
              onClick={handleShowHistory}
            >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-400/10 to-purple-400/10"
                  initial={{ scale: 0 }}
                  whileHover={{ scale: 1 }}
                  transition={{ duration: 0.3 }}
                />
                <div className="relative z-10 flex items-center justify-center">
                  <History className="mr-2 h-5 w-5" />
                  Withdrawal History
                </div>
            </Button>
            </motion.div>
          </motion.div>
        </motion.div>



        {/* Wallet Input Dialog */}
        <WalletDialog
          isOpen={showWalletDialog}
          onClose={() => setShowWalletDialog(false)}
          onConnect={handleConnectWallet}
        />

        {/* Withdraw Dialog */}
        <WithdrawDialog
          isOpen={showWithdrawDialog}
          onClose={() => setShowWithdrawDialog(false)}
          user={user}
          onWithdraw={handleWithdraw}
          stonToTon={stonToTon}
          adminConfig={adminConfig}
        />

        {/* Withdrawal History Dialog */}
        {showHistoryDialog && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-600/50 text-white w-full max-w-lg p-4 rounded-2xl shadow-2xl relative max-h-[80vh] overflow-y-auto"
            >
              <button
                className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
                onClick={() => setShowHistoryDialog(false)}
                aria-label="Close dialog"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-lg font-bold mb-4 flex items-center">
                <History className="mr-2 h-6 w-6" />
                Withdrawal History
              </h2>

              <div className="overflow-y-auto max-h-[60vh] pr-2">
                {loadingHistory ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-gray-400">
                      Loading history...
                    </span>
                  </div>
                ) : withdrawalHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Wallet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400">No withdrawal history found</p>
                    <p className="text-gray-500 text-sm mt-2">
                      Your withdrawal requests will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {withdrawalHistory.map((withdrawal) => (
                      <Card
                        key={withdrawal.id}
                        className="bg-[#1c1c1c] border-gray-700"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Wallet className="h-4 w-4 text-sky-400" />
                              <span className="font-semibold text-white">
                                {withdrawal.amount?.toLocaleString()} STON
                              </span>
                            </div>
                            {getStatusBadge(withdrawal.status)}
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">TON Amount:</span>
                              <span className="text-blue-400 font-mono">
                                {stonToTon(withdrawal.amount)} TON
                              </span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-gray-400">Date:</span>
                              <span className="text-white flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(withdrawal.createdAt)}
                              </span>
                            </div>

                            {withdrawal.walletAddress && (
                              <div className="mt-2">
                                <span className="text-gray-400 text-xs">
                                  Wallet:
                                </span>
                                <p className="text-white font-mono text-xs break-all bg-white/5 p-2 rounded mt-1">
                                  {withdrawal.walletAddress}
                                </p>
                              </div>
                            )}

                            {withdrawal.status === "approved" &&
                              withdrawal.approvedAt && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-400">
                                    Approved:
                                  </span>
                                  <span className="text-green-400">
                                    {formatDate(withdrawal.approvedAt)}
                                  </span>
                                </div>
                              )}

                            {withdrawal.status === "rejected" &&
                              withdrawal.rejectedAt && (
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-400">
                                    Rejected:
                                  </span>
                                  <span className="text-red-400">
                                    {formatDate(withdrawal.rejectedAt)}
                                  </span>
                                </div>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Mystery Box Modal */}
        <MysteryBoxModal
          isOpen={showMysteryBoxModal}
          onClose={() => setShowMysteryBoxModal(false)}
          user={user}
          refreshUserData={refreshUserData}
          navigate={navigate}
        />
      </div>
    </div>
  );
};

// Mystery Box Modal Component with Card Design
const MysteryBoxModal = ({ isOpen, onClose, user, refreshUserData, navigate }) => {
  const [isOpening, setIsOpening] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const { toast } = useToast();

  const mysteryBoxCount = user?.mysteryBoxes || 0;

  const generateRandomReward = () => {
    return Math.floor(Math.random() * (1000 - 500 + 1)) + 500;
  };

  const handleOpenBox = useCallback(async () => {
    if (!user?.id || mysteryBoxCount <= 0 || isOpening) return;

    setIsOpening(true);

    try {
      // Open the box
      const result = await openMysteryBox(user.id, 1);
      
      if (result.success) {
        // Generate random reward
        const reward = generateRandomReward();
        setRewardAmount(reward);

        // Add reward to user balance (box type - withdrawal only)
        await updateUserBalanceByType(user.id, reward, 'box');

        // Show reward animation after box opening animation
        setTimeout(() => {
          setShowReward(true);
          setShowConfetti(true);
          
          // Hide reward and refresh data after showing
          setTimeout(() => {
            setShowReward(false);
            setShowConfetti(false);
            setIsOpening(false);
            
            // Refresh user data
            getCurrentUser(user.id).then(updatedUser => {
              if (updatedUser) refreshUserData(updatedUser);
            });
            
            toast({
              title: "🎉 Mystery Box Opened!",
              description: `You received ${reward} STON (Box balance - withdrawal only)!`,
              variant: "success",
              className: "bg-[#1a1a1a] text-white"
            });
          }, 3000);
        }, 1500);

      } else {
        setIsOpening(false);
        toast({
          title: "Failed to Open Box",
          description: result.error || "Please try again.",
          variant: "destructive",
          className: "bg-[#1a1a1a] text-white"
        });
      }
    } catch (error) {
      setIsOpening(false);
      console.error('Error opening mystery box:', error);
      toast({
        title: "Error",
        description: "Failed to open mystery box. Please try again.",
        variant: "destructive",
        className: "bg-[#1a1a1a] text-white"
      });
    }
  }, [user?.id, mysteryBoxCount, isOpening, refreshUserData, toast]);

  const handleEarnBoxes = useCallback(() => {
    onClose();
    navigate("/tasks?highlight=mystery-box-ad");
  }, [onClose, navigate]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Mystery Box Modal with Card Design */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-purple-500/30 text-white w-full max-w-sm p-6 rounded-2xl shadow-2xl relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background sparkles */}
        <div className="absolute inset-0 pointer-events-none">
          <motion.div
            variants={sparkleVariants}
            initial="initial"
            animate="animate"
            className="absolute top-2 right-2 w-2 h-2 bg-purple-400 rounded-full"
          />
          <motion.div
            variants={sparkleVariants}
            initial="initial"
            animate="animate"
            style={{ animationDelay: '0.5s' }}
            className="absolute bottom-3 left-3 w-1.5 h-1.5 bg-pink-400 rounded-full"
          />
          <motion.div
            variants={sparkleVariants}
            initial="initial"
            animate="animate"
            style={{ animationDelay: '1s' }}
            className="absolute top-1/2 left-1/4 w-1 h-1 bg-purple-300 rounded-full"
          />
        </div>

        {/* Close Button */}
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-20"
          onClick={onClose}
        >
          <X className="h-6 w-6" />
        </button>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center justify-center mb-3">
            <Gift className="h-6 w-6 text-purple-400 mr-2" />
            <h3 className="text-lg font-bold text-white">Mystery Boxes</h3>
            <Sparkles className="h-5 w-5 text-pink-400 ml-2" />
          </div>

          {/* Box Count */}
          <div className="text-center mb-4">
            <p className="text-3xl font-bold text-white mb-1">{mysteryBoxCount}</p>
            <p className="text-sm text-purple-300">
              {mysteryBoxCount === 1 ? 'Box Available' : 'Boxes Available'}
            </p>
          </div>

          {/* Mystery Box Visual */}
          <div className="flex justify-center mb-6 relative">
            <motion.div
              variants={boxVariants}
              initial="closed"
              whileHover={mysteryBoxCount > 0 && !isOpening ? "hover" : "closed"}
              animate={isOpening ? "opening" : "closed"}
              className="relative cursor-pointer"
              onClick={mysteryBoxCount > 0 ? handleOpenBox : handleEarnBoxes}
              style={{ perspective: "1000px" }}
            >
              <motion.div 
                className="w-24 h-24 rounded-3xl flex items-center justify-center relative overflow-hidden border-3 border-white/30 shadow-2xl"
                style={{
                  background: "transparent",
                  transformStyle: "preserve-3d"
                }}
              >
                {/* Animated background overlay */}
                <motion.div
                  className="absolute inset-0 opacity-30"
                  animate={isOpening ? {
                    background: [
                      "linear-gradient(45deg, #8b5cf6, #ec4899)",
                      "linear-gradient(90deg, #a855f7, #f472b6)",
                      "linear-gradient(135deg, #c084fc, #fb7185)",
                      "linear-gradient(180deg, #fbbf24, #f97316)",
                      "linear-gradient(225deg, #22c55e, #3b82f6)",
                      "linear-gradient(270deg, #a855f7, #f472b6)",
                      "linear-gradient(315deg, #8b5cf6, #ec4899)"
                    ]
                  } : {}}
                  transition={{ duration: 2.5, ease: "easeInOut" }}
                  style={{
                    background: isOpening ? undefined : "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)"
                  }}
                />

                {/* Gift icon with enhanced animation */}
                {!isOpening ? (
                  <motion.div
                    animate={{
                      y: [0, -2, 0],
                      rotateY: [0, 5, -5, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Gift className="h-12 w-12 text-white drop-shadow-lg" />
                  </motion.div>
                ) : (
                  <motion.div
                    animate={{
                      scale: [1, 1.5, 0.8, 1.3, 1],
                      rotateY: [0, 180, 360, 540, 720],
                      rotateX: [0, 20, -15, 25, 0]
                    }}
                    transition={{
                      duration: 2.5,
                      ease: "easeInOut"
                    }}
                  >
                    <Gift className="h-12 w-12 text-white drop-shadow-lg" />
                  </motion.div>
                )}
              </motion.div>

              {/* Sparkle effects around box */}
              {(isOpening || mysteryBoxCount > 0) && Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  variants={sparkleVariants}
                  initial="initial"
                  animate="animate"
                  style={{ animationDelay: `${i * 0.15}s` }}
                  className={`absolute w-1.5 h-1.5 bg-gradient-to-r from-yellow-400 to-pink-400 rounded-full ${
                    i === 0 ? 'top-1 left-1' :
                    i === 1 ? 'top-1 right-1' :
                    i === 2 ? 'bottom-1 left-1' :
                    i === 3 ? 'bottom-1 right-1' :
                    i === 4 ? 'top-1/2 -left-1' :
                    i === 5 ? 'top-1/2 -right-1' :
                    i === 6 ? '-top-1 left-1/2' :
                    '-bottom-1 left-1/2'
                  }`}
                />
              ))}
            </motion.div>

            {/* Enhanced Reward Display */}
            <AnimatePresence>
              {showReward && (
                <motion.div
                  variants={rewardVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full z-30"
                  style={{ perspective: "1000px" }}
                >
                  <motion.div 
                    className="relative"
                    animate={{
                      rotateY: [0, 5, -5, 0],
                      rotateX: [0, 2, -2, 0]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    {/* Reward glow effect */}
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.6, 1, 0.6]
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-lg"
                    />
                    
                    {/* Reward text */}
                    <div className="relative bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full font-bold shadow-2xl border-2 border-white z-10">
                      <motion.span
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      >
                        +{rewardAmount} STON
                      </motion.span>
                    </div>
                    
                    {/* Floating particles */}
                    {Array.from({ length: 6 }).map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-yellow-300 rounded-full"
                        animate={{
                          y: [0, -20, -40],
                          x: [0, Math.sin(i) * 20, Math.sin(i) * 40],
                          opacity: [0, 1, 0],
                          scale: [0, 1, 0]
                        }}
                        transition={{
                          duration: 2,
                          delay: i * 0.1,
                          repeat: Infinity,
                          ease: "easeOut"
                        }}
                        style={{
                          left: `${20 + i * 10}%`,
                          top: '10px'
                        }}
                      />
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Button */}
          <Button
            onClick={mysteryBoxCount > 0 ? handleOpenBox : handleEarnBoxes}
            disabled={isOpening}
            className={`w-full h-12 rounded-xl font-semibold transition-all duration-300 ${
              mysteryBoxCount > 0 && !isOpening
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl'
                : mysteryBoxCount <= 0
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isOpening ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Opening...
              </>
            ) : mysteryBoxCount > 0 ? (
              <>
                <Gift className="mr-2 h-5 w-5" />
                Open Mystery Box
              </>
            ) : (
              <>
                <Zap className="mr-2 h-5 w-5" />
                Click to Earn Boxes
              </>
            )}
          </Button>

          {/* Info Text */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400 mb-1">
              {mysteryBoxCount > 0 
                ? "Click the box or button to open and reveal your reward!"
                : "Watch ads to earn mystery boxes!"
              }
            </p>
            
            <p className="text-xs text-orange-400">
              ⚠ Box rewards go to withdrawal-only balance
            </p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProfileSection;

