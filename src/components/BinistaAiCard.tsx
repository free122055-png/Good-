import React from 'react';
import { Sparkles } from 'lucide-react';

interface BinistaAiCardProps {
  onClick: () => void;
  isDarkMode: boolean;
}

export const BinistaAiCard: React.FC<BinistaAiCardProps> = ({ onClick, isDarkMode }) => {
  return (
    <div className="px-4 py-1">
      <div
        onClick={onClick}
        className={`group relative overflow-hidden rounded-full px-4 py-2 cursor-pointer transition-all duration-300 border shadow-2xs flex items-center gap-2.5 ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 hover:border-slate-700 text-white'
            : 'bg-white border-slate-300 hover:border-slate-400 text-slate-700'
        }`}
      >
        <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-pulse shrink-0" />
        <span className={`text-[11px] font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
          BINISTA AI জিজ্ঞেস করুন
        </span>
      </div>
    </div>
  );
};
