import React, { useState, useEffect } from 'react';
import { X, Heart, MessageCircle, Share2, Music2, Play, Pause, Volume2, VolumeX, Send, Loader2 } from 'lucide-react';
import { VideoItem } from '../data/mockData';
import {
  CommentItem,
  listenToVideoComments,
  addVideoComment,
} from '../services/commentService';
import { getSessionUser } from '../services/authService';

interface VideoPlayerModalProps {
  video: VideoItem | null;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  video,
  onClose,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(video?.likesCount || '');
  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);

  // Listen to Firestore comments in real-time
  useEffect(() => {
    if (!video?.id) return;
    const unsub = listenToVideoComments(video.id, (list) => {
      setCommentsList(list);
    });
    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [video?.id]);

  // Simulated video playback progress bar
  useEffect(() => {
    if (!video || !isPlaying) return;
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 0 : prev + 1.5));
    }, 200);
    return () => clearInterval(interval);
  }, [video, isPlaying]);

  if (!video) return null;

  const handleLikeToggle = () => {
    setIsLiked(!isLiked);
    if (!isLiked) {
      setLikeCount('Liked!');
    } else {
      setLikeCount(video.likesCount);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    const text = newComment.trim();
    setNewComment('');
    setIsSubmitting(true);
    const currentUser = getSessionUser();

    try {
      await addVideoComment(video.id, {
        userId: currentUser?.uid || 'guest_user',
        userName: currentUser?.name || 'BINISTA User',
        userUsername: currentUser?.username || 'user',
        userAvatar:
          currentUser?.avatarUrl ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
        text,
      });
    } catch (err) {
      console.error('Failed to post comment:', err);
      setNewComment(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-0 md:p-4 animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-md h-full md:h-[90vh] md:max-h-[800px] md:rounded-[32px] overflow-hidden bg-black flex flex-col justify-between shadow-2xl">
        {/* Background Image/Video backdrop */}
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />

        {/* Dark Gradients for Controls Contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

        {/* Top Header Row */}
        <div className="relative z-10 px-4 pt-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <span className="bg-black/50 backdrop-blur-md border border-white/20 text-xs font-bold px-2.5 py-1 rounded-md text-white">
              {video.quality}
            </span>
            <span className="bg-black/40 backdrop-blur-md text-xs px-2.5 py-1 rounded-md font-mono text-gray-200">
              {video.duration}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/70"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Center Play/Pause Tap Zone */}
        <div
          onClick={() => setIsPlaying(!isPlaying)}
          className="absolute inset-0 flex items-center justify-center z-0 cursor-pointer"
        >
          {!isPlaying && (
            <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-2xl animate-in zoom-in-75">
              <Play className="w-8 h-8 fill-white ml-1" />
            </div>
          )}
        </div>

        {/* Right Floating Actions Side Bar */}
        <div className="relative z-10 p-4 self-end flex flex-col gap-5 items-center text-white mb-16">
          {/* Creator Avatar */}
          <div className="relative">
            <img
              src={video.creatorAvatar}
              alt={video.creator}
              className="w-11 h-11 rounded-full border-2 border-[#FF2D55] object-cover shadow-lg"
              referrerPolicy="no-referrer"
            />
            <button className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-[#FF2D55] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow">
              +
            </button>
          </div>

          {/* Like Button */}
          <button
            onClick={handleLikeToggle}
            className="flex flex-col items-center gap-1 group"
          >
            <div className={`p-2.5 rounded-full backdrop-blur-md transition-transform active:scale-125 ${isLiked ? 'bg-[#FF2D55]/20 text-[#FF2D55]' : 'bg-black/40 text-white'}`}>
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-[#FF2D55] text-[#FF2D55]' : 'text-white'}`} />
            </div>
            <span className="text-xs font-bold shadow-sm">{likeCount}</span>
          </button>

          {/* Comment Button */}
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex flex-col items-center gap-1"
          >
            <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white">
              <MessageCircle className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold shadow-sm">{video.commentsCount}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={() => alert('Share link copied to clipboard!')}
            className="flex flex-col items-center gap-1"
          >
            <div className="p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white">
              <Share2 className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold shadow-sm">{video.sharesCount}</span>
          </button>
        </div>

        {/* Bottom Details Section */}
        <div className="relative z-10 px-4 pb-4 pt-2 text-white">
          {/* Creator Handle */}
          <div className="font-bold text-base mb-1 flex items-center gap-2">
            <span>@{video.creator}</span>
            <span className="text-[10px] bg-[#FF2D55] px-1.5 py-0.5 rounded font-bold uppercase">Follow</span>
          </div>

          {/* Video Description */}
          <p className="text-xs text-gray-200 line-clamp-2 mb-2 leading-relaxed">
            {video.description}
          </p>

          {/* Music Track */}
          <div className="flex items-center gap-2 text-xs text-gray-300 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full w-fit max-w-[80%] border border-white/10">
            <Music2 className="w-3.5 h-3.5 text-[#FF2D55] animate-spin" style={{ animationDuration: '4s' }} />
            <span className="truncate">{video.songName}</span>
          </div>

          {/* Video Scrubber / Progress Bar */}
          <div className="w-full bg-white/20 h-1 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-[#FF2D55] h-full transition-all duration-200 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Slide-Up Comments Drawer */}
        {showComments && (
          <div className="absolute inset-x-0 bottom-0 top-1/3 bg-[#111318] z-30 rounded-t-[28px] p-4 flex flex-col justify-between animate-in slide-in-from-bottom duration-300 shadow-2xl border-t border-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <span className="font-bold text-sm text-white">Comments ({commentsList.length})</span>
              <button
                onClick={() => setShowComments(false)}
                className="p-1 rounded-full text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto my-3 space-y-3 pr-1">
              {commentsList.length === 0 ? (
                <div className="py-6 text-center text-gray-400 text-xs">
                  কোনো কমেন্ট নেই। প্রথম কমেন্টটি আপনি করুন!
                </div>
              ) : (
                commentsList.map((c) => (
                  <div key={c.id} className="flex gap-2.5 items-start">
                    <img
                      src={c.userAvatar}
                      alt={c.userName}
                      className="w-7 h-7 rounded-full object-cover shrink-0 mt-0.5"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 text-xs">
                      <span className="font-bold text-gray-300 mr-2">@{c.userName}</span>
                      <span className="text-gray-100">{c.text}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Input */}
            <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-2 border-t border-gray-800">
              <input
                type="text"
                placeholder="একটি কমেন্ট লিখুন..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={isSubmitting}
                className="flex-1 bg-slate-900 border border-slate-700 text-white text-xs rounded-full px-4 py-2 focus:outline-none focus:border-[#FF2D55]"
              />
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="p-2 bg-[#FF2D55] disabled:bg-gray-700 text-white rounded-full hover:bg-opacity-90 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
