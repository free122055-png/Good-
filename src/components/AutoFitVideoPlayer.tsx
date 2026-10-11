import React, { useState, useRef, useEffect, memo } from 'react';
import { Clapperboard, Play, Volume2, VolumeX } from 'lucide-react';

export interface AutoFitVideoPlayerProps {
  src?: string;
  poster?: string;
  title?: string;
  quality?: string;
  duration?: string;
  aspectRatio?: number;
  isMuted?: boolean;
  isPlaying?: boolean;
  onTogglePlayPause?: () => void;
  onToggleMute?: () => void;
  className?: string;
  containerClassName?: string;
  showControls?: boolean;
  onRatioDetected?: (ratio: number, width: number, height: number) => void;
}

export function getRatioLabel(ratio: number): string {
  if (ratio >= 1.6) return '16:9';
  if (ratio >= 1.25) return '4:3';
  if (ratio >= 0.9 && ratio < 1.15) return '1:1';
  if (ratio >= 0.7 && ratio < 0.9) return '4:5';
  if (ratio <= 0.65) return '9:16';
  return `${ratio.toFixed(2)}:1`;
}

export function getRatioDescription(ratio: number): string {
  if (ratio >= 1.6) return '16:9 Landscape';
  if (ratio >= 1.25) return '4:3 Standard';
  if (ratio >= 0.9 && ratio < 1.15) return '1:1 Square';
  if (ratio >= 0.7 && ratio < 0.9) return '4:5 Portrait';
  if (ratio <= 0.65) return '9:16 Portrait';
  return `${ratio.toFixed(2)}:1 Ratio`;
}

export const AutoFitVideoPlayer: React.FC<AutoFitVideoPlayerProps> = memo(({
  src,
  poster,
  title = 'BINISTA Video',
  quality = 'HD',
  duration = '0:30',
  aspectRatio: initialRatio,
  isMuted = false,
  isPlaying: controlledIsPlaying,
  onTogglePlayPause,
  onToggleMute,
  containerClassName = '',
  showControls = true,
  onRatioDetected,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [internalPlaying, setInternalPlaying] = useState(true);
  const [internalMuted, setInternalMuted] = useState(isMuted);
  const [hasError, setHasError] = useState(false);
  const [triedFallback, setTriedFallback] = useState(false);
  const [detectedRatio, setDetectedRatio] = useState<number | null>(initialRatio || null);
  const [videoDims, setVideoDims] = useState<{ width: number; height: number } | null>(null);

  const isPlaying = controlledIsPlaying !== undefined ? controlledIsPlaying : internalPlaying;
  const effectiveMuted = onToggleMute !== undefined ? isMuted : internalMuted;

  useEffect(() => {
    setHasError(false);
    setTriedFallback(false);
  }, [src]);

  useEffect(() => {
    if (initialRatio && (!detectedRatio || Math.abs(detectedRatio - initialRatio) > 0.05)) {
      setDetectedRatio(initialRatio);
    }
  }, [initialRatio]);

  // Sync play/pause with controlled state
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  const inspectDimensions = (v: HTMLVideoElement) => {
    if (v.videoWidth && v.videoHeight && v.videoWidth > 0 && v.videoHeight > 0) {
      const r = v.videoWidth / v.videoHeight;
      setDetectedRatio(r);
      setVideoDims({ width: v.videoWidth, height: v.videoHeight });
      if (onRatioDetected) {
        onRatioDetected(r, v.videoWidth, v.videoHeight);
      }
    }
  };

  const handleLoadedMetadata = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    inspectDimensions(e.currentTarget);
  };

  useEffect(() => {
    if (videoRef.current) {
      inspectDimensions(videoRef.current);
    }
  }, [src]);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTogglePlayPause) {
      onTogglePlayPause();
    } else {
      if (videoRef.current) {
        if (internalPlaying) {
          videoRef.current.pause();
          setInternalPlaying(false);
        } else {
          videoRef.current.play().catch(() => {});
          setInternalPlaying(true);
        }
      }
    }
  };

  const handleToggleMuteBtn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleMute) {
      onToggleMute();
    } else {
      setInternalMuted((prev) => !prev);
      if (videoRef.current) {
        videoRef.current.muted = !internalMuted;
      }
    }
  };

  // Determine current effective ratio
  const ratio = detectedRatio || initialRatio || 0.75;

  // Helper to ensure URL is HTTPS
  const ensureHttps = (url?: string) => {
    if (!url) return url;
    if (url.startsWith('http://')) {
      return url.replace('http://', 'https://');
    }
    return url;
  };

  const rawSafeSrc = ensureHttps(src);
  const safeSrc = triedFallback ? 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-lights-41584-large.mp4' : rawSafeSrc;
  const safePoster = ensureHttps(poster);

  return (
    <div
      className={`relative w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 select-none overflow-hidden transition-[aspect-ratio] duration-200 ${containerClassName}`}
      style={{
        aspectRatio: `${ratio}`,
      }}
    >
      {/* Crisp Video Element — Matches Container Aspect Ratio Pixel-for-Pixel */}
      {safeSrc && !hasError ? (
        <video
          ref={videoRef}
          src={safeSrc}
          poster={safePoster || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=75'}
          autoPlay
          loop
          muted={effectiveMuted}
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          onLoadedMetadata={handleLoadedMetadata}
          onLoadedData={handleLoadedMetadata}
          onError={(e) => {
            console.warn('Video Error encountered:', e);
            if (!triedFallback && safeSrc !== 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-lights-41584-large.mp4') {
              setTriedFallback(true);
            } else {
              setHasError(true);
            }
          }}
          onClick={handleTogglePlay}
          className="w-full h-full block object-cover cursor-pointer select-none"
          style={{
            aspectRatio: `${ratio}`,
          }}
        />
      ) : safePoster ? (
        <img
          src={safePoster}
          alt={title}
          onClick={handleTogglePlay}
          className="w-full h-full block object-cover cursor-pointer select-none"
          style={{
            aspectRatio: `${ratio}`,
          }}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-gray-500 text-xs p-4 text-center">
          <div className="mb-2">⚠️ ভিডিও লোড করা যাচ্ছে না</div>
          <button 
            onClick={() => setHasError(false)}
            className="px-3 py-1 bg-white/10 rounded-full text-[10px] hover:bg-white/20 transition-colors"
          >
            আবার চেষ্টা করুন (Retry)
          </button>
        </div>
      )}

      {/* Gentle gradient overlay for badge readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/50 pointer-events-none z-20" />

      {/* Controls & Badges */}
      {showControls && (
        <>
          {/* Top Left Badges: Quality, Duration, Detected Aspect Ratio */}
          <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 z-30 pointer-events-auto">
            {/* HD Badge */}
            <div className="bg-black/65 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/15 shadow-sm">
              <Clapperboard className="w-3 h-3 text-white" />
              <span>{quality}</span>
            </div>

            {/* Duration Badge */}
            <div className="bg-black/55 backdrop-blur-md text-white text-[10px] font-mono px-2 py-0.5 rounded-md border border-white/15">
              {duration}
            </div>

            {/* Auto Detected Ratio Badge */}
            <div
              className="bg-black/55 backdrop-blur-md text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-500/30 flex items-center gap-1 shadow-sm"
              title={`Original video ratio: ${getRatioDescription(ratio)}${videoDims ? ` (${videoDims.width}x${videoDims.height})` : ''}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span>{getRatioLabel(ratio)}</span>
            </div>
          </div>

          {/* Top Right Mute Button */}
          <button
            onClick={handleToggleMuteBtn}
            className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/55 backdrop-blur-md text-white hover:bg-black/80 transition-all active:scale-95 shadow-md cursor-pointer border border-white/10"
            title={effectiveMuted ? 'শব্দ শুনুন (Unmute)' : 'শব্দ বন্ধ করুন (Mute)'}
          >
            {effectiveMuted ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            )}
          </button>
        </>
      )}

      {/* Center Play Button Overlay when paused */}
      {!isPlaying && (
        <div
          onClick={handleTogglePlay}
          className="absolute inset-0 flex items-center justify-center cursor-pointer z-30 bg-black/25"
        >
          <div className="w-14 h-14 rounded-full bg-black/70 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-2xl animate-in zoom-in-75 active:scale-90 transition-transform">
            <Play className="w-7 h-7 fill-white ml-0.5" />
          </div>
        </div>
      )}
    </div>
  );
});
