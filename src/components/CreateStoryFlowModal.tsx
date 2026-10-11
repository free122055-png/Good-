import React, { useState, useRef, memo } from 'react';
import {
  X,
  ChevronRight,
  Video as VideoIcon,
  ArrowLeft,
  Check,
  Type,
  Volume2,
  VolumeX,
  Play,
  Pause,
} from 'lucide-react';
import { StoryItem } from '../data/mockData';
import { sendOneSignalPush } from '../services/oneSignalService';
import { registerBackHandler } from '../services/backNavigationService';
import { useUser } from '../contexts/UserContext';

interface CreateStoryFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublishStory: (story: StoryItem) => void;
}

export const CreateStoryFlowModal: React.FC<CreateStoryFlowModalProps> = memo(({
  isOpen,
  onClose,
  onPublishStory,
}) => {
  const { currentUser } = useUser();
  const [mode, setMode] = useState<'choose' | 'text-editor' | 'media-preview'>('choose');

  // Selected Photo / Video Media State
  const [selectedMedia, setSelectedMedia] = useState<{
    url: string;
    isVideo: boolean;
    name: string;
  } | null>(null);
  const [mediaCaption, setMediaCaption] = useState('');
  const [isPreviewMuted, setIsPreviewMuted] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);

  // Text Story State
  const [textContent, setTextContent] = useState('');
  const [selectedBg, setSelectedBg] = useState(
    'bg-gradient-to-tr from-purple-600 via-pink-500 to-[#FF2D55]'
  );
  const [selectedFontId, setSelectedFontId] = useState('hind-siliguri');
  const [activeLangFilter, setActiveLangFilter] = useState<'all' | 'bn' | 'en' | 'ar'>('all');
  const [isPublishing, setIsPublishing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  // Android Back Navigation Handler for Create Story
  React.useEffect(() => {
    if (!isOpen) return;

    const unregister = registerBackHandler(() => {
      if (mode !== 'choose') {
        setMode('choose');
        setSelectedMedia(null);
        setTextContent('');
        return true;
      }
      onClose();
      return true;
    });

    return () => unregister();
  }, [isOpen, mode, onClose]);

  if (!isOpen) return null;

  const bgPresets = [
    { id: 1, class: 'bg-gradient-to-tr from-purple-600 via-pink-500 to-[#FF2D55]', fill: '#ec4899' },
    { id: 2, class: 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-700', fill: '#2563eb' },
    { id: 3, class: 'bg-gradient-to-tr from-[#00f2fe] to-[#4facfe]', fill: '#00f2fe' },
    { id: 4, class: 'bg-gradient-to-tr from-amber-500 via-rose-500 to-red-600', fill: '#f43f5e' },
    { id: 5, class: 'bg-[#0f172a]', fill: '#0f172a' },
  ];

  const fontOptions = [
    // Bengali (বাংলা) Fonts
    { id: 'hind-siliguri', name: 'হিন্দ শিলিগুড়ি', lang: 'bn', label: 'বাংলা (Modern)', family: "'Hind Siliguri', sans-serif" },
    { id: 'noto-serif-bn', name: 'নোটো সেরিফ', lang: 'bn', label: 'বাংলা (Classic)', family: "'Noto Serif Bengali', serif" },
    { id: 'anek-bangla', name: 'অনেক বাংলা', lang: 'bn', label: 'বাংলা (Bold)', family: "'Anek Bangla', sans-serif" },
    { id: 'mina', name: 'মিনা ক্যালিগ্রাফি', lang: 'bn', label: 'বাংলা (Elegant)', family: "'Mina', sans-serif" },
    { id: 'tiro-bangla', name: 'তিরো বাংলা', lang: 'bn', label: 'বাংলা (Literary)', family: "'Tiro Bangla', serif" },

    // English Fonts
    { id: 'inter', name: 'Inter Bold', lang: 'en', label: 'English Modern', family: "'Inter', sans-serif" },
    { id: 'playfair', name: 'Playfair Display', lang: 'en', label: 'English Elegant', family: "'Playfair Display', serif" },
    { id: 'caveat', name: 'Caveat Cursive', lang: 'en', label: 'English Handwriting', family: "'Caveat', cursive" },
    { id: 'oswald', name: 'Oswald Headline', lang: 'en', label: 'English Punchy', family: "'Oswald', sans-serif" },
    { id: 'spacemono', name: 'Space Mono', lang: 'en', label: 'English Tech', family: "'Space Mono', monospace" },

    // Arabic (العربية) Fonts
    { id: 'amiri', name: 'أميري Amiri', lang: 'ar', label: 'العربية (خط أصيل)', family: "'Amiri', serif" },
    { id: 'cairo', name: 'القاهرة Cairo', lang: 'ar', label: 'العربية (حديث)', family: "'Cairo', sans-serif" },
    { id: 'noto-arabic', name: 'نسخ Noto', lang: 'ar', label: 'العربية (النسخ)', family: "'Noto Naskh Arabic', serif" },
    { id: 'tajawal', name: 'تجوال Tajawal', lang: 'ar', label: 'العربية (متناسق)', family: "'Tajawal', sans-serif" },
  ];

  const selectedFont = fontOptions.find((f) => f.id === selectedFontId) || fontOptions[0];

  const filteredFonts = fontOptions.filter((f) => {
    if (activeLangFilter === 'all') return true;
    return f.lang === activeLangFilter;
  });

  // Device Media File Upload (Photo or Video for Story)
  const handleMediaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const mediaUrl = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video');

      setSelectedMedia({
        url: mediaUrl,
        isVideo: isVideo,
        name: file.name,
      });

      setIsPreviewMuted(false);
      setIsPreviewPlaying(true);
      setMediaCaption('');
      setMode('media-preview');
    }
  };

  // Publish Selected Media (Photo / Video) Story with Caption
  const handlePublishMediaStory = () => {
    if (!selectedMedia) return;

    setIsPublishing(true);
    setTimeout(() => {
      const authorUsername = currentUser?.username || 'user';
      const authorAvatar = currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=75';
      const authorName = currentUser?.name || authorUsername;

      const newStoryItem: StoryItem = {
        id: `story-${Date.now()}`,
        username: authorUsername,
        timeAgo: 'Just now',
        avatarUrl: authorAvatar,
        coverImage: selectedMedia.url,
        borderColor: selectedMedia.isVideo ? 'border-[#ec4899]' : 'border-[#00f2fe]',
        isVideo: selectedMedia.isVideo,
        caption: mediaCaption.trim() || undefined,
      };

      onPublishStory(newStoryItem);
      sendOneSignalPush({
        title: '✨ BINISTA New Story Uploaded',
        body: `${authorName} একটি নতুন মিডিয়া স্টোরি পোস্ট করেছেন!`,
        type: 'story',
      });
      setIsPublishing(false);
      setSelectedMedia(null);
      setMediaCaption('');
      setMode('choose');
      onClose();
    }, 450);
  };

  // Publish Text Story
  const handlePublishTextStory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textContent.trim()) return;

    setIsPublishing(true);
    setTimeout(() => {
      const authorUsername = currentUser?.username || 'user';
      const authorAvatar = currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=75';
      const authorName = currentUser?.name || authorUsername;

      // Create SVG data URL preserving the chosen font family & background
      const svgFontImport = `@import url('https://fonts.googleapis.com/css2?family=Amiri&family=Anek+Bangla&family=Cairo&family=Caveat&family=Hind+Siliguri&family=Inter:wght@700&family=Mina&family=Noto+Naskh+Arabic&family=Noto+Serif+Bengali&family=Oswald&family=Playfair+Display&family=Space+Mono&family=Tajawal&family=Tiro+Bangla&display=swap');`;
      const escapedText = textContent.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
        <defs>
          <style>
            ${svgFontImport}
          </style>
          <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#8b5cf6" />
            <stop offset="50%" stop-color="#ec4899" />
            <stop offset="100%" stop-color="#ff2d55" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)" />
        <text x="50%" y="50%" font-family="${selectedFont.family.replace(/'/g, '')}" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${escapedText}</text>
      </svg>`;

      const encodedSvg = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

      const newStoryItem: StoryItem = {
        id: `story-${Date.now()}`,
        username: authorUsername,
        timeAgo: 'Just now',
        avatarUrl: authorAvatar,
        coverImage: encodedSvg,
        borderColor: 'border-[#a855f7]',
      };

      onPublishStory(newStoryItem);
      sendOneSignalPush({
        title: '✨ BINISTA New Text Story Uploaded',
        body: `${authorName} একটি টেক্সট স্টোরি শেয়ার করেছেন!`,
        type: 'story',
      });
      setIsPublishing(false);
      setTextContent('');
      setMode('choose');
      onClose();
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col justify-between overflow-y-auto no-scrollbar animate-in fade-in duration-200 select-none">
      {/* Hidden File Input for Device Video Selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleMediaFileChange}
        className="hidden"
      />

      {/* MODE 1: CHOOSE STORY TYPE */}
      {mode === 'choose' && (
        <div className="min-h-screen w-full flex flex-col bg-white p-5 animate-in zoom-in-95 duration-200">
          {/* Top Bar with Close X Icon */}
          <div className="flex items-center justify-between relative pb-4">
            <button
              onClick={onClose}
              className="p-1 text-slate-900 hover:opacity-70 transition-opacity cursor-pointer z-10"
              aria-label="Close"
            >
              <X className="w-6 h-6 stroke-[2.5]" />
            </button>
            <h1 className="font-extrabold text-xl text-slate-900 absolute inset-x-0 text-center pointer-events-none">
              Create Story
            </h1>
          </div>

          {/* Subtitle */}
          <p className="text-gray-500 text-xs sm:text-sm text-center max-w-xs mx-auto mt-2 mb-8 leading-relaxed">
            Choose how you want to share something with your friends.
          </p>

          <div className="flex flex-col gap-4 max-w-md mx-auto w-full">
            {/* Option 1: ভিডিও (Video) Card - Photo removed as requested */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#f2f6ff] hover:bg-[#e8f0ff] border border-blue-100/80 rounded-2xl p-4.5 flex items-center justify-between shadow-xs cursor-pointer transition-all active:scale-[0.98] group"
            >
              <div className="flex items-center gap-4">
                {/* Blue Circle Badge with Video Icon */}
                <div className="w-13 h-13 rounded-full bg-[#0066FF] text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                  <VideoIcon className="w-6 h-6 stroke-[2.5]" />
                </div>

                <div className="flex flex-col">
                  <span className="font-extrabold text-base text-slate-900 leading-tight">
                    ভিডিও
                  </span>
                  <span className="text-gray-500 text-xs font-normal mt-0.5">
                    আপনার ডিভাইস থেকে ভিডিও আপলোড করুন (Upload Video)
                  </span>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
            </div>

            {/* Option 2: Text Card */}
            <div
              onClick={() => setMode('text-editor')}
              className="bg-[#f5f3ff] hover:bg-[#ede9fe] border border-purple-100/80 rounded-2xl p-4.5 flex items-center justify-between shadow-xs cursor-pointer transition-all active:scale-[0.98] group"
            >
              <div className="flex items-center gap-4">
                {/* Purple Circle Badge matching image */}
                <div className="w-13 h-13 rounded-full bg-[#635BFF] text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                  <span className="font-extrabold text-2xl font-sans leading-none">
                    T
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="font-extrabold text-base text-slate-900 leading-tight">
                    Text
                  </span>
                  <span className="text-gray-500 text-xs font-normal mt-0.5">
                    Create a text story with colorful background.
                  </span>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors" />
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: TEXT STORY EDITOR */}
      {mode === 'text-editor' && (
        <div className="min-h-screen w-full flex flex-col justify-between bg-white p-5 animate-in slide-in-from-right duration-200">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <button
                onClick={() => setMode('choose')}
                className="p-1 text-black hover:opacity-70 cursor-pointer"
              >
                <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
              <span className="font-extrabold text-lg text-black">
                Text Story
              </span>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Tilted Preview Card */}
            <div className="my-5 flex justify-center">
              <div
                style={{ transform: 'rotate(-4deg)', fontFamily: selectedFont.family }}
                dir="auto"
                className={`w-48 h-68 rounded-[28px] ${selectedBg} shadow-2xl p-4 flex items-center justify-center text-center overflow-hidden border-2 border-white/20 transition-all`}
              >
                <span className="font-bold text-lg text-white drop-shadow-md break-words leading-snug">
                  {textContent || 'Type your story message...'}
                </span>
              </div>
            </div>

            {/* Select Font Style Section */}
            <div className="mb-4 max-w-sm mx-auto">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
                  <Type className="w-3.5 h-3.5 text-blue-600" /> Choose Font Style
                </span>
                {/* Language filter tabs */}
                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setActiveLangFilter('all')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                      activeLangFilter === 'all' ? 'bg-white text-black shadow-xs' : 'text-gray-500'
                    }`}
                  >
                    সব (All)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLangFilter('bn')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                      activeLangFilter === 'bn' ? 'bg-white text-black shadow-xs' : 'text-gray-500'
                    }`}
                  >
                    বাংলা
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLangFilter('en')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                      activeLangFilter === 'en' ? 'bg-white text-black shadow-xs' : 'text-gray-500'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLangFilter('ar')}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer ${
                      activeLangFilter === 'ar' ? 'bg-white text-black shadow-xs' : 'text-gray-500'
                    }`}
                  >
                    العربية
                  </button>
                </div>
              </div>

              {/* Scrollable Font Pills */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 px-0.5">
                {filteredFonts.map((font) => (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => setSelectedFontId(font.id)}
                    style={{ fontFamily: font.family }}
                    dir="auto"
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 border transition-all cursor-pointer ${
                      selectedFontId === font.id
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm scale-105'
                        : 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {font.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Background Color Presets */}
            <div className="mb-4 max-w-sm mx-auto">
              <label className="text-xs font-bold text-gray-500 mb-2 block text-center">
                Select Background Color
              </label>
              <div className="flex justify-center gap-3">
                {bgPresets.map((bg) => (
                  <button
                    key={bg.id}
                    type="button"
                    onClick={() => setSelectedBg(bg.class)}
                    className={`w-9 h-9 rounded-full ${bg.class} border-2 shadow transition-transform cursor-pointer flex items-center justify-center ${
                      selectedBg === bg.class ? 'border-black scale-110' : 'border-white'
                    }`}
                  >
                    {selectedBg === bg.class && (
                      <Check className="w-4 h-4 text-white stroke-[3]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Input */}
            <div className="max-w-sm mx-auto">
              <input
                type="text"
                dir="auto"
                placeholder="Type your story message..."
                style={{ fontFamily: selectedFont.family }}
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                className="w-full bg-gray-100 border border-gray-200 text-black text-sm rounded-2xl px-4 py-3 focus:outline-none focus:border-black font-semibold"
                autoFocus
              />
            </div>
          </div>

          {/* Share Button */}
          <div className="pt-4 max-w-sm mx-auto w-full">
            <button
              onClick={handlePublishTextStory}
              disabled={isPublishing || !textContent.trim()}
              className="w-full py-3.5 rounded-full bg-[#1a202c] hover:bg-slate-800 disabled:opacity-50 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer"
            >
              {isPublishing ? 'Sharing Story...' : 'Share Story to BINISTA'}
            </button>
          </div>
        </div>
      )}

      {/* MODE 3: PHOTO / VIDEO MEDIA PREVIEW & CAPTION EDITOR */}
      {mode === 'media-preview' && selectedMedia && (
        <div className="min-h-screen w-full flex flex-col justify-between bg-white p-5 animate-in slide-in-from-right duration-200">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <button
                onClick={() => {
                  setSelectedMedia(null);
                  setMode('choose');
                }}
                className="p-1 text-black hover:opacity-70 cursor-pointer"
              >
                <ArrowLeft className="w-6 h-6 stroke-[2.5]" />
              </button>
              <span className="font-extrabold text-lg text-black">
                {selectedMedia.isVideo ? 'Video Story Preview' : 'Photo Story Preview'}
              </span>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Media Card Live Preview */}
            <div className="my-5 flex flex-col items-center">
              <div
                style={{ transform: 'rotate(-3deg)' }}
                className="relative w-48 h-72 rounded-[28px] overflow-hidden shadow-2xl border-2 border-slate-900 bg-black group"
              >
                {selectedMedia.isVideo ? (
                  <>
                    <video
                      ref={videoPreviewRef}
                      src={selectedMedia.url}
                      autoPlay
                      loop
                      muted={isPreviewMuted}
                      playsInline
                      onError={(e) => console.warn('Story preview video error:', e)}
                      className="w-full h-full object-cover"
                    />

                    {/* Mute / Unmute Button */}
                    <button
                      onClick={() => setIsPreviewMuted(!isPreviewMuted)}
                      className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:bg-black/80 transition-colors shadow-md cursor-pointer"
                      title={isPreviewMuted ? 'Unmute sound' : 'Mute sound'}
                    >
                      {isPreviewMuted ? (
                        <VolumeX className="w-4 h-4 text-red-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                      )}
                    </button>
                  </>
                ) : (
                  <img
                    src={selectedMedia.url}
                    alt="Story preview"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Caption overlay preview on story card if user types caption */}
                {mediaCaption.trim() && (
                  <div className="absolute inset-x-2 bottom-3 z-20 text-center">
                    <div className="inline-block bg-black/60 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-xl max-w-[90%]">
                      <p className="text-white font-bold text-xs leading-snug drop-shadow truncate">
                        {mediaCaption}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <span className="text-[11px] font-semibold text-gray-500 mt-1 flex items-center gap-1">
                {selectedMedia.isVideo
                  ? isPreviewMuted
                    ? '🔇 Video Sound Muted (tap sound icon to unmute)'
                    : '🔊 Video Sound Playing Live'
                  : '📷 High Quality Photo Loaded'}
              </span>
            </div>

            {/* Caption Input Section */}
            <div className="max-w-sm mx-auto mt-2">
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">
                ক্যাপশন বা মেসেজ (Add Caption)
              </label>
              <input
                type="text"
                dir="auto"
                placeholder="Type a caption for your story..."
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
                className="w-full bg-gray-100 border border-gray-200 text-black text-xs rounded-2xl px-4 py-3 focus:outline-none focus:border-black font-semibold"
                autoFocus
              />
            </div>
          </div>

          {/* Share Button */}
          <div className="pt-4 max-w-sm mx-auto w-full">
            <button
              onClick={handlePublishMediaStory}
              disabled={isPublishing}
              className="w-full py-3.5 rounded-full bg-[#0066FF] hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isPublishing ? 'Publishing Story...' : 'Share Story to BINISTA'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

CreateStoryFlowModal.displayName = 'CreateStoryFlowModal';
