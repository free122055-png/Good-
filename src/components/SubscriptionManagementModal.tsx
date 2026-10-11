import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  CreditCard,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Check,
  HelpCircle,
  Trash2,
} from 'lucide-react';
import { UserData } from '../services/authService';
import { db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { BlueBadgeIcon } from './BlueBadgeModal';

interface SubscriptionManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserData | null;
  triggerToast: (msg: string) => void;
  onUserUpdated?: (updatedUser: UserData) => void;
}

export const SubscriptionManagementModal: React.FC<SubscriptionManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  triggerToast,
  onUserUpdated,
}) => {
  const [loading, setLoading] = useState(false);
  const [subStatus, setSubStatus] = useState<'active' | 'cancel_scheduled' | 'expired' | 'pending' | 'billing_issue'>('active');
  const [badgeDisplayEnabled, setBadgeDisplayEnabled] = useState<boolean>(true);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<boolean>(false);

  const [planName] = useState('BINISTA Verified Creator PRO (Monthly)');
  const [priceBdt] = useState('৳২৯৯ / মাস');
  const [nextBillingDate] = useState('15 November 2026');
  const [expiryDate] = useState('15 December 2026');

  useEffect(() => {
    if (!currentUser?.uid || !isOpen) return;
    const fetchSub = async () => {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.subscriptionStatus) {
            setSubStatus(data.subscriptionStatus);
          } else if (data.isVerified || data.blueBadge) {
            setSubStatus('active');
          }
          if (data.badgeDisplayEnabled !== undefined) {
            setBadgeDisplayEnabled(data.badgeDisplayEnabled);
          } else {
            setBadgeDisplayEnabled(true);
          }
        }
      } catch (err) {
        console.error('Error fetching subscription status:', err);
      }
    };
    fetchSub();
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  // Handle Google Play Management redirection
  const handleOpenGooglePlaySubscriptions = () => {
    const playStoreUrl = 'https://play.google.com/store/account/subscriptions?package=app.binista';
    window.open(playStoreUrl, '_blank');
    triggerToast('🌐 Google Play Subscription Management পেজ খোলা হয়েছে।');
  };

  // Handle Remove Blue Badge
  const handleConfirmRemoveBadge = async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        badgeDisplayEnabled: false,
        blueBadge: false,
        isVerified: false,
      });

      setBadgeDisplayEnabled(false);
      setShowRemoveConfirm(false);
      triggerToast('🚫 Blue Badge সফলভাবে সরিয়ে নেওয়া হয়েছে। Paid Features বন্ধ করা হয়েছে।');

      if (onUserUpdated) {
        onUserUpdated({
          ...currentUser,
          badgeDisplayEnabled: false,
          blueBadge: false,
          isVerified: false,
        } as any);
      }
    } catch (err: any) {
      triggerToast('Blue Badge সরাতে সমস্যা হয়েছে: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  // Handle Restore / Enable Blue Badge
  const handleRestoreBadge = async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        badgeDisplayEnabled: true,
        blueBadge: true,
        isVerified: true,
      });

      setBadgeDisplayEnabled(true);
      triggerToast('✨ Blue Badge সফলভাবে পুনরায় চালু করা হয়েছে!');

      if (onUserUpdated) {
        onUserUpdated({
          ...currentUser,
          badgeDisplayEnabled: true,
          blueBadge: true,
          isVerified: true,
        } as any);
      }
    } catch (err: any) {
      triggerToast('Blue Badge চালু করতে সমস্যা হয়েছে: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  // Handle Cancel Subscription
  const handleCancelSubscription = async () => {
    if (!window.confirm('আপনি কি নিশ্চিত যে আপনি এই সাবস্ক্রিপশন বাতিল করতে চান? পরবর্তী পেমেন্ট স্বয়ংক্রিয়ভাবে বন্ধ হয়ে যাবে।')) return;
    if (!currentUser?.uid) return;

    setLoading(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        subscriptionStatus: 'cancel_scheduled',
      });

      setSubStatus('cancel_scheduled');
      triggerToast('✅ সাবস্ক্রিপশন বাতিল করা হয়েছে। বর্তমান মেয়াদ শেষ হওয়া পর্যন্ত সুবিধা বহাল থাকবে।');

      if (onUserUpdated) {
        onUserUpdated({
          ...currentUser,
          subscriptionStatus: 'cancel_scheduled',
        } as any);
      }

      setTimeout(() => {
        handleOpenGooglePlaySubscriptions();
      }, 1200);
    } catch (err: any) {
      triggerToast('সাবস্ক্রিপশন বাতিল করতে সমস্যা হয়েছে: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  // Handle Re-Subscribe
  const handleResubscribe = async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        subscriptionStatus: 'active',
        badgeDisplayEnabled: true,
        blueBadge: true,
        isVerified: true,
      });

      setSubStatus('active');
      setBadgeDisplayEnabled(true);
      triggerToast('🎉 সাবস্ক্রিপশন এবং Blue Badge সফলভাবে পুনরায় চালু হয়েছে!');

      if (onUserUpdated) {
        onUserUpdated({
          ...currentUser,
          subscriptionStatus: 'active',
          badgeDisplayEnabled: true,
          blueBadge: true,
          isVerified: true,
        } as any);
      }
    } catch (err: any) {
      triggerToast('পুনরায় সাবস্ক্রাইব করতে সমস্যা হয়েছে: ' + (err.message || 'Error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white text-slate-950 flex flex-col justify-between p-4 sm:p-6 overflow-hidden animate-in fade-in duration-200 select-none">
      <div className="max-w-md mx-auto w-full h-full flex flex-col justify-between">
        
        {/* Top Header */}
        <div className="flex items-center justify-between py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-tight text-slate-950">BINISTA</span>
            <div className="flex items-center gap-1">
              <span className="font-bold text-xs tracking-wider uppercase text-slate-900">SUBSCRIPTION</span>
              <BlueBadgeIcon className="w-4 h-4" />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-6 no-scrollbar">
          
          {/* Hero Banner */}
          <div className="bg-slate-950 text-white rounded-3xl p-5 flex flex-col gap-3 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white">
                  <ShieldCheck className="w-6 h-6 text-[#0066FF]" />
                </div>
                <div>
                  <h2 className="font-black text-sm text-white">{planName}</h2>
                  <span className="text-[11px] text-gray-300 font-semibold">{priceBdt}</span>
                </div>
              </div>
              {badgeDisplayEnabled ? <BlueBadgeIcon className="w-6 h-6" /> : <span className="text-[10px] bg-rose-500/30 text-rose-300 px-2 py-0.5 rounded-full font-bold">Badge Hidden</span>}
            </div>

            <div className="h-px bg-white/10 my-1"></div>

            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-gray-400">স্ট্যাটাস:</span>
              <span className={`px-2.5 py-1 rounded-full uppercase tracking-wider text-[10px] ${
                subStatus === 'active' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                subStatus === 'cancel_scheduled' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}>
                {subStatus === 'active' ? 'Active (স্বয়ংক্রিয় নবায়ন চালু)' :
                 subStatus === 'cancel_scheduled' ? 'Cancel Scheduled (মেয়াদ শেষে বাতিল)' : 'Expired'}
              </span>
            </div>
          </div>

          {/* Subscription Details Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">সাবস্ক্রিপশন তথ্য</h3>
            
            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-slate-400" /> মূল্য ও প্ল্যান:
              </span>
              <span className="font-extrabold text-slate-900">{priceBdt}</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" /> পরবর্তী বিলিং তারিখ:
              </span>
              <span className="font-mono font-bold text-slate-900">{nextBillingDate}</span>
            </div>

            <div className="flex items-center justify-between text-xs py-1.5">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" /> সাবস্ক্রিপশনের মেয়াদ শেষ:
              </span>
              <span className="font-mono font-bold text-slate-900">{expiryDate}</span>
            </div>
          </div>

          {/* ================= REMOVE BLUE BADGE SECTION ================= */}
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-rose-950">Remove Blue Badge</h4>
                <p className="text-[11px] text-rose-800 font-medium mt-0.5">আপনার প্রোফাইল থেকে নীল টিক বা ব্যাজটি সরিয়ে ফেলুন। (সাবস্ক্রিপশন আলাদা বিষয়)</p>
              </div>
            </div>

            {badgeDisplayEnabled ? (
              <button
                onClick={() => setShowRemoveConfirm(true)}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove Blue Badge</span>
              </button>
            ) : (
              <button
                onClick={handleRestoreBadge}
                disabled={loading}
                className="w-full py-3 bg-slate-950 hover:bg-black text-white font-extrabold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Blue Badge পুনরায় চালু করুন</span>
              </button>
            )}
          </div>

          {/* Google Play Billing Management Button */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                <ExternalLink className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-blue-950">Google Play Subscription</h4>
                <p className="text-[11px] text-blue-800 font-medium">Google Play অ্যাকাউন্ট থেকে স্বয়ংক্রিয় পেমেন্ট বা বিলিং পরিচালনা করুন।</p>
              </div>
            </div>

            <button
              onClick={handleOpenGooglePlaySubscriptions}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Manage on Google Play Store</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-slate-100 bg-white shrink-0 flex flex-col gap-2.5">
          {subStatus === 'active' ? (
            <button
              onClick={handleCancelSubscription}
              disabled={loading}
              className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 text-white font-black text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <span>{loading ? 'প্রসেসিং...' : 'Cancel Subscription (গুগল প্লে সাবস্ক্রিপশন বাতিল)'}</span>
            </button>
          ) : (
            <button
              onClick={handleResubscribe}
              disabled={loading}
              className="w-full py-3.5 bg-slate-950 hover:bg-black text-white font-black text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <span>{loading ? 'প্রসেসিং...' : 'Resubscribe (পুনরায় সাবস্ক্রাইব করুন)'}</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-2xl transition-all cursor-pointer text-center"
          >
            ফিরে যান
          </button>
        </div>

      </div>

      {/* ================= CONFIRMATION DIALOG FOR REMOVING BLUE BADGE ================= */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
            </div>

            <div className="flex flex-col gap-1.5">
              <h3 className="text-lg font-black text-slate-950 tracking-tight">
                আপনি কি Blue Badge সরাতে চান?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                আপনি Blue Badge সরিয়ে ফেললে আপনার প্রোফাইল থেকে Badge সরিয়ে দেওয়া হবে এবং Blue Badge-এর Paid Features বন্ধ হয়ে যাবে। আপনি কি নিশ্চিত?
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleConfirmRemoveBadge}
                disabled={loading}
                className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-2xl shadow-lg transition-all cursor-pointer"
              >
                {loading ? 'প্রসেসিং...' : 'হ্যাঁ, Blue Badge সরিয়ে দিন'}
              </button>
              <button
                onClick={() => setShowRemoveConfirm(false)}
                className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-2xl transition-all cursor-pointer"
              >
                না, ফিরে যান
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
