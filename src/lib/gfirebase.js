import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';

// Get user's energy
export const getUserEnergy = async (userId) => {
  if (!userId) return 0;
  try {
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    return userDoc.exists() ? userDoc.data().energy || 0 : 0;
  } catch (error) {
    console.error("Error fetching user energy:", error);
    return 0;
  }
};

// Update user's energy
export const updateUserEnergy = async (userId, amount) => {
  if (!userId) return false;
  try {
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, { energy: increment(amount) });
    return true;
  } catch (error) {
    console.error("Error updating user energy:", error);
    return false;
  }
};

// Update user's balance (add earned STON)
export const updateUserBalance = async (userId, amount) => {
  if (!userId || typeof amount !== 'number') return false;
  try {
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, { balance: increment(amount) });
    return true;
  } catch (error) {
    console.error("Error updating user balance:", error);
    return false;
  }
};
