import React from 'react';
import { Heart, MessageCircle, UserPlus, X } from 'lucide-react';

interface ActivityOverlayProps {
  onClose: () => void;
}

export const ActivityOverlay: React.FC<ActivityOverlayProps> = ({ onClose }) => {
  const notifications = [
    { id: 1, type: 'like', user: 'Nusrat Jahan', text: 'liked your story "Mountain Lake Sunset"', time: '10m ago', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80' },
    { id: 2, type: 'comment', user: 'creative_mind', text: 'commented: "Stunning HD quality!"', time: '1h ago', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' },
    { id: 3, type: 'follow', user: 'mono_lens', text: 'started following you', time: '3h ago', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80' },
  ];

  return (
    <div className="fixed inset-0 z-40 bg-white/95 backdrop-blur-xl flex flex-col p-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
        <span className="font-extrabold text-base text-black">Notifications & Activity</span>
        <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:text-black">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* List */}
      <div className="space-y-3 flex-1 overflow-y-auto">
        {notifications.map((n) => (
          <div key={n.id} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
            <img src={n.avatar} alt={n.user} className="w-10 h-10 rounded-full object-cover shrink-0" />
            <div className="flex-1 text-xs">
              <span className="font-bold text-black mr-1">@{n.user}</span>
              <span className="text-gray-600">{n.text}</span>
              <span className="block text-[10px] text-gray-400 mt-0.5">{n.time}</span>
            </div>
            {n.type === 'like' && <Heart className="w-4 h-4 fill-[#FF2D55] text-[#FF2D55] shrink-0" />}
            {n.type === 'comment' && <MessageCircle className="w-4 h-4 text-blue-500 shrink-0" />}
            {n.type === 'follow' && <UserPlus className="w-4 h-4 text-emerald-500 shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
};
