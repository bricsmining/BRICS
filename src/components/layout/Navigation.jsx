import React from 'react';
import { Home, ListChecks, Users, Trophy, ShieldCheck, Axe } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const Navigation = ({ isAdmin }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/tasks', label: 'Tasks', icon: ListChecks },
    { path: '/mining', label: 'Mining', icon: Axe, standout: true }, // 👈 New standout tab
    { path: '/invite', label: 'Invite', icon: Users },
    { path: '/leaders', label: 'Leaders', icon: Trophy },
    ...(isAdmin ? [{ path: '/admin', label: 'Admin', icon: ShieldCheck }] : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-lg bg-black/60 border-t border-white/10 rounded-t-xl">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          // Distinct style for the Mining tab
          const isStandout = item.standout;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center",
                isStandout ? "w-20 h-20 -mt-4 rounded-full bg-white/10 backdrop-blur-md shadow-lg border border-white/20" : "w-16",
                isActive ? "text-primary drop-shadow-md" : "text-muted-foreground hover:text-white transition"
              )}
            >
              <item.icon
                className={cn(
                  "mb-1",
                  isStandout ? "h-6 w-6" : "h-5 w-5",
                  isActive && "text-primary animate-pulse"
                )}
              />
              <span className={isStandout ? "text-xs font-semibold" : "text-xs"}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
