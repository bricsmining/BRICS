import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Zap, DollarSign, ArrowLeft, Play, X, Loader2, Gift, Star, Sparkles } from 'lucide-react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { showRewardedAd } from '@/ads/adsController';

import backgroundImg from '../assets/background.jpg';
import stonImg from '../assets/ston.png';
import bombImg from '../assets/bomb.png';
import catchSfx from '../assets/catch.mp3';
import explosionSfx from '../assets/explosion.mp3';

const GAME_DURATION = 30;
const ENERGY_COST = 20;
const MIN_BOMB_PENALTY = 30; // Minimum points lost from bomb
const MAX_BOMB_PENALTY = 75; // Maximum points lost from bomb

const getRandomPosition = () => `${Math.random() * 80}%`;
const getRandomReward = () => {
  // Random reward between 15-30 STON
  return Math.floor(Math.random() * 16) + 15; // 15 to 30
};
const getBombPenalty = (currentScore) => {
  // Scale bomb penalty based on current score (30-75 points to balance higher rewards)
  const penalty = Math.min(75, Math.max(30, Math.floor(currentScore * 0.1)));
  return penalty;
};

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
  const [gameStartTime, setGameStartTime] = useState(null);
  const [combo, setCombo] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [catchEffects, setCatchEffects] = useState([]);
  const [doubledAmount, setDoubledAmount] = useState(0);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const containerRef = useRef();

  const catchAudio = useRef(null);
  const explosionAudio = useRef(null);

  // Initialize audio
  useEffect(() => {
    catchAudio.current = new Audio(catchSfx);
    explosionAudio.current = new Audio(explosionSfx);
    
    // Preload audio
    catchAudio.current.preload = 'auto';
    explosionAudio.current.preload = 'auto';
    
    // Set volume
    catchAudio.current.volume = 0.5;
    explosionAudio.current.volume = 0.5;
    
    console.log('🎵 Audio initialized:', { catchSfx, explosionSfx });
    console.log('🖼️ Images loaded:', { backgroundImg, stonImg, bombImg });
    
    return () => {
      if (catchAudio.current) {
        catchAudio.current.pause();
        catchAudio.current = null;
      }
      if (explosionAudio.current) {
        explosionAudio.current.pause();
        explosionAudio.current = null;
      }
    };
  }, []);

  const userId = sessionStorage.getItem("gameUserId");
  const gameTimer = useRef(null);
  const dropInterval = useRef(null);

  const startGame = useCallback(() => {
    console.log('🎮 Starting game...');
    try {
      setGameStarted(true);
      setGameStartTime(Date.now());
      startTimers();
      console.log('✅ Game started successfully');
    } catch (error) {
      console.error('❌ Failed to start game:', error);
      toast({
        title: 'Failed to start game',
        description: 'Please try again.',
        variant: 'destructive',
        className: "bg-[#1a1a1a] text-white"
      });
    }
  }, [startTimers, toast]);

  const startTimers = useCallback(() => {
    let currentTime = GAME_DURATION;
    
    gameTimer.current = setInterval(() => {
      setTimeLeft(prev => {
        currentTime = prev - 1;
        if (currentTime <= 0) {
          clearInterval(gameTimer.current);
          clearInterval(dropInterval.current);
          setIsGameOver(true);
          return 0;
        }
        return currentTime;
      });
    }, 1000);

    dropInterval.current = setInterval(() => {
      try {
        // Progressive difficulty: more bombs and faster drops as time goes on
        const timeElapsed = GAME_DURATION - currentTime;
        const difficultyFactor = Math.min(timeElapsed / GAME_DURATION, 0.5); // Max 50% increase
        const bombChance = 0.15 + (difficultyFactor * 0.1); // 15% to 25% bomb chance
        
        const isBomb = Math.random() < bombChance;
        const reward = getRandomReward();
        const id = crypto.randomUUID();

        const newDrop = {
          id,
          left: getRandomPosition(),
          reward,
          isBomb,
          speed: 3 - (difficultyFactor * 0.5), // Slightly faster as game progresses
        };

        console.log('🎯 Creating drop:', isBomb ? '💣 Bomb' : `💎 Gem (${reward} STON)`);
        
        setDroppables(prev => [...prev, newDrop]);
      } catch (error) {
        console.error('❌ Error creating drop:', error);
      }
    }, 400); // Fixed interval to avoid timing issues
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
    
    // Add earned score to balance if game was started and user earned points
    if (gameStarted && !isGameOver && userId && score > 0) {
      try {
        const docRef = doc(db, 'users', userId);
        await updateDoc(docRef, { balance: increment(score) });
        
        // Also restore energy if game was very short (less than 5 seconds)
        const gameTime = gameStartTime ? (Date.now() - gameStartTime) / 1000 : 0;
        if (gameTime < 5) {
          await updateDoc(docRef, { energy: increment(ENERGY_COST) });
          toast({ 
            title: `Game ended early! Energy refunded and you earned ${score} STON`,
            className: "bg-[#1a1a1a] text-white"
          });
        } else {
          toast({ 
            title: `Game ended! You earned ${score} STON`,
            className: "bg-[#1a1a1a] text-white"
          });
        }
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
  }, [gameStarted, isGameOver, userId, score, navigate, toast, gameStartTime]);

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
            setDoubledAmount(doubledScore);
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

  // Clean up catch effects
  useEffect(() => {
    if (!catchEffects.length) return;
    const timers = catchEffects.map(effect =>
      setTimeout(() => {
        setCatchEffects(prev => prev.filter(e => e.id !== effect.id));
      }, 2000)
    );
    return () => timers.forEach(clearTimeout);
  }, [catchEffects]);

  const handleDropClick = useCallback((drop, event) => {
    if (isPaused) return;
    
    setDroppables(prev => prev.filter(d => d.id !== drop.id));
    
    if (drop.isBomb) {
      // Bomb hit - reset combo and apply penalty
      if (navigator.vibrate) navigator.vibrate(300);
      if (explosionAudio.current) {
        explosionAudio.current.play().catch((error) => {
          console.warn('Failed to play explosion sound:', error);
        });
      }
      setRedFlash(true);
      setTimeout(() => setRedFlash(false), 1000);
      
      const penalty = getBombPenalty(score);
      setScore(prev => Math.max(0, prev - penalty));
      setCombo(0);
      setShowCombo(false);
      
      // Show bomb penalty effect
      if (event && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        setCatchEffects(prev => [...prev, {
          id: crypto.randomUUID(),
          x,
          y,
          text: `-${penalty}`,
          color: 'text-red-400',
          isBomb: true
        }]);
      }
    } else {
      // Gem catch - increase combo and score
      if (catchAudio.current) {
        catchAudio.current.play().catch((error) => {
          console.warn('Failed to play catch sound:', error);
        });
      }
      setScore(prev => prev + drop.reward);
      setCombo(prev => {
        const newCombo = prev + 1;
        if (newCombo >= 3) {
          setShowCombo(true);
          setTimeout(() => setShowCombo(false), 2000);
        }
        return newCombo;
      });
      
      // Show catch effect with combo bonus
      if (event && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        let bonusText = `+${drop.reward}`;
        let bonusColor = 'text-green-400';
        
        if (combo >= 2) {
          bonusText = `+${drop.reward} (${combo + 1}x)`;
          bonusColor = 'text-yellow-400';
        }
        
        setCatchEffects(prev => [...prev, {
          id: crypto.randomUUID(),
          x,
          y,
          text: bonusText,
          color: bonusColor,
          isBomb: false
        }]);
      }
    }
  }, [isPaused, score, combo]);

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

  const resetGame = useCallback(async () => {
    // Clear all timers
    clearInterval(gameTimer.current);
    clearInterval(dropInterval.current);
    
    // Reset all game state
    setDroppables([]);
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setIsGameOver(false);
    setRedFlash(false);
    setGameStarted(false);
    setIsPaused(false);
    setShowQuitConfirm(false);
    setIsDoubling(false);
    setHasDoubled(false);
    setGameStartTime(null);
    setCombo(0);
    setShowCombo(false);
    setCatchEffects([]);
    setDoubledAmount(0);
    
    // Deduct energy for new game
    if (userId && userData) {
      try {
        const docRef = doc(db, 'users', userId);
        const snap = await getDoc(docRef);
        
        if (snap.exists()) {
          const data = snap.data();
          if (data.energy >= ENERGY_COST) {
            await updateDoc(docRef, { energy: increment(-ENERGY_COST) });
            setUserData(prev => ({ ...prev, energy: data.energy - ENERGY_COST }));
          } else {
            toast({ 
              title: 'Not enough energy to play again.',
              description: `You need ${ENERGY_COST} energy to play this game.`,
              variant: 'destructive',
              className: "bg-[#1a1a1a] text-white"
            });
            navigate('/tasks');
            return;
          }
        }
      } catch (error) {
        console.error('Failed to deduct energy:', error);
        toast({ 
          title: 'Failed to start new game.',
          variant: 'destructive',
          className: "bg-[#1a1a1a] text-white"
        });
        navigate('/tasks');
        return;
      }
    }
  }, [userId, userData, navigate, toast]);

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
      className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black"
      style={{
        backgroundImage: backgroundImg ? `url(${backgroundImg})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onError={() => {
        console.error('Background image failed to load:', backgroundImg);
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
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <span>Score: {score}</span>
            {combo > 0 && (
              <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full flex items-center gap-1">
                <Star className="w-3 h-3" />
                {combo}x
              </span>
            )}
          </div>
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
                <span>Earn 15-30 STON per gem</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-yellow-300 justify-center">
                <Star className="w-4 h-4 text-yellow-400" />
                <span>Build combos for bonus points!</span>
              </div>
              <div className="text-xs text-red-400 text-center">
                ⚠️ Avoid bombs! They reduce your score (30-75 points)
              </div>
              <div className="text-xs text-blue-400 text-center">
                💡 Game gets harder over time - stay focused!
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
            onClick={(e) => handleDropClick(drop, e)}
            onError={(e) => {
              console.error('Failed to load image:', e.target.src);
              // Fallback to emoji if image fails to load
              e.target.style.display = 'none';
              const fallback = document.createElement('div');
              fallback.textContent = drop.isBomb ? '💣' : '💎';
              fallback.className = 'absolute cursor-pointer select-none text-4xl';
              fallback.style.left = drop.left;
              fallback.style.top = e.target.style.top;
              fallback.onclick = (event) => handleDropClick(drop, event);
              e.target.parentNode.appendChild(fallback);
            }}
            onLoad={() => {
              console.log('✅ Image loaded successfully:', drop.isBomb ? 'bomb' : 'ston');
            }}
            className="absolute cursor-pointer select-none"
            style={{
              left: drop.left,
              width: drop.isBomb ? 40 : Math.min(60, 30 + (drop.reward - 15) * 2), // Size 30-60px based on reward 15-30
              height: 'auto',
              zIndex: 15,
              userSelect: 'none',
              filter: drop.isBomb ? 'drop-shadow(0 0 8px rgba(255, 0, 0, 0.6))' : 'drop-shadow(0 0 6px rgba(0, 255, 100, 0.4))',
            }}
            initial={{ top: '-12%', rotate: 0 }}
            animate={{ 
              top: '100%',
              rotate: drop.isBomb ? [0, 10, -10, 0] : [0, 5, -5, 0],
              transition: { 
                top: {
                  duration: drop.speed || 3,
                  ease: 'linear',
                },
                rotate: {
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }
              }
            }}
            exit={{ opacity: 0, scale: 0 }}
            whileHover={{ scale: 1.1, filter: drop.isBomb ? 'drop-shadow(0 0 12px rgba(255, 0, 0, 0.8))' : 'drop-shadow(0 0 10px rgba(0, 255, 100, 0.6))' }}
            whileTap={{ scale: 0.9 }}
            alt={drop.isBomb ? "Bomb" : "STON"}
            draggable={false}
          />
        ))}
      </AnimatePresence>

      {/* Catch Effects */}
      <AnimatePresence>
        {catchEffects.map(effect => (
          <motion.div
            key={effect.id}
            className={`absolute font-bold text-lg pointer-events-none z-40 ${effect.color}`}
            style={{
              left: effect.x - 30,
              top: effect.y - 20,
            }}
            initial={{ opacity: 1, scale: 1, y: 0 }}
            animate={{ 
              opacity: 0, 
              scale: effect.isBomb ? 1.5 : 1.2, 
              y: -50,
              transition: { duration: 2, ease: 'easeOut' }
            }}
            exit={{ opacity: 0 }}
          >
            {effect.text}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Combo Display */}
      {showCombo && combo >= 3 && (
        <motion.div
          className="absolute top-20 left-1/2 transform -translate-x-1/2 z-40"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
        >
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-full font-bold text-xl shadow-2xl border-2 border-yellow-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              <span>{combo}x COMBO!</span>
              <Sparkles className="w-6 h-6" />
            </div>
          </div>
        </motion.div>
      )}

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
                    ✅ Rewards Doubled! You earned an extra {doubledAmount} STON
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
