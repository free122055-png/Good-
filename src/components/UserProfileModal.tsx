import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  MoreVertical,
  Camera,
  User,
  MapPin,
  Link as LinkIcon,
  ChevronRight,
  LayoutGrid,
  Check,
  Play,
  Heart,
  Briefcase,
  Sparkles,
  Calendar,
  Clock,
  ShieldCheck,
  X,
  Share2,
  Copy,
  Settings,
  Flag,
  Send,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { VideoItem } from '../data/mockData';
import { loadUserVideosFromFirestore, deleteVideoPermanent } from '../services/videoService';
import { sendOneSignalPush } from '../services/oneSignalService';
import { registerBackHandler } from '../services/backNavigationService';
import { toggleFollowUser } from '../services/followService';
import { getSessionUser } from '../services/authService';
import { BlueBadgeIcon } from './BlueBadgeModal';
import { UserAvatar } from './UserAvatar';

export interface UserProfileData {
  id: string;
  name: string;
  username: string;
  avatarUrl: string;
  profession: string;
  bio: string;
  shortDescription: string;
  personalIdentity: string;
  hobbies: string;
  location?: string;
  website?: string;
  dob?: string;
  joinedDate: string;
  postsCount: string;
  followersCount: string;
  followingCount: string;
  isFollowing?: boolean;
}

export const CURRENT_LOGGED_IN_USER: UserProfileData = {
  id: 'current-user-rajibul',
  name: 'Rajibul Islam',
  username: 'rajibul_islam_fahim',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
  profession: 'Pro Creator / Video Producer',
  bio: 'Content Creator & Visual Storyteller on BINISTA 🎥✨',
  shortDescription: 'Creating aesthetic short films & reels for the BINISTA community',
  personalIdentity: 'Filmmaker, Visual Artist & Digital Creator',
  hobbies: 'Photography, Traveling, Cinematic Videography, Tech',
  location: 'Dhaka, Bangladesh',
  website: 'https://binista.app/rajibul',
  dob: '15 August 1998',
  joinedDate: 'Joined 2 months ago',
  postsCount: '12',
  followersCount: '245',
  followingCount: '18',
  isFollowing: false,
};

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVideo: (video: VideoItem) => void;
  onOpenSettings?: () => void;
  user?: UserProfileData | null;
}

import { useUser } from '../contexts/UserContext';

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  onSelectVideo,
  onOpenSettings,
  user,
}) => {
  const { currentUser: sessionUser, updateUserProfile } = useUser();
  
  // Determine if this profile belongs to the logged-in user
  const activeUser = user || sessionUser || CURRENT_LOGGED_IN_USER;
  const activeUserId = (activeUser as any).uid || (activeUser as any).id || 'current-user-rajibul';
  const sessionUserId = sessionUser?.uid || (sessionUser as any)?.id;

  const isOwnProfile =
    !user ||
    (sessionUser && (activeUserId === sessionUserId || activeUser.username === sessionUser.username));

  const [activeTab, setActiveTab] = useState<'reels' | 'story'>('reels');
  const [isFollowing, setIsFollowing] = useState(!!(activeUser as any)?.isFollowing);

  // Sync following status from session data
  useEffect(() => {
    if (sessionUser && sessionUser.following && activeUserId) {
       setIsFollowing(sessionUser.following.includes(activeUserId));
    } else {
       setIsFollowing(!!(activeUser as any)?.isFollowing);
    }
  }, [sessionUser, activeUserId, (activeUser as any)?.isFollowing]);

  // Dedicated Full-Screen Edit Profile Screen State
  const [isEditingScreenOpen, setIsEditingScreenOpen] = useState(false);

  // Editable fields for own profile
  const [avatarUrl, setAvatarUrl] = useState(activeUser.avatarUrl || '');
  const [name, setName] = useState(activeUser.name || '');
  const [username, setUsername] = useState(activeUser.username || '');
  const [bio, setBio] = useState(activeUser.bio || '');
  const [profession, setProfession] = useState(activeUser.profession || '');
  const [personalIdentity, setPersonalIdentity] = useState(activeUser.personalIdentity || '');
  const [hobbies, setHobbies] = useState(activeUser.hobbies || '');
  const [shortDescription, setShortDescription] = useState(activeUser.shortDescription || '');
  const [location, setLocation] = useState(activeUser.location || 'Dhaka, Bangladesh');
  const [website, setWebsite] = useState(activeUser.website || 'https://binista.app/rajibul');
  const [dob, setDob] = useState(activeUser.dob || '15 August 1998');
  const [joinedDate, setJoinedDate] = useState(activeUser.joinedDate || 'Joined recently');

  // Keep state in sync whenever activeUser changes or modal opens
  useEffect(() => {
    if (activeUser) {
      setAvatarUrl(activeUser.avatarUrl || '');
      setName(activeUser.name || '');
      setUsername(activeUser.username || '');
      setBio(activeUser.bio || '');
      setProfession(activeUser.profession || '');
      setPersonalIdentity(activeUser.personalIdentity || '');
      setHobbies(activeUser.hobbies || '');
      setShortDescription(activeUser.shortDescription || '');
      setLocation(activeUser.location || 'Dhaka, Bangladesh');
      setWebsite(activeUser.website || 'https://binista.app/rajibul');
      setDob(activeUser.dob || '15 August 1998');
      setJoinedDate(activeUser.joinedDate || 'Joined recently');
    }
  }, [activeUser, isOpen]);

  // Accordion drawer for info sections
  const [activeInfoDrawer, setActiveInfoDrawer] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);

  // 3-Dots Menu & Report Modal States
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Spam or Scam');
  const [reportDetail, setReportDetail] = useState('');
  const [userVideos, setUserVideos] = useState<VideoItem[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState<boolean>(true);

  const fetchUserVideos = useCallback(async () => {
    if (!activeUserId) return;
    setIsLoadingVideos(true);
    try {
      const list = await loadUserVideosFromFirestore(activeUserId);
      setUserVideos(list);
    } catch (err) {
      console.error('Failed to load user videos from Firestore:', err);
    } finally {
      setIsLoadingVideos(false);
    }
  }, [activeUserId]);

  useEffect(() => {
    if (isOpen) {
      fetchUserVideos();
    }
  }, [isOpen, fetchUserVideos]);

  // Android Back Button / Gesture Navigation Stack Handler for User Profile
  React.useEffect(() => {
    if (!isOpen) return;

    const unregister = registerBackHandler(() => {
      if (isReportModalOpen) {
        setIsReportModalOpen(false);
        return true;
      }
      if (isMoreMenuOpen) {
        setIsMoreMenuOpen(false);
        return true;
      }
      if (isEditingScreenOpen) {
        setIsEditingScreenOpen(false);
        return true;
      }
      onClose();
      return true;
    });

    return () => unregister();
  }, [isOpen, isReportModalOpen, isMoreMenuOpen, isEditingScreenOpen, onClose]);

  if (!isOpen) return null;

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 2500);
  };

  const handleShareProfile = () => {
    setIsMoreMenuOpen(false);
    if (navigator.share) {
      navigator
        .share({
          title: `${isOwnProfile ? name : activeUser.name} on BINISTA`,
          text: `Check out ${isOwnProfile ? name : activeUser.name}'s profile on BINISTA!`,
          url: `https://binista.app/u/@${isOwnProfile ? username : activeUser.username}`,
        })
        .catch(() => {});
    }
    triggerToast('Profile shared successfully! 🚀');
  };

  const handleCopyProfileLink = () => {
    setIsMoreMenuOpen(false);
    const link = `https://binista.app/u/@${isOwnProfile ? username : activeUser.username}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link);
    }
    triggerToast('Profile link copied to clipboard! 📋');
  };

  const handleOpenProfileSettings = () => {
    setIsMoreMenuOpen(false);
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      triggerToast('Opening Profile Settings...');
    }
  };

  const handleOpenReportProblem = () => {
    setIsMoreMenuOpen(false);
    setIsReportModalOpen(true);
  };

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsReportModalOpen(false);
    setReportDetail('');
    triggerToast('Report submitted! Our team will review within 24 hours. Thank you! 🙏');
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isOwnProfile) {
      const newUrl = URL.createObjectURL(file);
      setAvatarUrl(newUrl);
      try {
        await updateUserProfile({ avatarUrl: newUrl });
        triggerToast('Profile photo updated!');
      } catch (err) {
        triggerToast('Failed to save profile photo');
      }
    }
  };

  const handleToggleFollow = async () => {
    if (!sessionUser || !sessionUserId) {
      triggerToast('Please login to follow users');
      return;
    }

    const targetUserId = activeUserId;
    const currentlyFollowing = isFollowing;

    try {
      setIsFollowing(!currentlyFollowing); // Optimistic update
      await toggleFollowUser(sessionUserId, targetUserId, currentlyFollowing);
      
      const msg = !currentlyFollowing 
        ? `You are now following ${activeUser.name}` 
        : `Unfollowed ${activeUser.name}`;
      triggerToast(msg);

      if (!currentlyFollowing) {
        sendOneSignalPush({
          title: '👤 BINISTA New Follower',
          body: `${sessionUser.name} আপনাকে ফলো করতে শুরু করেছেন!`,
          targetUid: targetUserId,
          type: 'follower',
        } as any);
      }
    } catch (err) {
      setIsFollowing(currentlyFollowing); // Rollback
      triggerToast('Unable to update follow status');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isOwnProfile) return;
    
    try {
      await updateUserProfile({
        name,
        username,
        bio,
        profession,
        personalIdentity,
        hobbies,
        shortDescription,
        location,
        website,
        dob
      });
      setIsEditingScreenOpen(false);
      triggerToast('All profile changes saved successfully!');
    } catch (err) {
      triggerToast('Failed to save profile changes');
    }
  };

  // userVideos and fetchUserVideos moved to top hooks block

  const handleDeleteVideo = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('আপনি কি নিশ্চিত যে আপনি এই ভিডিওটি স্থায়ীভাবে মুছে ফেলতে চান?')) return;
    try {
      const targetUid = sessionUser?.uid || activeUserId || 'guest_creator';
      await deleteVideoPermanent(targetUid, videoId);
      setUserVideos((prev) => prev.filter((v) => v.id !== videoId));
      triggerToast('রিলটি স্থায়ীভাবে মুছে ফেলা হয়েছে');
    } catch (err: any) {
      triggerToast('মুছে ফেলতে সমস্যা হয়েছে: ' + (err.message || 'Error'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white text-slate-900 flex flex-col p-4 sm:p-5 overflow-y-auto no-scrollbar select-none animate-in fade-in duration-200">
      <div className="max-w-md mx-auto w-full flex flex-col gap-4 pb-12 relative">
        
        {/* Toast Notification */}
        {showToast && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2 border border-white/20 animate-in slide-in-from-top-3">
            <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
            <span>{showToast}</span>
          </div>
        )}

        {/* ========================================================= */}
        {/* SCREEN 1: DEDICATED FULL-SCREEN EDIT PROFILE PAGE          */}
        {/* ========================================================= */}
        {isEditingScreenOpen ? (
          <div className="min-h-screen w-full flex flex-col justify-between bg-white animate-in slide-in-from-right duration-200 pb-12">
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
              
              {/* Top Header Bar for Edit Profile */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 sticky top-0 bg-white z-20 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingScreenOpen(false)}
                  className="p-1 -ml-1 text-slate-900 hover:opacity-70 transition-opacity cursor-pointer flex items-center gap-1 font-bold text-sm"
                  aria-label="Cancel"
                >
                  <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
                  <span>Cancel</span>
                </button>

                <h1 className="font-extrabold text-lg text-slate-900 tracking-tight">
                  Edit Profile
                </h1>

                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#0066FF] hover:bg-blue-700 text-white font-extrabold text-xs rounded-full shadow-xs transition-colors cursor-pointer"
                >
                  Save
                </button>
              </div>

              {/* Avatar Photo Section in Edit Profile Page */}
              <div className="flex flex-col items-center justify-center my-2">
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="w-24 h-24 rounded-full object-cover shadow-md border-2 border-white ring-2 ring-gray-200"
                  />
                  <label
                    htmlFor="full-screen-avatar-upload"
                    className="absolute bottom-0 right-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center border-2 border-white shadow-lg cursor-pointer transition-transform active:scale-90"
                    title="Change profile photo"
                  >
                    <Camera className="w-4 h-4" />
                    <input
                      id="full-screen-avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <label
                  htmlFor="full-screen-avatar-upload"
                  className="mt-2.5 text-xs font-extrabold text-[#0066FF] hover:underline cursor-pointer"
                >
                  Change Profile Photo
                </label>
              </div>

              {/* Form Input Fields (All 10 Editable Information Sections) */}
              <div className="flex flex-col gap-4 bg-[#f8fafc] p-4 rounded-2xl border border-slate-100">
                
                <div>
                  <label className="text-xs font-extrabold text-gray-700 block mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-slate-900 text-xs font-bold rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-black shadow-2xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-gray-700 block mb-1">
                    Username (@handle)
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-[#0066FF] text-xs font-bold rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-black shadow-2xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-gray-700 block mb-1">
                    Bio / Headline
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={2}
                    className="w-full bg-white border border-gray-200 text-slate-900 text-xs font-semibold rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-black shadow-2xs leading-relaxed"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-gray-700 block mb-1">
                    Profession
                  </label>
                  <input
                    type="text"
                    value={profession}
                    onChange={(e) => setProfession(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-slate-900 text-xs font-bold rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-black shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-gray-700 block mb-1">
                    About / Personal Identity
                  </label>
                  <input
                    type="text"
                    value={personalIdentity}
                    onChange={(e) => setPersonalIdentity(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-slate-900 text-xs font-medium rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-black shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-gray-700 block mb-1">
                    Interests & Hobbies
                  </label>
                  <input
                    type="text"
                    value={hobbies}
                    onChange={(e) => setHobbies(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-slate-900 text-xs font-medium rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-black shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-gray-700 block mb-1">
                    Short Personal Description
                  </label>
                  <input
                    type="text"
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-slate-900 text-xs font-medium rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-black shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-gray-700 block mb-1">
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-slate-900 text-xs font-medium rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-black shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-gray-700 block mb-1">
                    Website (Optional)
                  </label>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-blue-600 text-xs font-medium rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-black shadow-2xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-extrabold text-gray-700 block mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="text"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-white border border-gray-200 text-slate-900 text-xs font-medium rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-black shadow-2xs"
                  />
                </div>

              </div>

              {/* Submit Save Button */}
              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-black text-white font-extrabold text-sm shadow-md transition-all cursor-pointer text-center mt-2"
              >
                Save Profile Information
              </button>
            </form>
          </div>
        ) : (
          /* ========================================================= */
          /* SCREEN 2: MAIN BINISTA PROFILE VIEW (Exact match)          */
          /* ========================================================= */
          <>
            {/* Top Header */}
            <div className="flex items-center justify-between pt-1 pb-2 relative z-30">
              <button
                onClick={onClose}
                className="p-1 -ml-1 text-slate-900 hover:opacity-70 transition-opacity cursor-pointer"
                aria-label="Back"
              >
                <ChevronLeft className="w-7 h-7 stroke-[2.2]" />
              </button>

              <h1 className="font-extrabold text-xl text-slate-900 tracking-tight">
                Profile
              </h1>

              {/* 3-Dots Button */}
              <div className="relative">
                <button
                  onClick={() => setIsMoreMenuOpen((prev) => !prev)}
                  className="p-1 -mr-1 text-slate-900 hover:opacity-70 transition-opacity cursor-pointer rounded-full active:bg-gray-100"
                  aria-label="More options"
                >
                  <MoreVertical className="w-6 h-6 stroke-[2.2]" />
                </button>

                {/* 3-Dots Floating Dropdown Menu (Exact 4 options requested) */}
                {isMoreMenuOpen && (
                  <>
                    {/* Backdrop to close */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsMoreMenuOpen(false)}
                    />

                    <div className="absolute right-0 top-9 z-50 w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-100 p-2 flex flex-col gap-1 animate-in fade-in zoom-in-95 duration-150">
                      
                      {/* Option 1: Share Profile */}
                      <button
                        onClick={handleShareProfile}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-100/80 text-slate-800 font-bold text-xs transition-colors cursor-pointer text-left"
                      >
                        <Share2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>Share Profile</span>
                      </button>

                      {/* Option 2: Copy Profile Link */}
                      <button
                        onClick={handleCopyProfileLink}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-100/80 text-slate-800 font-bold text-xs transition-colors cursor-pointer text-left"
                      >
                        <Copy className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Copy Profile Link</span>
                      </button>

                      {/* Option 3: Profile Settings */}
                      <button
                        onClick={handleOpenProfileSettings}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-100/80 text-slate-800 font-bold text-xs transition-colors cursor-pointer text-left"
                      >
                        <Settings className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>Profile Settings</span>
                      </button>

                      <div className="h-px bg-slate-100 my-0.5" />

                      {/* Option 4: Report a Problem */}
                      <button
                        onClick={handleOpenReportProblem}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-rose-50 text-rose-600 font-bold text-xs transition-colors cursor-pointer text-left"
                      >
                        <Flag className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Report a Problem</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Primary Info Header */}
            <div className="flex items-center gap-4 mt-1">
              {/* Avatar (with Camera Overlay Badge ONLY for Own Profile) */}
              <div className="relative shrink-0">
                <UserAvatar
                  src={isOwnProfile ? avatarUrl : activeUser.avatarUrl}
                  alt={isOwnProfile ? name : activeUser.name}
                  className="w-22 h-22 rounded-full object-cover shadow-sm border border-gray-200"
                />

                {/* Camera badge only on own profile */}
                {isOwnProfile && (
                  <label
                    htmlFor="profile-avatar-upload"
                    className="absolute bottom-0 right-0 w-7 h-7 bg-slate-800 hover:bg-slate-900 text-white rounded-full flex items-center justify-center border-2 border-white shadow-md cursor-pointer transition-transform active:scale-90"
                    title="Change profile photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <input
                      id="profile-avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Name, Username, Profession, Joined Date */}
              <div className="flex flex-col justify-center">
                <h2 className="font-extrabold text-xl text-slate-900 leading-tight flex items-center gap-1.5">
                  <span>{isOwnProfile ? name : activeUser.name}</span>
                  {((isOwnProfile && (sessionUser?.badgeDisplayEnabled !== false) && (sessionUser?.isVerified || sessionUser?.blueBadge || sessionUser?.personalIdentity?.includes('Verified') || sessionUser?.verificationStatus === 'approved')) || 
                   (!isOwnProfile && (activeUser as any).badgeDisplayEnabled !== false && (activeUser.personalIdentity?.includes('Verified') || (activeUser as any).isVerified || (activeUser as any).blueBadge))) && (
                    <BlueBadgeIcon className="w-5 h-5" />
                  )}
                </h2>
                <span className="text-sm font-semibold text-[#0066FF] mt-0.5">
                  @{isOwnProfile ? username : activeUser.username}
                </span>
                <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md inline-block w-fit mt-1">
                  {isOwnProfile ? profession : activeUser.profession}
                </span>
                <span className="text-xs font-normal text-gray-400 mt-1">
                  {joinedDate}
                </span>
              </div>
            </div>

            {/* Bio & Short Personal Description */}
            <div className="bg-[#f8fafc] border border-slate-100 rounded-2xl p-3.5 mt-1 flex flex-col gap-1">
              <p className="text-xs font-bold text-slate-900 leading-snug">
                {isOwnProfile ? bio : activeUser.bio}
              </p>
              <p className="text-[11px] font-normal text-gray-500 leading-relaxed">
                {isOwnProfile ? shortDescription : activeUser.shortDescription}
              </p>
            </div>

            {/* ACTION BUTTON AREA (Rule: Own Profile -> ONLY Edit Profile. Other User -> ONLY Follow) */}
            <div className="flex items-center gap-3">
              {isOwnProfile ? (
                /* OWN PROFILE: [ Edit Profile ] ONLY (Opens dedicated Full-Screen Edit Page) */
                <button
                  onClick={() => setIsEditingScreenOpen(true)}
                  className="w-full py-3 px-4 rounded-xl bg-[#f0f3f9] hover:bg-[#e4e9f3] text-slate-800 font-bold text-sm shadow-xs transition-all cursor-pointer text-center"
                >
                  Edit Profile
                </button>
              ) : (
                /* OTHER USER PROFILE: [ Follow ] ONLY */
                <button
                  onClick={handleToggleFollow}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm shadow-xs transition-all cursor-pointer text-center ${
                    isFollowing
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#1a202c] hover:bg-slate-800 text-white'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-around py-3 border-y border-gray-100 my-1">
              <div className="flex flex-col items-center">
                <span className="font-extrabold text-base text-slate-900 leading-tight">
                  {isLoadingVideos ? (activeUser.postsCount || '0') : userVideos.length.toString()}
                </span>
                <span className="text-xs text-gray-400 font-medium mt-0.5">
                  Posts
                </span>
              </div>

              <div className="h-7 w-px bg-gray-200" />

              <div className="flex flex-col items-center">
                <span className="font-extrabold text-base text-slate-900 leading-tight">
                  {activeUser.followersCount || '245'}
                </span>
                <span className="text-xs text-gray-400 font-medium mt-0.5">
                  Followers
                </span>
              </div>

              <div className="h-7 w-px bg-gray-200" />

              <div className="flex flex-col items-center">
                <span className="font-extrabold text-base text-slate-900 leading-tight">
                  {activeUser.followingCount || '18'}
                </span>
                <span className="text-xs text-gray-400 font-medium mt-0.5">
                  Following
                </span>
              </div>
            </div>

            {/* All Info Items */}
            <div className="flex flex-col divide-y divide-gray-100">
              
              {/* About / Personal Identity */}
              <div>
                <button
                  onClick={() =>
                    setActiveInfoDrawer(activeInfoDrawer === 'identity' ? null : 'identity')
                  }
                  className="w-full flex items-center justify-between py-3.5 hover:bg-gray-50 px-1 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-slate-700 stroke-[2]" />
                    <span className="font-bold text-sm text-slate-800">
                      About / Personal Identity
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                {activeInfoDrawer === 'identity' && (
                  <div className="p-3 bg-gray-50 text-xs text-slate-800 font-medium rounded-xl mb-2">
                    {isOwnProfile ? personalIdentity : activeUser.personalIdentity}
                  </div>
                )}
              </div>

              {/* Profession */}
              <div>
                <button
                  onClick={() =>
                    setActiveInfoDrawer(activeInfoDrawer === 'profession' ? null : 'profession')
                  }
                  className="w-full flex items-center justify-between py-3.5 hover:bg-gray-50 px-1 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-slate-700 stroke-[2]" />
                    <span className="font-bold text-sm text-slate-800">
                      Profession
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                {activeInfoDrawer === 'profession' && (
                  <div className="p-3 bg-gray-50 text-xs text-slate-800 font-medium rounded-xl mb-2">
                    💼 {isOwnProfile ? profession : activeUser.profession}
                  </div>
                )}
              </div>

              {/* Interests & Hobbies */}
              <div>
                <button
                  onClick={() =>
                    setActiveInfoDrawer(activeInfoDrawer === 'hobbies' ? null : 'hobbies')
                  }
                  className="w-full flex items-center justify-between py-3.5 hover:bg-gray-50 px-1 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-slate-700 stroke-[2]" />
                    <span className="font-bold text-sm text-slate-800">
                      Interests & Hobbies
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                {activeInfoDrawer === 'hobbies' && (
                  <div className="p-3 bg-gray-50 text-xs text-slate-800 font-medium rounded-xl mb-2">
                    🎨 {isOwnProfile ? hobbies : activeUser.hobbies}
                  </div>
                )}
              </div>

              {/* Location */}
              <div>
                <button
                  onClick={() =>
                    setActiveInfoDrawer(activeInfoDrawer === 'location' ? null : 'location')
                  }
                  className="w-full flex items-center justify-between py-3.5 hover:bg-gray-50 px-1 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-slate-700 stroke-[2]" />
                    <span className="font-bold text-sm text-slate-800">
                      Location
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                {activeInfoDrawer === 'location' && (
                  <div className="p-3 bg-gray-50 text-xs text-slate-800 font-medium rounded-xl mb-2">
                    📍 {isOwnProfile ? location : activeUser.location || 'Dhaka, Bangladesh'}
                  </div>
                )}
              </div>

              {/* Website */}
              <div>
                <button
                  onClick={() =>
                    setActiveInfoDrawer(activeInfoDrawer === 'website' ? null : 'website')
                  }
                  className="w-full flex items-center justify-between py-3.5 hover:bg-gray-50 px-1 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <LinkIcon className="w-5 h-5 text-slate-700 stroke-[2]" />
                    <span className="font-bold text-sm text-slate-800">
                      Website
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                {activeInfoDrawer === 'website' && (
                  <div className="p-3 bg-gray-50 text-xs text-blue-600 underline rounded-xl mb-2">
                    🔗 {isOwnProfile ? website : activeUser.website || 'https://binista.app/user'}
                  </div>
                )}
              </div>

              {/* Date of Birth */}
              <div>
                <button
                  onClick={() =>
                    setActiveInfoDrawer(activeInfoDrawer === 'dob' ? null : 'dob')
                  }
                  className="w-full flex items-center justify-between py-3.5 hover:bg-gray-50 px-1 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-slate-700 stroke-[2]" />
                    <span className="font-bold text-sm text-slate-800">
                      Date of Birth
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                {activeInfoDrawer === 'dob' && (
                  <div className="p-3 bg-gray-50 text-xs text-slate-800 font-medium rounded-xl mb-2">
                    🎂 {isOwnProfile ? dob : activeUser.dob || '15 August 1998'}
                  </div>
                )}
              </div>

              {/* Joined Date */}
              <div>
                <button
                  onClick={() =>
                    setActiveInfoDrawer(activeInfoDrawer === 'joined' ? null : 'joined')
                  }
                  className="w-full flex items-center justify-between py-3.5 hover:bg-gray-50 px-1 rounded-xl transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-slate-700 stroke-[2]" />
                    <span className="font-bold text-sm text-slate-800">
                      Member Joined Date
                    </span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
                {activeInfoDrawer === 'joined' && (
                  <div className="p-3 bg-gray-50 text-xs text-slate-800 font-medium rounded-xl mb-2">
                    🗓️ {joinedDate}
                  </div>
                )}
              </div>
            </div>

            {/* Security Notice Card (ONLY shown on own profile) */}
            {isOwnProfile && (
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3 flex items-center justify-between my-2">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-extrabold text-xs text-slate-900">
                      Email & Phone Secured
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Hidden from public profile for privacy
                    </span>
                  </div>
                </div>

                {onOpenSettings && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSettings();
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    Account Security
                  </button>
                )}
              </div>
            )}

            {/* Tabs Section (Reels & Story) */}
            <div className="flex items-center border-b border-gray-200 mt-2">
              <button
                onClick={() => setActiveTab('reels')}
                className={`flex-1 py-3 flex items-center justify-center gap-2 font-extrabold text-sm relative transition-colors cursor-pointer ${
                  activeTab === 'reels' ? 'text-[#FF2D55]' : 'text-slate-900 hover:opacity-80'
                }`}
              >
                <LayoutGrid className="w-4 h-4 text-[#FF2D55]" />
                <span>Reels</span>
                {activeTab === 'reels' && (
                  <div className="absolute bottom-0 inset-x-8 h-[2.5px] bg-[#FF2D55] rounded-full" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('story')}
                className={`flex-1 py-3 flex items-center justify-center gap-2 font-extrabold text-sm relative transition-colors cursor-pointer ${
                  activeTab === 'story' ? 'text-[#FF2D55]' : 'text-slate-900 hover:opacity-80'
                }`}
              >
                <span>Story</span>
                {activeTab === 'story' && (
                  <div className="absolute bottom-0 inset-x-8 h-[2.5px] bg-[#FF2D55] rounded-full" />
                )}
              </button>
            </div>

            {/* Media Grid */}
            <div className="pt-2">
              {isLoadingVideos ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0066FF]" />
                  <span className="text-xs font-semibold">ভিডিও লোড হচ্ছে...</span>
                </div>
              ) : userVideos.length === 0 ? (
                <div className="py-16 px-4 flex flex-col items-center justify-center text-center bg-slate-50/80 rounded-3xl border border-slate-100 my-2">
                  <div className="w-14 h-14 rounded-full bg-slate-200/70 flex items-center justify-center text-slate-500 mb-2.5">
                    <LayoutGrid className="w-6 h-6 stroke-[2]" />
                  </div>
                  <h3 className="font-extrabold text-sm text-slate-800">কোনো রিল পাওয়া যায়নি</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-[220px] leading-relaxed">
                    {isOwnProfile
                      ? 'আপনার প্রথম ভিডিও আপলোড করতে স্ক্রিনের নিচের (+) বাটনে ট্যাপ করুন।'
                      : 'এই ক্রিয়েটর এখনো কোনো ভিডিও শেয়ার করেননি।'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3.5 items-start">
                  {userVideos.map((reel) => (
                    <div
                      key={reel.id}
                      onClick={() => {
                        onSelectVideo(reel);
                        onClose();
                      }}
                      className="relative w-full rounded-[24px] overflow-hidden bg-slate-900 shadow-sm cursor-pointer group border border-slate-100 select-none"
                      style={{
                        aspectRatio: `${reel.aspectRatio || 0.75}`,
                      }}
                    >
                      <img
                        src={reel.thumbnailUrl || reel.videoUrl}
                        alt={reel.title}
                        className="w-full h-full block object-contain group-hover:scale-105 transition-transform duration-300"
                        style={{
                          aspectRatio: `${reel.aspectRatio || 0.75}`,
                        }}
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/15 group-hover:bg-black/25 transition-colors pointer-events-none" />

                      {/* Play Icon */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/30 group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                        </div>
                      </div>

                      {/* Delete button for own profile */}
                      {isOwnProfile && (
                        <button
                          onClick={(e) => handleDeleteVideo(reel.id, e)}
                          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 text-white flex items-center justify-center transition-colors shadow-md z-10"
                          title="Delete reel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Likes count & caption */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-[11px] font-bold drop-shadow-md">
                        <span className="truncate max-w-[90px] drop-shadow-sm">{reel.title}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span>{reel.likesCount || '0'}</span>
                          <Heart className="w-3 h-3 fill-[#FF2D55] text-[#FF2D55]" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ========================================================= */}
        {/* REPORT A PROBLEM MODAL OVERLAY                            */}
        {/* ========================================================= */}
        {isReportModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white text-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200 p-5 flex flex-col gap-4">
              
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <Flag className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      Report a Problem
                    </h3>
                    <p className="text-[11px] font-medium text-gray-500">
                      Report @{isOwnProfile ? username : activeUser.username}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-slate-900 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleReportSubmit} className="flex flex-col gap-3.5">
                <div>
                  <label className="text-xs font-extrabold text-slate-800 block mb-1.5">
                    Select Problem Category
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {[
                      'Spam or Scam',
                      'Inappropriate Content',
                      'Impersonation / Fake Account',
                      'Harassment or Hate Speech',
                      'Intellectual Property Violation',
                    ].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setReportReason(cat)}
                        className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold text-left transition-all flex items-center justify-between cursor-pointer ${
                          reportReason === cat
                            ? 'bg-rose-50 border border-rose-200 text-rose-700'
                            : 'bg-gray-50 hover:bg-gray-100 text-slate-700 border border-transparent'
                        }`}
                      >
                        <span>{cat}</span>
                        {reportReason === cat && (
                          <div className="w-2 h-2 rounded-full bg-rose-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-extrabold text-slate-800 block mb-1">
                    Details / Additional Information
                  </label>
                  <textarea
                    value={reportDetail}
                    onChange={(e) => setReportDetail(e.target.value)}
                    placeholder="Describe the issue in detail..."
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-200 text-xs text-slate-900 font-medium rounded-xl p-3 focus:outline-none focus:border-rose-500"
                    required
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Report</span>
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

      </div>
    </div>
  );
};
