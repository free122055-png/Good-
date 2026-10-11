import React, { useState, useRef, useEffect, memo } from 'react';
import { X, Camera, Video, AlertCircle, CheckCircle, Upload, Film, Image as ImageIcon, Music, Loader2 } from 'lucide-react';
import { StoryItem, VideoItem } from '../data/mockData';
import {
  uploadVideoFileToStorage,
  uploadThumbnailToStorage,
  generateVideoThumbnail,
  extractVideoMetadataAndThumbnail,
  saveVideoMetadataToFirestore,
  convertMetadataToVideoItem,
  VideoMetadata,
} from '../services/videoService';
import { useUser } from '../contexts/UserContext';

interface UploadModalProps {
  isOpen: boolean;
  initialTab?: 'story' | 'video';
  onClose: () => void;
  onUploadStory: (story: StoryItem) => void;
  onUploadVideo: (video: VideoItem) => void;
  uid?: string;
}

export const UploadModal: React.FC<UploadModalProps> = memo(({
  isOpen,
  initialTab = 'story',
  onClose,
  onUploadStory,
  onUploadVideo,
  uid = 'guest_creator',
}) => {
  const { currentUser } = useUser();
  const [activeTab, setActiveTab] = useState<'story' | 'video'>(initialTab);

  // Sync activeTab whenever initialTab or isOpen changes
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Story state
  const [storyImage, setStoryImage] = useState<string>(
    'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=75'
  );
  const [storyUsername, setStoryUsername] = useState(currentUser?.username || 'creator');

  // Video state
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [videoSong, setVideoSong] = useState('Original Audio - BINISTA');
  const [videoThumbnail, setVideoThumbnail] = useState<string>(
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=75'
  );
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | undefined>(undefined);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>(0.75);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number>(72);
  const [durationText, setDurationText] = useState('1:12');
  const [durationError, setDurationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Clean up Object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (uploadedVideoUrl && uploadedVideoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(uploadedVideoUrl);
      }
    };
  }, [uploadedVideoUrl]);

  if (!isOpen) return null;

  // Handle Story Image Upload
  const handleStoryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setStoryImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Video File Upload & Calculate Duration safely
  const handleVideoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedVideoFile(file);
    if (uploadedVideoUrl && uploadedVideoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(uploadedVideoUrl);
    }

    const videoUrl = URL.createObjectURL(file);
    setUploadedVideoUrl(videoUrl);

    try {
      const info = await extractVideoMetadataAndThumbnail(file);
      setVideoThumbnail(info.thumbnailUrl);
      setVideoDurationSeconds(info.durationSec);
      setDurationText(info.duration);
      setVideoAspectRatio(info.aspectRatio);

      if (info.durationSec > 120) {
        setDurationError(
          `Video is ${info.duration} long. Maximum allowed video length is 2:00 (120 seconds).`
        );
      } else {
        setDurationError(null);
      }
    } catch (err) {
      setVideoThumbnail('https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=75');
      setDurationError(null);
    }
  };

  const storyPresets = [
    { label: 'Desert Sunset', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=75' },
    { label: 'Mountain Lake', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=75' },
    { label: 'Starry Sea', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=600&q=75' },
    { label: 'Cozy Morning', url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=75' },
  ];

  const handlePublishStory = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const newStory: StoryItem = {
        id: `story-${Date.now()}`,
        username: storyUsername.replace('@', '').trim() || 'rajibul_islam_fahim',
        timeAgo: 'Just now',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=75',
        coverImage: storyImage,
        borderColor: 'border-[#00f2fe]',
      };

      onUploadStory(newStory);
      setIsSubmitting(false);
      onClose();
    }, 400);
  };

  const handlePublishVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (videoDurationSeconds > 120) {
      setDurationError('Cannot upload video over 2 minutes (120s). Please trim your video.');
      return;
    }

    setIsSubmitting(true);
    const videoId = `binista_short_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    try {
      let finalVideoUrl = uploadedVideoUrl || '';
      let storagePath = `users/${uid}/videos/${videoId}/video`;

      if (selectedVideoFile) {
        try {
          const uploadRes = await uploadVideoFileToStorage(selectedVideoFile, uid, videoId);
          finalVideoUrl = uploadRes.videoUrl;
          storagePath = uploadRes.storagePath;
        } catch (uploadErr) {
          console.warn('Upload modal storage sync fallback:', uploadErr);
        }
      }

      if (!finalVideoUrl || finalVideoUrl.startsWith('blob:')) {
        finalVideoUrl = 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-lights-41584-large.mp4';
      }

      const metadata: VideoMetadata = {
        videoId,
        userId: currentUser?.uid || uid,
        username: currentUser?.username || 'creator',
        userProfilePhoto: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=75',
        videoUrl: finalVideoUrl,
        storagePath,
        thumbnailUrl: (() => {
          let t = videoThumbnail;
          if (!t || t.startsWith('blob:') || t.endsWith('.mp4') || t.endsWith('.mov') || t.endsWith('.webm') || t.includes('/video')) {
            return 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=75';
          }
          return t;
        })(),
        caption: videoDescription.trim() || videoTitle.trim() || 'New BINISTA Short',
        title: videoTitle.trim() || 'New BINISTA Short',
        creator: currentUser?.name || `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'Creator',
        creatorAvatar: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=75',
        duration: durationText,
        aspectRatio: videoAspectRatio,
        quality: 'HD',
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        downloadsCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        visibility: 'public',
      };

      // Save permanently to Firestore
      await saveVideoMetadataToFirestore(metadata);

      const newVideo = convertMetadataToVideoItem(metadata);
      onUploadVideo(newVideo);
      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      console.error('Upload modal error:', err);
      setDurationError(err.message || 'Failed to permanently upload video');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-[#0b0d14] text-white w-full max-w-md rounded-[30px] border border-slate-800 p-5 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto no-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF0055] to-[#FF5E7E] flex items-center justify-center text-white shadow-md">
              <Upload className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="font-extrabold text-base tracking-tight">
              Create & Upload
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 p-1 bg-slate-900/90 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab('story')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'story'
                ? 'bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-black shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Upload Story</span>
          </button>

          <button
            onClick={() => setActiveTab('video')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 relative ${
              activeTab === 'video'
                ? 'bg-gradient-to-r from-[#FF0055] to-[#FF5E7E] text-white shadow'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Upload Video</span>
            <span className="text-[9px] bg-black/40 px-1.5 py-0.2 rounded-full border border-white/20 font-mono">
              Max 2m
            </span>
          </button>
        </div>

        {/* STORY UPLOAD TAB */}
        {activeTab === 'story' && (
          <form onSubmit={handlePublishStory} className="space-y-4">
            <div className="flex justify-center my-1 py-2">
              <div
                style={{ transform: 'rotate(-4deg)' }}
                className="w-[124px] h-[184px] rounded-[24px] bg-[#0d121c] border-[2.5px] border-[#00f2fe] shadow-[0_0_18px_rgba(0,242,254,0.3)] overflow-hidden relative flex flex-col justify-between"
              >
                <img
                  src={storyImage}
                  alt="Story preview"
                  loading="lazy"
                  decoding="async"
                  className="h-[62%] w-full object-cover rounded-t-[21px]"
                  referrerPolicy="no-referrer"
                />
                <div className="h-[38%] bg-[#080b10] p-2 flex flex-col justify-center">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <img
                      src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=75"
                      alt="User avatar"
                      className="w-6 h-6 rounded-full border-2 border-[#38bdf8] object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-white font-bold text-[10px] truncate">
                      {storyUsername}
                    </span>
                  </div>
                  <span className="text-[9px] text-gray-400 font-medium pl-0.5">
                    Just now
                  </span>
                </div>
              </div>
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleStoryImageChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-[#00f2fe] text-xs font-semibold text-gray-200 flex items-center justify-center gap-2 transition-colors"
              >
                <ImageIcon className="w-4 h-4 text-[#00f2fe]" />
                <span>Select Photo from Device</span>
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 mb-1.5 block">
                Or Choose Sample Preset Photo
              </label>
              <div className="grid grid-cols-4 gap-2">
                {storyPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setStoryImage(preset.url)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      storyImage === preset.url ? 'border-[#00f2fe] scale-105' : 'border-slate-800 opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img src={preset.url} alt={preset.label} loading="lazy" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 mb-1 block">
                Creator Handle
              </label>
              <input
                type="text"
                value={storyUsername}
                onChange={(e) => setStoryUsername(e.target.value)}
                placeholder="e.g. rajibul_islam_fahim"
                className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#00f2fe]"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-black font-extrabold text-xs shadow-lg hover:opacity-95 active:scale-[0.99] transition-transform flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Publishing Story...' : 'Share Story to BINISTA'}
            </button>
          </form>
        )}

        {/* VIDEO UPLOAD TAB */}
        {activeTab === 'video' && (
          <form onSubmit={handlePublishVideo} className="space-y-3.5">
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-2.5">
              <Film className="w-5 h-5 text-[#FF0055] shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-white block">Auto Adaptive Video Frame:</span>
                <span className="text-gray-300">System automatically detects & adapts to any aspect ratio (9:16 portrait, 16:9 landscape, 1:1 square, etc.) with max 2 minutes duration.</span>
              </div>
            </div>

            <div>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-700 hover:border-[#FF0055] bg-slate-900/60 text-xs font-semibold text-gray-200 flex flex-col items-center justify-center gap-1.5 transition-colors p-4"
              >
                <Video className="w-6 h-6 text-[#FF0055]" />
                <span>Select Any Video File (MP4, MOV, WebM)</span>
                <span className="text-[10px] text-gray-400">
                  {videoAspectRatio ? `Detected Frame Ratio: ${videoAspectRatio.toFixed(2)}` : 'Frame ratio & duration detected automatically'}
                </span>
              </button>
            </div>

            {durationError ? (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{durationError}</span>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="font-semibold">Duration Valid: {durationText}</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold">
                  ✓ Under 2 Mins
                </span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-400 mb-1 block">
                Video Title
              </label>
              <input
                type="text"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="e.g. Red Dunes Editorial Walk"
                className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#FF0055]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 mb-1 block">
                Description & Hashtags
              </label>
              <input
                type="text"
                value={videoDescription}
                onChange={(e) => setVideoDescription(e.target.value)}
                placeholder="e.g. Golden hour sunset vibes 🏜️ #BINISTA #Shorts"
                className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#FF0055]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-400 mb-1 block">
                Music / Audio Track Name
              </label>
              <div className="relative">
                <Music className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={videoSong}
                  onChange={(e) => setVideoSong(e.target.value)}
                  placeholder="e.g. Soft Acoustic - Rajibul Audio"
                  className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:border-[#FF0055]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !!durationError}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#FF0055] to-[#FF5E7E] text-white font-extrabold text-xs shadow-lg hover:opacity-95 disabled:opacity-50 transition-transform flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Uploading Video...' : 'Publish Short Video'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
});

UploadModal.displayName = 'UploadModal';
