import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getLeaderboardData } from '@/data';
import { Loader2, Trophy, Crown, Medal, Award, Users, Calendar, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Number formatting function for leaderboard
const formatLeaderboardNumber = (num) => {
  if (!num || num === 0) return '0';
  
  // Show full numbers up to 9,999
  if (num < 10000) {
    return num.toLocaleString();
  }
  
  // Use shortened format for 10K and above
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  
  if (num >= 10000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  
  return num.toLocaleString();
};

const LeaderboardSection = ({ currentUserTelegramId }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [currentUserPosition, setCurrentUserPosition] = useState(null);
  
  // Debug: Log the current user ID to help with debugging
  console.log('[LEADERBOARD] Current user Telegram ID:', currentUserTelegramId);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        console.log(`[LEADERBOARD] Fetching ${filter} leaderboard data...`);
        const data = await getLeaderboardData(filter);
        console.log(`[LEADERBOARD] Received ${data?.length || 0} entries for ${filter}`);
        console.log(`[LEADERBOARD] User IDs in leaderboard:`, data?.map(u => u.id));
        console.log(`[LEADERBOARD] Looking for user ID:`, currentUserTelegramId);
        
        // Find current user's position in the full leaderboard
        const userPosition = currentUserTelegramId ? 
          data?.findIndex(user => String(user.id) === String(currentUserTelegramId)) + 1 : null;
        
        console.log(`[LEADERBOARD] Current user position:`, userPosition || 'Not found');
        setCurrentUserPosition(userPosition > 0 ? userPosition : null);
        setLeaderboard(data || []);
      } catch (error) {
        console.error(`[LEADERBOARD] Error fetching ${filter} data:`, error);
        setLeaderboard([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [filter, currentUserTelegramId]); // Add currentUserTelegramId to dependencies

  const getRankSuffix = (rank) => {
    if (rank === 1) return 'st';
    if (rank === 2) return 'nd';
    if (rank === 3) return 'rd';
    return 'th';
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown className="h-4 w-4 text-yellow-400" />;
      case 2:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 3:
        return <Award className="h-4 w-4 text-yellow-600" />;
      default:
        return <Trophy className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return 'from-yellow-600/20 to-yellow-800/20 border-yellow-500/30';
      case 2:
        return 'from-gray-600/20 to-gray-800/20 border-gray-500/30';
      case 3:
        return 'from-yellow-600/20 to-yellow-700/20 border-yellow-600/30';
      default:
        return 'from-gray-800/50 to-gray-900/50 border-gray-600/50';
    }
  };

  const getRankTextColor = (rank) => {
    switch (rank) {
      case 1:
        return 'text-yellow-400';
      case 2:
        return 'text-gray-400';
      case 3:
        return 'text-yellow-600';
      default:
        return 'text-gray-400';
    }
  };

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
      <div className="flex flex-col items-center px-4 py-4 pb-24">
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
              Leaderboard
            </h2>
            <p className="text-xs text-gray-400 mt-1">See who's leading the referral race</p>
          </motion.div>

          {/* Filter Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full"
          >
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm border border-gray-600/50 p-1 rounded-2xl flex gap-1">
              <button
                className={cn(
                  'flex-1 text-xs px-3 py-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-1',
                  filter === 'all' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                )}
                onClick={() => setFilter('all')}
              >
                <Clock className="h-3 w-3" />
                All Time
              </button>
              <button
                className={cn(
                  'flex-1 text-xs px-3 py-2 rounded-xl transition-all duration-300 flex items-center justify-center gap-1',
                  filter === 'weekly' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                )}
                onClick={() => setFilter('weekly')}
              >
                <Calendar className="h-3 w-3" />
                This Week
              </button>
            </div>
          </motion.div>

          {/* Stats Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="w-full"
          >
            <div className="bg-gradient-to-r from-purple-600/20 to-purple-800/20 backdrop-blur-sm border border-purple-500/30 p-3 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-300">Active Users</p>
                  <p className="text-lg font-bold text-white">
                    {leaderboard.length}
                  </p>
                </div>
                <div className="w-px h-8 bg-purple-500/30"></div>
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-300">
                    {filter === 'weekly' ? 'Top This Week' : 'Top Referrals'}
                  </p>
                  <p className="text-lg font-bold text-white">
                    {leaderboard[0]?.referrals || 0}
                  </p>
                </div>
                <div className="w-px h-8 bg-purple-500/30"></div>
                <div className="text-center flex-1">
                  <p className="text-xs text-gray-300">Period</p>
                  <p className="text-lg font-bold text-white">
                    {filter === 'all' ? '∞' : '7d'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Leaderboard Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="w-full space-y-3"
          >
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-gray-400 text-sm">Loading leaderboard...</span>
              </div>
            ) : leaderboard.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8"
              >
                <div className="bg-gray-800/50 border border-gray-600/50 rounded-2xl p-6">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400 text-sm">No leaders yet</p>
                  <p className="text-gray-500 text-xs mt-2">
                    Start referring friends to appear on the leaderboard!
                  </p>
                </div>
              </motion.div>
            ) : (
              leaderboard.map((user, index) => {
                const rank = index + 1;
                const isCurrentUser = String(user.id) === String(currentUserTelegramId);
                const displayName = user.firstName
                  ? `${user.firstName} ${user.lastName || ''}`.trim()
                  : user.username || `User ${user.id}`;
                const profileImg =
                  user.profilePicUrl ||
                  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQB_4gKwn8q2WBPTwnV14Jmh3B5g56SCiGEBA&usqp=CAU';
                const fallbackAvatar = displayName?.substring(0, 2).toUpperCase() || 'U';

                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className={cn(
                      'bg-gradient-to-r backdrop-blur-sm border p-3 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105',
                      getRankColor(rank),
                      isCurrentUser && 'ring-2 ring-blue-500/50'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Rank */}
                        <div className="flex items-center gap-1">
                          {getRankIcon(rank)}
                          <span className={cn('font-bold text-sm', getRankTextColor(rank))}>
                            #{rank}
                          </span>
                        </div>

                        {/* Avatar */}
                        <Avatar className="h-8 w-8 border-2 border-white/20">
                          <AvatarImage src={profileImg} alt={displayName} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-700 text-white text-xs">
                            {fallbackAvatar}
                          </AvatarFallback>
                        </Avatar>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-sm text-white">
                            {displayName}
                          </p>
                          {isCurrentUser && (
                            <Badge className="bg-blue-600/20 text-blue-300 border-blue-600 text-xs mt-1">
                              You
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Referrals Count & Balance */}
                      <div className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <div>
                            <p className="text-lg font-bold text-white">
                              {user.referrals || 0}
                            </p>
                            <p className="text-xs text-gray-400">
                              {filter === 'weekly' ? 'this week' : 'referrals'}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-semibold text-yellow-400">
                              {formatLeaderboardNumber(user.balance || 0)}
                            </p>
                            <p className="text-xs text-gray-400">STON</p>
                          </div>
                        </div>
                        {filter === 'weekly' && user.totalReferrals && user.totalReferrals > user.referrals && (
                          <p className="text-xs text-gray-500 mt-1">
                            {user.totalReferrals} total referrals
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>

          {/* Current User Position */}
          {!isLoading && leaderboard.length > 0 && currentUserTelegramId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="w-full"
            >
              <div className="bg-gradient-to-r from-blue-600/20 to-blue-800/20 backdrop-blur-sm border border-blue-500/30 p-3 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-white">Your Position</span>
                  </div>
                  <span className="text-sm text-blue-400">
                    {currentUserPosition ? (
                      currentUserPosition <= 20 ? 
                        `#${currentUserPosition} (in top 20)` : 
                        `#${currentUserPosition}`
                    ) : 'Not ranked yet'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tips Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="w-full"
          >
            <div className="bg-gradient-to-r from-green-600/10 to-green-800/10 backdrop-blur-sm border border-green-500/20 p-3 rounded-2xl">
              <h3 className="text-sm font-semibold text-green-400 mb-2 text-center">
                {filter === 'weekly' ? '⚡ Weekly Challenge Tips' : '🏆 How to Climb the Leaderboard'}
              </h3>
              <div className="space-y-2 text-xs text-gray-300">
                {filter === 'weekly' ? (
                  <>
                    <p>• Weekly rankings reset every Monday</p>
                    <p>• Focus on active promotion this week</p>
                    <p>• Share your link in active communities</p>
                    <p>• Engage with potential users daily</p>
                  </>
                ) : (
                  <>
                    <p>• Share your referral link with friends and family</p>
                    <p>• Complete tasks and mine STON to boost your balance</p>
                    <p>• Help your referrals complete tasks for better retention</p>
                    <p>• Rankings consider referrals first, then STON balance</p>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default LeaderboardSection;
