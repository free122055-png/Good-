import React, { memo } from 'react';
import { Bell } from 'lucide-react';

interface HeaderProps {
  onOpenMenu: () => void;
  onOpenNotifications: () => void;
  onOpenAdmin: () => void;
  unreadCount?: number;
  isDarkMode?: boolean;
}

export const Header: React.FC<HeaderProps> = memo(({ onOpenMenu, onOpenNotifications, onOpenAdmin, unreadCount = 0, isDarkMode = true }) => {
  const [clickCount, setClickCount] = React.useState(0);

  const handleLogoClick = () => {
    const nextCount = clickCount + 1;
    setClickCount(nextCount);
    if (nextCount >= 5) {
      onOpenAdmin();
      setClickCount(0);
    }
  };

  return (
    <header className={`px-5 pt-3 pb-2 flex items-center justify-between ${isDarkMode ? 'bg-[#0a0d14] border-slate-800' : 'bg-white border-slate-100'} sticky top-0 z-30 select-none border-b`}>
      {/* Left: BINISTA Logo */}
      <div 
        className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
        onClick={handleLogoClick}
      >
        <div className="w-8 h-8 rounded-xl overflow-hidden shadow-sm flex items-center justify-center bg-white border border-slate-100">
          <img src="/logo.svg" alt="BINISTA Logo" className="w-full h-full object-cover" />
        </div>
        <span className="font-extrabold text-xl tracking-tight text-black font-sans">
          BINISTA
        </span>
      </div>



      {/* Right: Notifications & Menu Icons */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenNotifications}
          aria-label="Open notifications"
          className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 relative transition cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
          className="w-8 h-8 flex flex-col items-end justify-center gap-[5px] hover:opacity-70 transition-opacity p-1 cursor-pointer"
        >
          <span className="w-5 h-[2.5px] bg-black rounded-full" />
          <span className="w-3.5 h-[2.5px] bg-black rounded-full" />
        </button>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
