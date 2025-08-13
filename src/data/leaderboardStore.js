import { getLeaderboard } from '@/data/firestore/leaderboardActions';

// Fetches the leaderboard data from Firestore
export const getLeaderboardData = async (count = 10) => {
  return await getLeaderboard(count);
};
