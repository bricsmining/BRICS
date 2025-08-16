import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getReferralInfo, getWelcomeInfo, clearReferralInfo, clearWelcomeInfo } from '@/data/telegramUtils';
import { getAdminConfig } from '@/data/firestore/adminConfig';
import { useToast } from '@/components/ui/use-toast';

const ReferralWelcome = () => {
  const [showReferralMessage, setShowReferralMessage] = useState(false);
  const [referralInfo, setReferralInfo] = useState(null);
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [welcomeInfo, setWelcomeInfo] = useState(null);
  const [adminConfig, setAdminConfig] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const initWelcomeMessages = async () => {
      // Load admin config first to get referral reward
      try {
        const config = await getAdminConfig();
        setAdminConfig(config);
      } catch (error) {
        console.error('Failed to load admin config:', error);
      }

      // Check for referral info
      const refInfo = getReferralInfo();
      if (refInfo && refInfo.isFirstTime) { // Only show for first-time referrals
        setReferralInfo(refInfo);
        setShowReferralMessage(true);
        
        // Show success toast with dynamic rewards
        const referrerReward = adminConfig?.referralReward || 100;
        const welcomeBonus = adminConfig?.welcomeBonus || 50;
        toast({
          title: '🎉 Welcome Bonus Received!',
          description: refInfo.hasBonus 
            ? `You got ${welcomeBonus} STON! Your referrer earned ${referrerReward} STON + free spin!` 
            : 'Welcome to SkyTON via referral!',
          variant: 'success',
          duration: 6000,
          className: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-500',
        });

        // Auto-hide after 10 seconds for referral messages
        setTimeout(() => {
          setShowReferralMessage(false);
          clearReferralInfo(refInfo.userId);
        }, 10000);
      }

      // Check for welcome info (non-referred users)
      const welInfo = getWelcomeInfo();
      if (welInfo && welInfo.isFirstTime && !refInfo) { // Only show for first-time welcome and no referral
        setWelcomeInfo(welInfo);
        setShowWelcomeMessage(true);
        
        // Show welcome toast
        toast({
          title: '🚀 Welcome to SkyTON!',
          description: welInfo.hasError 
            ? 'Ready to start mining STON tokens!' 
            : 'Your mining journey begins now!',
          variant: 'default',
          duration: 4000,
          className: 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-blue-500',
        });

        // Auto-hide after 6 seconds
        setTimeout(() => {
          setShowWelcomeMessage(false);
          clearWelcomeInfo(welInfo.userId);
        }, 6000);
      }
    };

    initWelcomeMessages();
  }, [toast]);

  return (
    <AnimatePresence>
      {showReferralMessage && referralInfo && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-md"
        >
          <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-4 rounded-xl shadow-2xl border border-emerald-400">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🎉</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">Welcome Bonus Received!</h3>
                  <p className="text-sm opacity-90">
                    {referralInfo.hasBonus 
                      ? `You got ${adminConfig?.welcomeBonus || 50} STON welcome bonus!` 
                      : `Referred by: ${referralInfo.referrerId}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowReferralMessage(false);
                  clearReferralInfo(referralInfo.userId);
                }}
                className="text-white/80 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
            
            {referralInfo.hasBonus && (
              <div className="mt-3 pt-3 border-t border-white/20">
                <div className="text-center mb-2">
                  <p className="text-sm font-semibold">🎉 Referral Successfully Processed!</p>
                </div>
                <div className="flex justify-between text-sm">
                  <span>🎁 Your Welcome Bonus</span>
                  <span className="font-semibold">{adminConfig?.welcomeBonus || 50} STON</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>🪙 Referrer Reward</span>
                  <span className="font-semibold">{adminConfig?.referralReward || 100} STON</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>🎰 Referrer Bonus</span>
                  <span className="font-semibold">+1 Mystery Box</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>👤 Referred by</span>
                  <span className="font-semibold">User {referralInfo.referrerId}</span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
      
      {showWelcomeMessage && welcomeInfo && !showReferralMessage && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed top-4 left-4 right-4 z-50 mx-auto max-w-md"
        >
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-xl shadow-2xl border border-blue-400">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🚀</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">Welcome to SkyTON!</h3>
                  <p className="text-sm opacity-90">
                    Start mining STON tokens now
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowWelcomeMessage(false);
                  clearWelcomeInfo(welcomeInfo.userId);
                }}
                className="text-white/80 hover:text-white text-xl"
              >
                ×
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReferralWelcome;
