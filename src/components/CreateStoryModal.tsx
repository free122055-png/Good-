import React, { useState } from 'react';
import { X, Image, Video, Sparkles, Check } from 'lucide-react';

interface CreateStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: (title: string, imageUrl: string) => void;
}

export const CreateStoryModal: React.FC<CreateStoryModalProps> = ({
  isOpen,
  onClose,
  onStoryCreated,
}) => {
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [caption, setCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const presets = [
    { name: 'Red Desert Sunset', url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80' },
    { name: 'Mountain Lake Sunset', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80' },
    { name: 'Starry Aurora Sea', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=800&q=80' },
    { name: 'Coffee Studio Vibes', url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=800&q=80' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      onStoryCreated(caption || 'New Story Moment', presets[selectedPreset].url);
      setIsSubmitting(false);
      setCaption('');
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#111318] text-white w-full max-w-md rounded-[28px] border border-slate-800 p-5 shadow-2xl flex flex-col gap-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#00f2fe]/10 border border-[#00f2fe] flex items-center justify-center text-[#00f2fe]">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold text-base">Create New Story</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Image Preview */}
        <div className="relative h-48 rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 group">
          <img
            src={presets[selectedPreset].url}
            alt="Preview"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3">
            <span className="text-xs font-semibold text-white/90">
              {presets[selectedPreset].name}
            </span>
          </div>
        </div>

        {/* Preset Image Selector */}
        <div>
          <label className="text-xs text-gray-400 font-semibold mb-2 block">
            Choose Background / Media
          </label>
          <div className="grid grid-cols-4 gap-2">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedPreset(idx)}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                  selectedPreset === idx ? 'border-[#00f2fe] scale-105' : 'border-slate-800 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                {selectedPreset === idx && (
                  <div className="absolute inset-0 bg-[#00f2fe]/20 flex items-center justify-center">
                    <Check className="w-4 h-4 text-[#00f2fe] stroke-[3]" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Caption Input */}
        <div>
          <label className="text-xs text-gray-400 font-semibold mb-1 block">
            Story Caption
          </label>
          <input
            type="text"
            placeholder="Write a caption or feeling..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#00f2fe]"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#00f2fe] to-[#4facfe] text-black font-bold text-sm shadow-lg hover:opacity-95 active:scale-[0.99] transition-transform flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span>Publishing Story...</span>
          ) : (
            <>
              <Sparkles className="w-4 h-4 fill-black" />
              <span>Share to BINISTA</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
