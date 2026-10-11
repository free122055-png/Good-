import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, Send, CheckCircle, HelpCircle, MessageSquare } from 'lucide-react';
import { registerBackHandler } from '../services/backNavigationService';

interface HelpSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({ isOpen, onClose }) => {
  const [openFaqId, setOpenFaqId] = useState<number | null>(1);
  const [supportMsg, setSupportMsg] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const unregister = registerBackHandler(() => {
      onClose();
      return true;
    });

    return () => unregister();
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const faqs = [
    {
      id: 1,
      q: 'How do I upload short videos and reels on BINISTA?',
      a: 'Tap the Plus (+) button on the bottom navigation bar and select "রিল" (Reel) to upload from your gallery.',
    },
    {
      id: 2,
      q: 'How to become a Pro Creator?',
      a: 'Keep sharing high-quality original short videos! Our team automatically awards the Pro Creator badge to active accounts with 10k+ views.',
    },
    {
      id: 3,
      q: 'What video aspect ratios and length are supported?',
      a: 'BINISTA automatically adapts to any frame ratio (9:16 portrait, 1:1 square, 16:9 landscape) up to 2 minutes duration.',
    },
  ];

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMsg.trim()) return;
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setSupportMsg('');
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white text-slate-900 w-full max-w-md rounded-[32px] p-5 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto no-scrollbar relative border border-gray-100">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#FF2D55]" />
            <span className="font-extrabold text-base text-slate-900 tracking-tight">
              Help & Support
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-500 hover:text-black hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        {/* FAQ Accordion */}
        <div className="flex flex-col gap-2.5 pt-1">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
            Frequently Asked Questions
          </span>

          {faqs.map((faq) => {
            const isOpen = openFaqId === faq.id;
            return (
              <div
                key={faq.id}
                className="rounded-2xl border border-gray-200 bg-gray-50/80 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                  className="w-full flex items-center justify-between p-3.5 text-left font-bold text-xs text-slate-900 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="p-3.5 pt-0 text-xs text-gray-600 font-medium leading-relaxed border-t border-gray-200/60 bg-white">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Contact Support Form */}
        <div className="flex flex-col gap-2.5 pt-2 border-t border-gray-100">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-blue-600" /> Need Direct Assistance?
          </span>

          {isSubmitted ? (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center flex flex-col items-center gap-2">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
              <span className="font-extrabold text-sm text-emerald-900">
                Support Ticket Received!
              </span>
              <span className="text-xs text-emerald-700 font-medium">
                Our support team will respond to your email within 24 hours.
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmitTicket} className="flex flex-col gap-2.5">
              <textarea
                value={supportMsg}
                onChange={(e) => setSupportMsg(e.target.value)}
                rows={3}
                placeholder="Type your question or issue here..."
                className="w-full bg-gray-100 border border-gray-200 text-xs text-slate-900 rounded-2xl p-3.5 focus:outline-none focus:border-black font-semibold"
                required
              />
              <button
                type="submit"
                className="py-3 rounded-full bg-slate-900 hover:bg-black text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Submit Support Ticket</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
