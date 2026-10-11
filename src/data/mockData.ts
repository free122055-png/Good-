export interface StoryItem {
  id: string;
  userId?: string;
  username: string;
  timeAgo: string;
  avatarUrl: string;
  coverImage: string;
  borderColor: string;
  isCreate?: boolean;
  isVideo?: boolean;
  caption?: string;
  expiresAt?: number;
  durationHours?: number;
}

export interface VideoItem {
  id: string;
  title: string;
  creator: string;
  creatorAvatar: string;
  thumbnailUrl: string;
  videoUrl?: string;
  duration: string;
  quality: string;
  likesCount: string;
  commentsCount: string;
  sharesCount: string;
  downloadsCount?: number;
  description: string;
  songName: string;
  aspectRatio?: number;
  width?: number;
  height?: number;
  userId?: string;
  username?: string;
  userProfilePhoto?: string;
  storagePath?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  createdAt?: string;
  updatedAt?: string;
}

// Optimized Unsplash image URLs with w=600 & q=75 for fast loading and low memory footprint
export const STORIES_DATA: StoryItem[] = [
  {
    id: 'create',
    username: 'Create Story',
    timeAgo: '',
    avatarUrl: '',
    coverImage: '',
    borderColor: 'border-[#00f2fe]',
    isCreate: true,
  },
  {
    id: 'story-1',
    username: 'rajibul_islam_fahim',
    timeAgo: '1h ago',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=75',
    coverImage: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=75',
    borderColor: 'border-[#00d2ff]',
  },
  {
    id: 'story-2',
    username: 'Nusrat Jahan',
    timeAgo: '3h ago',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=75',
    coverImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=600&q=75',
    borderColor: 'border-[#a855f7]',
  },
];

export const VIDEOS_DATA: VideoItem[] = [
  {
    id: 'video-1',
    title: 'Red Dunes Editorial',
    creator: 'desert_vibes',
    creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=75',
    thumbnailUrl: '/videos/thumb1.jpg',
    videoUrl: '/videos/sample1.mp4',
    duration: '0:05',
    quality: 'HD',
    likesCount: '14.2K',
    commentsCount: '342',
    sharesCount: '1.1K',
    description: 'Golden hour sunset over red desert canyons 🏜️ #editorial #fashion #nature',
    songName: 'Desert Sunset - Original Audio',
    aspectRatio: 0.5625, // 9:16 Portrait (540x960)
  },
  {
    id: 'video-2',
    title: 'Window Light Shadows',
    creator: 'rajibul_islam_fahim',
    creatorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=75',
    thumbnailUrl: '/videos/thumb2.jpg',
    videoUrl: '/videos/sample2.mp4',
    duration: '0:06',
    quality: 'HD',
    likesCount: '28.9K',
    commentsCount: '890',
    sharesCount: '3.4K',
    description: 'Warm morning light streaming through shutter blinds ☀️ #portrait #cozy #aesthetic',
    songName: 'Soft Acoustic - Rajibul Audio',
    aspectRatio: 1.333, // 4:3 Standard (640x480)
  },
  {
    id: 'video-3',
    title: 'Pink Armchair & Persian Cats',
    creator: 'Nusrat Jahan',
    creatorAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=75',
    thumbnailUrl: '/videos/thumb3.jpg',
    videoUrl: '/videos/sample3.mp4',
    duration: '0:05',
    quality: 'HD',
    likesCount: '42.1K',
    commentsCount: '1.4K',
    sharesCount: '5.2K',
    description: 'Surrounded by fluffy white Persian cats in my pink haven 🐱💖 #cats #pinkaesthetic #lifestyle',
    songName: 'Cute Cat Melody - Nusrat Audio',
    aspectRatio: 0.5625, // 9:16 Portrait (540x960)
  },
  {
    id: 'video-4',
    title: 'Monochrome Portrait Mood',
    creator: 'mono_lens',
    creatorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=75',
    thumbnailUrl: '/videos/thumb4.jpg',
    videoUrl: '/videos/sample4.mp4',
    duration: '0:05',
    quality: 'HD',
    likesCount: '19.4K',
    commentsCount: '521',
    sharesCount: '2.0K',
    description: 'High contrast B&W editorial session 🖤🤍 #blackandwhite #portrait #photography',
    songName: 'Noir Vibe - Instrumental',
    aspectRatio: 1.777, // 16:9 Landscape (960x540)
  },
  {
    id: 'video-5',
    title: 'Morning Coffee & Art',
    creator: 'art_coffee_life',
    creatorAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=75',
    thumbnailUrl: '/videos/thumb5.jpg',
    videoUrl: '/videos/sample5.mp4',
    duration: '0:05',
    quality: 'HD',
    likesCount: '33.7K',
    commentsCount: '912',
    sharesCount: '2.8K',
    description: 'Sipping espresso surrounded by vibrant gallery paintings ☕🎨 #art #coffee #morning',
    songName: 'LoFi Coffee Chill - Soundscapes',
    aspectRatio: 1.0, // 1:1 Square (540x540)
  },
  {
    id: 'video-6',
    title: 'Subway Commute Moments',
    creator: 'metro_stories',
    creatorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=75',
    thumbnailUrl: '/videos/thumb6.jpg',
    videoUrl: '/videos/sample6.mp4',
    duration: '0:06',
    quality: 'HD',
    likesCount: '22.8K',
    commentsCount: '630',
    sharesCount: '1.9K',
    description: 'Quiet moments on the metro train ride home 🚆✨ #subway #citylife #aesthetic',
    songName: 'City Lights Transit - Chillwave',
    aspectRatio: 1.333, // 4:3 Standard (640x480)
  },
];
