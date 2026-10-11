import React, { memo } from 'react';
import { Clapperboard, Play, Video, Loader2 } from 'lucide-react';
import { VideoItem } from '../data/mockData';
import { getRatioLabel } from './AutoFitVideoPlayer';

interface VideoGridProps {
  videos: VideoItem[];
  onSelectVideo: (video: VideoItem) => void;
  isDarkMode?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export const VideoGrid: React.FC<VideoGridProps> = memo(({
  videos,
  onSelectVideo,
  isDarkMode,
  onLoadMore,
  hasMore,
  isLoadingMore,
}) => {
  // Split into two balanced columns for true Masonry Dynamic Aspect Ratio feed
  const col1 = videos.filter((_, i) => i % 2 === 0);
  const col2 = videos.filter((_, i) => i % 2 === 1);

  const renderVideoCard = (video: VideoItem, index: number) => {
    const ratio = video.aspectRatio || 0.75;
    const safeThumbnailUrl = video.thumbnailUrl && video.thumbnailUrl.startsWith('http://') 
      ? video.thumbnailUrl.replace('http://', 'https://') 
      : video.thumbnailUrl;

    return (
      <div
        key={video.id}
        onClick={() => onSelectVideo(video)}
        className="relative w-full rounded-[22px] overflow-hidden shadow-sm group cursor-pointer border border-black/5 bg-gray-950 transition-transform duration-200 active:scale-[0.98] select-none will-change-transform"
        style={{
          aspectRatio: `${ratio}`,
        }}
      >
        {/* Crisp Optimized Thumbnail — Eager for first 4, Lazy + Async for rest */}
        <img
          src={safeThumbnailUrl}
          alt={video.title}
          loading={index < 4 ? 'eager' : 'lazy'}
          decoding="async"
          crossOrigin="anonymous"
          onError={(e) => {
            (e.target as HTMLElement).style.opacity = '0.7';
          }}
          className="w-full h-full block object-contain group-hover:scale-105 transition-transform duration-300 pointer-events-none"
          style={{
            aspectRatio: `${ratio}`,
          }}
          referrerPolicy="no-referrer"
        />

        {/* Gentle dark gradient overlay for badge contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/30 pointer-events-none z-10" />

        {/* Top-Left Badges: Clapperboard HD + Dynamic Aspect Ratio */}
        <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/15 shadow-sm">
            <Clapperboard className="w-3 h-3 text-white stroke-[2]" />
            <span className="tracking-wide">{video.quality}</span>
          </div>

          <div className="bg-black/60 backdrop-blur-md text-blue-400 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md border border-blue-400/30 shadow-sm">
            {getRatioLabel(ratio)}
          </div>
        </div>

        {/* Center Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-lg group-hover:scale-110 group-hover:bg-black/60 transition-all duration-200">
            <Play className="w-4 h-4 fill-white text-white ml-0.5" />
          </div>
        </div>

        {/* Bottom-Right Badge: Video Duration */}
        <div className="absolute bottom-2.5 right-2.5 z-20 bg-black/65 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/15 shadow-sm pointer-events-none">
          <Video className="w-3 h-3 text-white stroke-[2]" />
          <span className="font-mono text-[10.5px]">{video.duration}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 pt-0 pb-24 select-none">
      {/* Centered "Videos" Section Header with Full Underline */}
      <div className="flex flex-col items-center justify-center pt-2 pb-5">
        <span className={`font-black text-base sm:text-[17px] tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          Videos
        </span>
        <div className="w-full max-w-[340px] h-[2px] bg-[#FF2D55] rounded-full mt-2 shadow-xs" />
      </div>


      {/* Dynamic Aspect Ratio 2-Column Responsive Masonry Feed */}
      <div className="grid grid-cols-2 gap-3.5 items-start">
        <div className="flex flex-col gap-3.5">
          {col1.map((video, idx) => renderVideoCard(video, idx * 2))}
        </div>
        <div className="flex flex-col gap-3.5">
          {col2.map((video, idx) => renderVideoCard(video, idx * 2 + 1))}
        </div>
      </div>

      {/* Infinite Scroll / Load More Trigger */}
      {hasMore && onLoadMore && (
        <div className="mt-8 flex justify-center pb-4">
          <button
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="px-6 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0066FF]" />
                <span>আরও ভিডিও লোড হচ্ছে...</span>
              </>
            ) : (
              <span>আরও ভিডিও দেখুন</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
});

VideoGrid.displayName = 'VideoGrid';
