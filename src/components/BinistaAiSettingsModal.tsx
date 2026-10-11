import React, { useState } from 'react';
import {
  X,
  Sliders,
  Globe,
  MessageSquareText,
  Volume2,
  Bell,
  History,
  ShieldCheck,
  Trash2,
  HelpCircle,
  Info,
  Check,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface BinistaAiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearHistory: () => void;
  triggerToast: (msg: string) => void;
}

export const BinistaAiSettingsModal: React.FC<BinistaAiSettingsModalProps> = ({
  isOpen,
  onClose,
  onClearHistory,
  triggerToast,
}) => {
  const [aiModel, setAiModel] = useState('Gemini Flash Latest');
  const [language, setLanguage] = useState('বাংলা (Bengali)');
  const [responseStyle, setResponseStyle] = useState('সংক্ষিপ্ত (Concise)');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('Bengali Female (Pro)');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [saveHistory, setSaveHistory] = useState(true);
  const [activeSubView, setActiveSubView] = useState<'main' | 'privacy' | 'help' | 'about'>('main');

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex flex-col justify-end animate-in fade-in duration-200">
      <div className="bg-white text-slate-900 rounded-t-[32px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-slate-900">BINISTA AI Settings</h2>
              <p className="text-xs text-slate-500">এআই সেটিংস ও পছন্দসমূহ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-200/60 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          
          {activeSubView === 'privacy' ? (
            <div className="space-y-4 animate-in fade-in">
              <button
                onClick={() => setActiveSubView('main')}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 mb-2 cursor-pointer"
              >
                ← সেটিংস এ ফিরে যান
              </button>
              <h3 className="font-bold text-sm text-slate-900">Data & Privacy (ডাটা এবং প্রাইভেসি)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                আপনার কথোপকথন এবং প্রম্পট ডেটা সম্পূর্ণ সুরক্ষিত রাখা হয়। BINISTA AI আপনার গোপনীয়তাকে সর্বোচ্চ অগ্রাধিকার দেয়। প্রম্পটগুলো শুধুমাত্র আপনার ডিভাইসে এবং নিরাপদ ফায়ারস্টোর সার্ভারে আপনার অ্যাকাউন্ট সুরক্ষায় সংরক্ষিত হয়। থার্ড-পার্টির সাথে কোনো ব্যক্তিগত ডাটা শেয়ার করা হয় না।
              </p>
            </div>
          ) : activeSubView === 'help' ? (
            <div className="space-y-4 animate-in fade-in">
              <button
                onClick={() => setActiveSubView('main')}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 mb-2 cursor-pointer"
              >
                ← সেটিংস এ ফিরে যান
              </button>
              <h3 className="font-bold text-sm text-slate-900">Help & Support (সহায়তা ও সমর্থন)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                BINISTA AI ব্যবহার করতে কোনো সমস্যা হলে বা কোনো প্রশ্ন থাকলে আমাদের সাপোর্ট টিমের সাথে যোগাযোগ করুন:
              </p>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
                <p className="font-bold">📧 Email: support@binista.com</p>
                <p className="font-bold">💬 Live Support: Available in app</p>
              </div>
            </div>
          ) : activeSubView === 'about' ? (
            <div className="space-y-4 animate-in fade-in text-center py-4">
              <button
                onClick={() => setActiveSubView('main')}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 mb-2 cursor-pointer text-left"
              >
                ← সেটিংস এ ফিরে যান
              </button>
              <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto shadow-lg mb-3">
                <Sparkles className="w-8 h-8 text-rose-400" />
              </div>
              <h3 className="font-black text-lg text-slate-900">BINISTA AI Pro</h3>
              <p className="text-xs text-slate-500">Version 1.0.0 (Build 2026.10)</p>
              <p className="text-xs text-slate-600 max-w-[280px] mx-auto mt-2 leading-relaxed">
                Powered by Google Gemini API. The ultimate video creator and assistant engine for BD STAR & BINISTA.
              </p>
            </div>
          ) : (
            <>
              {/* 1. AI Model */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>AI Model / AI Mode — কোন AI দিয়ে উত্তর দেবে</span>
                </label>
                <select
                  value={aiModel}
                  onChange={(e) => {
                    setAiModel(e.target.value);
                    triggerToast(`🤖 AI Model changed to ${e.target.value}`);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-600 transition"
                >
                  <option value="Gemini Flash Latest">Gemini Flash Latest (Recommended, Ultra-Fast)</option>
                  <option value="Gemini 2.5 Flash Pro">Gemini 2.5 Flash Pro</option>
                  <option value="Gemini Flash Lite">Gemini Flash Lite</option>
                </select>
              </div>

              {/* 2. Language */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5 text-blue-600" />
                  <span>Language — ভাষা নির্বাচন</span>
                </label>
                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    triggerToast(`🌐 Language set to ${e.target.value}`);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-600 transition"
                >
                  <option value="বাংলা (Bengali)">বাংলা (Bengali)</option>
                  <option value="English">English</option>
                  <option value="অন্যান্য ভাষা (Auto)">অন্যান্য ভাষা (Auto)</option>
                </select>
              </div>

              {/* 3. Response Style */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <MessageSquareText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Response Style — উত্তর লেখার ধরণ</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['সংক্ষিপ্ত (Concise)', 'বিস্তারিত (Detailed)'].map((style) => (
                    <button
                      key={style}
                      onClick={() => {
                        setResponseStyle(style);
                        triggerToast(`✍️ Style set to ${style}`);
                      }}
                      className={`py-3 px-4 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        responseStyle === style
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Voice */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Volume2 className="w-4 h-4 text-slate-700" />
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Voice (ভয়েস আউটপুট)</h4>
                      <p className="text-[11px] text-slate-500">এআই উত্তর ভয়েসে শুনুন</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={voiceEnabled}
                    onChange={(e) => {
                      setVoiceEnabled(e.target.checked);
                      triggerToast(e.target.checked ? '🔊 Voice enabled' : '🔇 Voice disabled');
                    }}
                    className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                  />
                </div>
                {voiceEnabled && (
                  <select
                    value={selectedVoice}
                    onChange={(e) => setSelectedVoice(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                  >
                    <option value="Bengali Female (Pro)">Bengali Female (Pro)</option>
                    <option value="Bengali Male (Pro)">Bengali Male (Pro)</option>
                    <option value="English Natural">English Natural</option>
                  </select>
                )}
              </div>

              {/* 5. Notifications */}
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <Bell className="w-4 h-4 text-slate-700" />
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Notifications</h4>
                    <p className="text-[11px] text-slate-500">এআই নোটিফিকেশন ও আপডেট</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => {
                    setNotificationsEnabled(e.target.checked);
                    triggerToast(e.target.checked ? '🔔 Notifications enabled' : '🔕 Notifications disabled');
                  }}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              {/* 6. Chat History Toggle */}
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <History className="w-4 h-4 text-slate-700" />
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Chat History</h4>
                    <p className="text-[11px] text-slate-500">কথোপকথনের ইতিহাস সংরক্ষণ</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={saveHistory}
                  onChange={(e) => {
                    setSaveHistory(e.target.checked);
                    triggerToast(e.target.checked ? '💾 History saving enabled' : '🔒 History saving disabled');
                  }}
                  className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              {/* 7, 8, 9, 10 Action Links */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    onClearHistory();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-rose-50 text-rose-600 text-xs font-bold transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Trash2 className="w-4 h-4" />
                    <span>Clear Chat History (পুরোনো কথোপকথন মুছুন)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => setActiveSubView('privacy')}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 text-slate-800 text-xs font-bold transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-slate-600" />
                    <span>Data & Privacy (ডাটা এবং প্রাইভেসি)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => setActiveSubView('help')}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 text-slate-800 text-xs font-bold transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <HelpCircle className="w-4 h-4 text-slate-600" />
                    <span>Help & Support (সহায়তা)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <button
                  onClick={() => setActiveSubView('about')}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 text-slate-800 text-xs font-bold transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Info className="w-4 h-4 text-slate-600" />
                    <span>About BINISTA (অ্যাপের তথ্য)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
