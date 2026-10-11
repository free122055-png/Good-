import React, { useState } from 'react';
import { Search, X, TrendingUp, Clapperboard, Video } from 'lucide-react';
import { VIDEOS_DATA, VideoItem } from '../data/mockData';

interface SearchOverlayProps {
  onClose: () => void;
  onSelectVideo: (video: VideoItem) => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  onClose,
  onSelectVideo,
}) => {
  const [query, setQuery] = useState('');
  const tags = ['#fashion', '#cats', '#desert', '#portrait', '#coffee', '#subway'];

  const filteredVideos = VIDEOS_DATA.filter(
    (v) =>
      v.title.toLowerCase().includes(query.toLowerCase()) ||
      v.creator.toLowerCase().includes(query.toLowerCase()) ||
      v.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-40 bg-white/95 backdrop-blur-xl flex flex-col p-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search videos, creators, tags..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-gray-100 border border-gray-200 text-black text-xs rounded-full pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#FF2D55]"
            autoFocus
          />
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-600 font-bold text-xs hover:text-black"
        >
          Cancel
        </button>
      </div>

      {/* Trending Tags */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mb-2">
          <TrendingUp className="w-3.5 h-3.5 text-[#FF2D55]" />
          <span>Trending Hashtags</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, idx) => (
            <button
              key={idx}
              onClick={() => setQuery(tag.replace('#', ''))}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs px-3 py-1.5 rounded-full font-medium"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Results Grid */}
      <div className="flex-1 overflow-y-auto pb-20">
        <span className="text-xs font-bold text-gray-400 mb-3 block">
          Results ({filteredVideos.length})
        </span>
        <div className="grid grid-cols-2 gap-3">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              onClick={() => {
                onSelectVideo(video);
                onClose();
              }}
              className="relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer group shadow-sm"
            >
              <img
                src={video.thumbnailUrl}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent p-2.5 flex flex-col justify-end text-white">
                <span className="font-bold text-xs truncate">{video.title}</span>
                <span className="text-[10px] text-gray-300">@{video.creator}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
