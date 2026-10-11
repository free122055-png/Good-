import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Bell,
  Volume2,
  Vibrate,
  Smartphone,
  Users,
  Heart,
  MessageSquare,
  AtSign,
  Send,
  ShieldCheck,
  Award,
  Sparkles,
  Lock,
  Moon,
  Trash2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserData } from '../services/authService';

interface NotificationSettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserData | null;
  triggerToast: (msg: string) => void;
}

export const NotificationSettingsPage: React.FC<NotificationSettingsPageProps> = ({
  isOpen,
  onClose,
  currentUser,
  triggerToast,
}) => {
  const [settings, setSettings] = useState({
    allNotifications: true,
    pushNotifications: true,
    inAppNotifications: true,
    sound: true,
    vibration: true,
    friendRequests: true,
    friendAccepted: true,
    reactions: true,
    comments: true,
    commentReplies: true,
    mentions: true,
    newMessages: true,
    messagePreview: true,
    groupMessages: true,
    blueBadgeUpdates: true,
    officialAnnouncements: true,
    securityAlerts: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !currentUser || !db) return;
    const fetchSettings = async () => {
      try {
        const ref = doc(db, 'users', currentUser.uid, 'settings', 'notifications');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setSettings((prev) => ({ ...prev, ...snap.data() }));
        }
      } catch (err) {
        console.warn('Could not load notification settings:', err);
      }
    };
    fetchSettings();
  }, [isOpen, currentUser]);

  const handleToggle = async (key: keyof typeof settings) => {
    const updated = { ...settings, [key]: !settings[key as keyof typeof settings] };
    setSettings(updated);

    if (currentUser && db) {
      try {
        setIsSaving(true);
        const ref = doc(db, 'users', currentUser.uid, 'settings', 'notifications');
        await setDoc(ref, updated, { merge: true });
        triggerToast('Settings updated successfully');
      } catch (err) {
        console.warn('Failed to save settings:', err);
        triggerToast('Failed to save settings');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleTimeChange = async (key: 'quietHoursStart' | 'quietHoursEnd', val: string) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    if (currentUser && db) {
      try {
        const ref = doc(db, 'users', currentUser.uid, 'settings', 'notifications');
        await setDoc(ref, updated, { merge: true });
      } catch (e) {}
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white text-slate-900 flex flex-col overflow-y-auto select-none animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3.5 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-800 transition cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <h1 className="text-base sm:text-lg font-extrabold text-slate-900">Notification Settings</h1>
        </div>
        {isSaving && (
          <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full animate-pulse">
            Saving...
          </span>
        )}
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto w-full p-4 sm:p-6 space-y-6 pb-20">
        
        {/* GENERAL SETTINGS */}
        <div className="space-y-3">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-1">General Settings</h2>
          <div className="bg-slate-50/80 rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
            <ToggleItem
              icon={<Bell className="w-4 h-4 text-blue-600" />}
              title="All Notifications"
              description="Enable or disable general notifications"
              checked={settings.allNotifications}
              onChange={() => handleToggle('allNotifications')}
            />
            <ToggleItem
              icon={<Smartphone className="w-4 h-4 text-purple-600" />}
              title="Push Notifications"
              description="Receive alerts on your device"
              checked={settings.pushNotifications}
              onChange={() => handleToggle('pushNotifications')}
            />
            <ToggleItem
              icon={<Sparkles className="w-4 h-4 text-amber-600" />}
              title="In-App Notifications"
              description="Show in BINISTA notification center"
              checked={settings.inAppNotifications}
              onChange={() => handleToggle('inAppNotifications')}
            />
            <ToggleItem
              icon={<Volume2 className="w-4 h-4 text-emerald-600" />}
              title="Notification Sound"
              description="Play sound for alerts"
              checked={settings.sound}
              onChange={() => handleToggle('sound')}
            />
            <ToggleItem
              icon={<Vibrate className="w-4 h-4 text-indigo-600" />}
              title="Vibration"
              description="Vibrate on new notifications"
              checked={settings.vibration}
              onChange={() => handleToggle('vibration')}
            />
          </div>
        </div>

        {/* SOCIAL NOTIFICATIONS */}
        <div className="space-y-3">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-1">Social Activities</h2>
          <div className="bg-slate-50/80 rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
            <ToggleItem
              icon={<Users className="w-4 h-4 text-blue-600" />}
              title="Friend Requests"
              description="When someone sends you a friend request"
              checked={settings.friendRequests}
              onChange={() => handleToggle('friendRequests')}
            />
            <ToggleItem
              icon={<Users className="w-4 h-4 text-emerald-600" />}
              title="Friend Request Accepted"
              description="When someone accepts your friend request"
              checked={settings.friendAccepted}
              onChange={() => handleToggle('friendAccepted')}
            />
            <ToggleItem
              icon={<Heart className="w-4 h-4 text-rose-600" />}
              title="Reactions"
              description="When someone reacts to your post, photo or video"
              checked={settings.reactions}
              onChange={() => handleToggle('reactions')}
            />
            <ToggleItem
              icon={<MessageSquare className="w-4 h-4 text-blue-600" />}
              title="Comments"
              description="When someone comments on your content"
              checked={settings.comments}
              onChange={() => handleToggle('comments')}
            />
            <ToggleItem
              icon={<MessageSquare className="w-4 h-4 text-indigo-600" />}
              title="Comment Replies"
              description="When someone replies to your comment"
              checked={settings.commentReplies}
              onChange={() => handleToggle('commentReplies')}
            />
            <ToggleItem
              icon={<AtSign className="w-4 h-4 text-violet-600" />}
              title="Mentions"
              description="When someone tags or mentions you"
              checked={settings.mentions}
              onChange={() => handleToggle('mentions')}
            />
          </div>
        </div>

        {/* MESSENGER NOTIFICATIONS */}
        <div className="space-y-3">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-1">Messenger</h2>
          <div className="bg-slate-50/80 rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
            <ToggleItem
              icon={<Send className="w-4 h-4 text-blue-600" />}
              title="New Message Notifications"
              description="Alerts for direct chats"
              checked={settings.newMessages}
              onChange={() => handleToggle('newMessages')}
            />
            <ToggleItem
              icon={<MessageSquare className="w-4 h-4 text-emerald-600" />}
              title="Message Preview"
              description="Show message snippet in notifications"
              checked={settings.messagePreview}
              onChange={() => handleToggle('messagePreview')}
            />
            <ToggleItem
              icon={<Users className="w-4 h-4 text-amber-600" />}
              title="Group Message Notifications"
              description="Alerts from group conversations"
              checked={settings.groupMessages}
              onChange={() => handleToggle('groupMessages')}
            />
          </div>
        </div>

        {/* BLUE BADGE & OFFICIAL */}
        <div className="space-y-3">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-1">Verification & Official</h2>
          <div className="bg-slate-50/80 rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
            <ToggleItem
              icon={<Award className="w-4 h-4 text-[#0066FF]" />}
              title="Blue Badge Updates"
              description="Verification request status and badge alerts"
              checked={settings.blueBadgeUpdates}
              onChange={() => handleToggle('blueBadgeUpdates')}
            />
            <ToggleItem
              icon={<Sparkles className="w-4 h-4 text-purple-600" />}
              title="BINISTA Official Announcements"
              description="Important platform updates and feature launches"
              checked={settings.officialAnnouncements}
              onChange={() => handleToggle('officialAnnouncements')}
            />
          </div>
        </div>

        {/* SECURITY */}
        <div className="space-y-3">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-1">Security & Privacy</h2>
          <div className="bg-slate-50/80 rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
            <ToggleItem
              icon={<ShieldCheck className="w-4 h-4 text-emerald-600" />}
              title="Security & Login Alerts"
              description="New device logins and password changes (High priority)"
              checked={settings.securityAlerts}
              onChange={() => handleToggle('securityAlerts')}
            />
          </div>
        </div>

        {/* QUIET HOURS */}
        <div className="space-y-3">
          <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-1">Quiet Hours / Do Not Disturb</h2>
          <div className="bg-slate-50/80 rounded-2xl border border-slate-100 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Moon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">Enable Quiet Hours</h3>
                  <p className="text-[11px] text-slate-500">Mute non-urgent push notifications during set times</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle('quietHoursEnabled')}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.quietHoursEnabled ? 'bg-[#0066FF]' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    settings.quietHoursEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {settings.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={settings.quietHoursStart}
                    onChange={(e) => handleTimeChange('quietHoursStart', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">End Time</label>
                  <input
                    type="time"
                    value={settings.quietHoursEnd}
                    onChange={(e) => handleTimeChange('quietHoursEnd', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

interface ToggleItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

const ToggleItem: React.FC<ToggleItemProps> = ({ icon, title, description, checked, onChange }) => {
  return (
    <div className="p-4 flex items-center justify-between gap-4 hover:bg-white/60 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">{title}</h3>
          <p className="text-[11px] text-slate-500 leading-snug">{description}</p>
        </div>
      </div>
      <button
        onClick={onChange}
        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 cursor-pointer ${
          checked ? 'bg-[#0066FF]' : 'bg-slate-300'
        }`}
        aria-label={title}
      >
        <div
          className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
};
