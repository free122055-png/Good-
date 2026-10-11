import React, { memo, useState, useEffect, useRef } from 'react';
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

interface VideoCardProps {
  video: VideoItem;
  index: number;
  onSelectVideo: (video: VideoItem) => void;
}

/**
 * Highly optimized, memoized VideoCard component to prevent unnecessary re-renders
 * during high-speed scrolling in the News Feed.
 */
const VideoCard = memo<VideoCardProps>(({ video, index, onSelectVideo }) => {
  const ratio = video.aspectRatio || 0.75;
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && video.videoUrl) {
      videoRef.current.currentTime = 0.5;
      videoRef.current.play().catch(() => {});
    }
  }, [video.videoUrl]);

  const safeVideoUrl = video.videoUrl && video.videoUrl.startsWith('http://')
    ? video.videoUrl.replace('http://', 'https://')
    : video.videoUrl;

  const safeThumbnailUrl = video.thumbnailUrl && !video.thumbnailUrl.includes('1506794778202')
    ? (video.thumbnailUrl.startsWith('http://') ? video.thumbnailUrl.replace('http://', 'https://') : video.thumbnailUrl)
    : 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=75';

  return (
    <div
      onClick={() => onSelectVideo(video)}
      className="relative w-full rounded-[22px] overflow-hidden cursor-pointer border border-black/5 bg-slate-900 select-none group"
      style={{
        aspectRatio: `${ratio}`,
        contentVisibility: 'auto',
        containIntrinsicSize: 'auto 300px',
        transform: 'translate3d(0,0,0)',
        willChange: 'transform',
        backfaceVisibility: 'hidden',
      }}
    >
      {safeVideoUrl ? (
        <video
          ref={videoRef}
          src={safeVideoUrl}
          poster={safeThumbnailUrl}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="w-full h-full block object-cover pointer-events-none"
          style={{
            aspectRatio: `${ratio}`,
          }}
        />
      ) : (
        <img
          src={safeThumbnailUrl}
          alt={video.title || 'BINISTA Reel'}
          loading={index < 6 ? 'eager' : 'lazy'}
          decoding="async"
          crossOrigin="anonymous"
          className="w-full h-full block object-cover pointer-events-none"
          style={{
            aspectRatio: `${ratio}`,
          }}
          referrerPolicy="no-referrer"
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/25 pointer-events-none z-10" />

      <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5 pointer-events-none">
        <div className="bg-black/85 text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/15">
          <Clapperboard className="w-3 h-3 text-white stroke-[2]" />
          <span className="tracking-wide">{video.quality || 'HD'}</span>
        </div>

        <div className="bg-black/85 text-blue-400 text-[9.5px] font-bold px-1.5 py-0.5 rounded-md border border-blue-400/30">
          {getRatioLabel(ratio)}
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none group-hover:scale-110 transition-transform">
        <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center border border-white/20 text-white shadow-lg">
          <Play className="w-4 h-4 fill-white text-white ml-0.5" />
        </div>
      </div>

      <div className="absolute bottom-2.5 right-2.5 z-20 bg-black/85 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/15 pointer-events-none">
        <Video className="w-3 h-3 text-white stroke-[2]" />
        <span className="font-mono text-[10.5px]">{video.duration || '0:30'}</span>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.video.id === nextProps.video.id &&
         prevProps.video.likesCount === nextProps.video.likesCount &&
         prevProps.video.thumbnailUrl === nextProps.video.thumbnailUrl &&
         prevProps.index === nextProps.index;
});

VideoCard.displayName = 'VideoCard';

export const VideoGrid: React.FC<VideoGridProps> = memo(({
  videos,
  onSelectVideo,
  isDarkMode,
  onLoadMore,
  hasMore,
  isLoadingMore,
}) => {
  return (
    <div className="px-4 pt-0 pb-24 select-none">
      {/* Centered "Videos" Section Header with Full Underline */}
      <div className="flex flex-col items-center justify-center pt-2 pb-5">
        <span className={`font-black text-base sm:text-[17px] tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          Videos
        </span>
        <div className="w-full max-w-[340px] h-[2px] bg-[#FF2D55] rounded-full mt-2 shadow-xs" />
      </div>

      {/* Native CSS Multi-Column Masonry Feed for Absolute Maximum Speed */}
      <div className="columns-2 gap-3.5 space-y-3.5">
        {videos.map((video, idx) => (
          <div key={video.id} className="break-inside-avoid mb-3.5">
            <VideoCard 
              video={video} 
              index={idx} 
              onSelectVideo={onSelectVideo} 
            />
          </div>
        ))}
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
