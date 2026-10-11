import React, { memo } from 'react';
import { Plus } from 'lucide-react';
import { StoryItem } from '../data/mockData';
import { UserAvatar } from './UserAvatar';

interface StoriesSectionProps {
  stories: StoryItem[];
  onSelectStory: (story: StoryItem) => void;
  onCreateStory: () => void;
}

export const StoriesSection: React.FC<StoriesSectionProps> = memo(({
  stories,
  onSelectStory,
  onCreateStory,
}) => {
  return (
    <div className="pt-2 pb-2 px-4 overflow-hidden select-none">
      <div className="flex justify-start items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth py-3 px-1">
        {stories.map((story, index) => {
          if (story.isCreate) {
            return (
              <div
                key={story.id}
                onClick={onCreateStory}
                style={{ transform: 'rotate(-5.5deg)' }}
                className="w-[118px] sm:w-[124px] h-[178px] sm:h-[184px] shrink-0 rounded-[24px] bg-[#05070c] border-[2.5px] border-slate-900 shadow-xl relative flex flex-col justify-between p-3.5 cursor-pointer hover:scale-105 transition-transform active:scale-95 group"
              >
                {/* Glowing Plus Circle */}
                <div className="my-auto mx-auto w-12 h-12 rounded-full border-2 border-[#00f2fe] bg-[#00f2fe]/10 flex items-center justify-center text-[#00f2fe] shadow-[0_0_18px_rgba(0,242,254,0.4)] group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6 stroke-[2.5]" />
                </div>

                {/* Text Label */}
                <div className="text-center font-bold text-[12px] text-white leading-tight mb-1">
                  Create
                  <br />
                  Story
                </div>
              </div>
            );
          }

          const rotations = ['rotate-[1.5deg]', 'rotate-[5.5deg]', 'rotate-[-2.5deg]', 'rotate-[3.5deg]'];
          const currentRotation = rotations[(index - 1) % rotations.length];
          
          const isEven = index % 2 === 0;
          const outerBorder = isEven
            ? 'border-[2.5px] border-[#a855f7] shadow-[0_0_16px_rgba(168,85,247,0.35)]'
            : 'border-[2.5px] border-[#0284c7] shadow-[0_0_16px_rgba(2,132,199,0.35)]';
          const avatarBorder = isEven
            ? 'border-2 border-[#ec4899]'
            : 'border-2 border-[#38bdf8]';

          const safeCoverImage = story.coverImage && story.coverImage.startsWith('http://') 
            ? story.coverImage.replace('http://', 'https://') 
            : story.coverImage;

          return (
            <div
              key={story.id}
              onClick={() => onSelectStory(story)}
              className={`w-[118px] sm:w-[124px] h-[178px] sm:h-[184px] shrink-0 rounded-[24px] bg-[#0a0d14] ${outerBorder} ${currentRotation} overflow-hidden relative shadow-xl flex flex-col justify-between cursor-pointer hover:scale-105 transition-transform active:scale-95`}
            >
              {/* Cover Scenery Image with Lazy Loading & Fallback */}
              <div className="h-[62%] w-full relative overflow-hidden bg-slate-900">
                <img
                  src={safeCoverImage}
                  alt={story.username}
                  loading="lazy"
                  decoding="async"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    // Fallback to stylized dark gradient background
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                  className="w-full h-full object-cover rounded-t-[21px]"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Bottom Profile Details */}
              <div className="h-[38%] bg-[#080b10] p-2 flex flex-col justify-center">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <UserAvatar
                    src={story.avatarUrl}
                    alt={story.username}
                    className={`w-6 h-6 rounded-full ${avatarBorder} object-cover shrink-0 bg-slate-800`}
                  />
                  <span className="text-white font-bold text-[10px] sm:text-[10.5px] truncate leading-none">
                    {story.username}
                  </span>
                </div>
                <span className="text-[9px] text-gray-400 font-medium pl-0.5">
                  {story.timeAgo}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

StoriesSection.displayName = 'StoriesSection';
