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
                "flex flex-col items-center justify-center transition-all duration-300",
                isStandout ? `
                  w-20 h-20 -mt-4 rounded-full relative
                  bg-gradient-to-br from-blue-500/20 via-purple-500/15 to-cyan-500/20
                  backdrop-blur-xl shadow-2xl 
                  border border-white/30
                  hover:scale-105 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]
                  active:scale-95
                  before:absolute before:inset-0 before:rounded-full 
                  before:bg-gradient-to-br before:from-white/10 before:to-transparent
                  before:backdrop-blur-sm
                  ${isActive ? 'ring-2 ring-blue-400/50 shadow-[0_0_25px_rgba(59,130,246,0.6)]' : ''}
                ` : "w-16",
                isActive && !isStandout ? "text-primary drop-shadow-md" : "",
                !isActive && !isStandout ? "text-muted-foreground hover:text-white transition" : "",
                isStandout ? (isActive ? "text-white drop-shadow-lg" : "text-white/90 hover:text-white") : ""
              )}
            >
              <item.icon
                className={cn(
                  "mb-1 transition-all duration-300 relative z-10",
                  isStandout ? "h-7 w-7" : "h-5 w-5",
                  isStandout && isActive && "animate-pulse drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]",
                  isStandout && !isActive && "drop-shadow-[0_0_4px_rgba(255,255,255,0.3)]",
                  !isStandout && isActive && "text-primary animate-pulse"
                )}
              />
              <span className={cn(
                "transition-all duration-300 relative z-10",
                isStandout ? "text-xs font-bold tracking-wide" : "text-xs",
                isStandout && isActive && "drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]",
                isStandout && !isActive && "drop-shadow-[0_0_2px_rgba(255,255,255,0.4)]"
              )}>
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
