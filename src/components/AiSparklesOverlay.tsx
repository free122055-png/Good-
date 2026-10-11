import React, { useState } from 'react';
import { Sparkles, Wand2, X, RefreshCw } from 'lucide-react';

interface AiSparklesOverlayProps {
  onClose: () => void;
}

export const AiSparklesOverlay: React.FC<AiSparklesOverlayProps> = ({ onClose }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<string | null>(null);

  const styles = ['Cyberpunk', 'Cinematic 8K', 'Anime Studio', 'Vintage 35mm', 'Watercolor'];

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGeneratedResult(null);
    setTimeout(() => {
      setIsGenerating(false);
      setGeneratedResult(
        'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80'
      );
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-xl text-white p-5 flex flex-col justify-between animate-in fade-in duration-200">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4 fill-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight">BINISTA AI Studio</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prompt Input Area */}
        <form onSubmit={handleGenerate} className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 mb-1.5 block">
              Describe your AI Video Concept
            </label>
            <textarea
              rows={3}
              placeholder="e.g. A futuristic cyberpunk neon motorcycle speeding through rain at midnight..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-white text-xs rounded-2xl p-3.5 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Style Selector */}
          <div>
            <label className="text-xs font-bold text-gray-400 mb-2 block">
              Select AI Style
            </label>
            <div className="flex flex-wrap gap-2">
              {styles.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt((prev) => `${prev} [Style: ${s}]`)}
                  className="bg-slate-900 border border-slate-800 hover:border-purple-500 text-gray-300 hover:text-white text-xs px-3 py-1.5 rounded-full"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-xs shadow-lg hover:opacity-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating AI Video Frame...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Generate Video with AI</span>
              </>
            )}
          </button>
        </form>

        {/* Result Preview */}
        {generatedResult && (
          <div className="mt-5 p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col gap-2">
            <span className="text-xs font-bold text-purple-400">Preview Generated AI Frame:</span>
            <img src={generatedResult} alt="AI Generated" className="w-full h-44 object-cover rounded-xl" />
          </div>
        )}
      </div>

      <button
        onClick={onClose}
        className="w-full py-3 text-center text-xs text-gray-400 font-semibold hover:text-white"
      >
        Close Studio
      </button>
    </div>
  );
};
