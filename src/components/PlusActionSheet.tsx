import React, { memo, useEffect } from 'react';
import { registerBackHandler } from '../services/backNavigationService';
import { Bot, Sparkles } from 'lucide-react';

interface PlusActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectStory: () => void;
  onSelectReel: () => void;
  onSelectAi: () => void;
}

export const PlusActionSheet: React.FC<PlusActionSheetProps> = memo(({
  isOpen,
  onClose,
  onSelectStory,
  onSelectReel,
  onSelectAi,
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

  return (
    <>
      {/* Invisible backdrop to dismiss popover when clicking outside */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-transparent"
        aria-hidden="true"
      />

      {/* Floating Popover Menu directly above the Bottom Nav Plus (+) Button */}
      <div className="fixed bottom-16 right-4 sm:right-6 z-50 w-48 bg-white rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.22)] border border-gray-200/90 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2 duration-150 select-none">
        {/* Row 1: স্টোরি (Story) */}
        <button
          onClick={() => {
            onSelectStory();
            onClose();
          }}
          className="w-full flex items-center gap-3.5 px-3.5 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors group cursor-pointer text-left"
        >
          {/* Circular Dashed Story Icon */}
          <div className="w-7 h-7 rounded-full border-[2px] border-black border-dashed flex items-center justify-center text-black shrink-0 group-hover:scale-105 transition-transform">
            <svg
              className="w-4 h-4 text-black"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>

          <span className="font-extrabold text-base text-black font-sans tracking-tight">
            স্টোরি
          </span>
        </button>

        {/* Thin Divider Line */}
        <div className="border-b border-gray-200/90" />

        {/* Row 2: রিল (Reel) */}
        <button
          onClick={() => {
            onSelectReel();
            onClose();
          }}
          className="w-full flex items-center gap-3.5 px-3.5 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors group cursor-pointer text-left"
        >
          {/* Reel Clapperboard Icon */}
          <div className="w-7 h-7 rounded-[8px] border-[2px] border-black flex items-center justify-center text-black shrink-0 group-hover:scale-105 transition-transform relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 border-b border-black flex justify-around items-center px-0.5 bg-black/5">
              <span className="w-0.5 h-0.5 bg-black rounded-full" />
              <span className="w-0.5 h-0.5 bg-black rounded-full" />
              <span className="w-0.5 h-0.5 bg-black rounded-full" />
            </div>
            <svg
              className="w-3 h-3 fill-black text-black ml-0.5 mt-1"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>

          <span className="font-extrabold text-base text-black font-sans tracking-tight">
            রিল
          </span>
        </button>

        {/* Thin Divider Line */}
        <div className="border-b border-gray-200/90" />

        {/* Row 3: BINISTA AI */}
        <button
          onClick={() => {
            onSelectAi();
            onClose();
          }}
          className="w-full flex items-center gap-3.5 px-3.5 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors group cursor-pointer text-left"
        >
          {/* Clean Non-Colorful Bot Icon */}
          <div className="w-7 h-7 rounded-[8px] border-[2px] border-black flex items-center justify-center text-black shrink-0 group-hover:scale-105 transition-transform">
            <Bot className="w-4 h-4 stroke-[2.2]" />
          </div>

          <span className="font-extrabold text-base text-black font-sans tracking-tight">
            BINISTA AI
          </span>
        </button>
      </div>
    </>
  );
});

PlusActionSheet.displayName = 'PlusActionSheet';
