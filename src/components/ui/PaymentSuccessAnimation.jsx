import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';

const PaymentSuccessAnimation = ({ 
  isVisible, 
  onAnimationComplete,
  cardName = "Mining Card",
  amount,
  currency = "TON"
}) => {
  const checkmarkVariants = {
    hidden: { 
      pathLength: 0, 
      opacity: 0,
      scale: 0.8
    },
    visible: { 
      pathLength: 1, 
      opacity: 1,
      scale: 1,
      transition: {
        pathLength: { duration: 0.6, ease: "easeInOut" },
        opacity: { duration: 0.2 },
        scale: { duration: 0.3, ease: "easeOut" }
      }
    }
  };

  const containerVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.8,
      y: 20
    },
    visible: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut",
        staggerChildren: 0.2
      }
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: -10,
      transition: { duration: 0.3 }
    }
  };

  const textVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    }
  };

  const circleVariants = {
    hidden: { scale: 0 },
    visible: { 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15
      }
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-600/50 text-white p-8 rounded-3xl shadow-2xl text-center max-w-sm w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onAnimationComplete={() => {
          // Auto-close after animation completes
          setTimeout(() => {
            onAnimationComplete?.();
          }, 2000);
        }}
      >
        {/* Success Icon */}
        <motion.div
          className="relative mx-auto mb-6"
          variants={circleVariants}
        >
          <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500/30">
            <svg 
              className="w-10 h-10" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <motion.circle
                cx="12"
                cy="12"
                r="10"
                stroke="rgb(34, 197, 94)"
                strokeWidth="2"
                fill="none"
                variants={circleVariants}
              />
              <motion.path
                d="m9 12 2 2 4-4"
                stroke="rgb(34, 197, 94)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                variants={checkmarkVariants}
                initial="hidden"
                animate="visible"
              />
            </svg>
          </div>
          
          {/* Success particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-green-400 rounded-full"
              initial={{ 
                opacity: 0, 
                scale: 0,
                x: 0,
                y: 0 
              }}
              animate={{ 
                opacity: [0, 1, 0], 
                scale: [0, 1, 0],
                x: Math.cos(i * 60 * Math.PI / 180) * 40,
                y: Math.sin(i * 60 * Math.PI / 180) * 40
              }}
              transition={{ 
                duration: 1.2, 
                delay: 0.6 + i * 0.1,
                ease: "easeOut"
              }}
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            />
          ))}
        </motion.div>

        {/* Success Text */}
        <motion.div variants={textVariants}>
          <h2 className="text-2xl font-bold text-green-400 mb-2">
            Payment Successful!
          </h2>
          <p className="text-gray-300 mb-4">
            Your {cardName} has been purchased successfully
          </p>
          {amount && (
            <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
              <p className="text-sm text-gray-400">Amount Paid</p>
              <p className="text-lg font-semibold text-white">
                {amount} {currency}
              </p>
            </div>
          )}
          <p className="text-sm text-gray-400">
            Activating your mining card...
          </p>
        </motion.div>

        {/* Progress indicator */}
        <motion.div 
          className="mt-6"
          variants={textVariants}
        >
          <div className="flex justify-center space-x-1">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-green-400 rounded-full"
                animate={{ 
                  opacity: [0.3, 1, 0.3],
                  scale: [0.8, 1.2, 0.8]
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default PaymentSuccessAnimation;
