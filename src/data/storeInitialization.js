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
  console.log("Initializing App Data...");
  console.log("🔍 Current URL:", window.location.href);
  console.log("🔍 Search params:", window.location.search);
  const { telegramUser, referrerId } = parseLaunchParams();
  console.log("🔍 Parsed referrerId:", referrerId);
  console.log("🔍 Parsed telegramUser:", telegramUser);

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

  // 3. If any are missing, force warning
  console.warn("No Telegram user or stored session. User must use Telegram WebApp.");
  return { needsTelegram: true };
};
