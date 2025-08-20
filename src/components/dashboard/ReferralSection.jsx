//the spinner is perfectly spninning at first spin but after that from the second spin it showing some issuse like backward spin, slower spin. can you fix the issue by analyzing the targetRotation calculation and the the final rotation calculation... Also check function of the spin completion after animation too....

// GIGAPUB INTEGRATION:
// - GigaPub ads are now exclusively used for post-spin advertisements
// - Admin can enable/disable GigaPub and set project ID in admin settings
// - Enhanced reliability script is automatically injected with fallback servers
// - Dedicated GigaPub network handler with proper error handling and debugging

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	Copy,
	Loader2,
	QrCode,
	X,
	Users,
	Share2,
	Gift,
	UserPlus,
	RotateCcw,
	Sparkles,
	Star,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { generateReferralLink, updateUserBalance, updateUserBalanceByType } from '@/data';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import QRCode from '@/components/ui/QRCode';
import * as gigapub from '@/ads/networks/gigapub';
import { getAdminConfig } from '@/data/firestore/adminConfig';
import { useAdTimer } from '@/contexts/AdTimerContext';

const defaultAvatar =
	'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQB_4gKwn8q2WBPTwnV14Jmh3B5g56SCiGEBA&usqp=CAU';

// Spin rewards configuration with weighted probabilities - FIXED ORDER AND PRIORITIES
const SPIN_REWARDS = [
	{
		id: 1,
		label: '100 STON',
		value: 100,
		type: 'ston',
		color: '#607D8B',
		actualReward: 100,
		weight: 15, // 40% chance - most common
		displayValue: '100',
	},
	{
		id: 2,
		label: '1 TON',
		value: 1,
		type: 'ton',
		color: '#FFD700',
		actualReward: 5000,
		weight: 0, // 0% chance - just for show
		displayValue: '1 TON',
	},
	{
		id: 3,
		label: '500 STON',
		value: 500,
		type: 'ston',
		color: '#4CAF50',
		actualReward: 500,
		weight: 25, // 30% chance
		displayValue: '500',
	},
	{
		id: 4,
		label: '5 TON',
		value: 5,
		type: 'ton',
		color: '#FF6B6B',
		actualReward: 10000,
		weight: 0, // 0% chance - just for show
		displayValue: '5 TON',
	},
	{
		id: 5,
		label: '1000 STON',
		value: 1000,
		type: 'ston',
		color: '#2196F3',
		actualReward: 1000,
		weight: 20, // 20% chance
		displayValue: '1K',
	},
	{
		id: 6,
		label: '5000 STON',
		value: 5000,
		type: 'ston',
		color: '#9C27B0',
		actualReward: 5000,
		weight: 15, // 8% chance
		displayValue: '5K',
	},
	{
		id: 7,
		label: '10000 STON',
		value: 10000,
		type: 'ston',
		color: '#FF9800',
		actualReward: 10000,
		weight: 25, // 2% chance - rare
		displayValue: '10K',
	},
	{
		id: 8,
		label: '50000 STON',
		value: 50000,
		type: 'ston',
		color: '#E91E63',
		actualReward: 50000,
		weight: 0, // 0% chance - just for show
		displayValue: '50K',
	},
];

// Function to select reward based on weighted probability with strict priority
const selectWeightedReward = () => {
    const availableRewards = SPIN_REWARDS.filter((r) => r.weight > 0)
        .sort((a, b) => b.weight - a.weight); // Sort by weight in descending order
    
    const totalWeight = availableRewards.reduce(
        (sum, reward) => sum + reward.weight,
        0
    );
    const random = Math.random() * totalWeight;

    let currentWeight = 0;
    for (const reward of availableRewards) {
        currentWeight += reward.weight;
        if (random <= currentWeight) {
            return reward;
        }
    }

    // Fallback to most common reward (highest weight)
    return availableRewards[0];
};

// Custom Telegram SVG Icon Component
const TelegramIcon = ({ className }) => (
	<svg className={className} viewBox='0 0 24 24' fill='currentColor'>
		<path d='M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z' />
	</svg>
);

// Floating Spin Button Component - Updated to show for all users
const FloatingSpinButton = ({ spinsAvailable, onClick, hasSpins }) => {
	return (
		<motion.div
			className='fixed bottom-20 right-4 z-40'
			initial={{ scale: 0, opacity: 0 }}
			animate={{ scale: 1, opacity: 1 }}
			transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
		>
			<motion.button
				onClick={onClick}
				className={`relative w-16 h-16 ${
					hasSpins 
						? 'bg-gradient-to-r from-purple-600 to-pink-600' 
						: 'bg-gradient-to-r from-gray-600 to-gray-700'
				} rounded-full shadow-2xl flex items-center justify-center`}
				whileHover={{ scale: 1.1 }}
				whileTap={{ scale: 0.95 }}
				animate={{
					boxShadow: hasSpins ? [
						'0 0 20px rgba(147, 51, 234, 0.5)',
						'0 0 30px rgba(147, 51, 234, 0.8)',
						'0 0 20px rgba(147, 51, 234, 0.5)',
					] : [
						'0 0 20px rgba(107, 114, 128, 0.5)',
						'0 0 30px rgba(107, 114, 128, 0.8)',
						'0 0 20px rgba(107, 114, 128, 0.5)',
					],
				}}
				transition={{
					boxShadow: {
						duration: 2,
						repeat: Infinity,
						ease: 'easeInOut',
					},
				}}
			>
				<motion.div
					animate={{ rotate: 360 }}
					transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
				>
					<RotateCcw className='h-8 w-8 text-white' />
				</motion.div>

				{/* Spin count badge or referral indicator */}
				{hasSpins ? (
					<motion.div
						className='absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center'
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ delay: 0.7, type: 'spring' }}
					>
						{spinsAvailable}
					</motion.div>
				) : (
					<motion.div
						className='absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center'
						initial={{ scale: 0 }}
						animate={{ scale: 1 }}
						transition={{ delay: 0.7, type: 'spring' }}
					>
						!
					</motion.div>
				)}

				{/* Sparkle effects */}
				<motion.div
					className='absolute inset-0 pointer-events-none'
					animate={{
						rotate: [0, 360],
					}}
					transition={{
						duration: 4,
						repeat: Infinity,
						ease: 'linear',
					}}
				>
					{[...Array(6)].map((_, i) => (
						<motion.div
							key={i}
							className={`absolute w-1 h-1 ${hasSpins ? 'bg-yellow-400' : 'bg-gray-400'} rounded-full`}
							style={{
								top: '10%',
								left: '50%',
								transformOrigin: '0 32px',
							}}
							animate={{
								rotate: i * 60,
								scale: [0, 1, 0],
							}}
							transition={{
								rotate: { duration: 0 },
								scale: {
									duration: 2,
									repeat: Infinity,
									delay: i * 0.3,
									ease: 'easeInOut',
								},
							}}
						/>
					))}
				</motion.div>
			</motion.button>
		</motion.div>
	);
};

// Professional Spin Wheel Component - FIXED ROTATION ISSUES
const SpinWheel = ({ isSpinning, selectedReward, onSpinStart, onSpinComplete }) => {
	const [rotation, setRotation] = useState(0);
	const [isAnimating, setIsAnimating] = useState(false);

	useEffect(() => {
		if (isSpinning && selectedReward && !isAnimating) {
			setIsAnimating(true);
			
			// Find the index of the selected reward
			const rewardIndex = SPIN_REWARDS.findIndex(
				(r) => r.id === selectedReward.id
			);
			
			const segmentAngle = 360 / SPIN_REWARDS.length; // 45 degrees per segment
			
			// Calculate the center angle of the target segment
			const targetSegmentCenter = rewardIndex * segmentAngle + (segmentAngle / 2);
			
			// Calculate how much we need to rotate to align the target segment with the pointer (top)
			// We want the segment center to be at 0 degrees (top position)
			const targetAngle = 360 - targetSegmentCenter;
			
			// Normalize the current rotation to 0-360 range
			const currentNormalizedRotation = rotation % 360;
			
			// Calculate the shortest path to the target
			let rotationDifference = targetAngle - currentNormalizedRotation;
			
			// Ensure we always rotate in the positive direction and add multiple spins
			if (rotationDifference <= 0) {
				rotationDifference += 360;
			}
			
			// Add 5-7 full rotations for the spinning effect
			const additionalSpins = 5 + Math.random() * 2;
			const fullRotations = Math.floor(additionalSpins) * 360;
			
			// Calculate final rotation: current position + full spins + difference to target
			const finalRotation = rotation + fullRotations + rotationDifference;
			
			console.log('=== SPIN CALCULATION ===');
			console.log('Selected reward:', selectedReward.label);
			console.log('Reward index:', rewardIndex);
			console.log('Current rotation:', rotation);
			console.log('Current normalized:', currentNormalizedRotation);
			console.log('Target segment center:', targetSegmentCenter);
			console.log('Target angle:', targetAngle);
			console.log('Rotation difference:', rotationDifference);
			console.log('Final rotation:', finalRotation);
			console.log('========================');
			
			setRotation(finalRotation);

			if (onSpinStart) {
				onSpinStart();
			}

			// Complete the spin after animation with proper timing
			const animationDuration = 4000; // 4 seconds
			setTimeout(() => {
				setIsAnimating(false);
				if (onSpinComplete) {
					onSpinComplete(selectedReward);
				}
			}, animationDuration);
		}
	}, [isSpinning, selectedReward, onSpinStart, onSpinComplete]); // Removed isAnimating from dependencies

	const segmentAngle = 360 / SPIN_REWARDS.length;

	return (
		<div className='flex flex-col items-center gap-3'>
			{/* Wheel Container with Indicator - Optimal size */}
			<div className='relative w-60 h-60'>
				{/* Fixed Pointer - Positioned at the top center, pointing down into the wheel */}
				<div className='absolute top-2 left-1/2 transform -translate-x-1/2 z-30'>
					<div 
						className='w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-yellow-400'
						style={{
							filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))',
						}}
					/>
				</div>

				{/* Wheel */}
				<motion.div
					className='w-full h-full rounded-full border-4 border-yellow-400 relative overflow-hidden shadow-2xl'
					animate={{ rotate: rotation }}
					transition={{ 
						duration: 4, 
						ease: [0.25, 0.46, 0.45, 0.94], // Smooth deceleration
						type: 'tween'
					}}
				>
					{SPIN_REWARDS.map((reward, index) => {
						const startAngle = index * segmentAngle;
						const endAngle = (index + 1) * segmentAngle;
						const midAngle = startAngle + (segmentAngle / 2);
						
						// Calculate text position - Adjusted for optimal wheel size
						const radius = 75; // Distance from center for text (optimal size)
						const textAngleRad = (midAngle - 90) * (Math.PI / 180); // -90 to start from top
						const x = 120 + radius * Math.cos(textAngleRad); // Adjusted center point
						const y = 120 + radius * Math.sin(textAngleRad); // Adjusted center point

						return (
							<div key={reward.id}>
								{/* Segment background */}
								<div
									className='absolute w-full h-full'
									style={{
										background: `conic-gradient(from ${startAngle}deg, ${reward.color} 0deg, ${reward.color} ${segmentAngle}deg, transparent ${segmentAngle}deg)`,
										clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((startAngle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((startAngle - 90) * Math.PI / 180)}%, ${50 + 50 * Math.cos((endAngle - 90) * Math.PI / 180)}% ${50 + 50 * Math.sin((endAngle - 90) * Math.PI / 180)}%)`,
									}}
								/>

								{/* Segment border lines */}
								<div
									className='absolute w-full h-full'
									style={{
										transform: `rotate(${startAngle}deg)`,
										transformOrigin: '50% 50%',
									}}
								>
									<div className='absolute w-0.5 h-1/2 bg-white/30 left-1/2 top-0 transform -translate-x-1/2' />
								</div>

								{/* Reward Text */}
								<div
									className='absolute text-white font-bold text-center pointer-events-none'
									style={{
										left: `${x}px`,
										top: `${y}px`,
										transform: `translate(-50%, -50%) rotate(${midAngle}deg)`,
										textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
										zIndex: 10,
									}}
								>
									{reward.type === 'ton' ? (
										<div className='flex flex-col items-center'>
											<span className='text-sm font-black leading-none whitespace-nowrap'>
												{reward.displayValue}
											</span>
										</div>
									) : (
										<div className='flex flex-col items-center'>
											<span className='text-sm font-black leading-none'>
												{reward.displayValue}
											</span>
											<span className='text-xs font-bold opacity-90 leading-none'>
												STON
											</span>
										</div>
									)}
								</div>
							</div>
						);
					})}

					{/* Center circle - Optimal size */}
					<div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg border-3 border-white z-20'>
						<Sparkles className='h-5 w-5 text-white' />
					</div>
				</motion.div>
			</div>
		</div>
	);
};

// Updated Spin Modal Component - FIXED STATE MANAGEMENT
const SpinModal = ({
	isOpen,
	onClose,
	user,
	refreshUserData,
	onSpinComplete,
}) => {
	const { toast } = useToast();
	const [isSpinning, setIsSpinning] = useState(false);
	const [spinResult, setSpinResult] = useState(null);
	const [showResult, setShowResult] = useState(false);
	const [selectedReward, setSelectedReward] = useState(null);
	const [currentUser, setCurrentUser] = useState(user);
	const [showAdAfterSpin, setShowAdAfterSpin] = useState(false);
	const [isLoadingAd, setIsLoadingAd] = useState(false);
	const [gigapubInitialized, setGigapubInitialized] = useState(false);

	// Update current user when user prop changes
	useEffect(() => {
		setCurrentUser(user);
	}, [user]);

	// Initialize GigaPub when component mounts
	useEffect(() => {
		const initializeGigaPub = async () => {
			try {
				console.log('Initializing GigaPub for spin ads...');
				const adminConfig = await getAdminConfig();
				
				if (adminConfig.gigapubEnabled && adminConfig.gigapubProjectId) {
					console.log('GigaPub is enabled, initializing with project ID:', adminConfig.gigapubProjectId);
					console.log('Admin config:', { 
						gigapubEnabled: adminConfig.gigapubEnabled, 
						gigapubProjectId: adminConfig.gigapubProjectId 
					});
					
					gigapub.initialize({
						projectId: adminConfig.gigapubProjectId
					});
					
					// Wait a bit and then check if it's available
					setTimeout(() => {
						const isAvailable = gigapub.isAvailable();
						const status = gigapub.getStatus();
						console.log('📊 GigaPub availability after init:', isAvailable);
						console.log('📊 GigaPub status after init:', status);
						console.log('📊 Window.showGiga available:', typeof window.showGiga === 'function');
						console.log('📊 Window.gigapubReady flag:', window.gigapubReady);
						setGigapubInitialized(isAvailable);
						
						if (!isAvailable) {
							console.error('🚨 GigaPub failed to initialize properly!');
							console.error('🚨 Please check admin settings and GigaPub project ID');
						} else {
							console.log('✅ GigaPub initialized successfully and ready for spin ads!');
						}
					}, 2000);
				} else {
					console.log('GigaPub is disabled or project ID not set:', {
						enabled: adminConfig.gigapubEnabled,
						projectId: adminConfig.gigapubProjectId
					});
					setGigapubInitialized(false);
				}
			} catch (error) {
				console.error('Failed to initialize GigaPub:', error);
				setGigapubInitialized(false);
			}
		};

		initializeGigaPub();
	}, []);

	// Reset states when modal opens/closes
	useEffect(() => {
		if (!isOpen) {
			setIsSpinning(false);
			setSpinResult(null);
			setShowResult(false);
			setSelectedReward(null);
			setShowAdAfterSpin(false);
			setIsLoadingAd(false);
			// Note: Don't reset gigapubInitialized as it should persist
		}
	}, [isOpen]);

	// Auto-hide result after 2 seconds and show ad (reduced from 5 seconds for faster experience)
	useEffect(() => {
		if (showResult) {
			const timer = setTimeout(() => {
				setShowResult(false);
				setSpinResult(null);
				// Trigger ad after showing the congratulations message
				setShowAdAfterSpin(true);
			}, 2000);
			return () => clearTimeout(timer);
		}
	}, [showResult]);

	// Handle showing GigaPub ad after spin completion
	useEffect(() => {
		console.log('🎯 SPIN AD EFFECT TRIGGERED:', {
			showAdAfterSpin,
			isLoadingAd,
			gigapubInitialized,
			gigapubAvailable: gigapubInitialized ? gigapub.isAvailable() : 'N/A'
		});
		
		if (showAdAfterSpin && !isLoadingAd) {
			// Check if GigaPub is properly initialized and available
			if (gigapubInitialized) {
				console.log('🎯 SPIN AD TRIGGER: Starting GigaPub ad...');
				setIsLoadingAd(true);
				
				// Check if GigaPub is available before showing ad
				const isAvailable = gigapub.isAvailable();
				console.log('🎯 GigaPub availability check:', isAvailable);
				console.log('🎯 GigaPub detailed status:', gigapub.getStatus());
				
				if (!isAvailable) {
					console.log('🚫 GigaPub is not available, skipping ad entirely');
					setIsLoadingAd(false);
					setShowAdAfterSpin(false);
					return;
				}
				
				console.log('🎯 Showing GigaPub ad after spin completion...');
				gigapub.showAd({
					onComplete: () => {
						console.log('✅ GigaPub post-spin ad completed successfully');
						setIsLoadingAd(false);
						setShowAdAfterSpin(false);
						// Optional: Add extra reward for watching ad
						toast({
							title: '🎁 Bonus Reward!',
							description: 'Thank you for watching the ad!',
							variant: 'default',
							className: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-500',
						});
					},
					onClose: () => {
						console.log('❌ GigaPub post-spin ad closed');
						setIsLoadingAd(false);
						setShowAdAfterSpin(false);
					},
					onError: (error) => {
						console.log('⚠️ GigaPub post-spin ad error:', error);
						setIsLoadingAd(false);
						setShowAdAfterSpin(false);
						// Don't show error toast for ads - just silently continue
					}
				});
			} else {
				// If GigaPub is not initialized, skip the ad entirely
				console.log('🚫 GigaPub not initialized, skipping post-spin ad entirely');
				setShowAdAfterSpin(false);
			}
		}
	}, [showAdAfterSpin, isLoadingAd, gigapubInitialized, toast]);

	const handleSpin = async () => {
		// Check if user has free spins
		if ((currentUser.freeSpins || 0) <= 0) {
			// Show referral prompt instead of error
			toast({
				title: 'No Free Spins Available! 🎯',
				description: 'Refer friends to earn free spins and win STON rewards!',
				variant: 'default',
				className: 'bg-gradient-to-r from-orange-600 to-red-600 text-white border-orange-500',
			});
			
			// Keep modal open but show referral section
			setShowResult(false);
			setSpinResult(null);
			return;
		}

		// Reset previous states
		setShowResult(false);
		setSpinResult(null);

		// Pre-select the reward based on weighted probability
		const preSelectedReward = selectWeightedReward();
		setSelectedReward(preSelectedReward);
		setIsSpinning(true);
	};

	// Handle spin completion from wheel component - FIXED TIMING
	const handleSpinComplete = async (detectedReward) => {
		try {
			// Use the detected reward (which should match the pre-selected one)
			const finalReward = detectedReward || selectedReward;
			
			if (!finalReward) {
				throw new Error('No reward detected');
			}
			
			// Update user balance and reduce free spins (referral type - withdrawal only)
			await updateUserBalanceByType(currentUser.id, finalReward.actualReward, 'referral');

			// Update free spins count
			const userRef = doc(db, 'users', currentUser.id);
			await updateDoc(userRef, {
				freeSpins: increment(-1),
				totalSpinsUsed: increment(1),
				lastSpinDate: new Date(),
				totalSpinRewards: increment(finalReward.actualReward),
			});

			// Update local user state immediately for live updates
			const updatedUser = {
				...currentUser,
				freeSpins: (currentUser.freeSpins || 0) - 1,
				balance: (currentUser.balance || 0) + finalReward.actualReward,
			};

			setCurrentUser(updatedUser);
			setSpinResult(finalReward);
			setIsSpinning(false);
			setShowResult(true);

			// Call the callback to update parent component
			if (onSpinComplete) {
				onSpinComplete(updatedUser);
			}

			// Refresh user data
			if (refreshUserData) {
				refreshUserData();
			}

			// Show correct reward message based on the actual reward
			const rewardMessage = finalReward.type === 'ton' 
				? `You won ${finalReward.displayValue}!`
				: `You won ${finalReward.actualReward.toLocaleString()} STON!`;

			toast({
				title: 'Congratulations! 🎉',
				description: rewardMessage,
				variant: 'success',
				className: 'bg-[#1a1a1a] text-white',
			});
		} catch (error) {
			console.error('Spin error:', error);
			setIsSpinning(false);
			setSelectedReward(null);
			setShowResult(false);
			toast({
				title: 'Spin failed',
				description: 'Please try again later.',
				variant: 'destructive',
				className: 'bg-[#1a1a1a] text-white',
			});
		}
	};

	const handleClose = () => {
		if (!isSpinning && !isLoadingAd) {
			setShowResult(false);
			setSpinResult(null);
			setSelectedReward(null);
			setShowAdAfterSpin(false);
			onClose();
		}
	};

	if (!isOpen) return null;

	return (
		<div 
			className='fixed top-0 left-0 w-full h-full bg-black/90 backdrop-blur-sm z-50' 
			style={{ 
				display: 'flex', 
				alignItems: 'center', 
				justifyContent: 'center',
				position: 'fixed',
				top: '0',
				left: '0',
				right: '0',
				bottom: '0'
			}}
		>
			<motion.div
				initial={{ scale: 0.8, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				exit={{ scale: 0.8, opacity: 0 }}
				className='bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-600/50 text-white w-full max-w-sm p-3 rounded-3xl shadow-2xl'
				style={{ 
					margin: '1rem',
					maxHeight: 'calc(100vh - 2rem)',
					minHeight: 'auto'
				}}
			>
				{/* Close Button */}
				<button
					className='absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10'
					onClick={handleClose}
					disabled={isSpinning || isLoadingAd}
				>
					<X className='w-6 h-6' />
				</button>

				{/* Header */}
				<div className='text-center mb-3'>
					<h2 className='text-xl font-bold text-center'>
						🎰 <span className='bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent'>Lucky Spin</span>
						</h2>
					<p className='text-gray-300 text-xs mt-1'>
						Free spins available:{' '}
						<span className='text-yellow-400 font-bold'>
							{currentUser.freeSpins || 0}
						</span>
					</p>
				</div>

				{/* Spin Wheel */}
				<div className='flex justify-center mb-3'>
					<SpinWheel
						isSpinning={isSpinning}
						selectedReward={selectedReward}
						onSpinStart={() => {}}
						onSpinComplete={handleSpinComplete}
					/>
				</div>

				{/* Result Display */}
				<AnimatePresence>
					{showResult && spinResult && (
						<motion.div
							initial={{ opacity: 0, scale: 0.8, y: 20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.8, y: -20 }}
							transition={{ duration: 0.5, ease: 'easeOut' }}
							className='text-center mb-6'
						>
							<div className='bg-gradient-to-r from-green-600/30 to-emerald-600/30 border-2 border-green-500/60 rounded-2xl p-3 shadow-xl'>
								<motion.div
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
								>
									<h3 className='text-lg font-bold text-green-400 mb-2 flex items-center justify-center gap-2'>
										🎉 Congratulations!
									</h3>
								</motion.div>
								<motion.div
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.4 }}
								>
									<p className='text-white text-lg mb-1'>You won</p>
									{spinResult.type === 'ton' ? (
										<p className='text-2xl font-bold text-yellow-400 mb-1'>
											{spinResult.displayValue}
										</p>
									) : (
										<p className='text-2xl font-bold text-yellow-400 mb-1'>
											{spinResult.actualReward.toLocaleString()} STON
										</p>
									)}
									<p className='text-xs text-gray-300'>
										Added to your balance!
									</p>
								</motion.div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Ad Loading Display */}
				{isLoadingAd && (
					<motion.div
						initial={{ opacity: 0, scale: 0.8, y: 20 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.8, y: -20 }}
						transition={{ duration: 0.5, ease: 'easeOut' }}
						className='text-center mb-6'
					>
						<div className='bg-gradient-to-r from-blue-600/30 to-indigo-600/30 border-2 border-blue-500/60 rounded-2xl p-3 shadow-xl'>
							<div className='flex items-center justify-center gap-2 mb-2'>
								<Loader2 className='h-5 w-5 animate-spin text-blue-400' />
								<h3 className='text-lg font-bold text-blue-400'>Loading GigaPub Ad...</h3>
							</div>
							<p className='text-sm text-gray-300'>
								Please wait while we load your exclusive spin reward ad
							</p>
						</div>
					</motion.div>
				)}

				{/* Action Buttons - Hide when showing result or loading ad */}
				{!showResult && !isLoadingAd && (
					<div className='space-y-1.5 mb-3'>
						<Button
							onClick={handleSpin}
							disabled={isSpinning}
							className={`w-full h-9 ${
								(currentUser.freeSpins || 0) > 0
									? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
									: 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700'
							} text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm`}
						>
							{isSpinning ? (
								<>
									<Loader2 className='h-3 w-3 mr-1 animate-spin' />
									Spinning...
								</>
							) : (currentUser.freeSpins || 0) > 0 ? (
								<>
									<RotateCcw className='h-3 w-3 mr-1' />
									Use Free Spin ({currentUser.freeSpins || 0} left)
								</>
							) : (
								<>
									<UserPlus className='h-3 w-3 mr-1' />
									Refer Friends to Get Free Spins
								</>
							)}
						</Button>

						<Button
							onClick={handleClose}
							variant='outline'
							disabled={isSpinning || isLoadingAd}
							className='w-full h-7 bg-transparent border border-gray-500/50 text-gray-300 hover:bg-gray-600/20 hover:border-gray-400 rounded-xl disabled:opacity-50 text-xs'
						>
							{isSpinning ? 'Please wait...' : isLoadingAd ? 'Loading ad...' : 'Close'}
						</Button>
					</div>
				)}

				{/* How to earn spins - Hide when showing result or loading ad */}
				{!showResult && !isLoadingAd && (
					<div className='bg-gradient-to-r from-orange-600/10 to-orange-800/10 backdrop-blur-sm border border-orange-500/20 p-2 rounded-xl'>
						<h3 className='text-xs font-semibold text-orange-400 mb-1 text-center flex items-center justify-center gap-1'>
							<Gift className='h-3 w-3' />
							How to earn free spins
						</h3>
						<div className='space-y-0.5 text-xs text-gray-300'>
							<p>• Get 1 free spin for each successful referral</p>
							<p>• Invite friends to join and earn more spins</p>
							<p>• Win STON rewards with every spin</p>
						</div>
					</div>
				)}
			</motion.div>
		</div>
	);
};

// Main ReferralSection Component - UPDATED
const ReferralSection = ({ user, refreshUserData }) => {
	const { toast } = useToast();
	const { pauseAdTimer, resumeAdTimer } = useAdTimer();
	const [referredUsers, setReferredUsers] = useState([]);
	const [referrerInfo, setReferrerInfo] = useState(null);
	const [loadingReferrals, setLoadingReferrals] = useState(true);
	const [showQRCodePopup, setShowQRCodePopup] = useState(false);
	const [showSpinModal, setShowSpinModal] = useState(false);
	const [copying, setCopying] = useState(false);
	const [currentUser, setCurrentUser] = useState(user);

	// Update current user when user prop changes
	useEffect(() => {
		setCurrentUser(user);
	}, [user]);

	// Pause/resume ad timer when spin modal opens/closes AND prevent body scroll
	useEffect(() => {
		if (showSpinModal) {
			console.log('🎯 Spin modal opened - pausing ad timer and preventing scroll');
			pauseAdTimer();
			// Prevent body scroll when modal is open
			document.body.style.overflow = 'hidden';
		} else {
			console.log('🎯 Spin modal closed - resuming ad timer and enabling scroll');
			resumeAdTimer();
			// Restore body scroll when modal is closed
			document.body.style.overflow = 'unset';
		}

		// Cleanup: always restore scroll on unmount
		return () => {
			resumeAdTimer();
			document.body.style.overflow = 'unset';
		};
	}, [showSpinModal, pauseAdTimer, resumeAdTimer]);

	const referralLink =
		currentUser.referralLink || generateReferralLink(currentUser.id);

	const copyReferralLink = () => {
		if (!referralLink) {
			toast({
				title: 'Referral link not available',
				variant: 'destructive',
				className: 'bg-[#1a1a1a] text-white',
			});
			return;
		}
		navigator.clipboard
			.writeText(referralLink)
			.then(() => {
				setCopying(true);
				toast({
					title: 'Referral Link Copied!',
					variant: 'success',
					className: 'bg-[#1a1a1a] text-white',
				});
				setTimeout(() => setCopying(false), 1200);
			})
			.catch((err) => {
				toast({
					title: 'Failed to copy link',
					description: err.message,
					variant: 'destructive',
					className: 'bg-[#1a1a1a] text-white',
				});
			});
	};

	const shareOnTelegram = () => {
		const encodedLink = encodeURIComponent(referralLink);
		const shareUrl = `https://t.me/share/url?url=${encodedLink}`;
		window.open(shareUrl, '_blank');
	};

	const handleSpinModalClose = () => {
		setShowSpinModal(false);
		// Refresh user data when modal closes to update the main page
		if (refreshUserData) {
			refreshUserData();
		}
	};

	// Handle spin completion to update local state immediately
	const handleSpinComplete = (updatedUser) => {
		setCurrentUser(updatedUser);
	};

	useEffect(() => {
		const fetchReferredUsers = async () => {
			setLoadingReferrals(true);
			const referredIds = currentUser.referredUsers || [];
			const fetchedUsers = await Promise.all(
				referredIds.map(async (uid) => {
					const ref = doc(db, 'users', uid);
					const snap = await getDoc(ref);
					if (snap.exists()) {
						const data = snap.data();
						return {
							id: uid,
							name: data.firstName || data.username || `User ${uid}`,
							photo: data.profilePicUrl || defaultAvatar,
						};
					}
					return null;
				})
			);
			setReferredUsers(fetchedUsers.filter(Boolean));
			setLoadingReferrals(false);
		};

		const fetchReferrerInfo = async () => {
			if (currentUser.invitedBy) {
				const ref = doc(db, 'users', currentUser.invitedBy);
				const snap = await getDoc(ref);
				if (snap.exists()) {
					const data = snap.data();
					setReferrerInfo({
						id: currentUser.invitedBy,
						name:
							data.firstName ||
							data.username ||
							`User ${currentUser.invitedBy}`,
						photo: data.profilePicUrl || defaultAvatar,
					});
				}
			}
		};

		fetchReferredUsers();
		fetchReferrerInfo();
	}, [currentUser.referredUsers, currentUser.invitedBy]);

	return (
		<div
			className={`relative w-full min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#1a1a1a] text-white ${showSpinModal ? 'overflow-hidden' : 'overflow-y-auto'}`}
			style={{
				touchAction: showSpinModal ? 'none' : 'pan-y',
				userSelect: 'none',
				WebkitUserSelect: 'none',
				WebkitTouchCallout: 'none',
			}}
		>
			{/* Floating Spin Button - Now available for all users */}
			<FloatingSpinButton
				spinsAvailable={currentUser.freeSpins || 0}
				hasSpins={(currentUser.freeSpins || 0) > 0}
				onClick={() => setShowSpinModal(true)}
			/>

			<div className='flex flex-col items-center px-4 py-4 pb-24'>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5 }}
					className='w-full max-w-md flex flex-col items-center gap-4'
				>
					{/* Header */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
						className='text-center'
					>
						<h2 className='text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent'>
							Invite & Earn
						</h2>
						<p className='text-xs text-gray-400 mt-1'>
							Share your link with friends and earn STON
						</p>
					</motion.div>

					{/* Referral Stats */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
						className='w-full grid grid-cols-2 gap-3'
					>
						<div className='bg-gradient-to-r from-green-600/20 to-emerald-600/20 backdrop-blur-sm border border-green-500/30 p-3 rounded-2xl text-center'>
							<div className='flex items-center justify-center gap-1 mb-1'>
								<Gift className='h-4 w-4 text-green-400' />
								<p className='text-xs font-semibold text-white'>Referrals</p>
							</div>
							<p className='text-xl font-bold text-green-400'>
								{currentUser.referrals || 0}
							</p>
						</div>
						<div className='bg-gradient-to-r from-purple-600/20 to-pink-600/20 backdrop-blur-sm border border-purple-500/30 p-3 rounded-2xl text-center'>
							<div className='flex items-center justify-center gap-1 mb-1'>
								<RotateCcw className='h-4 w-4 text-purple-400' />
								<p className='text-xs font-semibold text-white'>Free Spins</p>
							</div>
							<p className='text-xl font-bold text-purple-400'>
								{currentUser.freeSpins || 0}
							</p>
						</div>
					</motion.div>

					{/* Referral Link Section */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4 }}
						className='w-full'
					>
						<h3 className='text-sm font-semibold text-center mb-2 text-gray-300'>
							Your Referral Link
						</h3>
						<div className='bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-600/50 rounded-2xl p-2'>
							<div className='flex items-center gap-2'>
								<Input
									type='text'
									readOnly
									value={referralLink}
									className='flex-grow text-xs bg-transparent border-none text-white'
								/>
								<button
									type='button'
									className='flex items-center justify-center p-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 transition-all duration-200 active:scale-95'
									onClick={copyReferralLink}
								>
									<Copy
										className={`h-4 w-4 ${
											copying ? 'text-green-400' : 'text-blue-400'
										} transition-colors`}
									/>
								</button>
								<button
									type='button'
									className='flex items-center justify-center p-1 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 transition-all duration-200 active:scale-95'
									onClick={() => setShowQRCodePopup(true)}
								>
									<QrCode className='h-4 w-4 text-purple-400' />
								</button>
							</div>
						</div>
					</motion.div>

					{/* Share Buttons */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.5 }}
						className='w-full space-y-2'
					>
						<Button
							onClick={shareOnTelegram}
							className='w-full h-10 bg-[#0088cc] hover:bg-[#006699] text-white rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105'
						>
							<TelegramIcon className='w-4 h-4 mr-2' />
							Share on Telegram
						</Button>

						{(currentUser.freeSpins || 0) > 0 && (
							<Button
								onClick={() => setShowSpinModal(true)}
								className='w-full h-10 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-2xl border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105'
							>
								<RotateCcw className='w-4 h-4 mr-2' />
								Use Free Spin ({currentUser.freeSpins || 0})
							</Button>
						)}
					</motion.div>

					{/* Referred Users Section */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.6 }}
						className='w-full'
					>
						{loadingReferrals ? (
							<div className='flex justify-center items-center py-8'>
								<Loader2 className='h-6 w-6 animate-spin text-primary' />
								<span className='ml-2 text-gray-400 text-sm'>
									Loading referrals...
								</span>
							</div>
						) : referredUsers.length > 0 ? (
							<div>
								<div className='flex items-center gap-2 mb-3'>
									<Users className='h-4 w-4 text-blue-400' />
									<p className='text-sm font-semibold text-white'>
										Referred Users
									</p>
								</div>
								<div className='grid grid-cols-2 gap-2'>
									{referredUsers.map((u, index) => (
										<motion.div
											key={u.id}
											initial={{ opacity: 0, y: 20 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: 0.7 + index * 0.1 }}
											className='bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-600/50 p-2 rounded-xl flex items-center gap-2 hover:scale-105 transition-all duration-300'
										>
											<Avatar className='h-6 w-6'>
												<AvatarImage src={u.photo} />
												<AvatarFallback className='bg-gradient-to-br from-blue-600 to-purple-700 text-white text-xs'>
													{u.name?.charAt(0)}
												</AvatarFallback>
											</Avatar>
											<span className='text-xs truncate text-white'>
												{u.name}
											</span>
										</motion.div>
									))}
								</div>
							</div>
						) : (
							<motion.div
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								className='text-center py-8'
							>
								<div className='bg-gray-800/50 border border-gray-600/50 rounded-2xl p-6'>
									<UserPlus className='h-12 w-12 text-gray-400 mx-auto mb-4' />
									<p className='text-gray-400 text-sm'>No referrals yet</p>
									<p className='text-gray-500 text-xs mt-2'>
										Start sharing your link to see your referrals here
									</p>
								</div>
							</motion.div>
						)}
					</motion.div>

					{/* Referrer Info */}
					{referrerInfo && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.8 }}
							className='w-full'
						>
							<div className='bg-gradient-to-r from-blue-600/20 to-blue-800/20 backdrop-blur-sm border border-blue-500/30 p-3 rounded-2xl'>
								<div className='flex items-center gap-3'>
									<Avatar className='h-8 w-8 border-2 border-blue-400/50'>
										<AvatarImage src={referrerInfo.photo} />
										<AvatarFallback className='bg-gradient-to-br from-blue-600 to-purple-700 text-white text-xs'>
											{referrerInfo.name?.charAt(0)}
										</AvatarFallback>
									</Avatar>
									<div>
										<p className='text-xs text-blue-400 font-medium'>
											Referred by
										</p>
										<p className='text-sm text-white font-semibold'>
											{referrerInfo.name}
										</p>
									</div>
								</div>
							</div>
						</motion.div>
					)}

					{/* Tips Section */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.9 }}
						className='w-full'
					>
						<div className='bg-gradient-to-r from-orange-600/10 to-orange-800/10 backdrop-blur-sm border border-orange-500/20 p-3 rounded-2xl'>
							<h3 className='text-sm font-semibold text-orange-400 mb-2 text-center'>
								💡 Referral Tips
							</h3>
							<div className='space-y-2 text-xs text-gray-300'>
								<p>• Share your link on social media platforms</p>
								<p>• Invite friends and family members</p>
								<p>• Help your referrals complete their first tasks</p>
								<p>• Earn STON for every successful referral</p>
								<p>• Get 1 free spin for each successful refer</p>
							</div>
						</div>
					</motion.div>
				</motion.div>

				{/* QR Code Popup */}
				<AnimatePresence>
					{showQRCodePopup && (
						<div className='fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50 p-4'>
							<motion.div
								initial={{ scale: 0.9, opacity: 0 }}
								animate={{ scale: 1, opacity: 1 }}
								exit={{ scale: 0.9, opacity: 0 }}
								className='bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-600/50 text-white w-full max-w-sm p-4 rounded-2xl shadow-2xl relative'
							>
								{/* Close Button */}
								<button
									className='absolute top-4 right-4 text-gray-400 hover:text-white transition-colors'
									onClick={() => setShowQRCodePopup(false)}
								>
									<X className='w-6 h-6' />
								</button>

								<h3 className='text-lg font-bold mb-4 text-center text-white'>
									Your QR Code
								</h3>

								{/* QR Code - Centered */}
								<div className='flex justify-center mb-4'>
									<div className='bg-white p-3 rounded-xl'>
										<QRCode value={referralLink} size={180} />
									</div>
								</div>

								{/* Referral Link Display */}
								<div className='bg-gray-800/50 border border-gray-600/50 p-3 rounded-xl mb-4'>
									<p className='text-xs text-gray-400 mb-2 text-center'>
										Referral Link
									</p>
									<div className='flex items-center gap-2'>
										<p className='text-xs text-white break-all flex-1 text-center'>
											{referralLink}
										</p>
										<button
											type='button'
											className='flex items-center justify-center p-1 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 transition-all duration-200 active:scale-95 flex-shrink-0'
											onClick={copyReferralLink}
										>
											<Copy
												className={`h-4 w-4 ${
													copying ? 'text-green-400' : 'text-blue-400'
												} transition-colors`}
											/>
										</button>
									</div>
								</div>

								{/* Action Buttons */}
								<div className='space-y-2'>
									<Button
										onClick={shareOnTelegram}
										className='w-full h-10 bg-[#0088cc] hover:bg-[#006699] text-white rounded-xl'
									>
										<TelegramIcon className='w-4 h-4 mr-2' />
										Share on Telegram
									</Button>
									<Button
										onClick={() => setShowQRCodePopup(false)}
										variant='outline'
										className='w-full h-10 bg-transparent border-2 border-gray-500/50 text-gray-300 hover:bg-gray-600/20 hover:border-gray-400 rounded-xl'
									>
										Close
									</Button>
								</div>
							</motion.div>
						</div>
					)}
				</AnimatePresence>

				{/* Spin Modal */}
				<AnimatePresence>
					{showSpinModal && (
						<SpinModal
							isOpen={showSpinModal}
							onClose={handleSpinModalClose}
							user={currentUser}
							refreshUserData={refreshUserData}
							onSpinComplete={handleSpinComplete}
						/>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
};

export default ReferralSection;
