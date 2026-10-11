import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Heart,
  Download,
  Send,
  MoreHorizontal,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Clapperboard,
  Video as VideoIcon,
  Sparkles,
  Check,
  MessageCircle,
  X,
  Trash2,
  Loader2,
  Share2,
} from 'lucide-react';
import { VideoItem, VIDEOS_DATA } from '../data/mockData';
import { UserData } from '../services/authService';
import {
  CommentItem,
  listenToVideoComments,
  addVideoComment,
  deleteVideoComment,
  getCachedUserProfile,
  fetchAndCacheUserProfile,
} from '../services/commentService';
import {
  listenToVideoLikes,
  toggleVideoLike,
  checkIfUserLikedVideo,
} from '../services/likeService';
import { recordVideoShare, recordVideoDownload } from '../services/videoService';
import { sendOneSignalPush } from '../services/oneSignalService';
import { registerBackHandler } from '../services/backNavigationService';
import { AutoFitVideoPlayer } from './AutoFitVideoPlayer';
import { BlueBadgeIcon } from './BlueBadgeModal';
import { UserAvatar } from './UserAvatar';

interface VideoDetailViewProps {
  video: VideoItem | null;
  onClose: () => void;
  onSelectRelatedVideo: (video: VideoItem) => void;
  onSelectUser?: (userId: string, username: string) => void;
  currentUser?: UserData | null;
  onDeleteVideo?: (videoId: string) => void;
}

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return 'Just now';
  const diffSec = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export const VideoDetailView: React.FC<VideoDetailViewProps> = ({
  video,
  onClose,
  onSelectRelatedVideo,
  onSelectUser,
  currentUser,
  onDeleteVideo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const commentInputRef = useRef<HTMLInputElement>(null);

  const [isLiked, setIsLiked] = useState(false);
  const [likeCountNum, setLikeCountNum] = useState<number>(() => {
    return parseInt(video?.likesCount || '0', 10) || 0;
  });
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState<string>('Added to favorites');
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Real-time Persistent Comments State
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isCommentsSheetOpen, setIsCommentsSheetOpen] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    setVideoError(false);
    setShowOptionsMenu(false);
  }, [video?.id, video?.videoUrl]);

  // Auto scroll to top when video opens or changes
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [video?.id]);

  // Real-time Firestore Likes Listener (connected to videos/{videoId}/likes/{uid})
  useEffect(() => {
    if (!video?.id) return;
    const unsubLikes = listenToVideoLikes(video.id, currentUser?.uid, (state) => {
      setIsLiked(state.isLiked);
      setLikeCountNum(state.likesCount);
    });
    return () => {
      if (typeof unsubLikes === 'function') unsubLikes();
    };
  }, [video?.id, currentUser?.uid]);

  const [, setProfileUpdateTick] = useState(0);

  // Real-time Firestore Comments Listener for this specific video
  useEffect(() => {
    if (!video?.id) return;
    const unsubscribe = listenToVideoComments(video.id, (list) => {
      setComments(list);
      // Asynchronously resolve latest profiles for commenters
      list.forEach((c) => {
        if (c.userId && (!currentUser || c.userId !== currentUser.uid)) {
          fetchAndCacheUserProfile(c.userId, () => {
            setProfileUpdateTick((t) => t + 1);
          });
        }
      });
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [video?.id, currentUser?.uid]);

  // Android Back Navigation Handler for Video Detail View
  useEffect(() => {
    if (!video) return;

    const unregister = registerBackHandler(() => {
      if (isCommentsSheetOpen) {
        setIsCommentsSheetOpen(false);
        return true;
      }
      onClose();
      return true;
    });

    return () => unregister();
  }, [video, isCommentsSheetOpen, onClose]);

  if (!video) return null;

  // Handle Play/Pause
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  // Related videos for "More like this"
  const relatedVideos = VIDEOS_DATA.filter((v) => v.id !== video.id);
  const col1 = relatedVideos.filter((_, idx) => idx % 2 === 0);
  const col2 = relatedVideos.filter((_, idx) => idx % 2 === 1);

  // REAL LIKE INTERACTION: Instant Optimistic UI + Rollback on error
  const handleLike = async () => {
    const effectiveUid = currentUser?.uid || 'guest_user';
    const previousLiked = isLiked;
    const previousCount = likeCountNum;
    const nextStatus = !previousLiked;
    const nextCount = nextStatus ? previousCount + 1 : Math.max(0, previousCount - 1);

    // 1. Instant Optimistic UI update (0ms lag)
    setIsLiked(nextStatus);
    setLikeCountNum(nextCount);

    if (nextStatus) {
      setToastMessage('❤️ লাইক সফলভাবে যুক্ত হয়েছে');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1800);

      sendOneSignalPush({
        title: '❤️ BINISTA Video Reaction',
        body: `${currentUser?.name || 'A User'} আপনার "${video?.title || 'ভিডিওতে'}" রিঅ্যাকশন দিয়েছেন!`,
        type: 'love',
      });
    }

    // 2. Background Firestore update with rollback on failure
    try {
      await toggleVideoLike(video.id, effectiveUid, previousLiked, video.userId);
    } catch (err) {
      console.error('Error toggling video like in Firestore, rolling back UI:', err);
      // Rollback to previous state
      setIsLiked(previousLiked);
      setLikeCountNum(previousCount);
      setToastMessage('লাইক আপডেট করা যায়নি। আবার চেষ্টা করুন।');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2200);
    }
  };

  // REAL SHARE INTERACTION: Deep link / Web Share API + non-blocking count in Firestore
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}?videoId=${encodeURIComponent(video.id)}`;
    const shareTitle = video.title || 'BINISTA Video';
    const shareText = `BINISTA-তে "${shareTitle}" ভিডিওটি দেখুন!`;

    // Non-blocking background interaction tracking
    recordVideoShare(video.id, video.userId).catch(() => {});

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    // Fallback: Copy link to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      setToastMessage('🔗 ভিডিও লিংক কপি করা হয়েছে!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    } catch (_) {
      setToastMessage('ভিডিও লিংক: ' + shareUrl);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  // REAL DOWNLOAD INTERACTION: Direct file stream from authorized URL
  const handleDownload = async () => {
    if (!video.videoUrl) return;

    recordVideoDownload(video.id, video.userId).catch(() => {});
    setToastMessage('ভিডিও ডাউনলোড শুরু হচ্ছে...');
    setShowToast(true);

    try {
      const anchor = document.createElement('a');
      anchor.href = video.videoUrl;
      anchor.download = `${video.title || 'binista-video'}.mp4`;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      setTimeout(() => {
        setToastMessage('ভিডিও সংরক্ষিত হচ্ছে');
        setTimeout(() => setShowToast(false), 2000);
      }, 1000);
    } catch (err) {
      window.open(video.videoUrl, '_blank');
      setShowToast(false);
    }
  };

  // Handle Adding a Permanent Comment: Instant Optimistic Append
  const handleAddComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCommentText.trim() || isSubmittingComment) return;

    if (!currentUser) {
      setToastMessage('কমেন্ট করতে অনুগ্রহ করে লগইন করুন');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
      return;
    }

    const text = newCommentText.trim();
    setNewCommentText('');
    setIsSubmittingComment(true);

    const authorName = currentUser.name || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username || 'User';
    const authorUsername = currentUser.username || 'user';
    const authorAvatar =
      currentUser.avatarUrl ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=75';
    const authorUid = currentUser.uid;

    // 1. Instant Optimistic UI Injection (0ms delay)
    const tempId = `temp_${Date.now()}`;
    const optimisticComment: CommentItem = {
      id: tempId,
      videoId: video.id,
      userId: authorUid,
      userName: authorName,
      userUsername: authorUsername,
      userAvatar: authorAvatar,
      profilePhoto: authorAvatar,
      username: authorUsername,
      text,
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [...prev, optimisticComment]);

    // 2. Background Firestore commit
    try {
      const realComment = await addVideoComment(
        video.id,
        {
          userId: authorUid,
          userName: authorName,
          userUsername: authorUsername,
          userAvatar: authorAvatar,
          text,
        },
        video.userId
      );

      // Replace temporary ID with real Firestore document ID
      setComments((prev) =>
        prev.map((c) => (c.id === tempId ? { ...c, id: realComment.id } : c))
      );

      sendOneSignalPush({
        title: '💬 BINISTA New Comment',
        body: `${authorName}: "${text.slice(0, 45)}"`,
        type: 'comment',
      });
    } catch (err: any) {
      console.error('Failed to post comment to Firestore, rolling back:', err);
      // Rollback optimistic comment
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setNewCommentText(text); // restore entered text
      setToastMessage('কমেন্ট পোস্ট করা সম্ভব হয়নি। আবার চেষ্টা করুন।');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('আপনি কি এই কমেন্টটি ডিলিট করতে চান?')) return;
    try {
      await deleteVideoComment(video.id, commentId, video.userId);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const isOwner = currentUser?.uid && video.userId === currentUser.uid;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-white flex flex-col overflow-y-auto no-scrollbar animate-in fade-in duration-200 select-none pb-20"
    >
      {/* Top Floating Back Header */}
      <div className="sticky top-0 z-30 px-3 py-2 flex items-center justify-between bg-white/95 backdrop-blur-md border-b border-gray-100">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-black/5 hover:bg-black/10 text-gray-800 transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
        </button>
        <span className="text-xs font-bold text-gray-800 font-sans tracking-wide">
          BINISTA VIDEO
        </span>
        <button
          onClick={handleShare}
          className="p-2 rounded-full bg-black/5 hover:bg-black/10 text-gray-800 cursor-pointer"
          title="Share video link"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Main Video Player Banner — DYNAMIC ASPECT RATIO CONTAINER */}
      <div className="relative w-full bg-black rounded-b-[24px] overflow-hidden shadow-lg shrink-0 select-none">
        <AutoFitVideoPlayer
          src={video.videoUrl}
          poster={video.thumbnailUrl}
          title={video.title}
          quality={video.quality}
          duration={video.duration}
          aspectRatio={video.aspectRatio}
          isMuted={isMuted}
          isPlaying={isPlaying}
          onTogglePlayPause={togglePlayPause}
          onToggleMute={() => setIsMuted(!isMuted)}
        />
      </div>

      {/* Action Bar Below Video */}
      <div className="px-4 py-3.5 flex items-center justify-between border-b border-gray-100/80">
        <div className="flex items-center gap-5">
          {/* 1. Love React (Heart) Button */}
          <button
            onClick={handleLike}
            className="flex items-center gap-1.5 text-gray-800 hover:text-black font-bold text-xs transition-transform active:scale-125 cursor-pointer"
          >
            <Heart
              className={`w-5 h-5 ${
                isLiked ? 'fill-[#FF2D55] text-[#FF2D55]' : 'text-gray-800'
              }`}
            />
            <span className="font-semibold text-xs">{likeCountNum}</span>
          </button>

          {/* 2. Comment Button */}
          <button
            onClick={() => {
              setIsCommentsSheetOpen(true);
            }}
            className="flex items-center gap-1.5 text-gray-800 hover:text-[#0066FF] font-bold text-xs transition-transform active:scale-125 cursor-pointer"
            title="কমেন্ট দেখুন ও লিখুন"
          >
            <MessageCircle className="w-5 h-5 text-gray-800 hover:text-[#0066FF] stroke-[2]" />
            <span className="font-semibold text-xs">{comments.length}</span>
          </button>

          {/* 3. Download Icon (Real Video File Download) */}
          <button
            onClick={handleDownload}
            className="p-1 text-gray-700 hover:text-black transition-colors cursor-pointer"
            title="ভিডিও ডাউনলোড করুন"
          >
            <Download className="w-5 h-5 stroke-[2]" />
          </button>

          {/* 4. Send / Share Icon */}
          <button
            onClick={handleShare}
            className="p-1 text-gray-700 hover:text-black transition-colors cursor-pointer"
            title="শেয়ার করুন"
          >
            <Send className="w-5 h-5 stroke-[2]" />
          </button>
        </div>

        {/* 5. Three Dots Options */}
        <div className="relative">
          <button
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            className="p-1 text-gray-700 hover:text-black transition-colors cursor-pointer"
            title="Options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {showOptionsMenu && (
            <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-150 py-1.5 z-40 animate-in fade-in">
              <button
                onClick={() => {
                  setShowOptionsMenu(false);
                  handleShare();
                }}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-blue-600" />
                <span>ভিডিও লিংক শেয়ার</span>
              </button>
              <button
                onClick={() => {
                  setShowOptionsMenu(false);
                  handleDownload();
                }}
                className="w-full px-4 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>ডাউনলোড করুন</span>
              </button>
              {isOwner && onDeleteVideo && (
                <button
                  onClick={() => {
                    setShowOptionsMenu(false);
                    if (window.confirm('আপনি কি এই ভিডিওটি স্থায়ীভাবে মুছে ফেলতে চান?')) {
                      onDeleteVideo(video.id);
                    }
                  }}
                  className="w-full px-4 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer border-t border-gray-100"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>ভিডিও ডিলিট করুন</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 💬 COMMENTS PREVIEW & INTERACTION SECTION */}
      <div className="px-4 py-3.5 bg-slate-50/80 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs text-slate-900 tracking-tight">
              কমেন্ট ও মতামত ({comments.length})
            </span>
          </div>
          {comments.length > 0 && (
            <button
              onClick={() => setIsCommentsSheetOpen(true)}
              className="text-xs font-bold text-[#0066FF] hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>সব দেখুন</span>
              <span>({comments.length})</span>
            </button>
          )}
        </div>

        {/* Comment Box Trigger */}
        <div
          onClick={() => setIsCommentsSheetOpen(true)}
          className="flex items-center gap-2.5 mb-2.5 cursor-pointer group"
        >
          <UserAvatar
            src={
              currentUser?.avatarUrl ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=75'
            }
            alt={currentUser?.name || 'User'}
            className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0 shadow-2xs group-hover:scale-105 transition-transform"
          />
          <div className="flex-1 relative flex items-center">
            <div className="w-full bg-white group-hover:bg-gray-50 border border-gray-200 rounded-full pl-3.5 pr-10 py-2 text-xs font-medium text-slate-500 shadow-2xs transition-colors flex items-center justify-between">
              <span>একটি কমেন্ট লিখুন...</span>
              <span className="p-1 rounded-full bg-[#0066FF] text-white">
                <Send className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>

        {/* Real-time Comments Stream Preview */}
        {comments.length === 0 ? (
          <div
            onClick={() => setIsCommentsSheetOpen(true)}
            className="py-3 px-3 text-center text-gray-400 text-xs font-medium flex items-center justify-center gap-1.5 bg-white rounded-xl border border-dashed border-gray-200 cursor-pointer hover:border-[#0066FF]/40 transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-gray-400 shrink-0" />
            <span>এখনো কোনো কমেন্ট নেই। প্রথম কমেন্টটি আপনি করুন!</span>
          </div>
        ) : (
          <div
            onClick={() => setIsCommentsSheetOpen(true)}
            className="flex flex-col gap-2.5 cursor-pointer group"
          >
            {comments.slice(-2).map((cmt) => (
              <div key={cmt.id} className="flex items-start gap-2.5">
                <UserAvatar
                  src={cmt.userAvatar}
                  alt={cmt.userName}
                  className="w-7 h-7 rounded-full object-cover border border-gray-200 shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="bg-white px-3.5 py-2 rounded-2xl border border-gray-100 shadow-2xs inline-block max-w-[95%]">
                    <span className="font-extrabold text-[11px] text-slate-900 block leading-tight">
                      {cmt.userName}
                    </span>
                    <p className="text-xs text-slate-800 leading-snug mt-0.5 break-words font-normal">
                      {cmt.text}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pl-2 mt-0.5 text-[10px] text-gray-400 font-medium">
                    <span>{formatTimeAgo(cmt.createdAt)}</span>
                    <span className="hover:text-rose-500 font-bold">❤️ লাভ</span>
                    <span className="hover:text-[#0066FF] font-bold">💬 উত্তর</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="text-[11px] font-bold text-[#0066FF] pl-9 pt-0.5 flex items-center gap-1 group-hover:underline">
              <span>সবগুলো {comments.length}টি কমেন্ট দেখতে ট্যাপ করুন →</span>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#121620] text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-bottom duration-300">
          <div className="w-6 h-6 rounded-full bg-[#FF2D55] flex items-center justify-center text-white">
            <Heart className="w-3.5 h-3.5 fill-white" />
          </div>
          <div className="flex flex-col text-xs">
            <span className="font-bold">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Video Caption & Creator Details */}
      <div className="p-4 flex flex-col gap-3">
        <h1 className="font-extrabold text-base text-gray-900 leading-tight">
          {video.title}
        </h1>

        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => {
               if (onSelectUser && video.userId) {
                 onSelectUser(video.userId, video.username || video.creator);
               } else if (onSelectUser) {
                 // Fallback for mock data without userId
                 onSelectUser(video.creator, video.username || video.creator);
               }
            }}
          >
            <UserAvatar
              src={video.creatorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=75'}
              alt={video.creator}
              className="w-10 h-10 rounded-full object-cover border border-gray-200 group-hover:ring-2 group-hover:ring-blue-500 transition-all"
            />
            <div className="flex flex-col">
              <span className="font-bold text-xs text-gray-900 flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                <span>{video.creator}</span>
                {((video as any).badgeDisplayEnabled !== false) && ((video as any).isVerified || (video as any).blueBadge || (video as any).isCreatorVerified) && (
                  <BlueBadgeIcon className="w-3.5 h-3.5" />
                )}
              </span>
              <span className="text-[11px] text-gray-400 font-medium">
                @{video.username || video.creator.toLowerCase().replace(/\s+/g, '_')}
              </span>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              alert(`You are now following @${video.creator}`);
            }}
            className="bg-black hover:bg-gray-800 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            Follow
          </button>
        </div>

        {video.description && (
          <div className="mt-1 text-xs text-gray-700 leading-relaxed">
            <p className={showFullDesc ? '' : 'line-clamp-2'}>
              {video.description}
            </p>
            {video.description.length > 80 && (
              <button
                onClick={() => setShowFullDesc(!showFullDesc)}
                className="text-gray-400 font-semibold mt-0.5 hover:text-black cursor-pointer"
              >
                {showFullDesc ? 'less' : 'more'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="h-px bg-gray-100 my-1 mx-4" />

      {/* "More like this" Section */}
      <div className="p-4 flex flex-col gap-3">
        <h2 className="font-extrabold text-sm text-gray-900">
          More like this
        </h2>

        <div className="grid grid-cols-2 gap-3.5">
          {/* Column 1 */}
          <div className="flex flex-col gap-3.5">
            {col1.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectRelatedVideo(item)}
                className="relative w-full aspect-[3/4.2] rounded-[22px] overflow-hidden shadow-sm group cursor-pointer border border-black/5 bg-gray-100"
              >
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                <div className="absolute top-2.5 left-2.5 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/10">
                  <Clapperboard className="w-3 h-3 text-white stroke-[2]" />
                  <span>HD</span>
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-lg">
                    <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                  </div>
                </div>

                <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/10">
                  <VideoIcon className="w-3 h-3 text-white" />
                  <span className="font-mono text-[10px]">{item.duration}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-3.5">
            {col2.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectRelatedVideo(item)}
                className="relative w-full aspect-[3/4.2] rounded-[22px] overflow-hidden shadow-sm group cursor-pointer border border-black/5 bg-gray-100"
              >
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                <div className="absolute top-2.5 left-2.5 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/10">
                  <Clapperboard className="w-3 h-3 text-white stroke-[2]" />
                  <span>HD</span>
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-lg">
                    <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                  </div>
                </div>

                <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/10">
                  <VideoIcon className="w-3 h-3 text-white" />
                  <span className="font-mono text-[10px]">{item.duration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Bottom Action Button ("✨ Use Idea") */}
      <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center items-center pointer-events-none px-4">
        <button
          onClick={() => alert('AI Remixing / Using Idea...')}
          className="pointer-events-auto bg-black text-white hover:bg-slate-900 border border-white/20 shadow-2xl rounded-full px-5 py-2.5 flex items-center gap-2 text-xs font-bold active:scale-95 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-[#00f2fe] stroke-[2.5]" />
          <span>Use Idea</span>
        </button>
      </div>

      {/* 📱 COMMENTS SHEET VIEW */}
      {isCommentsSheetOpen && (
        <div className="fixed inset-0 z-[60] bg-white flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200 select-none">
          {/* 1. Top Header Bar */}
          <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between shrink-0 shadow-2xs">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsCommentsSheetOpen(false)}
                className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100 text-slate-800 transition-colors cursor-pointer"
                aria-label="Back to video"
              >
                <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-base text-slate-900 leading-tight">
                    কমেন্ট ও মতামত
                  </h2>
                  <span className="font-bold text-xs text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    {comments.length}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsCommentsSheetOpen(false)}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>

          {/* 2. Scrollable Comments Feed */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50/60">
            {comments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-24 px-6">
                <div className="w-16 h-16 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center mb-3 shadow-inner">
                  <MessageCircle className="w-8 h-8 stroke-[2]" />
                </div>
                <h3 className="font-extrabold text-base text-slate-900 mb-1">
                  এখনো কোনো কমেন্ট নেই
                </h3>
                <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                  এই ভিডিওতে প্রথম মন্তব্যটি আপনি করুন!
                </p>
              </div>
            ) : (
              comments.map((cmt) => {
                const isCurrentUserComment = !!(currentUser && cmt.userId === currentUser.uid);
                const cachedProfile = getCachedUserProfile(cmt.userId);
                const displayName = isCurrentUserComment
                  ? currentUser.name
                  : (cachedProfile?.name || cmt.userName);
                const displayAvatar = isCurrentUserComment
                  ? currentUser.avatarUrl
                  : (cachedProfile?.avatarUrl || cmt.userAvatar || cmt.profilePhoto);
                const displayUsername = isCurrentUserComment
                  ? currentUser.username
                  : (cachedProfile?.username || cmt.userUsername || cmt.username);

                return (
                  <div key={cmt.id} className="flex items-start gap-3">
                    <UserAvatar
                      src={displayAvatar}
                      alt={displayName}
                      className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0 mt-0.5 shadow-2xs"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="bg-white p-3.5 rounded-2xl border border-gray-150 shadow-2xs inline-block max-w-[95%]">
                        <span className="font-extrabold text-xs text-slate-900 block leading-tight">
                          {displayName}
                        </span>
                        <p className="text-xs sm:text-sm text-slate-800 leading-relaxed mt-1 break-words font-normal">
                          {cmt.text}
                        </p>
                      </div>

                      <div className="flex items-center gap-3.5 pl-2 mt-1 text-[11px] text-gray-500 font-medium">
                        <span>{formatTimeAgo(cmt.createdAt)}</span>
                        <button
                          type="button"
                          onClick={() => alert('❤️ লাভ যোগ করা হয়েছে')}
                          className="hover:text-rose-500 font-bold transition-colors cursor-pointer"
                        >
                          ❤️ লাভ
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewCommentText(`@${displayUsername} `);
                          }}
                          className="hover:text-[#0066FF] font-bold transition-colors cursor-pointer"
                        >
                          💬 উত্তর
                        </button>
                        {isCurrentUserComment && (
                          <button
                            onClick={() => handleDeleteComment(cmt.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors ml-1 cursor-pointer"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3 h-3 inline" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 3. Sticky Bottom Comment Composer in Full Screen */}
          <div className="p-3.5 bg-white border-t border-gray-200 shrink-0 shadow-lg">
            <form onSubmit={handleAddComment} className="flex items-center gap-2.5 max-w-xl mx-auto">
              <UserAvatar
                src={
                  currentUser?.avatarUrl ||
                  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=75'
                }
                alt={currentUser?.name || 'User'}
                className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0 shadow-2xs"
              />
              <div className="flex-1 relative flex items-center">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder="আপনার কমেন্ট লিখুন..."
                  disabled={isSubmittingComment}
                  className="w-full bg-slate-100 border border-slate-200 rounded-full pl-4 pr-12 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0066FF] focus:bg-white transition-colors"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim() || isSubmittingComment}
                  className="absolute right-1.5 p-1.5 bg-[#0066FF] hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-[#0066FF] text-white rounded-full transition-transform active:scale-95 cursor-pointer shadow-sm"
                  aria-label="Send"
                >
                  {isSubmittingComment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
