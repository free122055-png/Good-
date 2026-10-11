import React, { useEffect } from 'react';
import { X, Flame, Play, Eye, Heart } from 'lucide-react';
import { VideoItem, VIDEOS_DATA } from '../data/mockData';
import { registerBackHandler } from '../services/backNavigationService';

interface TrendingVideosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVideo: (video: VideoItem) => void;
}

export const TrendingVideosModal: React.FC<TrendingVideosModalProps> = ({
  isOpen,
  onClose,
  onSelectVideo,
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

  const trendingList = (VIDEOS_DATA || []).map((v, idx) => ({
    ...v,
    rank: `#${idx + 1}`,
    views: idx === 0 ? '1.2M' : idx === 1 ? '890K' : idx === 2 ? '750K' : idx === 3 ? '620K' : idx === 4 ? '510K' : '430K',
  }));

  return (
    <div className="fixed inset-0 z-50 bg-white text-slate-900 flex flex-col p-5 sm:p-6 overflow-y-auto no-scrollbar select-none animate-in fade-in duration-200">
      <div className="max-w-md mx-auto w-full flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-900 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-6 h-6 stroke-[2.5]" />
            </button>
            <Flame className="w-5 h-5 text-[#FF2D55] fill-[#FF2D55]" />
            <span className="font-extrabold text-lg text-slate-900 tracking-tight">
              Trending Videos
            </span>
          </div>
        </div>

        {/* Trending List */}
        <div className="flex flex-col gap-3 pt-1">
          {trendingList.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                onSelectVideo(item);
                onClose();
              }}
              className="flex items-center gap-3 p-2.5 rounded-2xl bg-gray-50 hover:bg-slate-100 transition-colors cursor-pointer group border border-gray-100"
            >
              {/* Rank Tag */}
              <span className="font-black text-sm text-[#FF2D55] shrink-0 w-7 text-center">
                {item.rank}
              </span>

              {/* Thumbnail */}
              <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-slate-900 shrink-0 shadow-xs">
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                  <Play className="w-4 h-4 text-white fill-white" />
                </div>
              </div>

              {/* Details */}
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-extrabold text-xs text-slate-900 truncate group-hover:text-[#FF2D55] transition-colors">
                  {item.title}
                </span>
                <span className="text-[11px] text-gray-500 font-semibold mt-0.5">
                  @{item.creator}
                </span>
                <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500 font-bold">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3 text-blue-500" />
                    <span>{item.views} views</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart className="w-3 h-3 text-red-500 fill-red-500" />
                    <span>{item.likesCount}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
