import React, { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, X, ShieldAlert } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { UserData } from '../services/authService';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  targetType: 'all' | 'verified' | 'subscribers' | 'non_verified' | 'specific';
  targetUid?: string;
  createdAt: string;
  timestamp: number;
  read?: boolean;
}

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserData | null;
  triggerToast: (msg: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  triggerToast,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !db) return;
    setLoading(true);
    const q = query(collection(db, 'notifications'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allNotifs: NotificationItem[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as any;
        allNotifs.push({
          id: d.id,
          title: data.title || 'Notification',
          body: data.body || '',
          targetType: data.targetType || 'all',
          targetUid: data.targetUid,
          createdAt: data.createdAt || new Date().toISOString(),
          timestamp: data.timestamp || Date.now(),
          read: data.read || false,
        });
      });

      allNotifs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      const isVerified = currentUser?.personalIdentity?.includes('Verified');
      const isSubscriber = (currentUser as any)?.isSubscribed || false;

      const filtered = allNotifs.filter((n) => {
        if (n.targetType === 'all') return true;
        if (n.targetType === 'verified' && isVerified) return true;
        if (n.targetType === 'subscribers' && isSubscriber) return true;
        if (n.targetType === 'non_verified' && !isVerified) return true;
        if (n.targetType === 'specific' && currentUser && n.targetUid === currentUser.uid) return true;
        return false;
      });

      setNotifications(filtered);
      setLoading(false);
    }, (err) => {
      console.warn('Failed to load notifications:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, currentUser]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const notifRef = doc(db, 'notifications', id);
      await updateDoc(notifRef, { read: true });
      triggerToast('Notification marked as read');
    } catch (e) {
      console.warn('Failed to mark read:', e);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      notifications.forEach((n) => {
        if (!n.read) {
          const ref = doc(db, 'notifications', n.id);
          batch.update(ref, { read: true });
        }
      });
      await batch.commit();
      triggerToast('All notifications marked as read');
    } catch (e) {
      console.warn('Failed to mark all read:', e);
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Notifications</h2>
              <p className="text-xs text-slate-500">BD STAR In-App Notification Center</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition cursor-pointer"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
          {loading ? (
            <div className="py-20 text-center text-slate-400 text-xs">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6 opacity-60" />
              </div>
              <p className="text-sm font-bold text-slate-700">No notifications yet</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">You're all caught up! Updates and announcements from BD STAR will appear here.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.read && handleMarkAsRead(n.id)}
                className={`p-4 rounded-2xl border transition cursor-pointer ${
                  n.read
                    ? 'bg-white border-slate-200/80 text-slate-700'
                    : 'bg-blue-50/60 border-blue-200 text-slate-900 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm">{n.title}</span>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.body}</p>
                    <p className="text-[10px] text-slate-400 pt-1">
                      {new Date(n.timestamp || n.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>

                  {!n.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMarkAsRead(n.id);
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:underline shrink-0 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
