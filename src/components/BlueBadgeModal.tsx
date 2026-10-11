import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  FileText,
  User,
  Lock,
  Users,
  Camera,
  Calendar,
  Check,
  ArrowLeft,
  Clock,
  AlertTriangle,
  RefreshCw,
  LogOut,
  CreditCard,
  ChevronLeft,
  Info,
  Scan,
  Shield
} from 'lucide-react';
import { UserData } from '../services/authService';
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { UserAvatar } from './UserAvatar';

interface BlueBadgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserData | null;
  onUserUpdated?: (updatedUser: UserData) => void;
  triggerToast: (msg: string) => void;
  onOpenSubscription?: () => void;
}

export const BlueBadgeIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    className={`shrink-0 ${className}`}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M23.3333 12L20.6667 8.93333V4.86667C20.6667 4.53333 20.4 4.26667 20.0667 4.26667H16L12.9333 1.6C12.8 1.46667 12.6 1.4 12.4 1.4C12.2 1.4 12 1.46667 11.8667 1.6L8.8 4.26667H4.73333C4.4 4.26667 4.13333 4.53333 4.13333 4.86667V8.93333L1.46667 12C1.33333 12.1333 1.26667 12.3333 1.26667 12.5333C1.26667 12.7333 1.33333 12.9333 1.46667 13.0667L4.13333 16.1333V20.2C4.13333 20.5333 4.4 20.8 4.73333 20.8H8.8L11.8667 23.4667C12 23.6 12.2 23.6667 12.4 23.6667C12.6 23.6667 12.8 23.6 12.9333 23.4667L16 20.8H20.0667C20.4 20.8 20.6667 20.5333 20.6667 20.2V16.1333L23.3333 13.0667C23.4667 12.9333 23.5333 12.7333 23.5333 12.5333C23.5333 12.3333 23.4667 12.1333 23.3333 12ZM10.5333 17.0667L6.4 12.9333L7.86667 11.4667L10.5333 14.1333L16.9333 7.73333L18.4 9.2L10.5333 17.0667Z"
      fill="#0066FF"
    />
  </svg>
);

export const BlueBadgeModal: React.FC<BlueBadgeModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  triggerToast,
  onOpenSubscription,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [selectedFeature, setSelectedFeature] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    'not_started' | 'in_progress' | 'pending' | 'approved' | 'rejected'
  >('not_started');
  const [rejectionReason, setRejectionReason] = useState<string>('তথ্য অসম্পূর্ণ বা অস্পষ্ট ছিল।');
  const [submittedAtDate, setSubmittedAtDate] = useState<string>('');

  // Form states
  const [legalName, setLegalName] = useState(currentUser?.name || '');
  const [dob, setDob] = useState('01-01-1995');
  const [nidFile, setNidFile] = useState<File | null>(null);
  const [nidPreviewUrl, setNidPreviewUrl] = useState<string | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState<string | null>(null);

  const nidInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser?.uid || !isOpen) return;
    
    if (currentUser.verificationStatus) {
      setVerificationStatus(currentUser.verificationStatus as any);
    }

    const fetchStatus = async () => {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          const dbStatus = data.verificationStatus || (data.isVerified ? 'approved' : 'not_started');
          setVerificationStatus(dbStatus);
          if (data.name && !legalName) setLegalName(data.name);

          if (dbStatus === 'pending') {
            const reqRef = doc(db, 'verificationRequests', currentUser.uid);
            const reqSnap = await getDoc(reqRef);
            if (reqSnap.exists()) {
              setSubmittedAtDate(reqSnap.data().submittedAt || new Date().toLocaleString());
            }
          }
          if (dbStatus === 'rejected') {
            const reqRef = doc(db, 'verificationRequests', currentUser.uid);
            const reqSnap = await getDoc(reqRef);
            if (reqSnap.exists()) {
              setRejectionReason(reqSnap.data().reason || 'যাচাইকালে আপনার NID বা সেলফি ছবি অস্পষ্ট পাওয়া গেছে।');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching verification status:', err);
      }
    };
    fetchStatus();
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleNidSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNidFile(file);
      const url = URL.createObjectURL(file);
      setNidPreviewUrl(url);
      triggerToast('✅ NID কার্ডের ছবি সফলভাবে নির্বাচন করা হয়েছে');
    }
  };

  const handleSelfieSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelfieFile(file);
      const url = URL.createObjectURL(file);
      setSelfiePreviewUrl(url);
      triggerToast('✅ সেলফি সফলভাবে ক্যাপচার হয়েছে');
    }
  };

  const handleCompleteVerification = async () => {
    if (!currentUser?.uid) {
      triggerToast('⚠️ প্লিজ প্রথমে একাউন্টে লগইন করুন।');
      return;
    }

    if (!nidFile) {
      triggerToast('⚠️ অনুগ্রহ করে NID কার্ডের ছবি আপলোড করুন।');
      return;
    }

    if (!selfieFile) {
      triggerToast('⚠️ ফেস ভেরিফিকেশনের জন্য সেলফি ছবি আবশ্যক।');
      return;
    }

    if (!legalName.trim() || !dob.trim()) {
      triggerToast('⚠️ জন্ম তারিখ ও NID অনুযায়ী নাম সঠিকভাবে পূরণ করুন।');
      return;
    }

    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const requestData = {
        uid: currentUser.uid,
        username: currentUser.username || 'user',
        legalName,
        dob,
        status: 'pending',
        submittedAt: nowIso,
      };

      const reqRef = doc(db, 'verificationRequests', currentUser.uid);
      await setDoc(reqRef, requestData);

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        isVerified: false,
        blueBadge: false,
        verificationStatus: 'pending',
        name: legalName,
      });

      setVerificationStatus('pending');
      setSubmittedAtDate(nowIso);
      triggerToast('⏳ আপনার ভেরিফিকেশন আবেদনটি সফলভাবে জমা হয়েছে।');

      if (onUserUpdated) {
        onUserUpdated({
          ...currentUser,
          isVerified: false,
          verificationStatus: 'pending',
          name: legalName,
        } as any);
      }
    } catch (err: any) {
      console.error('Error saving verification:', err);
      triggerToast('❌ ভেরিফিকেশন সম্পন্ন করতে সমস্যা হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleExitVerification = async () => {
    if (!window.confirm('আপনি কি ভেরিফিকেশন ফিচার থেকে বের হয়ে যেতে চান?')) return;
    if (!currentUser?.uid) {
      onClose();
      return;
    }
    setLoading(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        verificationStatus: 'not_started',
        isVerified: false,
        blueBadge: false,
      });
      setVerificationStatus('not_started');
      setStep(1);
      triggerToast('🔄 ভেরিফিকেশন রিসেট করা হয়েছে।');
      if (onUserUpdated) {
        onUserUpdated({
          ...currentUser,
          isVerified: false,
          blueBadge: false,
          verificationStatus: 'not_started',
        } as any);
      }
      onClose();
    } catch (err) {
      console.error('Error exiting verification:', err);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleReapply = async () => {
    if (!currentUser?.uid) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { verificationStatus: 'in_progress' });
      setVerificationStatus('in_progress');
      setStep(4);
      setNidFile(null);
      setNidPreviewUrl(null);
      setSelfieFile(null);
      setSelfiePreviewUrl(null);
      triggerToast('🔄 পুনরায় ভেরিফিকেশন আবেদন শুরু হয়েছে।');
    } catch (err) {
      triggerToast('ত্রুটি হয়েছে। আবার চেষ্টা করুন।');
    }
  };

  const handleBack = () => {
    if (selectedFeature !== null) {
      setSelectedFeature(null);
      return;
    }
    if (step > 1) {
      setStep((prev) => (prev - 1) as any);
    } else {
      onClose();
    }
  };

  const Stepper = ({ currentStep }: { currentStep: number }) => (
    <div className="flex items-center justify-center w-full gap-2 px-6 py-4">
      {[1, 2, 3, 4].map((s) => {
        const isDone = s < currentStep;
        const isActive = s === currentStep;
        const label = s === 1 ? 'NID' : s === 2 ? 'ফেস' : s === 3 ? 'জন্ম তারিখ' : 'সম্পন্ন';
        
        return (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                isDone ? 'bg-slate-950 text-white' : 
                isActive ? 'bg-slate-950 text-white ring-4 ring-slate-100' : 
                'bg-slate-100 text-slate-400'
              }`}>
                {isDone ? <Check className="w-4 h-4" /> : s}
              </div>
              <span className={`text-[10px] font-bold ${isActive ? 'text-slate-950' : 'text-slate-400'}`}>
                {label}
              </span>
            </div>
            {s < 4 && <div className="flex-1 h-[1px] bg-slate-200 mt-[-14px]" />}
          </React.Fragment>
        );
      })}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col animate-in fade-in duration-200 select-none">
      
      {/* ================= GLOBAL DARK HEADER ================= */}
      <div className="flex items-center justify-between px-5 py-4 shrink-0">
        <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-black text-lg tracking-wider">BINISTA VERIFIED</span>
          <BlueBadgeIcon className="w-5 h-5" />
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* ================= WHITE BODY CARD ================= */}
      <div className="flex-1 bg-white rounded-t-[40px] overflow-hidden flex flex-col text-slate-900 shadow-2xl">
        
        {/* Content Section */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">
          
          {/* STEP 1: PREVIEW (NOT IN SCREENSHOT BUT KEPT FOR FLOW) */}
          {verificationStatus === 'not_started' && step === 1 && (
             <div className="p-6 flex flex-col items-center text-center gap-8 py-10 animate-in slide-in-from-bottom duration-300">
                <div className="relative">
                    <UserAvatar 
                      src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80'} 
                      alt={currentUser?.name || 'User'} 
                      className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-xl ring-2 ring-[#0066FF]/20"
                    />
                    <div className="absolute bottom-1 right-1">
                      <BlueBadgeIcon className="w-7 h-7" />
                    </div>
                </div>
                <div className="space-y-3">
                  <h1 className="text-2xl font-black tracking-tight">আপনার প্রোফাইলে ব্লু ব্যাজ</h1>
                  <p className="text-sm text-slate-500 font-medium px-4">ভেরিফিকেশন সম্পন্ন হলে আপনার প্রোফাইলের পাশে একটি অফিসিয়াল ব্লু ব্যাজ যুক্ত হবে।</p>
                </div>
                <div className="w-full bg-slate-50 rounded-3xl p-5 border border-slate-100 flex items-center gap-4 text-left">
                    <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-white shrink-0">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[13px] font-black text-slate-900">নিরাপদ পরিচয় নিশ্চিত করুন</p>
                      <p className="text-[11px] text-slate-500 font-medium">আমরা আপনার তথ্য গোপন ও নিরাপদ রাখি।</p>
                    </div>
                </div>
             </div>
          )}

          {/* STEP 2: WHY BINISTA VERIFIED? (SCREENSHOT 1) */}
          {verificationStatus === 'not_started' && step === 2 && (
            <div className="flex-1 flex flex-col">
              <div className="bg-slate-950 text-white p-8 pt-4 pb-12">
                <h1 className="text-2xl font-black tracking-tight leading-tight mb-2">কেন BINISTA VERIFIED?</h1>
                <p className="text-sm text-slate-400 font-medium leading-relaxed">বেশ কিছু গুরুত্বপূর্ণ সুবিধা পেতে আপনাকে অবশ্যই ভেরিফাই করা হবে।</p>
              </div>
              
              <div className="flex-1 bg-white mt-[-30px] rounded-t-[40px] p-6 space-y-4">
                {selectedFeature === null ? (
                  <div className="space-y-3">
                    {[
                      { id: 0, title: 'নিরাপদ ও সত্য পরিচয়', desc: 'রিয়েল আইডি দিয়ে ভেরিফাইড ব্যবহারকারী হিসেবে পরিচিত হন।', icon: ShieldCheck },
                      { id: 1, title: 'নীল টিক', desc: 'ভেরিফাইড অ্যাকাউন্টে পাবেন নীল টিক মার্ক।', icon: CheckCircle2 },
                      { id: 2, title: 'একক অ্যাকাউন্ট', desc: 'একজন ব্যবহারকারী, একটি মাত্র অ্যাকাউন্ট। (ফেক অ্যাকাউন্ট বন্ধ)', icon: User },
                      { id: 3, title: 'ফেক ইউজার প্রতিরোধ', desc: 'শুধু ভেরিফাইড ব্যবহারকারীরাই নতুন অ্যাকাউন্ট খুলতে পারেন।', icon: Shield },
                      { id: 4, title: 'বিশ্বাসযোগ্য কমিউনিটি', desc: 'রিয়েল মানুষের সাথে রিয়েল সংযোগ, নিরাপদ ও মানসম্মত অভিজ্ঞতা।', icon: Users },
                    ].map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => setSelectedFeature(item.id)}
                        className="flex items-center justify-between p-4 rounded-3xl border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer group active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-slate-950 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform">
                            <item.icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-[13px] font-black text-slate-900">{item.title}</h4>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">{item.desc}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6 animate-in slide-in-from-right duration-300">
                     {/* Feature Animation Area */}
                     <div className="w-full aspect-video bg-slate-950 rounded-[30px] overflow-hidden relative flex flex-col items-center justify-center shadow-2xl border border-slate-800 p-4">
                        {/* Background subtle effect */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />

                        {/* Feature Specific Animations */}
                        {selectedFeature === 0 && (
                          <div className="relative flex flex-col items-center gap-4">
                             <div className="w-40 h-24 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 flex flex-col gap-2 p-3 opacity-20">
                                   <div className="w-1/2 h-2 bg-slate-400 rounded" />
                                   <div className="w-full h-2 bg-slate-400 rounded" />
                                   <div className="w-3/4 h-2 bg-slate-400 rounded" />
                                </div>
                                <div className="w-12 h-12 bg-slate-700 rounded-full animate-pulse" />
                                <div className="w-full h-1.5 bg-blue-500 absolute top-0 animate-[scan_2s_infinite] shadow-[0_0_15px_#3b82f6]"></div>
                             </div>
                             <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full text-[11px] font-black border border-emerald-500/30 animate-bounce">
                                <ShieldCheck className="w-4 h-4" />
                                VERIFIED IDENTITY
                             </div>
                             <style>{`
                                @keyframes scan {
                                  0% { top: 0; }
                                  100% { top: 100%; }
                                }
                             `}</style>
                          </div>
                        )}

                        {selectedFeature === 1 && (
                          <div className="relative flex flex-col items-center gap-6">
                            <div className="bg-white p-5 rounded-[24px] flex items-center gap-4 shadow-2xl">
                              <div className="w-12 h-12 rounded-full bg-slate-200 animate-pulse shrink-0"></div>
                              <div className="flex flex-col gap-1.5 shrink-0">
                                <div className="w-24 h-3 bg-slate-200 rounded animate-pulse"></div>
                                <div className="w-16 h-2 bg-slate-100 rounded animate-pulse"></div>
                              </div>
                              <div className="animate-[badge-pop_1s_infinite_alternate] drop-shadow-[0_0_10px_rgba(0,102,255,0.4)]">
                                <BlueBadgeIcon className="w-8 h-8" />
                              </div>
                            </div>
                            <div className="text-[10px] text-blue-400 font-black tracking-widest uppercase animate-pulse">OFFICIAL BADGE ACTIVATED</div>
                            <style>{`
                              @keyframes badge-pop {
                                0% { transform: scale(1); filter: brightness(1); }
                                100% { transform: scale(1.3); filter: brightness(1.2); }
                              }
                            `}</style>
                          </div>
                        )}

                        {selectedFeature === 2 && (
                          <div className="relative w-full h-full flex items-center justify-center gap-12 p-4">
                             {/* User A (Main) */}
                             <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center border-4 border-blue-400/50 shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                                   <User className="w-8 h-8 text-white" />
                                </div>
                                <span className="text-[9px] text-blue-400 font-black uppercase">Verified User</span>
                             </div>

                             {/* Collision / System Block */}
                             <div className="relative w-12 flex items-center justify-center">
                                <div className="absolute h-[2px] w-20 bg-slate-700 -z-10" />
                                <div className="w-12 h-12 rounded-full bg-rose-500 flex items-center justify-center animate-[pop_0.5s_infinite_alternate] shadow-[0_0_15px_rgba(244,63,94,0.6)]">
                                   <X className="w-7 h-7 text-white stroke-[4]" />
                                </div>
                             </div>

                             {/* User B (Clone Attempt) */}
                             <div className="flex flex-col items-center gap-3 opacity-40">
                                <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center border-4 border-slate-600 grayscale">
                                   <User className="w-8 h-8 text-slate-400" />
                                </div>
                                <span className="text-[9px] text-slate-500 font-black uppercase">Clone Attempt</span>
                             </div>

                             <div className="absolute bottom-4 bg-rose-500/20 text-rose-400 px-4 py-2 rounded-xl text-[10px] font-black border border-rose-500/30">
                               DUPLICATE FACE REJECTED
                             </div>
                             <style>{`
                                @keyframes pop {
                                   0% { transform: scale(1); }
                                   100% { transform: scale(1.2); }
                                }
                             `}</style>
                          </div>
                        )}

                        {selectedFeature === 3 && (
                          <div className="relative w-full h-full flex flex-col items-center justify-center gap-4">
                             <div className="flex gap-4 items-center">
                                {[1, 2, 3].map((i) => (
                                  <div key={i} className={`w-14 h-14 rounded-full border-2 border-slate-700 flex items-center justify-center relative animate-[fade-down_${1+i/2}s_infinite]`}>
                                     <User className="w-7 h-7 text-slate-600" />
                                     <div className="absolute inset-0 bg-rose-950/40 rounded-full flex items-center justify-center">
                                        <Lock className="w-6 h-6 text-rose-500/60" />
                                     </div>
                                  </div>
                                ))}
                             </div>
                             <div className="bg-rose-500/20 text-rose-400 px-5 py-2.5 rounded-2xl text-[11px] font-black border border-rose-500/30 flex items-center gap-2">
                                <Shield className="w-4 h-4" />
                                BOT & FAKE PROFILES BLOCKED
                             </div>
                             <style>{`
                                @keyframes fade-down {
                                   0% { transform: translateY(-20px); opacity: 0; }
                                   50% { transform: translateY(0); opacity: 1; }
                                   100% { transform: translateY(20px); opacity: 0; }
                                }
                             `}</style>
                          </div>
                        )}

                        {selectedFeature === 4 && (
                          <div className="relative w-full h-full flex items-center justify-center">
                            <div className="relative w-36 h-36 animate-[spin_12s_linear_infinite]">
                              {[0, 1, 2, 3, 4].map((i) => (
                                <div
                                  key={i}
                                  className="absolute w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg"
                                  style={{
                                    top: '50%',
                                    left: '50%',
                                    marginTop: '-24px',
                                    marginLeft: '-24px',
                                    transform: `rotate(${i * 72}deg) translate(65px) rotate(-${i * 72}deg)`
                                  }}
                                >
                                  <div className="absolute -top-1.5 -right-1.5">
                                    <BlueBadgeIcon className="w-5 h-5" />
                                  </div>
                                  <User className="w-6 h-6 text-slate-400" />
                                </div>
                              ))}
                            </div>
                            <div className="absolute w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_40px_#2563eb66] z-10">
                              <Users className="w-8 h-8 text-white" />
                            </div>
                            <div className="absolute bottom-4 text-[9px] text-blue-400 font-black uppercase tracking-widest">REAL PEOPLE ONLY</div>
                          </div>
                        )}
                     </div>

                     <div className="space-y-3">
                        <h3 className="text-xl font-black text-slate-900">
                          {['নিরাপদ পরিচয়', 'নীল টিক মার্ক', 'একক অ্যাকাউন্ট', 'ফেক ইউজার প্রতিরোধ', 'বিশ্বাসযোগ্য কমিউনিটি'][selectedFeature]}
                        </h3>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                          {[
                            'আপনার পরিচয় হবে সম্পূর্ণ নিরাপদ। রিয়েল আইডি যাচাইকরণের মাধ্যমে আমরা নিশ্চিত করি যে প্রতিটি প্রোফাইল একজন প্রকৃত মানুষের।',
                            'ভেরিফিকেশন সফল হলে আপনার নামের পাশে একটি উজ্জ্বল নীল টিক মার্ক যুক্ত হবে যা আপনাকে অন্যদের থেকে আলাদা করবে।',
                            'সিস্টেম আপনার ছবি ও তথ্য দিয়ে অন্য কোনো অ্যাকাউন্ট খুলতে বাধা দিবে। একজন ব্যবহারকারী একটিই অ্যাকাউন্ট চালাতে পারবেন।',
                            'আমরা অত্যাধুনিক AI ব্যবহার করে কোনো বট বা ফেক ইউজার প্ল্যাটফর্মে প্রবেশ করতে বাধা দেই।',
                            'এখানে আপনি যাদের সাথে কথা বলবেন বা যাদের ভিডিও দেখবেন, তারা সবাই ভেরিফাইড। একটি নিরাপদ কমিউনিটি নিশ্চিত হয়।'
                          ][selectedFeature]}
                        </p>
                     </div>
                     <button onClick={() => setSelectedFeature(null)} className="w-full py-4 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-900 font-black text-sm transition-colors active:scale-95">পিছনে ফিরে যান</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: MANDATORY WARNING (SCREENSHOT 2) */}
          {verificationStatus === 'not_started' && step === 3 && (
            <div className="flex-1 flex flex-col p-6 items-center text-center animate-in fade-in duration-500">
               <div className="w-full max-w-[280px] mb-8 mt-4">
                  <div className="relative aspect-square flex items-center justify-center">
                      <div className="absolute inset-0 bg-blue-50 rounded-full scale-110 opacity-50 blur-2xl"></div>
                      <div className="relative w-full h-full bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex items-center justify-center p-6">
                          <div className="relative w-full h-full border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 bg-slate-50/50">
                              {/* Better NID Card Representation */}
                              <div className="w-32 h-20 bg-white rounded-lg border border-slate-200 shadow-sm relative p-2 flex flex-col gap-1.5 overflow-hidden">
                                 <div className="flex gap-2">
                                    <div className="w-8 h-8 rounded bg-slate-100" />
                                    <div className="flex-1 flex flex-col gap-1">
                                       <div className="w-full h-1 bg-slate-100 rounded" />
                                       <div className="w-3/4 h-1 bg-slate-100 rounded" />
                                       <div className="w-1/2 h-1 bg-slate-100 rounded" />
                                    </div>
                                 </div>
                                 <div className="w-full h-1 bg-slate-50 rounded mt-auto" />
                                 
                                 {/* Floating badge over card */}
                                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center text-white shadow-xl ring-4 ring-white">
                                    <CheckCircle2 className="w-6 h-6" />
                                 </div>
                              </div>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Identity Proof Required</span>
                          </div>
                      </div>
                  </div>
               </div>

               <div className="space-y-4 mb-8">
                  <h1 className="text-2xl font-black text-slate-900 leading-tight">ভেরিফিকেশন বাধ্যতামূলক</h1>
                  <p className="text-sm text-slate-500 font-medium px-4">আপনার পরিচয় যাচাই করতে নিচের তথ্যগুলো জমা দিতে হবে।</p>
               </div>

               <div className="w-full bg-[#F4F7FB] border border-[#E1E8F0] rounded-3xl p-5 flex items-start gap-4 text-left">
                  <div className="w-12 h-12 rounded-full bg-slate-950 text-white flex items-center justify-center shrink-0 mt-1">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-snug">ভেরিফিকেশন সম্পন্ন না করলে আপনার অ্যাকাউন্টের কিছু ফিচার সীমিত থাকবে।</p>
                  </div>
               </div>
            </div>
          )}

          {/* STEP 4: NID (SCREENSHOT 3) */}
          {verificationStatus !== 'pending' && verificationStatus !== 'approved' && verificationStatus !== 'rejected' && step === 4 && (
            <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-300">
               <Stepper currentStep={1} />
               <div className="p-8 space-y-2">
                  <h1 className="text-2xl font-black text-slate-900">জাতীয় পরিচয়পত্র (NID)</h1>
                  <p className="text-sm text-slate-500 font-medium">NID কার্ডের সামনের অংশের স্পষ্ট ছবি আপলোড করুন</p>
               </div>

               <div className="px-8 pb-8 space-y-6">
                  <div 
                    onClick={() => nidInputRef.current?.click()}
                    className="w-full aspect-[1.6/1] rounded-[30px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden bg-slate-50 group cursor-pointer hover:border-[#0066FF] transition-all"
                  >
                    {nidPreviewUrl ? (
                      <img src={nidPreviewUrl} alt="NID Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-white shadow-md flex items-center justify-center text-[#0066FF] group-hover:scale-110 transition-transform">
                          <CreditCard className="w-7 h-7" />
                        </div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">NID কার্ড নির্বাচন করুন</p>
                      </div>
                    )}
                    <input ref={nidInputRef} type="file" accept="image/*" onChange={handleNidSelect} className="hidden" />
                  </div>

                  <button 
                    onClick={() => nidInputRef.current?.click()}
                    className="w-full py-4 rounded-full border-2 border-slate-900 flex items-center justify-center gap-3 text-slate-900 font-black text-[13px] active:scale-95 transition-transform"
                  >
                    <Camera className="w-5 h-5" />
                    <span>NID সামনের অংশ আপলোড করুন</span>
                  </button>

                  <div className="flex items-center gap-3 text-slate-500 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100">
                     <Info className="w-4 h-4 shrink-0 text-slate-900" />
                     <p className="text-[11px] font-bold text-slate-600">ছবি অবশ্যই স্পষ্ট, সম্পূর্ণ ও অক্ষত হতে হবে।</p>
                  </div>
               </div>
            </div>
          )}

          {/* STEP 5: FACE (SCREENSHOT 4) */}
          {verificationStatus !== 'pending' && verificationStatus !== 'approved' && verificationStatus !== 'rejected' && step === 5 && (
            <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-300">
               <Stepper currentStep={2} />
               <div className="p-8 space-y-2">
                  <h1 className="text-2xl font-black text-slate-900">ফেস ভেরিফিকেশন</h1>
                  <p className="text-sm text-slate-500 font-medium">আপনার মুখের একটি সেলফি তুলুন, যাতে আপনার NID ছবির সাথে মিল হয়।</p>
               </div>

               <div className="px-8 pb-8 space-y-6 flex-1 flex flex-col items-center justify-center">
                  <div 
                    onClick={() => selfieInputRef.current?.click()}
                    className="relative w-full max-w-[280px] aspect-square rounded-[40px] border-4 border-slate-100 shadow-2xl flex items-center justify-center overflow-hidden bg-slate-50 cursor-pointer group"
                  >
                    {selfiePreviewUrl ? (
                      <img src={selfiePreviewUrl} alt="Selfie Preview" className="w-full h-full object-cover" />
                    ) : (
                      <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80" alt="Face" className="w-full h-full object-cover opacity-80" />
                    )}
                    
                    {/* Corners */}
                    <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-white/80 rounded-tl-lg"></div>
                    <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-white/80 rounded-tr-lg"></div>
                    <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-white/80 rounded-bl-lg"></div>
                    <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-white/80 rounded-br-lg"></div>
                    
                    <input ref={selfieInputRef} type="file" accept="image/*" capture="user" onChange={handleSelfieSelect} className="hidden" />
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 animate-pulse">
                     <Scan className="w-5 h-5 text-slate-950" />
                     <p className="text-xs font-black text-slate-900 tracking-tight">ভালো আলোতে মুখ স্পষ্ট রাখুন</p>
                  </div>
               </div>
            </div>
          )}

          {/* STEP 6: NAME & DOB */}
          {verificationStatus !== 'pending' && verificationStatus !== 'approved' && verificationStatus !== 'rejected' && step === 6 && (
            <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-300">
               <Stepper currentStep={3} />
               <div className="p-8 space-y-2">
                  <h1 className="text-2xl font-black text-slate-900">জন্ম তারিখ ও তথ্য</h1>
                  <p className="text-sm text-slate-500 font-medium">আপনার NID অনুযায়ী জন্ম তারিখ ও নাম দিন।</p>
               </div>

               <div className="px-8 pb-8 space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">জন্ম তারিখ (Date of Birth)</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        placeholder="DD-MM-YYYY"
                        className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-950 outline-none transition-all"
                      />
                      <Calendar className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">NID অনুযায়ী নাম</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder="আপনার নাম লিখুন"
                        className="w-full px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-950 outline-none transition-all"
                      />
                      <User className="w-5 h-5 absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-3xl flex items-center gap-3 text-[#0066FF]">
                     <Info className="w-5 h-5 shrink-0" />
                     <p className="text-[10px] font-bold">সঠিক তথ্য না দিলে আপনার আবেদন বাতিল হতে পারে।</p>
                  </div>
               </div>
            </div>
          )}

          {/* STEP 7: CHOOSE METHOD (PAID PLAY BILLING SUBSCRIPTION VS FREE ADMIN VERIFICATION) */}
          {verificationStatus !== 'pending' && verificationStatus !== 'approved' && verificationStatus !== 'rejected' && step === 7 && (
            <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-300 overflow-y-auto">
               <div className="p-8 space-y-2">
                  <h1 className="text-2xl font-black text-slate-900">ভেরিফিকেশন পদ্ধতি নির্বাচন করুন</h1>
                  <p className="text-sm text-slate-500 font-medium">আপনার ব্লু ব্যাজ পাওয়ার জন্য যেকোনো একটি মাধ্যম বেছে নিন।</p>
               </div>

               <div className="px-8 pb-8 space-y-4">
                  {/* Option 1: Paid Subscription ($5 for 6 months via Google Play Billing) */}
                  <div 
                    onClick={() => {
                      if (!nidFile || !selfieFile || !legalName.trim()) {
                        triggerToast('⚠️ অনুগ্রহ করে আগের ধাপে NID এবং সেলফি ছবি প্রদান করুন।');
                        setStep(4);
                        return;
                      }
                      onClose();
                      if (onOpenSubscription) onOpenSubscription();
                    }}
                    className="p-6 rounded-[28px] border-2 border-blue-600 bg-blue-50/50 hover:bg-blue-50 transition-all cursor-pointer flex flex-col gap-3 relative shadow-sm group"
                  >
                     <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase">
                       প্রস্তাবিত
                     </div>
                     <div className="flex items-center gap-3">
                       <div className="w-12 h-12 rounded-2xl bg-[#0066FF] text-white flex items-center justify-center shadow-md">
                         <CreditCard className="w-6 h-6" />
                       </div>
                       <div>
                         <h3 className="text-base font-black text-slate-900">গুগল প্লে স্টোর সাবস্ক্রিপশন</h3>
                         <p className="text-xs text-blue-600 font-bold">$৫ ডলার / ৬ মাস</p>
                       </div>
                     </div>
                     <p className="text-xs text-slate-600 font-medium leading-relaxed">
                       গুগল প্লে স্টোর পেমেন্ট মেথড দিয়ে সরাসরি সাবস্ক্রিপশন চালু করুন এবং ইনস্ট্যান্ট ব্লু ব্যাজ পান।
                     </p>
                     <div className="flex items-center gap-2 text-xs font-black text-[#0066FF] pt-1">
                       <span>পেমেন্ট করতে ট্যাপ করুন</span>
                       <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                     </div>
                  </div>

                  {/* Option 2: Free Admin-Approved Request */}
                  <div 
                    onClick={() => handleCompleteVerification()}
                    className="p-6 rounded-[28px] border-2 border-slate-200 bg-white hover:border-slate-950 transition-all cursor-pointer flex flex-col gap-3 shadow-sm group"
                  >
                     <div className="absolute top-4 right-4 bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase">
                       ফ্রি
                     </div>
                     <div className="flex items-center gap-3">
                       <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                         <ShieldCheck className="w-6 h-6" />
                       </div>
                       <div>
                         <h3 className="text-base font-black text-slate-900">ফ্রি অ্যাডমিন ভেরিফিকেশন</h3>
                         <p className="text-xs text-emerald-600 font-bold">সম্পূর্ণ ফ্রি (ডকুমেন্টস যাচাই সাপেক্ষে)</p>
                       </div>
                     </div>
                     <p className="text-xs text-slate-600 font-medium leading-relaxed">
                       আপনার NID ও সেলফি ছবি অ্যাডমিনের কাছে পাঠানো হবে। ডকুমেন্টস সঠিক থাকলে অ্যাডমিন অনুমোদন করবেন, অন্যথায় বাতিল করবেন।
                     </p>
                     <div className="flex items-center gap-2 text-xs font-black text-slate-900 pt-1">
                       <span>ফ্রি রিকোয়েস্ট জমা দিন</span>
                       <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                     </div>
                  </div>
               </div>
            </div>
          )}

          {/* ================= STATUS SCREENS (PENDING/APPROVED/REJECTED) ================= */}
          {(verificationStatus === 'pending' || verificationStatus === 'approved' || verificationStatus === 'rejected') && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-300">
               <div className={`w-28 h-28 rounded-[40px] flex items-center justify-center mb-6 shadow-2xl relative ${
                  verificationStatus === 'approved' ? 'bg-blue-50 text-blue-600' :
                  verificationStatus === 'rejected' ? 'bg-rose-50 text-rose-600' :
                  'bg-amber-50 text-amber-600'
               }`}>
                  {verificationStatus === 'approved' ? <BlueBadgeIcon className="w-16 h-16" /> :
                   verificationStatus === 'rejected' ? <AlertTriangle className="w-16 h-16" /> :
                   <Clock className="w-16 h-16 animate-pulse" />}
               </div>

               <h2 className="text-2xl font-black text-slate-950 mb-3 leading-tight">
                  {verificationStatus === 'approved' ? 'অভিনন্দন! আপনি ভেরিফাইড' :
                   verificationStatus === 'rejected' ? 'ভেরিফিকেশন প্রত্যাখ্যাত' :
                   'আবেদন যাচাই চলছে'}
               </h2>
               
               <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-[280px] mb-8">
                  {verificationStatus === 'approved' ? 'আপনার অ্যাকাউন্টে সফলভাবে ব্লু ব্যাজ যুক্ত করা হয়েছে।' :
                   verificationStatus === 'rejected' ? `কারণ: ${rejectionReason}` :
                   'আমরা আপনার দেওয়া তথ্যগুলো গুরুত্বের সাথে যাচাই করছি। অনুগ্রহ করে অপেক্ষা করুন।'}
               </p>

               {verificationStatus === 'approved' && (
                  <button 
                    onClick={() => { onClose(); if (onOpenSubscription) onOpenSubscription(); }}
                    className="w-full py-4 bg-[#0066FF] text-white rounded-3xl font-black text-sm shadow-xl active:scale-95 transition-transform"
                  >
                    Manage Subscription
                  </button>
               )}

               {verificationStatus === 'rejected' && (
                  <button 
                    onClick={handleReapply}
                    className="w-full py-4 bg-slate-950 text-white rounded-3xl font-black text-sm shadow-xl active:scale-95 transition-transform"
                  >
                    পুনরায় আবেদন করুন
                  </button>
               )}

               <button 
                 onClick={handleExitVerification}
                 className="mt-4 text-xs font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest"
               >
                 Close Menu
               </button>
            </div>
          )}

        </div>

        {/* ================= BOTTOM ACTION FOOTER ================= */}
        {verificationStatus === 'not_started' && selectedFeature === null && step <= 3 && (
          <div className="p-8 pt-4 pb-10 bg-white shrink-0 border-t border-slate-50 flex flex-col gap-4">
            
            {/* Dot Progress Indicator for Welcome Flow */}
            {step <= 3 && (
              <div className="flex items-center justify-center gap-2 mb-2">
                {[1, 2, 3].map((s) => (
                  <div 
                    key={s} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${step === s ? 'w-8 bg-slate-950' : 'w-2 bg-slate-200'}`} 
                  />
                ))}
              </div>
            )}

            <button
              onClick={() => {
                if (step === 1) setStep(2);
                else if (step === 2) setStep(3);
                else if (step === 3) setStep(4);
              }}
              className="w-full py-5 bg-slate-950 text-white rounded-3xl font-black text-sm flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98] transition-all"
            >
              <span>পরবর্তী</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Wizard Footer Buttons */}
        {verificationStatus === 'not_started' && step >= 4 && step <= 6 && (
           <div className="p-8 pt-4 pb-10 bg-white shrink-0 border-t border-slate-50">
              <button
                disabled={loading}
                onClick={() => {
                  if (step === 4) {
                    if (!nidFile) triggerToast('⚠️ NID ছবি আপলোড করুন');
                    else setStep(5);
                  } else if (step === 5) {
                    if (!selfieFile) triggerToast('⚠️ সেলফি ছবি আপলোড করুন');
                    else setStep(6);
                  } else if (step === 6) {
                    if (!legalName.trim() || !dob.trim()) {
                      triggerToast('⚠️ জন্ম তারিখ ও নাম পূরণ করুন');
                    } else {
                      setStep(7); // Go to method selection (Paid subscription vs Free Admin request)
                    }
                  }
                }}
                className={`w-full py-5 bg-slate-950 text-white rounded-3xl font-black text-sm flex items-center justify-center gap-3 shadow-2xl active:scale-[0.98] transition-all ${loading ? 'opacity-70' : ''}`}
              >
                <span>{step === 6 ? 'পদ্ধতি নির্বাচন করুন' : 'পরবর্তী'}</span>
                {step < 6 && <ChevronRight className="w-5 h-5" />}
              </button>
           </div>
        )}

      </div>
    </div>
  );
};
