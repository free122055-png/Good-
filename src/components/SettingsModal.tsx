import React, { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Lock,
  Shield,
  User,
  Ban,
  Smartphone,
  HelpCircle,
  Info,
  ChevronRight,
  ChevronLeft,
  Check,
  Mail,
  Phone,
  Key,
  Smartphone as PhoneIcon,
  ShieldAlert,
  UserX,
  AlertTriangle,
  Globe,
  Moon,
  Database,
  Trash2,
  FileText,
  MessageSquare,
  LifeBuoy,
  ChevronDown,
  Sparkles,
  Lock as LockIcon,
  Eye,
  MessageCircle,
  Users,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { requestNotificationPermissionAndGetToken } from '../services/fcmService';
import { requestOneSignalPermission } from '../services/oneSignalService';
import { registerBackHandler } from '../services/backNavigationService';
import { UserData } from '../services/authService';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleDarkMode?: () => void;
  isDarkMode?: boolean;
  currentUser?: UserData | null;
  onOpenBlueBadge?: () => void;
}

export type SettingsSubPage =
  | 'notifications'
  | 'privacy'
  | 'security'
  | 'account'
  | 'block'
  | 'app'
  | 'help'
  | 'about'
  | null;

interface PopupPickerConfig {
  title: string;
  currentValue: string;
  options: { label: string; value: string }[];
  onSelect: (val: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onToggleDarkMode,
  isDarkMode = false,
  currentUser,
  onOpenBlueBadge,
}) => {
  // Navigation active sub-page state
  const [activeSubPage, setActiveSubPage] = useState<SettingsSubPage>(null);

  // Custom Software Popup Picker Dialog State (Exact match to Screenshot_২০২৬১০০৭-১২৩৫০১.jpg)
  const [activePopupPicker, setActivePopupPicker] = useState<PopupPickerConfig | null>(null);

  // Sub-dialog modals inside sub-pages
  const [activeSubDialog, setActiveSubDialog] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // System Notification Device Permission State
  const [notifPermissionState, setNotifPermissionState] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'
  );
  const [isRequestingNotif, setIsRequestingNotif] = useState(false);

  // 1. Notifications State
  const [likeNotifs, setLikeNotifs] = useState(true);
  const [commentNotifs, setCommentNotifs] = useState(true);
  const [followerNotifs, setFollowerNotifs] = useState(true);
  const [storyNotifs, setStoryNotifs] = useState(true);
  const [videoNotifs, setVideoNotifs] = useState(true);
  const [securityNotifs, setSecurityNotifs] = useState(true);

  // 2. Privacy State
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [whoCanFollow, setWhoCanFollow] = useState<'everyone' | 'approval'>('everyone');
  const [whoCanComment, setWhoCanComment] = useState<'everyone' | 'followers' | 'none'>('everyone');
  const [whoCanViewStory, setWhoCanViewStory] = useState<'everyone' | 'friends'>('everyone');
  const [storyReplies, setStoryReplies] = useState<'everyone' | 'followers' | 'off'>('everyone');
  const [activityStatus, setActivityStatus] = useState(true);
  const [profileVisibility, setProfileVisibility] = useState(true);

  // 3. Security State
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // 4. Account State (Initialized from currentUser in real-time)
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [dob, setDob] = useState(currentUser?.dob || '');
  const [username, setUsername] = useState(currentUser?.username || '');

  // Sync state when currentUser changes or modal opens
  useEffect(() => {
    if (currentUser) {
      if (currentUser.email) setEmail(currentUser.email);
      if (currentUser.phone) setPhone(currentUser.phone);
      if (currentUser.dob) setDob(currentUser.dob);
      if (currentUser.username) setUsername(currentUser.username);
    }
  }, [currentUser, isOpen]);

  // Helper to persist updates to Firestore in real-time
  const updateFirestoreUserField = async (fields: Record<string, any>) => {
    if (!currentUser?.uid) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, fields);
      console.log('[BINISTA Firestore Sync] Updated user settings/credentials:', fields);
    } catch (err) {
      console.error('Failed to sync user settings to Firestore:', err);
    }
  };

  // Request system notification permission
  const handleRequestNotificationPermission = async () => {
    setIsRequestingNotif(true);
    try {
      await requestOneSignalPermission(currentUser?.uid);
      const res = await requestNotificationPermissionAndGetToken(currentUser?.uid);
      if (res.token || res.permissionStatus === 'granted') {
        setNotifPermissionState('granted');
        setLikeNotifs(true);
        setCommentNotifs(true);
        setFollowerNotifs(true);
        setStoryNotifs(true);
        setVideoNotifs(true);
        setSecurityNotifs(true);
        triggerToast(`🎉 OneSignal & System Push নোটিফিকেশন পারমিশন চালু হয়েছে!`);
      } else if (res.permissionStatus === 'denied') {
        setNotifPermissionState('denied');
        triggerToast('⚠️ ডিভাইসে নোটিফিকেশন বন্ধ রয়েছে। Settings ➔ Allow করুন।');
      } else {
        triggerToast('⚠️ পারমিশন দেওয়া হয়নি।');
      }
    } catch (e: any) {
      console.error('Notification request error:', e);
      triggerToast('পারমিশন নেওয়ার সময় সমস্যা হয়েছে।');
    } finally {
      setIsRequestingNotif(false);
    }
  };

  // Helper toggle that auto requests permission if not granted
  const handleTogglePreference = async (setter: React.Dispatch<React.SetStateAction<boolean>>, currentVal: boolean, name: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission !== 'granted') {
      await handleRequestNotificationPermission();
      return;
    }
    setter(!currentVal);
    triggerToast(!currentVal ? `${name} চালু করা হলো` : `${name} বন্ধ করা হলো`);
  };

  // 5. Block & Restrictions State
  const [blockedUsers, setBlockedAccounts] = useState(['spammer_99', 'fake_account_x']);
  const [restrictedUsers, setRestrictedAccounts] = useState(['troll_user_01']);

  // 6. App Settings State
  const [language, setLanguage] = useState<'English' | 'বাংলা' | 'العربية'>('English');
  const [dataSaver, setDataSaver] = useState(false);
  const [autoplayVideos, setAutoplayVideos] = useState(true);
  const [mediaQuality, setMediaQuality] = useState<'High 4K' | 'Standard HD' | 'Auto'>('High 4K');
  const [cacheSize, setCacheSize] = useState('24.8 MB');

  // 7. Help & Report Form State
  const [reportText, setReportText] = useState('');

  if (!isOpen) return null;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleClearCache = () => {
    setCacheSize('0.0 KB');
    triggerToast('Cache & Storage cleared successfully!');
  };

  const handleUnblockUser = (u: string) => {
    setBlockedAccounts(blockedUsers.filter((b) => b !== u));
    triggerToast(`Unblocked @${u}`);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOldPassword('');
    setNewPassword('');
    setActiveSubDialog(null);
    triggerToast('Password updated securely!');
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReportText('');
    setActiveSubDialog(null);
    triggerToast('Report submitted to BINISTA Support!');
  };

  const categories = [
    {
      id: 'notifications' as SettingsSubPage,
      icon: Bell,
      iconColor: 'text-indigo-600',
      label: 'Notifications',
      emoji: '🔔',
      desc: 'Likes, comments, followers, stories & security alerts',
    },
    {
      id: 'privacy' as SettingsSubPage,
      icon: Lock,
      iconColor: 'text-emerald-600',
      label: 'Privacy',
      emoji: '🔒',
      desc: 'Private account, comments, story visibility & online status',
    },
    {
      id: 'security' as SettingsSubPage,
      icon: Shield,
      iconColor: 'text-blue-600',
      label: 'Security',
      emoji: '🛡️',
      desc: 'Change password, 2FA, login activity & active devices',
    },
    {
      id: 'account' as SettingsSubPage,
      icon: User,
      iconColor: 'text-purple-600',
      label: 'Account & Personal Credentials',
      emoji: '👤',
      desc: 'Private Email, Phone Number, Date of Birth & Username',
    },
    {
      id: 'block' as SettingsSubPage,
      icon: Ban,
      iconColor: 'text-red-500',
      label: 'Block & Restrictions',
      emoji: '🚫',
      desc: 'Blocked accounts and restricted users management',
    },
    {
      id: 'app' as SettingsSubPage,
      icon: Smartphone,
      iconColor: 'text-teal-600',
      label: 'App Settings',
      emoji: '📱',
      desc: 'Language, Dark mode, Data saver, 4K quality & Cache',
    },
    {
      id: 'help' as SettingsSubPage,
      icon: HelpCircle,
      iconColor: 'text-amber-600',
      label: 'Help & Support',
      emoji: 'ℹ️',
      desc: 'Help center, report a problem & contact support',
    },
    {
      id: 'about' as SettingsSubPage,
      icon: Info,
      iconColor: 'text-slate-700',
      label: 'About BINISTA',
      emoji: '📄',
      desc: 'Terms of service, privacy policy & app version v2.4.0',
    },
  ];

  const getLabelForValue = (val: string) => {
    switch (val) {
      case 'everyone': return 'Everyone';
      case 'approval': return 'Follow Approval Only';
      case 'followers': return 'Followers';
      case 'none': return 'No One';
      case 'friends': return 'Close Friends Only';
      case 'off': return 'Off';
      default: return val;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white text-slate-900 flex flex-col p-4 sm:p-6 overflow-y-auto no-scrollbar select-none animate-in fade-in duration-200">
      <div className="max-w-md mx-auto w-full flex flex-col gap-4 pb-12">
        
        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-extrabold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-white/20 animate-in slide-in-from-top-3">
            <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* VIEW 1: MAIN SETTINGS & PRIVACY MENU (Exact match to Screenshot_২০২৬১০০৭-১২১৭৫৬.jpg) */}
        {!activeSubPage && (
          <div className="flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            {/* Main Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 sticky top-0 bg-white z-20 pt-1">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={onClose}
                  className="p-1 -ml-1 text-slate-900 hover:opacity-70 transition-opacity cursor-pointer"
                  aria-label="Close settings"
                >
                  <X className="w-6 h-6 stroke-[2.5]" />
                </button>
                <div className="w-8 h-8 rounded-2xl bg-[#0066FF] text-white flex items-center justify-center shadow-xs">
                  <Shield className="w-4.5 h-4.5 stroke-[2.5]" />
                </div>
                <h1 className="font-extrabold text-xl text-slate-900 tracking-tight">
                  Settings & Privacy
                </h1>
              </div>
            </div>

            {/* List of 8 Category Cards matching photo */}
            <div className="flex flex-col gap-3 pt-1">
              {/* Blue Badge Promotional Banner */}
              {onOpenBlueBadge && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenBlueBadge();
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl p-4 flex items-center justify-between shadow-md transition-all cursor-pointer group text-left mb-1"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white shadow-xs shrink-0">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-white">Get BINISTA Blue Badge</span>
                        <span className="bg-white/20 text-white text-[10px] font-black px-1.5 py-0.5 rounded uppercase">VERIFIED</span>
                      </div>
                      <span className="text-[11px] text-blue-100 font-medium mt-0.5">
                        Verify your profile, get priority & authentic creator status
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/80 group-hover:translate-x-0.5 transition-transform" />
                </button>
              )}

              {categories.map((cat) => {
                const IconComp = cat.icon;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveSubPage(cat.id)}
                    className="w-full bg-[#f8fafc] hover:bg-[#f1f5f9] active:bg-[#e2e8f0] border border-slate-100/90 rounded-2xl p-4 flex items-center justify-between shadow-2xs transition-all cursor-pointer group text-left"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                        <IconComp className={`w-5 h-5 ${cat.iconColor} stroke-[2.2]`} />
                      </div>

                      <div className="flex flex-col">
                        <span className="font-extrabold text-sm text-slate-900 font-sans tracking-tight">
                          {cat.label}
                        </span>
                        <span className="text-[11px] text-gray-500 font-medium mt-0.5 leading-tight">
                          {cat.desc}
                        </span>
                      </div>
                    </div>

                    <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors -rotate-90" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 2: FULL SCREEN SUB-PAGES */}
        {activeSubPage && (
          <div className="flex flex-col gap-4 animate-in slide-in-from-right duration-200">
            {/* Sub-Page Top Header with Back Chevron (Matching Screenshot_২০২৬১০০৭-১২৩৫০৩.jpg) */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 sticky top-0 bg-white z-20 pt-1">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setActiveSubPage(null)}
                  className="p-1 -ml-1 text-slate-900 hover:opacity-70 transition-opacity cursor-pointer flex items-center gap-1"
                  aria-label="Back to Settings & Privacy"
                >
                  <ChevronLeft className="w-7 h-7 stroke-[2.5]" />
                </button>
                <h1 className="font-extrabold text-lg text-slate-900 tracking-tight">
                  {categories.find((c) => c.id === activeSubPage)?.label}
                </h1>
              </div>

              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-black cursor-pointer"
                aria-label="Close"
              >
                <X className="w-6 h-6 stroke-[2]" />
              </button>
            </div>

            {/* SUB-PAGE 1: 🔔 Notifications */}
            {activeSubPage === 'notifications' && (
              <div className="flex flex-col gap-3.5 pt-1">
                {/* Master Device Permission Switch & Status */}
                <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                        <Bell className="w-5 h-5 stroke-[2.5]" />
                      </div>
                      <div>
                        <h2 className="font-extrabold text-sm text-white">
                          ডিভাইস পুশ নোটিফিকেশন (Device Permission)
                        </h2>
                        <span
                          className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-md mt-0.5 ${
                            notifPermissionState === 'granted'
                              ? 'bg-emerald-500 text-slate-950'
                              : notifPermissionState === 'denied'
                              ? 'bg-rose-500 text-white'
                              : 'bg-amber-400 text-slate-950'
                          }`}
                        >
                          {notifPermissionState === 'granted'
                            ? '✓ চালূ আছে (Active)'
                            : notifPermissionState === 'denied'
                            ? '✕ ব্লক করা (Blocked)'
                            : '⚡ পারমিশন প্রয়োজন (Required)'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleRequestNotificationPermission}
                      disabled={isRequestingNotif}
                      className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                    >
                      {isRequestingNotif ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>{notifPermissionState === 'granted' ? 'আপডেট করুন' : 'পারমিশন দিন'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {notifPermissionState === 'denied' && (
                    <div className="bg-rose-950/80 border border-rose-500/40 rounded-xl p-3 text-[11px] text-rose-200 space-y-1 leading-snug">
                      <span className="font-extrabold text-rose-300 block flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        ব্রাউজার/মোবাইলে নোটিফিকেশন ব্লক রয়েছে!
                      </span>
                      <p className="font-medium text-[10px] text-rose-200">
                        মোবাইল ফোনের ব্রাউজার এড্রেস বারের পাশে 🔒 বা ⚙️ ক্লিক করে <strong>Notifications &rarr; Allow</strong> করুন এবং পেজ রিলোড দিন।
                      </p>
                    </div>
                  )}
                </div>

                {/* Granular Notification Switches */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-4">
                  <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                    Push Notification Preferences
                  </span>

                  <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm text-slate-900">Like Notifications ❤️</span>
                      <span className="text-xs text-gray-500">Notify when someone likes your reels or stories</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={likeNotifs && notifPermissionState === 'granted'}
                      onChange={() => handleTogglePreference(setLikeNotifs, likeNotifs, 'Like notifications')}
                      className="w-5 h-5 accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm text-slate-900">Comment Notifications 💬</span>
                      <span className="text-xs text-gray-500">Notify on new comments and replies</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={commentNotifs && notifPermissionState === 'granted'}
                      onChange={() => handleTogglePreference(setCommentNotifs, commentNotifs, 'Comment notifications')}
                      className="w-5 h-5 accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm text-slate-900">New Follower Notifications 👤</span>
                      <span className="text-xs text-gray-500">Notify when someone starts following you</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={followerNotifs && notifPermissionState === 'granted'}
                      onChange={() => handleTogglePreference(setFollowerNotifs, followerNotifs, 'Follower notifications')}
                      className="w-5 h-5 accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm text-slate-900">Story Notifications 📖</span>
                      <span className="text-xs text-gray-500">Notify when creators post new stories</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={storyNotifs && notifPermissionState === 'granted'}
                      onChange={() => handleTogglePreference(setStoryNotifs, storyNotifs, 'Story notifications')}
                      className="w-5 h-5 accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-gray-200/60">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm text-slate-900">Video Notifications 🎬</span>
                      <span className="text-xs text-gray-500">Notify when recommended videos drop</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={videoNotifs && notifPermissionState === 'granted'}
                      onChange={() => handleTogglePreference(setVideoNotifs, videoNotifs, 'Video notifications')}
                      className="w-5 h-5 accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm text-slate-900">Security Notifications 🔒</span>
                      <span className="text-xs text-gray-500">Instant alerts on new logins or security changes</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={securityNotifs && notifPermissionState === 'granted'}
                      onChange={() => handleTogglePreference(setSecurityNotifs, securityNotifs, 'Security notifications')}
                      className="w-5 h-5 accent-indigo-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SUB-PAGE 2: 🔒 Privacy (Matching Screenshot_২০২৬১০০৭-১২৩৫০৩.jpg) */}
            {activeSubPage === 'privacy' && (
              <div className="flex flex-col gap-3.5 pt-1">
                <div className="bg-[#f8fafc] border border-slate-100 rounded-2xl p-4 flex flex-col gap-4">
                  <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                    ACCOUNT & CONTENT PRIVACY
                  </span>

                  {/* Private Account */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200/60">
                    <div className="flex flex-col pr-2">
                      <span className="font-extrabold text-sm text-slate-900">Private Account</span>
                      <span className="text-xs text-gray-500 leading-snug">When active, only followers you approve can see your reels</span>
                    </div>
                    <button
                      onClick={() => {
                        setIsPrivateAccount(!isPrivateAccount);
                        triggerToast(!isPrivateAccount ? 'Private Account Active' : 'Public Account Active');
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 ${
                        isPrivateAccount ? 'bg-emerald-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${isPrivateAccount ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Who Can Follow Me (Opens Custom Software Popup Modal) */}
                  <button
                    type="button"
                    onClick={() =>
                      setActivePopupPicker({
                        title: 'Who Can Follow Me',
                        currentValue: whoCanFollow,
                        options: [
                          { label: 'Everyone', value: 'everyone' },
                          { label: 'Follow Approval Only', value: 'approval' },
                        ],
                        onSelect: (val) => setWhoCanFollow(val as any),
                      })
                    }
                    className="w-full flex items-center justify-between pb-3 border-b border-gray-200/60 cursor-pointer hover:opacity-80 transition-opacity text-left"
                  >
                    <span className="font-extrabold text-xs text-slate-900">Who Can Follow Me</span>
                    <div className="flex items-center gap-1.5 bg-white border border-gray-200 text-xs font-bold text-slate-900 rounded-xl px-3.5 py-1.5 shadow-2xs">
                      <span>{getLabelForValue(whoCanFollow)}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                  </button>

                  {/* Who Can Comment (Opens Custom Software Popup Modal) */}
                  <button
                    type="button"
                    onClick={() =>
                      setActivePopupPicker({
                        title: 'Who Can Comment',
                        currentValue: whoCanComment,
                        options: [
                          { label: 'Everyone', value: 'everyone' },
                          { label: 'Followers', value: 'followers' },
                          { label: 'No One', value: 'none' },
                        ],
                        onSelect: (val) => setWhoCanComment(val as any),
                      })
                    }
                    className="w-full flex items-center justify-between pb-3 border-b border-gray-200/60 cursor-pointer hover:opacity-80 transition-opacity text-left"
                  >
                    <span className="font-extrabold text-xs text-slate-900">Who Can Comment</span>
                    <div className="flex items-center gap-1.5 bg-white border border-gray-200 text-xs font-bold text-slate-900 rounded-xl px-3.5 py-1.5 shadow-2xs">
                      <span>{getLabelForValue(whoCanComment)}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                  </button>

                  {/* Who Can View My Story (Opens Custom Software Popup Modal) */}
                  <button
                    type="button"
                    onClick={() =>
                      setActivePopupPicker({
                        title: 'Who Can View My Story',
                        currentValue: whoCanViewStory,
                        options: [
                          { label: 'Everyone', value: 'everyone' },
                          { label: 'Close Friends Only', value: 'friends' },
                        ],
                        onSelect: (val) => setWhoCanViewStory(val as any),
                      })
                    }
                    className="w-full flex items-center justify-between pb-3 border-b border-gray-200/60 cursor-pointer hover:opacity-80 transition-opacity text-left"
                  >
                    <span className="font-extrabold text-xs text-slate-900">Who Can View My Story</span>
                    <div className="flex items-center gap-1.5 bg-white border border-gray-200 text-xs font-bold text-slate-900 rounded-xl px-3.5 py-1.5 shadow-2xs">
                      <span>{getLabelForValue(whoCanViewStory)}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                  </button>

                  {/* Story Replies (Opens Custom Software Popup Modal matching Screenshot_২০২৬১০০৭-১২৩৫০১.jpg) */}
                  <button
                    type="button"
                    onClick={() =>
                      setActivePopupPicker({
                        title: 'Story Replies',
                        currentValue: storyReplies,
                        options: [
                          { label: 'Everyone', value: 'everyone' },
                          { label: 'Followers', value: 'followers' },
                          { label: 'Off', value: 'off' },
                        ],
                        onSelect: (val) => setStoryReplies(val as any),
                      })
                    }
                    className="w-full flex items-center justify-between pb-3 border-b border-gray-200/60 cursor-pointer hover:opacity-80 transition-opacity text-left"
                  >
                    <span className="font-extrabold text-xs text-slate-900">Story Replies</span>
                    <div className="flex items-center gap-1.5 bg-white border border-gray-200 text-xs font-bold text-slate-900 rounded-xl px-3.5 py-1.5 shadow-2xs">
                      <span>{getLabelForValue(storyReplies)}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                  </button>

                  {/* Activity Status (Online) */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200/60">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm text-slate-900">Activity Status (Online)</span>
                      <span className="text-xs text-gray-500">Show when you are active on BINISTA</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={activityStatus}
                      onChange={() => setActivityStatus(!activityStatus)}
                      className="w-5 h-5 accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  {/* Profile Indexing */}
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm text-slate-900">Profile Indexing</span>
                      <span className="text-xs text-gray-500">Allow profile to appear in search suggestions</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={profileVisibility}
                      onChange={() => setProfileVisibility(!profileVisibility)}
                      className="w-5 h-5 accent-emerald-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SUB-PAGE 3: 🛡️ Security */}
            {activeSubPage === 'security' && (
              <div className="flex flex-col gap-3.5 pt-1">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-4">
                  <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                    Password & Account Protection
                  </span>

                  {/* Change Password Button */}
                  <button
                    onClick={() => setActiveSubDialog('password')}
                    className="w-full p-3.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Key className="w-5 h-5 text-blue-600" />
                      <div className="flex flex-col text-left">
                        <span className="font-extrabold text-xs text-slate-900">Change Password</span>
                        <span className="text-[10px] text-gray-500">Update your account password regularly</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>

                  {/* Login Activity & Devices */}
                  <button
                    onClick={() => setActiveSubDialog('login-activity')}
                    className="w-full p-3.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <PhoneIcon className="w-5 h-5 text-blue-600" />
                      <div className="flex flex-col text-left">
                        <span className="font-extrabold text-xs text-slate-900">Login Activity & Devices</span>
                        <span className="text-[10px] text-gray-500">2 devices active (iPhone 15 Pro & Chrome)</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>

                  {/* Two Factor Authentication */}
                  <div className="flex items-center justify-between py-2 border-t border-gray-200/60 pt-3">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm text-slate-900">Two-Factor Authentication (2FA)</span>
                      <span className="text-xs text-gray-500">Require an SMS or App code on login</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={twoFactorAuth}
                      onChange={() => {
                        setTwoFactorAuth(!twoFactorAuth);
                        triggerToast(!twoFactorAuth ? '2FA Enabled' : '2FA Disabled');
                      }}
                      className="w-5 h-5 accent-blue-600 cursor-pointer"
                    />
                  </div>

                  {/* Security Alerts */}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm text-slate-900">Security Alerts</span>
                      <span className="text-xs text-gray-500">Get notified if suspicious login is detected</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={securityAlerts}
                      onChange={() => setSecurityAlerts(!securityAlerts)}
                      className="w-5 h-5 accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SUB-PAGE 4: 👤 Account & Personal Credentials */}
            {activeSubPage === 'account' && (
              <div className="flex flex-col gap-3.5 pt-1">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                      Private Credentials & Identity
                    </span>
                    <span className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full">
                      Hidden From Profile
                    </span>
                  </div>

                  {/* Email Address */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-purple-600" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Email Address (Private)</span>
                        <span className="text-xs font-extrabold text-slate-900">{email}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const newE = prompt('Enter new private email address:', email);
                        if (newE) {
                          setEmail(newE);
                          updateFirestoreUserField({ email: newE });
                          triggerToast('Email address updated!');
                        }
                      }}
                      className="px-3 py-1 bg-purple-50 text-purple-700 font-extrabold text-xs rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>

                  {/* Phone Number */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-purple-600" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Phone Number (Private)</span>
                        <span className="text-xs font-extrabold text-slate-900">{phone}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const newP = prompt('Enter new phone number:', phone);
                        if (newP) {
                          setPhone(newP);
                          updateFirestoreUserField({ phone: newP });
                          triggerToast('Phone number updated!');
                        }
                      }}
                      className="px-3 py-1 bg-purple-50 text-purple-700 font-extrabold text-xs rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>

                  {/* Date of Birth */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-200 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Date of Birth</span>
                      <span className="text-xs font-extrabold text-slate-900">{dob}</span>
                    </div>
                    <button
                      onClick={() => {
                        const newD = prompt('Enter Date of Birth:', dob);
                        if (newD) {
                          setDob(newD);
                          updateFirestoreUserField({ dob: newD });
                          triggerToast('Date of birth updated!');
                        }
                      }}
                      className="px-3 py-1 bg-purple-50 text-purple-700 font-extrabold text-xs rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>

                  {/* Change Username */}
                  <div className="bg-white p-3.5 rounded-xl border border-gray-200 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Username</span>
                      <span className="text-xs font-extrabold text-[#0066FF]">@{username}</span>
                    </div>
                    <button
                      onClick={() => {
                        const newU = prompt('Enter new handle/username:', username);
                        if (newU) {
                          const cleanU = newU.replace('@', '');
                          setUsername(cleanU);
                          updateFirestoreUserField({ username: cleanU });
                          triggerToast('Username changed successfully!');
                        }
                      }}
                      className="px-3 py-1 bg-blue-50 text-blue-700 font-extrabold text-xs rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      Change
                    </button>
                  </div>

                  {/* Account Status Actions */}
                  <div className="flex flex-col gap-2 pt-2 border-t border-gray-200/60">
                    <button
                      onClick={() => {
                        if (confirm('Deactivate your BINISTA account temporarily?')) {
                          triggerToast('Account deactivated temporarily');
                        }
                      }}
                      className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold text-xs transition-colors cursor-pointer text-center"
                    >
                      Deactivate Account Temporarily
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to PERMANENTLY DELETE your BINISTA account? This cannot be undone.')) {
                          triggerToast('Account deletion request submitted.');
                        }
                      }}
                      className="w-full py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs transition-colors cursor-pointer text-center"
                    >
                      Permanently Delete Account
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-PAGE 5: 🚫 Block & Restrictions */}
            {activeSubPage === 'block' && (
              <div className="flex flex-col gap-3.5 pt-1">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-4">
                  <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                    Blocked Accounts ({blockedUsers.length})
                  </span>

                  {blockedUsers.length === 0 ? (
                    <span className="text-xs text-gray-400 font-medium p-2">No blocked users on your list.</span>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {blockedUsers.map((u) => (
                        <div key={u} className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-900">@{u}</span>
                          <button
                            onClick={() => handleUnblockUser(u)}
                            className="px-3 py-1 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-black transition-colors cursor-pointer"
                          >
                            Unblock
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider pt-2 border-t border-gray-200/60">
                    Restricted Accounts ({restrictedUsers.length})
                  </span>

                  {restrictedUsers.map((r) => (
                    <div key={r} className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between">
                      <span className="text-xs font-extrabold text-slate-900">@{r}</span>
                      <button
                        onClick={() => {
                          setRestrictedAccounts(restrictedUsers.filter((item) => item !== r));
                          triggerToast(`Removed restriction for @${r}`);
                        }}
                        className="px-3 py-1 bg-gray-100 text-slate-800 font-bold text-xs rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                      >
                        Unrestrict
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB-PAGE 6: 📱 App Settings */}
            {activeSubPage === 'app' && (
              <div className="flex flex-col gap-3.5 pt-1">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-4">
                  <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                    Application & Playback Preferences
                  </span>

                  {/* Language */}
                  <button
                    type="button"
                    onClick={() =>
                      setActivePopupPicker({
                        title: 'App Language',
                        currentValue: language,
                        options: [
                          { label: 'English', value: 'English' },
                          { label: 'বাংলা (Bengali)', value: 'বাংলা' },
                          { label: 'العربية (Arabic)', value: 'العربية' },
                        ],
                        onSelect: (val) => setLanguage(val as any),
                      })
                    }
                    className="w-full flex items-center justify-between pb-3 border-b border-gray-200/60 cursor-pointer hover:opacity-80 transition-opacity text-left"
                  >
                    <span className="font-extrabold text-xs text-slate-900">App Language</span>
                    <div className="flex items-center gap-1.5 bg-white border border-gray-200 text-xs font-bold text-slate-900 rounded-xl px-3.5 py-1.5 shadow-2xs">
                      <span>{language}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                  </button>

                  {/* Dark Mode */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200/60">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm text-slate-900">Dark Mode</span>
                      <span className="text-xs text-gray-500">Toggle dark / light theme UI</span>
                    </div>
                    <button
                      onClick={() => {
                        if (onToggleDarkMode) onToggleDarkMode();
                        triggerToast(isDarkMode ? 'Light Mode Enabled' : 'Dark Mode Enabled');
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer shrink-0 ${
                        isDarkMode ? 'bg-slate-900' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Data Saver */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200/60">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm text-slate-900">Data Saver</span>
                      <span className="text-xs text-gray-500">Use lower bandwidth when on mobile network</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={dataSaver}
                      onChange={() => setDataSaver(!dataSaver)}
                      className="w-5 h-5 accent-teal-600 cursor-pointer"
                    />
                  </div>

                  {/* Autoplay Videos */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200/60">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm text-slate-900">Autoplay Videos</span>
                      <span className="text-xs text-gray-500">Automatically play video feed on scroll</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoplayVideos}
                      onChange={() => setAutoplayVideos(!autoplayVideos)}
                      className="w-5 h-5 accent-teal-600 cursor-pointer"
                    />
                  </div>

                  {/* Media Quality */}
                  <button
                    type="button"
                    onClick={() =>
                      setActivePopupPicker({
                        title: 'Media Quality',
                        currentValue: mediaQuality,
                        options: [
                          { label: 'High 4K Ultra', value: 'High 4K' },
                          { label: 'Standard HD', value: 'Standard HD' },
                          { label: 'Auto Balance', value: 'Auto' },
                        ],
                        onSelect: (val) => setMediaQuality(val as any),
                      })
                    }
                    className="w-full flex items-center justify-between pb-3 border-b border-gray-200/60 cursor-pointer hover:opacity-80 transition-opacity text-left"
                  >
                    <span className="font-extrabold text-xs text-slate-900">Media Quality</span>
                    <div className="flex items-center gap-1.5 bg-white border border-gray-200 text-xs font-bold text-slate-900 rounded-xl px-3.5 py-1.5 shadow-2xs">
                      <span>{mediaQuality}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                  </button>

                  {/* Cache & Storage */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-sm text-slate-900">Cache & Storage</span>
                      <span className="text-xs text-gray-500">Occupied cache space: {cacheSize}</span>
                    </div>
                    <button
                      onClick={handleClearCache}
                      className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Clear Cache
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-PAGE 7: ℹ️ Help & Support */}
            {activeSubPage === 'help' && (
              <div className="flex flex-col gap-3.5 pt-1">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-3">
                  <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                    Customer Support & Help Center
                  </span>

                  <button
                    onClick={() => triggerToast('Opening Help Center & Video Tutorials...')}
                    className="w-full p-3.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <LifeBuoy className="w-5 h-5 text-amber-600" />
                      <span className="font-extrabold text-xs text-slate-900">Help Center & Guides</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>

                  <button
                    onClick={() => setActiveSubDialog('report')}
                    className="w-full p-3.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                      <span className="font-extrabold text-xs text-slate-900">Report a Problem</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>

                  <button
                    onClick={() => triggerToast('Connecting to 24/7 Live Agent Support...')}
                    className="w-full p-3.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-amber-600" />
                      <span className="font-extrabold text-xs text-slate-900">Contact Live Support</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            )}

            {/* SUB-PAGE 8: 📄 About BINISTA */}
            {activeSubPage === 'about' && (
              <div className="flex flex-col gap-3.5 pt-1">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-3">
                  <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-1">
                    Platform Legal & Information
                  </span>

                  <button
                    onClick={() => triggerToast('Terms of Service loaded')}
                    className="w-full p-3.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <span className="font-extrabold text-xs text-slate-900">Terms of Service</span>
                    <FileText className="w-4 h-4 text-gray-400" />
                  </button>

                  <button
                    onClick={() => triggerToast('Privacy Policy loaded')}
                    className="w-full p-3.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <span className="font-extrabold text-xs text-slate-900">Privacy Policy</span>
                    <FileText className="w-4 h-4 text-gray-400" />
                  </button>

                  <button
                    onClick={() => triggerToast('Community Guidelines loaded')}
                    className="w-full p-3.5 bg-white border border-gray-200 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <span className="font-extrabold text-xs text-slate-900">Community Guidelines</span>
                    <FileText className="w-4 h-4 text-gray-400" />
                  </button>

                  <div className="mt-2 bg-white p-4 rounded-xl border border-gray-200 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900">BINISTA Platform</span>
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                        v2.4.0 (Build 2026.10)
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed mt-1">
                      BINISTA is a modern short-video, cinematic reels, and storytelling platform designed for creators worldwide.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* CUSTOM SOFTWARE POPUP PICKER DIALOG (Exact match to Screenshot_২০২৬১০০৭-১২৩৫০১.jpg) */}
        {activePopupPicker && (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
            onClick={() => setActivePopupPicker(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#383e47] text-white rounded-2xl overflow-hidden shadow-2xl border border-slate-600/80 max-w-xs w-full animate-in zoom-in-95 duration-150"
            >
              <div className="flex flex-col divide-y divide-slate-700/80">
                {activePopupPicker.options.map((opt) => {
                  const isSelected = activePopupPicker.currentValue === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        activePopupPicker.onSelect(opt.value);
                        setActivePopupPicker(null);
                        triggerToast(`${activePopupPicker.title} updated`);
                      }}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 active:bg-slate-700/80 transition-colors text-left cursor-pointer group"
                    >
                      <span className="font-extrabold text-sm text-slate-100 font-sans tracking-tight">
                        {opt.label}
                      </span>

                      {/* Radio Circle Indicator (Matching exact teal/cyan circle in screenshot) */}
                      <div
                        className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
                          isSelected
                            ? 'border-[#26D07C] bg-transparent'
                            : 'border-slate-500 bg-transparent group-hover:border-slate-400'
                        }`}
                      >
                        {isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#26D07C]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SUB-DIALOG MODALS */}
        {/* Password Modal */}
        {activeSubDialog === 'password' && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <form onSubmit={handlePasswordSubmit} className="bg-white rounded-2xl p-5 max-w-sm w-full flex flex-col gap-3 shadow-2xl">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-extrabold text-sm text-slate-900">Change Password</span>
                <button type="button" onClick={() => setActiveSubDialog(null)} className="p-1 text-gray-400 hover:text-black">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="password"
                placeholder="Current Password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full bg-gray-100 p-2.5 rounded-xl text-xs font-bold text-black focus:outline-none"
                required
              />
              <input
                type="password"
                placeholder="New Secure Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-gray-100 p-2.5 rounded-xl text-xs font-bold text-black focus:outline-none"
                required
              />
              <button type="submit" className="py-2.5 bg-slate-900 text-white font-extrabold text-xs rounded-xl hover:bg-black">
                Update Password
              </button>
            </form>
          </div>
        )}

        {/* Login Activity & Devices Modal */}
        {activeSubDialog === 'login-activity' && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-5 max-w-sm w-full flex flex-col gap-3 shadow-2xl">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-extrabold text-sm text-slate-900">Login Activity & Devices</span>
                <button type="button" onClick={() => setActiveSubDialog(null)} className="p-1 text-gray-400 hover:text-black">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-col gap-2 text-xs">
                <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-extrabold text-slate-900">iPhone 15 Pro (This Device)</span>
                    <span className="text-[10px] text-emerald-700 font-bold">Active Now • Dhaka, Bangladesh</span>
                  </div>
                  <span className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-black">ACTIVE</span>
                </div>
                <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-xl flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">Chrome Web Browser</span>
                    <span className="text-[10px] text-gray-500">2 hours ago • Windows PC</span>
                  </div>
                  <button onClick={() => triggerToast('Session terminated')} className="text-[10px] text-red-600 font-bold hover:underline">
                    Log Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Report Problem Modal */}
        {activeSubDialog === 'report' && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <form onSubmit={handleReportSubmit} className="bg-white rounded-2xl p-5 max-w-sm w-full flex flex-col gap-3 shadow-2xl">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-extrabold text-sm text-slate-900">Report a Problem</span>
                <button type="button" onClick={() => setActiveSubDialog(null)} className="p-1 text-gray-400 hover:text-black">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <textarea
                placeholder="Describe what went wrong or suggest a feature..."
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                rows={4}
                className="w-full bg-gray-100 p-2.5 rounded-xl text-xs font-medium text-black focus:outline-none"
                required
              />
              <button type="submit" className="py-2.5 bg-slate-900 text-white font-extrabold text-xs rounded-xl hover:bg-black">
                Submit Report
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
};
