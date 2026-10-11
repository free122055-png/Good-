import React, { useState, useEffect } from 'react';
import { X, Heart, Send, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { StoryItem } from '../data/mockData';
import { registerBackHandler } from '../services/backNavigationService';
import { UserAvatar } from './UserAvatar';

interface StoryViewerModalProps {
  story: StoryItem | null;
  onClose: () => void;
  onSelectUser?: (userId: string, username: string) => void;
}

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  story,
  onClose,
  onSelectUser,
}) => {
  const [progress, setProgress] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);

  // Auto-progress bar for story
  useEffect(() => {
    if (!story || story.isCreate || !isPlaying) return;
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          onClose();
          return 100;
        }
        return prev + 2;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [story, isPlaying, onClose]);

  // Android Back Navigation Handler for Story Viewer
  useEffect(() => {
    if (!story || story.isCreate) return;

    const unregister = registerBackHandler(() => {
      onClose();
      return true;
    });

    return () => unregister();
  }, [story, onClose]);

  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    setProgress(0);
    setIsPlaying(true);
    setVideoError(false);
  }, [story?.id]);

  if (!story || story.isCreate) return null;

  const isVideoStory = Boolean(
    !videoError &&
    (story.isVideo ||
      (story.coverImage &&
        (story.coverImage.endsWith('.mp4') ||
          story.coverImage.endsWith('.webm') ||
          story.coverImage.startsWith('data:video/') ||
          story.coverImage.includes('/videos/'))))
  );

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    alert(`Reply sent to ${story.username}: "${replyText}"`);
    setReplyText('');
  };

  const ensureHttps = (url?: string) => {
    if (!url) return url;
    if (url.startsWith('http://')) return url.replace('http://', 'https://');
    return url;
  };

  const safeCoverImage = ensureHttps(story.coverImage);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex items-center justify-center p-0 md:p-4 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-md h-full md:h-[90vh] md:max-h-[800px] md:rounded-[32px] overflow-hidden bg-slate-950 flex flex-col justify-between shadow-2xl">
        {/* Story Background Scenery (Video or Image) */}
        {isVideoStory ? (
          <div className="absolute inset-0 w-full h-full bg-black">
            <video
              src={safeCoverImage}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              preload="metadata"
              crossOrigin="anonymous"
              onError={() => {
                console.warn('Story video error, falling back to image:', story.coverImage);
                setVideoError(true);
              }}
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="absolute bottom-20 right-4 z-20 p-2.5 rounded-full bg-black/60 text-white backdrop-blur-md border border-white/20"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
            </button>
          </div>
        ) : (
          <img
            src={safeCoverImage}
            alt={story.username}
            className="absolute inset-0 w-full h-full object-cover"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
          />
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80 pointer-events-none" />

        {/* Top Story Controls Bar */}
        <div className="relative z-10 px-4 pt-4 flex flex-col gap-3">
          {/* Progress Bar */}
          <div className="w-full bg-white/30 h-1 rounded-full overflow-hidden">
            <div
              className="bg-white h-full transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* User Info Header */}
          <div className="flex items-center justify-between text-white">
            <div 
              className="flex items-center gap-2.5 cursor-pointer group"
              onClick={() => {
                 if (onSelectUser && story) {
                   onSelectUser(story.userId || story.username, story.username);
                   onClose();
                 }
              }}
            >
              <UserAvatar
                src={story.avatarUrl}
                alt={story.username}
                className="w-9 h-9 rounded-full border-2 border-[#00f2fe] object-cover group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col">
                <span className="font-bold text-xs text-white leading-tight group-hover:text-[#00f2fe] transition-colors">
                  {story.username}
                </span>
                <span className="text-[10px] text-gray-300">
                  {story.timeAgo}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-black/40 text-white hover:bg-black/60"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Story Caption Overlay if present */}
        {story.caption && (
          <div className="relative z-10 px-5 my-auto text-center">
            <div className="inline-block bg-black/60 backdrop-blur-md border border-white/20 px-5 py-3 rounded-2xl max-w-xs shadow-xl">
              <p className="text-white font-extrabold text-sm leading-relaxed drop-shadow">
                {story.caption}
              </p>
            </div>
          </div>
        )}

        {/* Story Interaction Footer */}
        <div className="relative z-10 p-4 flex items-center gap-3">
          <form onSubmit={handleSendReply} className="flex-1 flex items-center gap-2">
            <input
              type="text"
              placeholder={`Send message to ${story.username}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="w-full bg-black/50 backdrop-blur-md border border-white/20 text-white placeholder-gray-300 text-xs rounded-full px-4 py-2.5 focus:outline-none focus:border-[#00f2fe]"
            />
            {replyText.trim() && (
              <button
                type="submit"
                className="p-2.5 bg-[#00f2fe] text-black rounded-full font-bold"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>

          <button
            onClick={() => setIsLiked(!isLiked)}
            className={`p-2.5 rounded-full backdrop-blur-md border border-white/20 transition-transform active:scale-125 ${
              isLiked ? 'bg-[#FF2D55] text-white border-[#FF2D55]' : 'bg-black/50 text-white'
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-white' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
