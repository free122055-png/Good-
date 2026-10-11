import React, { memo } from 'react';
import { Home, Search, Heart, Plus } from 'lucide-react';

export const MessengerIcon: React.FC<{ className?: string; isActive?: boolean }> = ({
  className = 'w-5 h-5',
  isActive = false,
}) => {
  if (isActive) {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
        <path
          d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.518 3.734 7.202V22l3.39-1.86c.92.254 1.89.39 2.876.39 5.523 0 10-4.145 10-9.272C22 6.145 17.523 2 12 2Z"
          fill="currentColor"
        />
        <path
          d="m13.04 14.44-2.58-2.75-5.05 2.75 5.55-5.88 2.65 2.75 4.97-2.75-5.54 5.88Z"
          fill="#ffffff"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M12 2.75C6.89 2.75 2.75 6.56 2.75 11.26c0 2.68 1.34 5.08 3.44 6.63v2.79l3.12-1.71c.85.23 1.74.36 2.69.36 5.11 0 9.25-3.81 9.25-8.51S17.11 2.75 12 2.75Z"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m13.04 14.44-2.58-2.75-5.05 2.75 5.55-5.88 2.65 2.75 4.97-2.75-5.54 5.88Z"
        fill="currentColor"
      />
    </svg>
  );
};

export type NavTab = 'home' | 'search' | 'ai' | 'activity' | 'create';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onCreateClick: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = memo(({
  activeTab,
  onTabChange,
  onCreateClick,
}) => {
  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center items-center pointer-events-none px-4">
      <div className="pointer-events-auto flex items-center gap-3">
        {/* Main Floating Pill Nav containing 4 icons */}
        <nav className="bg-white/95 backdrop-blur-xl border border-gray-100 shadow-[0_12px_36px_rgba(0,0,0,0.16)] rounded-full px-4 py-2 flex items-center justify-between gap-2 select-none min-w-[260px]">
          {/* 1. Home Tab */}
          <button
            onClick={() => onTabChange('home')}
            aria-label="Home"
            className={`transition-all duration-200 cursor-pointer ${
              activeTab === 'home'
                ? 'w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-black shadow-inner'
                : 'p-2.5 text-gray-500 hover:text-black'
            }`}
          >
            <Home
              className={`w-5 h-5 ${
                activeTab === 'home' ? 'fill-black text-black stroke-[2.2]' : 'stroke-[2]'
              }`}
            />
          </button>

          {/* 2. Search Tab */}
          <button
            onClick={() => onTabChange('search')}
            aria-label="Search"
            className={`transition-all duration-200 cursor-pointer ${
              activeTab === 'search'
                ? 'w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-black shadow-inner'
                : 'p-2.5 text-gray-500 hover:text-black'
            }`}
          >
            <Search className="w-5 h-5 stroke-[2.2]" />
          </button>

          {/* 3. Messenger Tab */}
          <button
            onClick={() => onTabChange('ai')}
            aria-label="Messenger"
            className={`transition-all duration-200 cursor-pointer ${
              activeTab === 'ai'
                ? 'w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-black shadow-inner'
                : 'p-2.5 text-gray-500 hover:text-black'
            }`}
          >
            <MessengerIcon className="w-5 h-5" isActive={activeTab === 'ai'} />
          </button>

          {/* 4. Activity / Heart Tab */}
          <button
            onClick={() => onTabChange('activity')}
            aria-label="Activity"
            className={`transition-all duration-200 cursor-pointer ${
              activeTab === 'activity'
                ? 'w-11 h-11 rounded-full bg-gray-100 flex items-center justify-center text-black shadow-inner'
                : 'p-2.5 text-gray-500 hover:text-black'
            }`}
          >
            <Heart className={`w-5 h-5 ${activeTab === 'activity' ? 'fill-black text-black' : 'stroke-[2.2]'}`} />
          </button>
        </nav>

        {/* Standalone Circular Create Button (+) */}
        <button
          onClick={() => {
            onTabChange('create');
            onCreateClick();
          }}
          aria-label="Create Video or Story"
          className="w-13 h-13 rounded-full bg-white text-gray-900 border border-gray-100 hover:bg-gray-50 flex items-center justify-center shadow-[0_12px_36px_rgba(0,0,0,0.18)] transition-all active:scale-95 cursor-pointer"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
});

BottomNav.displayName = 'BottomNav';
