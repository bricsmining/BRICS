
import React from 'react';
import { db } from '@/lib/firebase';
import {
  collection, getDocs, query, where, orderBy, limit
} from "firebase/firestore";

// Fetches top users by referrals
export const getLeaderboard = async (count = 10) => {
  const usersColRef = collection(db, "users");
  const q = query(
    usersColRef,
    where("isBanned", "==", false),
    orderBy("referrals", "desc"),
    orderBy("balance", "desc"),
    limit(count)
  );
  try {
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }
};
  