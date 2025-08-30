import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserContext } from '@/App';
import { Loader2, Zap, Star, Rocket } from 'lucide-react';

const DynamicLoader = ({ message = "Loading your dashboard" }) => {
  const context = useContext(UserContext);
  const { adminConfig } = context || {};
  const [currentStep, setCurrentStep] = useState(0);
  const [dots, setDots] = useState('');

  // Get dynamic app name - wait for adminConfig or use generic fallback
  const appName = adminConfig?.appName || 'your app';

  const loadingSteps = [
    { text: `Initializing ${appName}`, icon: Rocket, color: "text-blue-400" },
    { text: "Loading your data", icon: Zap, color: "text-yellow-400" },
    { text: "Connecting to TON", icon: Star, color: "text-purple-400" },
    { text: "Preparing dashboard", icon: Loader2, color: "text-sky-400" },
  ];

  // Animate loading steps
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % loadingSteps.length);
    }, 1500);

    return () => clearInterval(stepInterval);
  }, []);

  // Animate dots
  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((prev) => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 400);

    return () => clearInterval(dotInterval);
  }, []);

  const currentLoad = loadingSteps[currentStep];
  const IconComponent = currentLoad.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#1a1a1a] text-white">
      <div className="text-center space-y-8">
        {/* Main Logo/Icon Area */}
        <motion.div
          className="relative"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Outer Glow Ring */}
          <motion.div
            className="absolute inset-0 w-32 h-32 mx-auto"
            animate={{ 
              boxShadow: [
                "0 0 20px rgba(56, 189, 248, 0.3)",
                "0 0 40px rgba(56, 189, 248, 0.6)",
                "0 0 20px rgba(56, 189, 248, 0.3)"
              ]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, transparent 70%)"
            }}
          />
          
          {/* Center Icon */}
          <motion.div
            className="relative w-32 h-32 mx-auto bg-gradient-to-br from-sky-400 to-blue-600 rounded-full flex items-center justify-center shadow-2xl"
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.05, 1]
            }}
            transition={{
              rotate: { duration: 8, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <motion.div
              animate={{ scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <IconComponent 
                className={`h-16 w-16 ${currentLoad.color}`}
                strokeWidth={1.5}
              />
            </motion.div>
          </motion.div>

          {/* Orbiting Particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-sky-400 rounded-full"
              style={{
                top: '50%',
                left: '50%',
                transformOrigin: '0 0'
              }}
              animate={{
                rotate: [0, 360],
                x: [0, 60 * Math.cos((i * 60) * Math.PI / 180)],
                y: [0, 60 * Math.sin((i * 60) * Math.PI / 180)],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{
                duration: 3 + i * 0.2,
                repeat: Infinity,
                ease: "linear",
                delay: i * 0.2
              }}
            />
          ))}
        </motion.div>

        {/* Loading Text with Steps */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-2"
            >
              <h2 className="text-2xl font-bold bg-gradient-to-r from-sky-400 to-blue-400 bg-clip-text text-transparent">
                {currentLoad.text}{dots}
              </h2>
              
              {/* Progress Bar */}
              <div className="w-64 mx-auto bg-gray-800 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-sky-400 to-blue-500"
                  initial={{ width: "0%" }}
                  animate={{ width: `${((currentStep + 1) / loadingSteps.length) * 100}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
              
              <p className="text-sm text-gray-400">
                Step {currentStep + 1} of {loadingSteps.length}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Loading Indicator */}
        <motion.div
          className="flex justify-center space-x-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {loadingSteps.map((_, index) => (
            <motion.div
              key={index}
              className={`w-3 h-3 rounded-full ${
                index <= currentStep ? 'bg-sky-400' : 'bg-gray-700'
              }`}
              animate={index === currentStep ? {
                scale: [1, 1.3, 1],
                opacity: [0.7, 1, 0.7]
              } : {}}
              transition={{
                duration: 1,
                repeat: index === currentStep ? Infinity : 0,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>

        {/* Decorative Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-sky-400/30 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
                y: [0, -100]
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 3,
                ease: "easeOut"
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default DynamicLoader;
