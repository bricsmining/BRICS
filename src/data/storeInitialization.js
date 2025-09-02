import { getOrCreateUser, getUserById } from '@/data/firestore/userActions';
import { seedInitialTasks } from '@/data/firestore/initActions';
import { parseLaunchParams } from '@/data/telegramUtils';
import { defaultFirestoreTasks } from '@/data/defaults';

/**
 * Initializes app data by restoring the Telegram user session.
 * Uses both sessionStorage and localStorage for robust session restoration.
 * If user is not in Telegram context, signals the UI to show a warning.
 */
export const initializeAppData = async () => {
  const { telegramUser, referrerId, isTelegramContext } = parseLaunchParams();

  // Seed tasks if they don’t already exist
  await seedInitialTasks(defaultFirestoreTasks);

  // 1. If we have Telegram user, get or create user and store in both storages
  if (telegramUser) {
    const userData = await getOrCreateUser(telegramUser, referrerId);
    if (userData) {
      sessionStorage.setItem('userId', userData.id);
      localStorage.setItem('userId', userData.id);
      return userData;
    } else {
      console.error("Failed to get or create user from Telegram WebApp data.");
      return { needsTelegram: true };
    }
  }

  // 2. Fallback: get user from sessionStorage or localStorage, only if ALL Telegram params exist
  const sessionId = sessionStorage.getItem('userId');
  const localId = localStorage.getItem('userId');
  const sessionTgHash = sessionStorage.getItem('tgWebAppHash');
  const sessionTgDataRaw = sessionStorage.getItem('tgWebAppDataRaw');
  const localTgHash = localStorage.getItem('tgWebAppHash');
  const localTgDataRaw = localStorage.getItem('tgWebAppDataRaw');

  // Try sessionStorage first, then fallback to localStorage
  let storedId = sessionId && sessionTgHash && sessionTgDataRaw ? sessionId : null;
  let tgHash = sessionTgHash || null;
  let tgWebAppDataRaw = sessionTgDataRaw || null;
  if (!storedId && localId && localTgHash && localTgDataRaw) {
    storedId = localId;
    tgHash = localTgHash;
    tgWebAppDataRaw = localTgDataRaw;
  }

  if (storedId && tgHash && tgWebAppDataRaw) {
    // Sync sessionStorage and localStorage for robustness
    sessionStorage.setItem('userId', storedId);
    sessionStorage.setItem('tgWebAppHash', tgHash);
    sessionStorage.setItem('tgWebAppDataRaw', tgWebAppDataRaw);
    localStorage.setItem('userId', storedId);
    localStorage.setItem('tgWebAppHash', tgHash);
    localStorage.setItem('tgWebAppDataRaw', tgWebAppDataRaw);

    const existingUser = await getUserById(storedId);
    if (existingUser) {
      console.log("Loaded user from stored session/localStorage ID:", storedId);
      return existingUser;
    }
  }

  // 3. Enhanced decision making based on Telegram context detection
  if (!isTelegramContext) {
    console.warn("No Telegram context detected. User should use Telegram WebApp.");
    return { needsTelegram: true };
  }
  
  // If we detect Telegram context but no user data, there might be a temporary issue
  // Try to be more lenient and allow the user to continue with limited functionality
  console.warn("Telegram context detected but no user data available. Attempting graceful fallback.");
  
  // Check if there's any partial user data we can work with
  const partialUserId = sessionStorage.getItem('userId') || localStorage.getItem('userId');
  if (partialUserId) {
    try {
      const existingUser = await getUserById(partialUserId);
      if (existingUser) {
        console.log("Recovered user from partial session data:", partialUserId);
        return existingUser;
      }
    } catch (error) {
      console.error("Failed to recover user from partial data:", error);
    }
  }
  
  // Final fallback - show Telegram warning
  return { needsTelegram: true };
};
