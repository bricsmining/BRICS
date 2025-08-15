import React, { useState, useEffect, useRef } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation
} from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardPage from '@/pages/DashboardPage';
import AdminPage from '@/pages/AdminPage';
import StonDropGame from '@/pages/StonDropGame';
import Navigation from '@/components/layout/Navigation';
import { Toaster } from '@/components/ui/toaster';
import ReferralWelcome from '@/components/ReferralWelcome';
import { initializeAppData } from '@/data';
import { Loader2 } from 'lucide-react';
import { initializeAdNetworks, showRewardedAd } from '@/ads/adsController';
import { setupGlobalErrorHandlers } from '@/utils/errorNotification';

export const UserContext = React.createContext(null);

// Iframe-busting script to prevent our app from being loaded inside iframes
// This is especially important for payment return URLs
(function() {
  if (window.top !== window.self) {
    // Check if we're on a payment return URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'return' || urlParams.get('purchase') === 'success') {
      console.log('🔄 Payment return detected in iframe, sending message to parent window');
      
      // Extract payment info from URL
      const trackId = urlParams.get('track_id') || urlParams.get('trackId');
      const paymentStatus = urlParams.get('status') || 'return';
      
      // Send message to parent window instead of reloading
      window.top.postMessage({
        type: 'payment_return',
        url: window.location.href,
        trackId: trackId,
        status: paymentStatus,
        urlParams: Object.fromEntries(urlParams.entries())
      }, '*');
      
      // Prevent the page from loading further and show minimal content
      document.documentElement.innerHTML = `
        <div style="padding: 20px; text-align: center; font-family: Arial;">
          <h3>🔄 Processing Payment Return...</h3>
          <p>Please wait while we verify your payment.</p>
          <script>
            setTimeout(() => {
              if (window.top && window.top !== window) {
                window.top.postMessage({
                  type: 'payment_return',
                  trackId: '${trackId}',
                  status: '${paymentStatus}'
                }, '*');
              }
            }, 100);
          </script>
        </div>
      `;
      return; // Stop execution
    }
  }
})();

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -10 }
};

const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.25
};

function AppContent({
  isAdmin,
  currentUser
}) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="min-h-[100dvh] bg-[#0f0f0f] text-white"
      >
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<DashboardPage activeView="home" />} />
          <Route path="/tasks" element={<DashboardPage activeView="tasks" />} />
          <Route path="/mining" element={<DashboardPage activeView="mining" />} />
          <Route path="/invite" element={<DashboardPage activeView="invite" />} />
          <Route path="/leaders" element={<DashboardPage activeView="leaders" />} />
          <Route path="/game" element={<StonDropGame />} />
          <Route
            path="/admin"
            element={<AdminPage />}
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);


  // --- AD TIMER LOGIC ---
  const adTimerRef = useRef(null);
  const prevIsGameRoute = useRef(null);

  const isGameRoute = location.pathname === "/game";
  const isAdminRoute = location.pathname === "/admin" || location.pathname.startsWith("/admin/");
  const isAdmin = currentUser?.isAdmin === true;

  // Check if user is from Telegram and is admin (no additional verification needed)
  const isFromTelegramAndAdmin = currentUser && !currentUser.needsTelegram && isAdmin;
  
  // Determine if navigation should be shown
  const shouldShowNavigation = !isGameRoute && (
    // Show navigation for regular routes when user is from Telegram
    (!isAdminRoute && currentUser && !currentUser.needsTelegram) ||
    // Show navigation for admin route only if user is from Telegram, is admin, and verified
    (isAdminRoute && isFromTelegramAndAdmin)
  );

  // Helper to start ad timer
  const startAdTimer = () => {
    if (adTimerRef.current) clearInterval(adTimerRef.current);
    adTimerRef.current = setInterval(() => {
      showRewardedAd({
        onComplete: () => console.log("Ad completed."),
        onClose: () => console.log("Ad closed."),
        onError: (err) => console.error("Ad error:", err)
      });
    }, 2 * 60 * 1000); // 2 minutes
  };

  // Helper to stop ad timer
  const stopAdTimer = () => {
    if (adTimerRef.current) {
      clearInterval(adTimerRef.current);
      adTimerRef.current = null;
    }
  };

  // Manage ad timer based on route
  useEffect(() => {
    // Only start ad timer if not in game and the user is loaded
    if (!isLoading && currentUser && !isGameRoute) {
      startAdTimer();
    } else {
      stopAdTimer();
    }
    prevIsGameRoute.current = isGameRoute;
    // Clean up on unmount
    return () => stopAdTimer();
  }, [isLoading, currentUser, isGameRoute]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Skip user loading for admin route - allow direct access
        if (isAdminRoute) {
          setIsLoading(false);
          return;
        }

        const cachedUser = sessionStorage.getItem("cachedUser");
        if (cachedUser) {
          setCurrentUser(JSON.parse(cachedUser));
        }

        const userData = await initializeAppData();
        if (userData) {
          sessionStorage.setItem("cachedUser", JSON.stringify(userData));
          setCurrentUser(userData);
        } else {
          setError("User not found. Please open from the Telegram bot.");
        }
      } catch (err) {
        console.error("App init error:", err);
        setError("Something went wrong. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeAdNetworks();
    setupGlobalErrorHandlers();
    loadUser();
  }, [isAdminRoute]);



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] text-white">
        <Loader2 className="h-12 w-12 animate-spin text-sky-400" />
        <p className="text-sm text-muted-foreground ml-3">Loading your dashboard...</p>
      </div>
    );
  }

  // Show Telegram warning if user is not in Telegram context, but NOT on /admin
  if (
    currentUser && currentUser.needsTelegram &&
    !isAdminRoute
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] text-white flex-col">
        <div className="bg-[#181818] px-8 py-10 rounded-lg shadow-lg text-center">
          <h1 className="text-2xl font-bold mb-4">SkyTON</h1>
          <p className="mb-6 text-lg">
            Please open this app through the <span className="text-sky-400 font-semibold">SkyTON Telegram Bot</span> to continue.
          </p>
          <a
            href={`https://t.me/${import.meta.env.VITE_BOT_USERNAME || 'xSkyTON_Bot'}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-sky-500 hover:bg-sky-400 text-white px-6 py-2 rounded transition"
          >
            Open in Telegram
          </a>
        </div>
      </div>
    );
  }

  // For non-admin routes, show error if no user data
  if (!isAdminRoute && (error || !currentUser)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f0f] text-red-500 p-4">
        <p className="text-center">{error || "User data could not be loaded."}</p>
      </div>
    );
  }

  return (
    <UserContext.Provider value={{ user: currentUser, setUser: setCurrentUser }}>
      <div className="min-h-screen flex flex-col bg-[#0f0f0f] text-white">
        <main className="flex-grow overflow-x-hidden">
          <AppContent
            isAdmin={isAdmin}
            currentUser={currentUser}
          />
        </main>
        
        {/* Conditionally show navigation based on the logic */}
        {shouldShowNavigation && <Navigation isAdmin={isAdmin} />}
        
        {/* Show admin panel indicator only when navigation is visible and on admin route */}
        {isAdminRoute && shouldShowNavigation && (
          <nav className="w-full bg-[#181818] border-t border-[#222] flex items-center justify-center py-3">
            <span className="text-lg font-semibold tracking-wide text-sky-400">
              Admin Panel
            </span>
          </nav>
        )}
        <Toaster />
        <ReferralWelcome />
      </div>
    </UserContext.Provider>
  );
}

export default function WrappedApp() {
  return (
    <Router>
      <App />
    </Router>
  );
}
