import React, { useState, useEffect } from 'react';
import {
  Bell,
  Settings,
  Check,
  CheckCheck,
  Trash2,
  X,
  ShieldCheck,
  Heart,
  MessageSquare,
  Users,
  UserPlus,
  AtSign,
  Send,
  Award,
  Sparkles,
  ChevronRight,
  Loader2,
  Filter,
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  setDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserData } from '../services/authService';

export interface NotificationItem {
  id: string;
  category: 'friend' | 'reaction' | 'comment' | 'mention' | 'message' | 'badge' | 'official' | 'security';
  title: string;
  body: string;
  timeAgo: string;
  timestamp: number;
  read: boolean;
  avatarUrl?: string;
  group?: 'Today' | 'Yesterday' | 'Earlier';
  targetId?: string;
  targetType?: string;
}

interface NotificationCenterPageProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserData | null;
  triggerToast: (msg: string) => void;
  onOpenSettings: () => void;
  onNavigateToTarget?: (targetType?: string, targetId?: string) => void;
}

export const NotificationCenterPage: React.FC<NotificationCenterPageProps> = ({
  isOpen,
  onClose,
  currentUser,
  triggerToast,
  onOpenSettings,
  onNavigateToTarget,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'friends' | 'reactions' | 'comments'>('all');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Default initial demo notifications matching reference image if none in DB
  const defaultMockNotifications: NotificationItem[] = [
    {
      id: 'notif_1',
      category: 'friend',
      title: 'Friend Request',
      body: 'Rafiul Islam sent you a friend request.',
      timeAgo: '2m ago',
      timestamp: Date.now() - 2 * 60 * 1000,
      read: false,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=75',
      group: 'Today',
    },
    {
      id: 'notif_2',
      category: 'reaction',
      title: 'Reaction',
      body: 'Sadia Akter reacted to your post.',
      timeAgo: '12m ago',
      timestamp: Date.now() - 12 * 60 * 1000,
      read: true,
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=75',
      group: 'Today',
    },
    {
      id: 'notif_3',
      category: 'comment',
      title: 'New Comment',
      body: 'Mim Akter commented on your post. "দারুণ পোস্ট, খুব ভালো লেগেছে! 🎉"',
      timeAgo: '18m ago',
      timestamp: Date.now() - 18 * 60 * 1000,
      read: false,
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=75',
      group: 'Today',
    },
    {
      id: 'notif_4',
      category: 'mention',
      title: 'Mention',
      body: 'Tanjil Ahmed mentioned you in a comment. "@you অসাধারণ কাজ!"',
      timeAgo: '25m ago',
      timestamp: Date.now() - 25 * 60 * 1000,
      read: true,
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=75',
      group: 'Today',
    },
    {
      id: 'notif_5',
      category: 'message',
      title: 'New Message',
      body: 'Hasan sent you a new message. "কেমন আছো?"',
      timeAgo: '32m ago',
      timestamp: Date.now() - 32 * 60 * 1000,
      read: false,
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=75',
      group: 'Today',
    },
    {
      id: 'notif_6',
      category: 'badge',
      title: 'Blue Badge',
      body: 'Your verification request has been approved! You are now a verified user on BINISTA.',
      timeAgo: '1h ago',
      timestamp: Date.now() - 60 * 60 * 1000,
      read: true,
      group: 'Today',
    },
    {
      id: 'notif_7',
      category: 'official',
      title: 'BINISTA Update',
      body: 'New AI features are now available in BINISTA AI. Check out the latest updates and improvements.',
      timeAgo: '2h ago',
      timestamp: Date.now() - 120 * 60 * 1000,
      read: true,
      group: 'Today',
    },
    {
      id: 'notif_8',
      category: 'security',
      title: 'Security',
      body: 'New login detected from a device in Dhaka, Bangladesh. If this wasn’t you, secure your account.',
      timeAgo: '3h ago',
      timestamp: Date.now() - 180 * 60 * 1000,
      read: true,
      group: 'Today',
    },
    {
      id: 'notif_9',
      category: 'friend',
      title: 'Friendship Accepted',
      body: 'Nayeem Hasan accepted your friend request.',
      timeAgo: 'Yesterday',
      timestamp: Date.now() - 24 * 60 * 60 * 1000,
      read: true,
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=75',
      group: 'Yesterday',
    },
    {
      id: 'notif_10',
      category: 'reaction',
      title: 'Top Post',
      body: 'Your post got 100+ reactions! Keep sharing great content.',
      timeAgo: 'Yesterday',
      timestamp: Date.now() - 26 * 60 * 60 * 1000,
      read: true,
      group: 'Yesterday',
    },
  ];

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    if (!db || !currentUser) {
      setNotifications(defaultMockNotifications);
      setLoading(false);
      return;
    }

    const notifRef = collection(db, 'users', currentUser.uid, 'notifications');
    const q = query(notifRef, orderBy('timestamp', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: NotificationItem[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          loaded.push({
            id: d.id,
            category: data.category || 'official',
            title: data.title || 'Notification',
            body: data.body || '',
            timeAgo: data.timeAgo || 'Just now',
            timestamp: data.timestamp || Date.now(),
            read: data.read || false,
            avatarUrl: data.avatarUrl,
            group: data.group || 'Today',
            targetId: data.targetId,
            targetType: data.targetType,
          });
        });

        if (loaded.length === 0) {
          setNotifications(defaultMockNotifications);
        } else {
          setNotifications(loaded);
        }
        setLoading(false);
      },
      (err) => {
        console.warn('Firestore notifications sync warning:', err);
        setNotifications(defaultMockNotifications);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen, currentUser]);

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    if (currentUser && db && !id.startsWith('notif_')) {
      try {
        const ref = doc(db, 'users', currentUser.uid, 'notifications', id);
        await updateDoc(ref, { read: true });
      } catch (e) {}
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    triggerToast('All notifications marked as read');
    if (currentUser && db) {
      try {
        const notifRef = collection(db, 'users', currentUser.uid, 'notifications');
        const snap = await getDocs(notifRef);
        const batch = writeBatch(db);
        snap.forEach((d) => {
          batch.update(d.ref, { read: true });
        });
        await batch.commit();
      } catch (e) {}
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    triggerToast('Notification deleted');
    if (currentUser && db && !id.startsWith('notif_')) {
      try {
        const ref = doc(db, 'users', currentUser.uid, 'notifications', id);
        await deleteDoc(ref);
      } catch (e) {}
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.read;
    if (activeTab === 'friends') return n.category === 'friend';
    if (activeTab === 'reactions') return n.category === 'reaction';
    if (activeTab === 'comments') return n.category === 'comment' || n.category === 'mention';
    return true;
  });

  const todayGroup = filteredNotifications.filter((n) => n.group === 'Today' || !n.group);
  const yesterdayGroup = filteredNotifications.filter((n) => n.group === 'Yesterday');
  const earlierGroup = filteredNotifications.filter((n) => n.group === 'Earlier');

  const renderCategoryIcon = (category: string) => {
    switch (category) {
      case 'friend':
        return <UserPlus className="w-4 h-4 text-white" />;
      case 'reaction':
        return <Heart className="w-4 h-4 text-white fill-white" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-white" />;
      case 'mention':
        return <AtSign className="w-4 h-4 text-white" />;
      case 'message':
        return <Send className="w-4 h-4 text-white" />;
      case 'badge':
        return <Award className="w-4 h-4 text-white" />;
      case 'official':
        return <Sparkles className="w-4 h-4 text-white" />;
      case 'security':
        return <ShieldCheck className="w-4 h-4 text-white" />;
      default:
        return <Bell className="w-4 h-4 text-white" />;
    }
  };

  const getCategoryBg = (category: string) => {
    switch (category) {
      case 'friend':
        return 'bg-[#0066FF]';
      case 'reaction':
        return 'bg-[#FF2D55]';
      case 'comment':
        return 'bg-[#0066FF]';
      case 'mention':
        return 'bg-violet-600';
      case 'message':
        return 'bg-[#0066FF]';
      case 'badge':
        return 'bg-[#0066FF]';
      case 'official':
        return 'bg-purple-600';
      case 'security':
        return 'bg-emerald-600';
      default:
        return 'bg-slate-800';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white text-slate-900 flex flex-col overflow-y-auto select-none animate-in fade-in duration-200">
      
      {/* HEADER */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 sm:px-6 pt-4 pb-3 flex items-center justify-between z-30">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Notifications</h1>
          <p className="text-xs text-slate-500 font-medium">Stay updated with what's happening on BINISTA</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition cursor-pointer shadow-2xs"
            title="Notification Settings"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 stroke-[2]" />
          </button>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition cursor-pointer shadow-2xs"
            title="Close"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[2]" />
          </button>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="sticky top-[73px] bg-white/95 backdrop-blur-md px-4 sm:px-6 py-2.5 border-b border-slate-100 flex items-center gap-2 overflow-x-auto no-scrollbar z-20">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'all'
              ? 'bg-[#0066FF] text-white shadow-md shadow-blue-500/20'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <span>All</span>
          {notifications.length > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
              {notifications.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('unread')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'unread'
              ? 'bg-[#0066FF] text-white shadow-md shadow-blue-500/20'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${activeTab === 'unread' ? 'bg-white/20 text-white' : 'bg-blue-600 text-white'}`}>
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('friends')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'friends'
              ? 'bg-[#0066FF] text-white shadow-md shadow-blue-500/20'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Friends</span>
        </button>

        <button
          onClick={() => setActiveTab('reactions')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'reactions'
              ? 'bg-[#0066FF] text-white shadow-md shadow-blue-500/20'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Heart className="w-3.5 h-3.5" />
          <span>Reactions</span>
        </button>

        <button
          onClick={() => setActiveTab('comments')}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeTab === 'comments'
              ? 'bg-[#0066FF] text-white shadow-md shadow-blue-500/20'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Comments</span>
        </button>
      </div>

      {/* NOTIFICATIONS LIST CONTAINER */}
      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-4 space-y-6 pb-24">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-[#0066FF]" />
            <span className="text-xs font-semibold">Loading notifications...</span>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Bell className="w-7 h-7 opacity-60" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800">
              {activeTab === 'unread' ? "You're all caught up" : 'No notifications yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              {activeTab === 'unread'
                ? 'You have no unread notifications right now.'
                : 'Activity and updates from friends and BINISTA will appear here.'}
            </p>
          </div>
        ) : (
          <>
            {/* TODAY GROUP */}
            {todayGroup.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Today</h2>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs font-bold text-[#0066FF] hover:underline cursor-pointer"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {todayGroup.map((item) => renderNotificationCard(item))}
                </div>
              </div>
            )}

            {/* YESTERDAY GROUP */}
            {yesterdayGroup.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Yesterday</h2>
                  <span className="text-xs font-bold text-slate-400">View all</span>
                </div>

                <div className="space-y-2">
                  {yesterdayGroup.map((item) => renderNotificationCard(item))}
                </div>
              </div>
            )}

            {/* EARLIER GROUP */}
            {earlierGroup.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Earlier</h2>
                </div>

                <div className="space-y-2">
                  {earlierGroup.map((item) => renderNotificationCard(item))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );

  function renderNotificationCard(item: NotificationItem) {
    return (
      <div
        key={item.id}
        onClick={() => {
          handleMarkAsRead(item.id);
          if (onNavigateToTarget) {
            onNavigateToTarget(item.targetType, item.targetId);
          }
        }}
        className={`relative p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 group ${
          item.read
            ? 'bg-white border-slate-100 hover:bg-slate-50/70 text-slate-800'
            : 'bg-blue-50/60 border-blue-200/80 hover:bg-blue-50 text-slate-900 shadow-xs'
        }`}
      >
        {/* Avatar or Category Icon */}
        <div className="relative shrink-0">
          {item.avatarUrl ? (
            <img
              src={item.avatarUrl}
              alt={item.title}
              className="w-11 h-11 rounded-full object-cover shadow-xs border border-slate-200"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={`w-11 h-11 rounded-2xl ${getCategoryBg(item.category)} flex items-center justify-center shadow-md`}>
              {renderCategoryIcon(item.category)}
            </div>
          )}

          {/* Small badge overlay for avatar */}
          {item.avatarUrl && (
            <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full ${getCategoryBg(item.category)} flex items-center justify-center border-2 border-white shadow-xs`}>
              {renderCategoryIcon(item.category)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">{item.title}</h3>
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">{item.timeAgo}</span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed break-words">{item.body}</p>
        </div>

        {/* Unread Indicator Dot & Delete button */}
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {!item.read && (
            <span className="w-2.5 h-2.5 rounded-full bg-[#0066FF] shadow-xs shrink-0" />
          )}
          <button
            onClick={(e) => handleDeleteNotification(item.id, e)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
            title="Delete notification"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }
};
