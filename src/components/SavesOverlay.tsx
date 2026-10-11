import React, { useState, useMemo, memo } from 'react';
import { Search, MoreHorizontal, Play, Clapperboard, Video, X } from 'lucide-react';
import { VideoItem } from '../data/mockData';

interface SavesOverlayProps {
  onClose: () => void;
  onSelectVideo: (video: VideoItem) => void;
}

export const SavesOverlay: React.FC<SavesOverlayProps> = memo(({
  onClose,
  onSelectVideo,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'videos'>('all');
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Saved videos list
  const savedVideosList: (VideoItem & { aspectClass: string })[] = useMemo(
    () => [
      {
        id: 'save-1',
        title: 'Pink Silk Portrait',
        creator: 'fashion_drape',
        creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=75',
        thumbnailUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=75',
        duration: '1:05',
        quality: 'HD',
        likesCount: '52.4K',
        commentsCount: '890',
        sharesCount: '4.2K',
        description: 'Ethereal pink silk drapery portrait shoot ✨ #fashion #aesthetic',
        songName: 'Silk Dreams - Ambient Audio',
        aspectClass: 'aspect-[3/4]',
      },
      {
        id: 'save-2',
        title: 'Red Roses Teacup',
        creator: 'vintage_rose',
        creatorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=75',
        thumbnailUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=75',
        duration: '1:48',
        quality: 'HD',
        likesCount: '88.1K',
        commentsCount: '1.9K',
        sharesCount: '9.5K',
        description: 'Morning tea surrounded by blooming red velvet roses 🌹☕ #cozy #roses',
        songName: 'Rose Petal Waltz - Classical',
        aspectClass: 'aspect-[3/5]',
      },
      {
        id: 'save-3',
        title: 'Artistic Cafe Coffee',
        creator: 'art_coffee_life',
        creatorAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=75',
        thumbnailUrl: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=75',
        duration: '0:45',
        quality: 'HD',
        likesCount: '33.7K',
        commentsCount: '912',
        sharesCount: '2.8K',
        description: 'Sipping espresso at the vintage cafe table ☕🎨 #art #coffee',
        songName: 'LoFi Coffee Chill - Soundscapes',
        aspectClass: 'aspect-[3/5.2]',
      },
      {
        id: 'save-4',
        title: 'Red Desert Dunes',
        creator: 'desert_vibes',
        creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=75',
        thumbnailUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=600&q=75',
        duration: '0:48',
        quality: 'HD',
        likesCount: '14.2K',
        commentsCount: '342',
        sharesCount: '1.1K',
        description: 'Golden hour sunset over red desert canyons 🏜️ #editorial #nature',
        songName: 'Desert Sunset - Original Audio',
        aspectClass: 'aspect-[3/4.2]',
      },
    ],
    []
  );

  const filteredSaves = useMemo(
    () =>
      savedVideosList.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.creator.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [savedVideosList, searchQuery]
  );

  const col1 = useMemo(() => filteredSaves.filter((_, idx) => idx % 2 === 0), [filteredSaves]);
  const col2 = useMemo(() => filteredSaves.filter((_, idx) => idx % 2 === 1), [filteredSaves]);

  return (
    <div className="fixed inset-0 z-40 bg-white flex flex-col p-4 sm:p-5 overflow-y-auto no-scrollbar animate-in fade-in duration-200 select-none pb-24">
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 border border-white/20 animate-in slide-in-from-top-2">
          <span>{toastMessage}</span>
        </div>
      )}
      {/* Top Header Row */}
      <div className="flex items-center justify-between pt-1 pb-2">
        <h1 className="text-2xl font-black tracking-tight text-black">Saves</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab(activeTab === 'videos' ? 'all' : 'videos')}
            className="text-sm font-semibold text-gray-700 hover:text-black transition-colors"
          >
            Videos
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:text-black transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Full Width Search Pill */}
      <div className="relative my-3">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search saves"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-gray-100/90 border border-gray-200/60 text-black text-sm rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:bg-white focus:border-gray-300 transition-colors placeholder:text-gray-500 placeholder:font-normal"
        />
      </div>

      {/* Masonry / Staggered 2-Column Grid */}
      <div className="grid grid-cols-2 gap-3.5 items-start mt-2">
        {/* Column 1 */}
        <div className="flex flex-col gap-4">
          {col1.map((item) => (
            <div key={item.id} className="flex flex-col gap-1">
              <div
                onClick={() => onSelectVideo(item)}
                className={`relative ${item.aspectClass} rounded-[24px] overflow-hidden shadow-sm group cursor-pointer border border-black/5 bg-gray-100`}
              >
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

                <div className="absolute top-2.5 left-2.5 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/10">
                  <Clapperboard className="w-3 h-3 text-white stroke-[2]" />
                  <span>HD</span>
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 text-white group-hover:scale-110 transition-transform shadow-lg">
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </div>
                </div>

                <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/10">
                  <Video className="w-3 h-3 text-white" />
                  <span className="font-mono text-[10.5px]">{item.duration}</span>
                </div>
              </div>

              <div className="flex justify-end px-1 pt-0.5 relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveActionMenuId(activeActionMenuId === item.id ? null : item.id);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-800 transition-colors rounded-full"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {activeActionMenuId === item.id && (
                  <div className="absolute right-0 top-6 z-20 bg-black/90 backdrop-blur-md text-white text-xs rounded-xl p-2 shadow-xl border border-white/10 w-36 animate-in zoom-in-95">
                    <button
                      onClick={() => {
                        showToast('Video removed from Saves');
                        setActiveActionMenuId(null);
                      }}
                      className="w-full text-left py-1.5 px-2 hover:bg-white/10 rounded font-medium text-red-400"
                    >
                      Unsave Video
                    </button>
                    <button
                      onClick={() => {
                        showToast('Share link copied!');
                        setActiveActionMenuId(null);
                      }}
                      className="w-full text-left py-1.5 px-2 hover:bg-white/10 rounded font-medium"
                    >
                      Share Video
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Column 2 */}
        <div className="flex flex-col gap-4">
          {col2.map((item) => (
            <div key={item.id} className="flex flex-col gap-1">
              <div
                onClick={() => onSelectVideo(item)}
                className={`relative ${item.aspectClass} rounded-[24px] overflow-hidden shadow-sm group cursor-pointer border border-black/5 bg-gray-100`}
              >
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

                <div className="absolute top-2.5 left-2.5 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/10">
                  <Clapperboard className="w-3 h-3 text-white stroke-[2]" />
                  <span>HD</span>
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/20 text-white group-hover:scale-110 transition-transform shadow-lg">
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </div>
                </div>

                <div className="absolute bottom-2.5 right-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 border border-white/10">
                  <Video className="w-3 h-3 text-white" />
                  <span className="font-mono text-[10.5px]">{item.duration}</span>
                </div>
              </div>

              <div className="flex justify-end px-1 pt-0.5 relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveActionMenuId(activeActionMenuId === item.id ? null : item.id);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-800 transition-colors rounded-full"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {activeActionMenuId === item.id && (
                  <div className="absolute right-0 top-6 z-20 bg-black/90 backdrop-blur-md text-white text-xs rounded-xl p-2 shadow-xl border border-white/10 w-36 animate-in zoom-in-95">
                    <button
                      onClick={() => {
                        showToast('Video removed from Saves');
                        setActiveActionMenuId(null);
                      }}
                      className="w-full text-left py-1.5 px-2 hover:bg-white/10 rounded font-medium text-red-400"
                    >
                      Unsave Video
                    </button>
                    <button
                      onClick={() => {
                        showToast('Share link copied!');
                        setActiveActionMenuId(null);
                      }}
                      className="w-full text-left py-1.5 px-2 hover:bg-white/10 rounded font-medium"
                    >
                      Share Video
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

SavesOverlay.displayName = 'SavesOverlay';
