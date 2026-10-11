import React, { useEffect } from 'react';
import {
  X,
  Video,
  User,
  Heart,
  Settings,
  Moon,
  HelpCircle,
  LogOut,
  ChevronRight,
  LogIn,
  ShieldCheck,
  Shield,
} from 'lucide-react';
import { UserData } from '../services/authService';
import { registerBackHandler } from '../services/backNavigationService';
import { UserAvatar } from './UserAvatar';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTrending: () => void;
  onSelectProfile: () => void;
  onSelectSaved: () => void;
  onSelectSettings: () => void;
  onToggleDarkMode: () => void;
  onSelectHelp: () => void;
  onOpenBlueBadge: () => void;
  onSignOut: () => void;
  onOpenAuth: () => void;
  currentUser: UserData | null;
}

export const MenuDrawer: React.FC<MenuDrawerProps> = ({
  isOpen,
  onClose,
  onSelectTrending,
  onSelectProfile,
  onSelectSaved,
  onSelectSettings,
  onToggleDarkMode,
  onSelectHelp,
  onOpenBlueBadge,
  onSignOut,
  onOpenAuth,
  currentUser,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const unregister = registerBackHandler(() => {
      onClose();
      return true;
    });

    return () => unregister();
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const menuItems = [
    { icon: Video, label: 'Trending Videos', count: '6', action: onSelectTrending },
    { icon: User, label: 'My Profile', badge: 'NEW', action: onSelectProfile },
    { icon: ShieldCheck, label: 'Get Blue Badge', badge: 'VERIFIED', action: onOpenBlueBadge },
    { icon: Heart, label: 'Saved Videos', count: '12', action: onSelectSaved },
    { icon: Settings, label: 'Settings & Privacy', action: onSelectSettings },
    { icon: Moon, label: 'Dark Mode', action: onToggleDarkMode },
    { icon: HelpCircle, label: 'Help & Support', action: onSelectHelp },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-white text-slate-900 flex flex-col justify-between p-5 sm:p-6 overflow-y-auto no-scrollbar animate-in fade-in duration-200 select-none">
      <div className="flex flex-col gap-6 max-w-md mx-auto w-full">
        {/* Top Header with BINISTA Logo and Close X */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            {/* Pink/Red Play Icon Badge */}
            <div className="w-8 h-8 rounded-2xl bg-[#FF2D55] flex items-center justify-center text-white shadow-sm">
              <svg
                className="w-4 h-4 text-white fill-white ml-0.5"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900 font-sans">
              BINISTA
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-800 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* User Profile Card */}
        {currentUser ? (
          <div
            onClick={() => {
              onClose();
              onSelectProfile();
            }}
            className="flex items-center justify-between p-4 rounded-2xl bg-[#F4F6FC] hover:bg-[#EEF2FA] transition-colors cursor-pointer group shadow-xs"
          >
            <div className="flex items-center gap-3.5">
              <UserAvatar
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-12 h-12 rounded-full object-cover shadow-xs border border-gray-200"
              />
              <div className="flex flex-col">
                <span className="font-extrabold text-base text-slate-900 leading-tight">
                  {currentUser.name || 'BINISTA User'}
                </span>
                <span className="text-xs text-[#0066FF] font-semibold mt-0.5">
                  @{currentUser.username || 'user'}
                </span>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
          </div>
        ) : (
          <div
            onClick={() => {
              onClose();
              onOpenAuth();
            }}
            className="flex items-center justify-between p-4 rounded-2xl bg-[#131b26] text-white hover:bg-slate-800 transition-colors cursor-pointer group shadow-md"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                <LogIn className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-sm text-white leading-tight">
                  Log In / Create Account
                </span>
                <span className="text-[11px] text-gray-300 font-medium mt-0.5">
                  Access your profile & custom reels
                </span>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-white/70 group-hover:text-white transition-colors" />
          </div>
        )}

        {/* Menu Items List - Real Live Actions */}
        <div className="flex flex-col gap-2 pt-1">
          {menuItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  onClose();
                  item.action();
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100 active:bg-slate-200/80 transition-colors text-slate-900 group cursor-pointer text-left border border-slate-100/80"
              >
                <div className="flex items-center gap-3.5">
                  <Icon className="w-5 h-5 text-slate-900 stroke-[2.2] group-hover:scale-105 transition-transform" />
                  <span className="font-extrabold text-sm text-slate-900 font-sans tracking-tight">
                    {item.label}
                  </span>
                </div>

                {item.count && (
                  <span className="text-xs bg-[#E8EFFB] text-slate-700 font-extrabold px-2.5 py-0.5 rounded-full min-w-[22px] text-center">
                    {item.count}
                  </span>
                )}

                {item.badge && (
                  <span className="text-[10px] bg-[#FF2D55] text-white font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Sign Out / Log In Item */}
      <div className="pt-4 border-t border-gray-100 max-w-md mx-auto w-full mt-auto">
        {currentUser ? (
          <button
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-red-50/60 hover:bg-red-50 text-slate-900 hover:text-red-600 transition-colors text-left group cursor-pointer border border-red-100/60"
          >
            <LogOut className="w-5 h-5 text-slate-900 stroke-[2.2] group-hover:text-red-600 transition-colors" />
            <span className="font-extrabold text-sm text-slate-900 group-hover:text-red-600 transition-colors font-sans">
              Sign Out (@{currentUser.username})
            </span>
          </button>
        ) : (
          <button
            onClick={() => {
              onClose();
              onOpenAuth();
            }}
            className="w-full flex items-center gap-3.5 p-3.5 rounded-2xl bg-blue-50/60 hover:bg-blue-50 text-blue-700 transition-colors text-left group cursor-pointer border border-blue-100/60 font-extrabold text-sm"
          >
            <LogIn className="w-5 h-5 text-blue-600" />
            <span>Sign In to BINISTA Account</span>
          </button>
        )}
      </div>
    </div>
  );
};
