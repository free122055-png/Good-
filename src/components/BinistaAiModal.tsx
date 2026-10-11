import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  History,
  Settings,
  Edit3,
  PlusCircle,
  Video,
  Image as ImageIcon,
  Search,
  MessageSquare,
  ChevronRight,
  Sparkles,
  Send,
  Bot,
  User,
  X,
  Check
} from 'lucide-react';
import { BinistaAiSettingsModal } from './BinistaAiSettingsModal';

interface BinistaAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  activeVideoContext?: { title: string; description?: string; creator?: string } | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export const BinistaAiModal: React.FC<BinistaAiModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  activeVideoContext,
}) => {
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputPrompt;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputPrompt('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          context: activeVideoContext ? JSON.stringify(activeVideoContext) : 'General BINISTA Platform',
          category: selectedTopic,
        }),
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace('data: ', ''));
              if (data.text) {
                assistantContent += data.text;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1].content = assistantContent;
                  return updated;
                });
              }
              if (data.done && data.latency) {
                console.log(`[Low Latency Stream] Latency: ${data.latency}ms`);
              }
            } catch (e) {}
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'দুঃখিত, সংযোগে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const actionCards = [
    {
      id: 'ask',
      title: 'যেকোনো প্রশ্ন করা',
      subtitle: 'যা জানতে চান, আমাকে জিজ্ঞাসা করুন',
      icon: Edit3,
      prompt: 'বাংলাদেশ বা সাধারণ জ্ঞান সম্পর্কে একটি চমৎকার তথ্য বলুন।',
    },
    {
      id: 'caption',
      title: 'লেখা/ক্যাপশন তৈরি বা ঠিক করা',
      subtitle: 'লেখা, ক্যাপশন বা টেক্সট তৈরি / ঠিক করুন',
      icon: PlusCircle,
      prompt: 'আমার সোশ্যাল মিডিয়া ভিডিওর জন্য একটি আকর্ষণীয় ক্যাপশন লিখে দিন।',
    },
    {
      id: 'ideas',
      title: 'আইডিয়া নেওয়া',
      subtitle: 'নতুন আইডিয়া, পরিকল্পনা বা পরামর্শ নিন',
      icon: Video,
      prompt: 'BINISTA-তে ট্রেন্ডিং রিল বা ভিডিও বানানোর ৩টি চমৎকার আইডিয়া দিন।',
    },
    {
      id: 'image',
      title: 'ছবি বুঝতে দেওয়া',
      subtitle: 'ছবি সম্পর্কে প্রশ্ন করুন বা বিশ্লেষণ জানুন',
      icon: ImageIcon,
      prompt: 'সোশ্যাল মিডিয়া পোস্টের জন্য ছবির কোয়ালিটি ও এস্থেটিক্স কীভাবে উন্নত করা যায়?',
    },
    {
      id: 'search',
      title: 'তথ্য খোঁজা',
      subtitle: 'বিভিন্ন বিষয়ে নির্ভরযোগ্য তথ্য সংগ্রহ করুন',
      icon: Search,
      prompt: 'ডিজিটাল কনটেন্ট ক্রিয়েশনের আধুনিক ট্রেন্ডগুলো সম্পর্কে জানুন।',
    },
    {
      id: 'help',
      title: 'BINISTA ব্যবহার করতে সাহায্য নেওয়া',
      subtitle: 'অ্যাপের ফিচার, সেটিংস বা সমস্যার সমাধান পান',
      icon: MessageSquare,
      prompt: 'BINISTA অ্যাপে কীভাবে ভিডিও আপলোড এবং প্রোফাইল ভেরিফাই করতে হয়?',
      fullWidth: true,
    },
  ];

  return (
    <div className="absolute inset-0 z-50 bg-[#f8fafc] text-slate-900 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between shadow-xs shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (messages.length > 0) {
                setMessages([]);
                setSelectedTopic(null);
              } else {
                onClose();
              }
            }}
            className="p-1.5 -ml-1 text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-rose-500 flex items-center justify-center text-white shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-slate-900">BINISTA AI</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-700">
          <button onClick={() => setMessages([])} className="p-2 hover:bg-slate-100 rounded-full cursor-pointer" title="History">
            <History className="w-5 h-5" />
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 hover:bg-slate-100 rounded-full cursor-pointer" title="Settings">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Local Toast Message */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-in slide-in-from-top-3">
          <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 no-scrollbar">
        {messages.length === 0 ? (
          <>
            {/* Hero Banner Section */}
            <div className="text-center space-y-3 pt-2">
              <div className="relative inline-block">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-purple-100 via-rose-50 to-blue-50 border border-purple-200/50 flex items-center justify-center mx-auto shadow-inner">
                  <Bot className="w-10 h-10 text-purple-600" />
                </div>
                <Sparkles className="absolute top-1 right-1 w-5 h-5 text-rose-500 animate-pulse" />
              </div>

              <div>
                <h1 className="text-xl font-black text-slate-950 tracking-tight">BINISTA AI</h1>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">আপনার সাথে, সবসময়</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[280px] mx-auto leading-relaxed">
                  প্রশ্ন করুন, তৈরি করুন, জানুন — সবকিছু সহজভাবে!
                </p>
              </div>
            </div>

            {/* Quick Actions Title */}
            <div>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">দ্রুত কাজগুলো</h2>

              {/* Action Cards Grid */}
              <div className="grid grid-cols-2 gap-3">
                {actionCards.map((card, idx) => {
                  const IconComp = card.icon;
                  return (
                    <div
                      key={card.id}
                      onClick={() => {
                        setSelectedTopic(card.title);
                        handleSend(card.prompt);
                      }}
                      className={`${
                        card.fullWidth ? 'col-span-2' : 'col-span-1'
                      } bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-purple-300 rounded-2xl p-3.5 shadow-2xs transition-all duration-200 cursor-pointer flex items-center justify-between group`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-purple-50 text-slate-700 group-hover:text-purple-600 flex items-center justify-center shrink-0 transition-colors">
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-xs text-slate-900 truncate leading-tight">{card.title}</h3>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">{card.subtitle}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            {selectedTopic && (
              <div className="bg-slate-900 text-white rounded-xl px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-400" />
                  <span>ক্যাটাগরি: {selectedTopic}</span>
                </div>
                <button
                  onClick={() => {
                    setMessages([]);
                    setSelectedTopic(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  ক্যাটাগরি বদলান
                </button>
              </div>
            )}

            {activeVideoContext && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs text-purple-900 flex items-center gap-2.5">
                <Video className="w-4 h-4 text-purple-600 shrink-0" />
                <div className="truncate"><span className="font-bold">Active Context:</span> {activeVideoContext.title}</div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-purple-600 text-white'}`}>
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm shadow-2xs ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'}`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  <div className={`text-[10px] mt-1 text-right ${msg.role === 'user' ? 'text-slate-400' : 'text-slate-400'}`}>
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-500 rounded-tl-none flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Bottom Floating Input Bar matching the exact reference image */}
      <div className="p-3 bg-white border-t border-slate-200 shrink-0">
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 shadow-inner focus-within:border-purple-500 transition-colors">
          <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="আপনার প্রশ্ন লিখুন..."
            className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputPrompt.trim() || isLoading}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md ${
              inputPrompt.trim() && !isLoading
                ? 'bg-rose-600 hover:bg-rose-500 text-white scale-100'
                : 'bg-rose-300 text-white opacity-80 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <BinistaAiSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onClearHistory={() => {
          setMessages([]);
          triggerToast('🗑️ Chat history cleared successfully');
        }}
        triggerToast={triggerToast}
      />
    </div>
  );
};
