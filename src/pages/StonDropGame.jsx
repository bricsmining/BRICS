import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Zap, DollarSign, ArrowLeft, Play, X, Loader2, Gift } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { showRewardedAd } from '@/ads/adsController';

import backgroundImg from '@/assets/background.jpg';
import stonImg from '@/assets/ston.png';
import bombImg from '@/assets/bomb.png';
import catchSfx from '@/assets/catch.mp3';
import explosionSfx from '@/assets/explosion.mp3';

const GAME_DURATION = 30;
const ENERGY_COST = 20;

const getRandomPosition = () => `${Math.random() * 80}%`;
const getRandomReward = () => Math.floor(Math.random() * 5) + 1;

export default function StonDropGame() {
  const [userData, setUserData] = useState(null);
  const [droppables, setDroppables] = useState([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isGameOver, setIsGameOver] = useState(false);
  const [redFlash, setRedFlash] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [finalEnergy, setFinalEnergy] = useState(0);
  const [finalBalance, setFinalBalance] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [isDoubling, setIsDoubling] = useState(false);
  const [hasDoubled, setHasDoubled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const containerRef = useRef();

  const catchAudio = useRef(new Audio(catchSfx));
  const explosionAudio = useRef(new Audio(explosionSfx));

  const userId = sessionStorage.getItem("gameUserId");
  const gameTimer = useRef(null);
  const dropInterval = useRef(null);

  const startGame = useCallback(() => {
    setGameStarted(true);
    startTimers();
  }, []);

  const startTimers = useCallback(() => {
    gameTimer.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(gameTimer.current);
          clearInterval(dropInterval.current);
          setIsGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    dropInterval.current = setInterval(() => {
      const isBomb = Math.random() < 0.2;
      const reward = getRandomReward();
      const id = crypto.randomUUID();

      setDroppables(prev => [
        ...prev,
        {
          id,
          left: getRandomPosition(),
          reward,
          isBomb,
        },
      ]);
    }, 400);
  }, []);

  const pauseGame = useCallback(() => {
    clearInterval(gameTimer.current);
    clearInterval(dropInterval.current);
    setIsPaused(true);
  }, []);

  const resumeGame = useCallback(() => {
    setIsPaused(false);
    startTimers();
  }, [startTimers]);

  const quitGame = useCallback(async () => {
    clearInterval(gameTimer.current);
    clearInterval(dropInterval.current);
    
    // Add earned score to balance if game was started
    if (gameStarted && !isGameOver && userId && score > 0) {
      try {
        const docRef = doc(db, 'users', userId);
        await updateDoc(docRef, { balance: increment(score) });
        toast({ 
          title: `Game ended! You earned ${score} STON`,
          className: "bg-[#1a1a1a] text-white"
        });
      } catch (error) {
        console.error('Failed to update balance:', error);
        toast({ 
          title: 'Failed to update balance.',
          variant: 'destructive',
          className: "bg-[#1a1a1a] text-white"
        });
      }
    }
    
    navigate('/tasks');
  }, [gameStarted, isGameOver, userId, score, navigate, toast]);

  const handleDoubleReward = useCallback(() => {
    if (hasDoubled || score <= 0) return;
    
    setIsDoubling(true);
    showRewardedAd({
      onComplete: async () => {
        try {
          if (userId && !hasDoubled) {
            const doubledScore = score; // Amount to double
            const docRef = doc(db, 'users', userId);
            await updateDoc(docRef, { balance: increment(doubledScore) });
            
            // Update final balance for display
            const updatedSnap = await getDoc(docRef);
            const updatedData = updatedSnap.data();
            setFinalBalance(updatedData.balance);
            
            setScore(prev => prev + doubledScore);
            setHasDoubled(true);
            
            // Notify admin via bot
            try {
              const { notifyAdmin } = await import('@/utils/botNotifications');
              await notifyAdmin('game_reward', {
                userId: userId,
                userName: `User ${userId}`,
                gameType: 'STON Drop',
                reward: doubledScore,
                multiplier: '2x'
              });
            } catch (notifError) {
              console.error('Failed to send admin notification:', notifError);
            }
            
            toast({ 
              title: `Rewards Doubled!`,
              description: `You earned extra ${doubledScore} STON`,
              variant: 'success',
              className: "bg-[#1a1a1a] text-white"
            });
          }
        } catch (error) {
          console.error('Failed to double rewards:', error);
          toast({ 
            title: "Failed to double rewards",
            description: "Please try again later.",
            variant: 'destructive',
            className: "bg-[#1a1a1a] text-white"
          });
        } finally {
          setIsDoubling(false);
        }
      },
      onClose: () => {
        toast({ 
          title: "Ad not completed", 
          description: "Watch the full ad to double your rewards.",
          variant: 'destructive',
          className: "bg-[#1a1a1a] text-white"
        });
        setIsDoubling(false);
      },
      onError: (err) => {
        toast({ 
          title: "No Ad Available", 
          description: err || "Try again later.",
          variant: 'destructive',
          className: "bg-[#1a1a1a] text-white"
        });
        setIsDoubling(false);
      }
    });
  }, [userId, score, hasDoubled, toast]);

  useEffect(() => {
    if (!userId) {
      toast({
        title: 'Error',
        description: 'No user session found. Please return to tasks.',
        variant: 'destructive',
        className: "bg-[#1a1a1a] text-white"
      });
      navigate('/tasks');
      return;
    }

    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const docRef = doc(db, 'users', userId);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const data = snap.data();
          if (data.energy < ENERGY_COST) {
            toast({ 
              title: 'Not enough energy to play.',
              description: `You need ${ENERGY_COST} energy to play this game.`,
              variant: 'destructive',
              className: "bg-[#1a1a1a] text-white"
            });
            navigate('/tasks');
            return;
          }
          
          // Deduct energy cost
          await updateDoc(docRef, { energy: increment(-ENERGY_COST) });
          setUserData({ ...data, id: userId, energy: data.energy - ENERGY_COST });
        } else {
          toast({ 
            title: 'User not found.',
            variant: 'destructive',
            className: "bg-[#1a1a1a] text-white"
          });
          navigate('/tasks');
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
        toast({ 
          title: 'Failed to load user data.',
          variant: 'destructive',
          className: "bg-[#1a1a1a] text-white"
        });
        navigate('/tasks');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [userId, navigate, toast]);

  useEffect(() => {
    if (!droppables.length) return;
    const timers = droppables.map(drop =>
      setTimeout(() => {
        setDroppables(prev => prev.filter(d => d.id !== drop.id));
      }, 3000)
    );
    return () => timers.forEach(clearTimeout);
  }, [droppables]);

  const handleDropClick = useCallback((drop) => {
    if (isPaused) return;
    
    setDroppables(prev => prev.filter(d => d.id !== drop.id));
    if (drop.isBomb) {
      if (navigator.vibrate) navigator.vibrate(300);
      explosionAudio.current.play().catch(() => {});
      setRedFlash(true);
      setTimeout(() => setRedFlash(false), 1000);
      setScore(prev => Math.max(0, prev - 20));
    } else {
      catchAudio.current.play().catch(() => {});
      setScore(prev => prev + drop.reward);
    }
  }, [isPaused]);

  useEffect(() => {
    if (!isGameOver || !userId) return;
    
    const finalizeGame = async () => {
      try {
        const docRef = doc(db, 'users', userId);
        await updateDoc(docRef, { balance: increment(score) });
        const updatedSnap = await getDoc(docRef);
        const updatedData = updatedSnap.data();
        setFinalEnergy(updatedData.energy);
        setFinalBalance(updatedData.balance);
        
        toast({ 
          title: `Game Over! You earned ${score} STON`,
          variant: 'success',
          className: "bg-[#1a1a1a] text-white"
        });
      } catch (error) {
        console.error('Failed to finalize game:', error);
        toast({ 
          title: 'Failed to save game results.',
          variant: 'destructive',
          className: "bg-[#1a1a1a] text-white"
        });
      }
    };
    
    finalizeGame();
  }, [isGameOver, userId, score, toast]);

  const resetGame = useCallback(() => {
    window.location.reload();
  }, []);

  const handleBackClick = useCallback(() => {
    if (!gameStarted || isGameOver) {
      navigate('/tasks');
    } else {
      pauseGame();
      setShowQuitConfirm(true);
    }
  }, [gameStarted, isGameOver, navigate, pauseGame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(gameTimer.current);
      clearInterval(dropInterval.current);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#1a1a1a]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-400 mx-auto mb-4" />
          <p className="text-white text-lg">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden"
      style={{
        backgroundImage: `url(${backgroundImg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Top bar */}
      <div className="absolute top-3 left-3 right-3 flex justify-between items-center gap-4 text-white text-sm z-20 bg-black/70 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg select-none border border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackClick}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {userData?.profilePicUrl ? (
            <img
              src={userData.profilePicUrl}
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover border border-white/30"              
          />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold">
              {userData?.firstName?.charAt(0) || userData?.username?.charAt(0) || 'U'}
            </div>
          )}
          <span className="flex items-center gap-1 bg-yellow-500/20 px-2 py-1 rounded-lg">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="font-semibold">{userData?.energy ?? 0}</span>
          </span>
          <span className="flex items-center gap-1 bg-green-500/20 px-2 py-1 rounded-lg">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span className="font-semibold">{userData?.balance ?? 0}</span>
          </span>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">00:{timeLeft.toString().padStart(2, '0')}</div>
          <div className="text-xs text-gray-300">Score: {score}</div>
        </div>
      </div>

      {/* Start screen */}
      {!gameStarted && !isGameOver && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-2xl p-8 border border-white/10 shadow-2xl max-w-sm mx-4"
          >
            <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">STON DROP</h1>
            <p className="text-gray-300 mb-6 text-lg">Catch STON gems, avoid bombs!</p>
            <div className="flex flex-col gap-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-gray-300 justify-center">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span>Energy Cost: {ENERGY_COST}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300 justify-center">
                <DollarSign className="w-4 h-4 text-green-400" />
                <span>Earn STON by catching gems</span>
              </div>
              <div className="text-xs text-red-400 text-center">
                ⚠️ Avoid bombs! They reduce your score by 20 points
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button
                className="text-white bg-gradient-to-br from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 px-8 py-4 text-lg rounded-xl shadow-xl transition-all duration-300 transform hover:scale-105"
                onClick={startGame}
              >
                <Play className="mr-2 h-5 w-5" />
                Start Game
              </Button>
              <Button
                variant="outline"
                className="text-white border-white/30 hover:bg-white/10 px-8 py-4 text-lg rounded-xl shadow-xl transition-all duration-300"
                onClick={() => navigate('/tasks')}
              >
                <X className="mr-2 h-5 w-5" />
                Back to Tasks
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Pause overlay */}
      {isPaused && !showQuitConfirm && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-2xl"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Game Paused</h2>
            <div className="flex gap-4">
              <Button
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl"
                onClick={resumeGame}
              >
                <Play className="mr-2 h-4 w-4" />
                Resume
              </Button>
              <Button
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 px-6 py-2 rounded-xl"
                onClick={() => setShowQuitConfirm(true)}
              >
                <X className="mr-2 h-4 w-4" />
                Quit
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Falling items */}
      <AnimatePresence>
        {droppables.map(drop => (
          <motion.img
            key={drop.id}
            src={drop.isBomb ? bombImg : stonImg}
            onClick={() => handleDropClick(drop)}
            className="absolute cursor-pointer select-none"
            style={{
              left: drop.left,
              width: drop.isBomb ? 40 : 24 + drop.reward * 12,
              zIndex: 15,
              userSelect: 'none',
            }}
            initial={{ top: '-12%' }}
            animate={{ 
              top: '100%',
              transition: { 
                duration: 3, 
                ease: 'linear',
                paused: isPaused 
              }
            }}
            exit={{ opacity: 0, scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            alt={drop.isBomb ? "Bomb" : "STON"}
            draggable={false}
          />
        ))}
      </AnimatePresence>

      {/* Red flash overlay */}
      {redFlash && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-red-600 z-30 pointer-events-none"
        />
      )}

      {/* Game over screen */}
      {isGameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-40">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-white text-center bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-sm rounded-2xl px-8 py-10 shadow-2xl border border-white/10 max-w-sm mx-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <h1 className="text-4xl font-extrabold mb-4 text-green-400 drop-shadow-lg">
                🎉 Game Over!
              </h1>
            </motion.div>
            
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-6"
            >
              <p className="text-2xl mb-2 font-bold">
                You earned <span className="text-yellow-400">{score} STON</span>
              </p>
              <div className="text-sm text-gray-300 space-y-1">
                <p>New Balance: <span className="text-green-400 font-semibold">{finalBalance} STON</span></p>
                <p>Energy Left: <span className="text-yellow-400 font-semibold">{finalEnergy}</span></p>
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col gap-3"
            >
              {/* Double Reward Button - Only show if not doubled and score > 0 */}
              {!hasDoubled && score > 0 && (
                <Button
                  className="px-6 py-3 bg-gradient-to-br from-yellow-500 to-yellow-700 hover:from-yellow-600 hover:to-yellow-800 text-white rounded-xl font-bold shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleDoubleReward}
                  disabled={isDoubling}
                >
                  {isDoubling ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Loading Ad...
                    </>
                  ) : (
                    <>
                      <Gift className="mr-2 h-5 w-5" />
                      2x Rewards (Watch Ad)
                    </>
                  )}
                </Button>
              )}

              {/* Show doubled message if already doubled */}
              {hasDoubled && (
                <div className="bg-green-600/20 border border-green-500/50 rounded-xl p-3 mb-2">
                  <p className="text-green-400 text-sm font-semibold">
                    ✅ Rewards Doubled! You earned an extra {score / 2} STON
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="px-6 py-2 bg-gradient-to-br from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white rounded-xl font-semibold shadow-lg transition-all duration-300 transform hover:scale-105"
                  onClick={resetGame}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Play Again
                </Button>
                <Button
                  variant="outline"
                  className="px-6 py-2 border-white/30 text-white hover:bg-white/10 rounded-xl font-semibold shadow-lg transition-all duration-300"
                  onClick={() => navigate('/tasks')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Tasks
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* Quit confirmation dialog */}
      {showQuitConfirm && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-sm rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-white/10"
          >
            <h3 className="text-xl font-bold text-white mb-4">Quit Game?</h3>
            <p className="text-gray-300 mb-6">
              Your current score of <span className="text-yellow-400 font-semibold">{score} STON</span> will be added to your balance. Are you sure you want to quit?
            </p>
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                className="bg-transparent border-white/30 text-white hover:bg-white/10"
                onClick={() => {
                  setShowQuitConfirm(false);
                  resumeGame();
                }}
              >
                No, Continue
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={quitGame}
              >
                Yes, Quit
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
