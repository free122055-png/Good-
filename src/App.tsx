import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { StoriesSection } from './components/StoriesSection';
import { VideoGrid } from './components/VideoGrid';
import { BottomNav, NavTab } from './components/BottomNav';
import { VideoDetailView } from './components/VideoDetailView';
import { StoryViewerModal } from './components/StoryViewerModal';
import { CreateStoryFlowModal } from './components/CreateStoryFlowModal';
import { ReelUploadFlowModal } from './components/ReelUploadFlowModal';
import { PlusActionSheet } from './components/PlusActionSheet';
import { MenuDrawer } from './components/MenuDrawer';
import { SearchOverlay } from './components/SearchOverlay';
import { MessengerOverlay } from './components/MessengerOverlay';
import { SavesOverlay } from './components/SavesOverlay';
import { UserProfileModal, CURRENT_LOGGED_IN_USER, UserProfileData } from './components/UserProfileModal';
import { TrendingVideosModal } from './components/TrendingVideosModal';
import { SettingsModal } from './components/SettingsModal';
import { HelpSupportModal } from './components/HelpSupportModal';
import { AuthModal } from './components/AuthModal';
import { BlueBadgeModal } from './components/BlueBadgeModal';
import { SubscriptionManagementModal } from './components/SubscriptionManagementModal';
import { NotificationCenterPage } from './components/NotificationCenterPage';
import { NotificationSettingsPage } from './components/NotificationSettingsPage';
import { AdminPanel } from './components/AdminPanel';
import { BinistaAiCard } from './components/BinistaAiCard';
import { BinistaAiModal } from './components/BinistaAiModal';
import { requestNotificationPermissionAndGetToken, listenToForegroundFcmMessages } from './services/fcmService';
import { initOneSignal, requestOneSignalPermission } from './services/oneSignalService';
import { setupGlobalBackNavigation, registerBackHandler } from './services/backNavigationService';
import {
  UserData,
  getSessionUser,
  refreshSessionFromFirestore,
  clearSessionUser,
} from './services/authService';
import {
  loadPublicFeedVideos,
  loadPublicFeedVideosPaginated,
  listenToGlobalPublicVideos,
  deleteVideoPermanent,
  getCachedPublicFeedVideos,
} from './services/videoService';
import { db } from './firebase';
import { DocumentSnapshot, collection, query, orderBy, limit, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { StoryItem, VideoItem, STORIES_DATA, VIDEOS_DATA } from './data/mockData';
import { Check, Bell, X } from 'lucide-react';

import { useUser } from './contexts/UserContext';

export default function App() {
  const { currentUser, loading, logout } = useUser();
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [stories, setStories] = useState<StoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('binista_stories_v3');
      if (saved) {
        const parsed: StoryItem[] = JSON.parse(saved);
        const now = Date.now();
        const valid = parsed.filter(s => s.isCreate || !s.expiresAt || s.expiresAt > now);
        if (valid.length > 0) return valid;
      }
    } catch (e) {
      console.error('Error loading stories:', e);
    }
    return STORIES_DATA;
  });

  // Save stories to localStorage and clean up expired ones automatically
  useEffect(() => {
    try {
      localStorage.setItem('binista_stories_v3', JSON.stringify(stories));
    } catch (e) {
      console.error('Error saving stories:', e);
    }
  }, [stories]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setStories(prev => prev.filter(s => s.isCreate || !s.expiresAt || s.expiresAt > now));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const [videos, setVideos] = useState<VideoItem[]>(VIDEOS_DATA);

  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [selectedStory, setSelectedStory] = useState<StoryItem | null>(null);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [isReelFlowOpen, setIsReelFlowOpen] = useState(false);
  const [isPlusSheetOpen, setIsPlusSheetOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Authentication State
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Force Auth Modal if not logged in
  useEffect(() => {
    if (!loading && !currentUser) {
      setIsAuthOpen(true);
    }
  }, [loading, currentUser]);

  // Real-time Menu Feature States
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<UserProfileData | null>(null);
  const [isTrendingOpen, setIsTrendingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isBlueBadgeOpen, setIsBlueBadgeOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isBinistaAiOpen, setIsBinistaAiOpen] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [pushBanner, setPushBanner] = useState<{ title: string; body: string; time: string } | null>(null);

  // Listen to unread notifications count in real-time
  useEffect(() => {
    if (!db || !currentUser?.uid) {
      setUnreadNotificationsCount(0);
      return;
    }
    const q = query(collection(db, 'notifications'));
    const unsub = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.forEach((d) => {
        const data = d.data() as any;
        if (!data.read) {
          const isVerified = currentUser?.isVerified || currentUser?.blueBadge;
          const isSubscriber = (currentUser as any)?.isSubscribed || false;
          const targetType = data.targetType || 'all';
          const targetUid = data.targetUid;

          const applies =
            targetType === 'all' ||
            (targetType === 'verified' && isVerified) ||
            (targetType === 'subscribers' && isSubscriber) ||
            (targetType === 'non_verified' && !isVerified) ||
            (targetType === 'specific' && targetUid === currentUser.uid);

          if (applies) {
            count++;
          }
        }
      });
      setUnreadNotificationsCount(count);
    });
    return () => unsub();
  }, [currentUser?.uid, currentUser?.isVerified, currentUser?.blueBadge]);

  // Global Foreground Push Notification Listener (Heads-Up Display Banner)
  useEffect(() => {
    const unsubscribe = listenToForegroundFcmMessages((payload: any) => {
      const title = payload?.notification?.title || payload?.title || 'BINISTA Notification';
      const body = payload?.notification?.body || payload?.body || 'New alert on BINISTA!';
      setPushBanner({
        title,
        body,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
      setTimeout(() => {
        setPushBanner(null);
      }, 7000);
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Global Real-time Broadcast Notification Listener from Firestore
  const initialLoadTimeRef = useRef(Date.now());
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'broadcastNotifications'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let latestDoc: any = null;
      let maxTimestamp = 0;
      snapshot.forEach((d) => {
        const data = d.data() as any;
        if (data && (data.timestamp || 0) > maxTimestamp) {
          maxTimestamp = data.timestamp || 0;
          latestDoc = data;
        }
      });
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data() as any;
          if (data && data.timestamp && (data.timestamp >= initialLoadTimeRef.current - 15000 || Date.now() - data.timestamp < 300000)) {
            setPushBanner({
              title: data.title || 'BINISTA Push Notification',
              body: data.body || 'New alert from BINISTA admin',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            });
            try {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.volume = 0.6;
              audio.play().catch(() => {});
            } catch (e) {}

            setTimeout(() => {
              setPushBanner(null);
            }, 8000);
          }
        }
      });
    }, (err) => {
      console.warn('Broadcast listener error:', err);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        setShowNotificationPrompt(true);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isDarkMode]);

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }, []);

  // Initialize Global Android Hardware Back & Gesture Listener
  useEffect(() => {
    const unregisterGlobal = setupGlobalBackNavigation((msg) => {
      triggerToast(msg);
    });
    return () => unregisterGlobal();
  }, [triggerToast]);

  // Back navigation handler for non-home active tabs (e.g. search, ai, activity -> home)
  useEffect(() => {
    if (activeTab === 'home') return;

    const unregister = registerBackHandler(() => {
      setActiveTab('home');
      return true;
    });

    return () => unregister();
  }, [activeTab]);

  // Restore session and listen to Real-Time Public Videos Feed from Firestore
  useEffect(() => {
    // 1. Setup Live Real-time Public Videos listener from Firestore
    const unsubFeed = listenToGlobalPublicVideos((livePublicVideos) => {
      if (livePublicVideos && livePublicVideos.length > 0) {
        const merged = [
          ...livePublicVideos,
          ...VIDEOS_DATA.filter((v) => !livePublicVideos.some((l) => l.id === v.id)),
        ];
        setVideos(merged);
      } else {
        setVideos(VIDEOS_DATA);
      }
    });

    return () => {
      if (typeof unsubFeed === 'function') unsubFeed();
    };
  }, []);

  // Sync Push Notification Services when Auth State is ready
  useEffect(() => {
    if (currentUser?.uid) {
      initOneSignal(currentUser.uid);
      requestNotificationPermissionAndGetToken(currentUser.uid);
    } else {
      initOneSignal();
      requestNotificationPermissionAndGetToken();
    }
  }, [currentUser?.uid]);


  // Handlers
  const handleUploadStory = useCallback((newStory: StoryItem) => {
    setStories((prev) => [prev[0], newStory, ...prev.slice(1)]);
  }, []);

  const handleUploadVideo = useCallback((newVideo: VideoItem) => {
    setVideos((prev) => [newVideo, ...prev.filter((v) => v.id !== newVideo.id)]);
    triggerToast('✨ ভিডিও ৩ সেকেন্ডে সফলভাবে প্রকাশিত হয়েছে!');
  }, [triggerToast]);

  const handleSelectStory = useCallback((story: StoryItem) => {
    setSelectedStory(story);
  }, []);

  const handleCreateStoryClick = useCallback(() => {
    setIsCreateStoryOpen(true);
  }, []);

  const handlePlusButtonClick = useCallback(() => {
    setIsPlusSheetOpen(true);
  }, []);

  // When 'স্টোরি' is selected from popover
  const handleSelectStoryFromSheet = useCallback(() => {
    setIsCreateStoryOpen(true);
  }, []);

  // When 'রিল' is selected from popover
  const handleSelectReelFromSheet = useCallback(() => {
    setIsReelFlowOpen(true);
  }, []);

  const handleSelectVideo = useCallback((video: VideoItem) => {
    setSelectedVideo(video);
  }, []);

  const handleSelectUser = useCallback(async (userId: string, username: string) => {
    // If it's mock data or no DB, we just show a skeleton/simulated profile
    // In a real app, we would fetch from Firestore 'users' collection
    if (!db) {
       triggerToast('Offline mode: Profile view limited');
       return;
    }

    try {
      const userRef = doc(db, 'users', userId);
      const snap = await getDoc(userRef);
      
      if (snap.exists()) {
        const data = snap.data();
        const mappedUser: UserProfileData = {
          id: userId,
          name: data.name || username,
          username: data.username || username,
          avatarUrl: data.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || username)}`,
          profession: data.profession || 'BINISTA Member',
          bio: data.bio || '',
          shortDescription: data.shortDescription || '',
          personalIdentity: data.personalIdentity || '',
          hobbies: data.hobbies || '',
          location: data.location || '',
          website: data.website || '',
          dob: data.dob || '',
          joinedDate: data.joinedDate || 'Joined recently',
          postsCount: data.postsCount || '0',
          followersCount: data.followersCount || '0',
          followingCount: data.followingCount || '0',
          isVerified: data.isVerified,
          blueBadge: data.blueBadge,
          verificationStatus: data.verificationStatus,
        } as any;
        setSelectedProfileUser(mappedUser);
      } else {
        // Mock fallback if user document doesn't exist yet
        setSelectedProfileUser({
          id: userId,
          name: username,
          username: username,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}`,
          profession: 'BINISTA Member',
          bio: 'Verified BINISTA Profile',
          shortDescription: '',
          personalIdentity: '',
          hobbies: '',
          joinedDate: 'Joined recently',
          postsCount: '0',
          followersCount: '0',
          followingCount: '0',
        });
      }
      setIsProfileOpen(true);
    } catch (err) {
      console.error('Error fetching user profile:', err);
      triggerToast('Unable to load profile');
    }
  }, [triggerToast]);

  const handleOpenMenu = useCallback(() => {
    setIsMenuOpen(true);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const handleTabChange = useCallback((tab: NavTab) => {
    setActiveTab(tab);
  }, []);

  const handleCloseSelectedVideo = useCallback(() => {
    setSelectedVideo(null);
  }, []);

  const handleCloseSelectedStory = useCallback(() => {
    setSelectedStory(null);
  }, []);

  const handleCloseCreateStory = useCallback(() => {
    setIsCreateStoryOpen(false);
  }, []);

  const handleCloseReelFlow = useCallback(() => {
    setIsReelFlowOpen(false);
  }, []);

  const handleClosePlusSheet = useCallback(() => {
    setIsPlusSheetOpen(false);
  }, []);

  // Menu Live Action Handlers
  const handleSelectTrending = useCallback(() => {
    setIsTrendingOpen(true);
  }, []);

  const handleSelectProfile = useCallback(() => {
    setSelectedProfileUser(null);
    setIsProfileOpen(true);
  }, []);

  const handleSelectSaved = useCallback(() => {
    setActiveTab('activity');
  }, []);

  const handleSelectSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleToggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const next = !prev;
      triggerToast(next ? 'Dark Mode Activated' : 'Light Mode Activated');
      return next;
    });
  }, [triggerToast]);

  const handleSelectHelp = useCallback(() => {
    setIsHelpOpen(true);
  }, []);

  const handleSignOut = useCallback(async () => {
    await logout();
    setSelectedProfileUser(null);
    loadPublicFeedVideos().then((feedVideos) => {
      if (feedVideos) setVideos(feedVideos);
    });
    triggerToast('Signed out of BINISTA account');
  }, [logout, triggerToast]);

  const handleSuccessAuth = useCallback((user: UserData) => {
    // Context will handle state update via onSnapshot
    requestNotificationPermissionAndGetToken(user.uid);
    const mappedUser: UserProfileData = {
      id: user.uid,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      profession: user.profession || 'BINISTA Member',
      bio: user.bio,
      shortDescription: user.shortDescription,
      personalIdentity: user.personalIdentity,
      hobbies: user.hobbies,
      location: user.location,
      website: user.website,
      dob: user.dob,
      joinedDate: user.joinedDate,
      postsCount: user.postsCount,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
    };
    setSelectedProfileUser(mappedUser);
    loadPublicFeedVideos().then((feedVideos) => {
      if (feedVideos) setVideos(feedVideos);
    });
  }, []);

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-200 text-slate-900'} flex justify-center items-center py-0 md:py-6 antialiased font-sans select-none transition-colors duration-200`}>
      {/* Mobile Frame Container */}
      <div className={`w-full max-w-[430px] h-screen md:h-[880px] ${isDarkMode ? 'bg-[#0a0d14] text-white' : 'bg-white text-slate-900'} md:rounded-[40px] shadow-2xl overflow-hidden relative flex flex-col border-0 md:border-[8px] ${isDarkMode ? 'md:border-slate-800' : 'md:border-slate-900'}`}>
        
        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-extrabold px-4 py-2.5 rounded-full shadow-2xl border border-white/10 flex items-center gap-2 animate-in slide-in-from-top-3 duration-200">
            <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header - Fixed Top */}
        <div className="shrink-0 z-30">
          <Header
            onOpenMenu={handleOpenMenu}
            onOpenNotifications={() => setIsNotificationCenterOpen(true)}
            unreadCount={unreadNotificationsCount}
            onOpenAdmin={() => setIsAdminOpen(true)}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Dedicated Scrollable Feed Container */}
        <div className="flex-1 overflow-y-auto no-scrollbar hyper-scroll relative flex flex-col pb-28">
          {/* Notification Permission Banner Prompt */}
          {showNotificationPrompt && (
            <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between text-xs font-bold shrink-0">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Enable BINISTA push notifications!</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    const res = await requestNotificationPermissionAndGetToken(currentUser?.uid);
                    if (res.token) {
                      triggerToast('🎉 Notifications enabled!');
                    }
                    setShowNotificationPrompt(false);
                  }}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[11px] rounded-lg cursor-pointer"
                >
                  Allow
                </button>
                <button
                  onClick={() => setShowNotificationPrompt(false)}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Stories Section - scrolls naturally with the video feed */}
          <div className="shrink-0">
            <StoriesSection
              stories={stories}
              onSelectStory={handleSelectStory}
              onCreateStory={handleCreateStoryClick}
            />
          </div>

          {/* 2-Column Video Grid */}
          <VideoGrid
            videos={videos}
            onSelectVideo={handleSelectVideo}
            isDarkMode={isDarkMode}
          />
        </div>

        {/* Floating Bottom Navigation Bar - Fixed Bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-[#0a0d14]/80 backdrop-blur-lg">
          <BottomNav
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onCreateClick={handlePlusButtonClick}
          />
        </div>

        {/* Floating Popover menu when clicking Plus (+) Button */}
        <PlusActionSheet
          isOpen={isPlusSheetOpen}
          onClose={handleClosePlusSheet}
          onSelectStory={handleSelectStoryFromSheet}
          onSelectReel={handleSelectReelFromSheet}
          onSelectAi={() => setIsBinistaAiOpen(true)}
        />

        {/* White Background Create Story Modal */}
        <CreateStoryFlowModal
          isOpen={isCreateStoryOpen}
          onClose={handleCloseCreateStory}
          onPublishStory={handleUploadStory}
        />

        {/* Reel Video Upload Flow */}
        <ReelUploadFlowModal
          isOpen={isReelFlowOpen}
          onClose={handleCloseReelFlow}
          onPublishVideo={handleUploadVideo}
          currentUser={currentUser}
        />

        {/* Video Detail View */}
        {selectedVideo && (
          <VideoDetailView
            video={selectedVideo}
            onClose={handleCloseSelectedVideo}
            onSelectRelatedVideo={handleSelectVideo}
            onSelectUser={handleSelectUser}
            currentUser={currentUser}
            onDeleteVideo={async (videoId) => {
              try {
                const targetUid = currentUser?.uid || selectedVideo?.userId || 'guest_creator';
                await deleteVideoPermanent(targetUid, videoId, selectedVideo.storagePath);
                setSelectedVideo(null);
                setVideos((prev) => prev.filter((v) => v.id !== videoId));
                triggerToast('ভিডিওটি সফলভাবে মুছে ফেলা হয়েছে');
              } catch (e: any) {
                triggerToast(e.message || 'Error deleting video');
              }
            }}
          />
        )}

        {/* Story Viewer Fullscreen Modal */}
        <StoryViewerModal
          story={selectedStory}
          onClose={handleCloseSelectedStory}
          onSelectUser={handleSelectUser}
        />

        {/* Hamburger Menu Drawer */}
        <MenuDrawer
          isOpen={isMenuOpen}
          onClose={handleCloseMenu}
          onSelectTrending={handleSelectTrending}
          onSelectProfile={handleSelectProfile}
          onSelectSaved={handleSelectSaved}
          onSelectSettings={handleSelectSettings}
          onToggleDarkMode={handleToggleDarkMode}
          onSelectHelp={handleSelectHelp}
          onOpenBlueBadge={() => setIsBlueBadgeOpen(true)}
          onSignOut={handleSignOut}
          onOpenAuth={() => setIsAuthOpen(true)}
          currentUser={currentUser}
        />

        {/* Real BINISTA Authentication Modal */}
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onSuccessLogin={handleSuccessAuth}
          isMandatory={false}
        />

        {/* Menu Feature Overlays */}
        <UserProfileModal
          isOpen={isProfileOpen}
          user={selectedProfileUser}
          onClose={() => setIsProfileOpen(false)}
          onSelectVideo={handleSelectVideo}
          onOpenSettings={() => setIsSettingsOpen(true)}
          isDarkMode={isDarkMode}
        />

        <TrendingVideosModal
          isOpen={isTrendingOpen}
          onClose={() => setIsTrendingOpen(false)}
          onSelectVideo={handleSelectVideo}
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onToggleDarkMode={handleToggleDarkMode}
          isDarkMode={isDarkMode}
          currentUser={currentUser}
          onOpenBlueBadge={() => setIsBlueBadgeOpen(true)}
        />

        <HelpSupportModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
        />

        <BlueBadgeModal
          isOpen={isBlueBadgeOpen}
          onClose={() => setIsBlueBadgeOpen(false)}
          currentUser={currentUser}
          triggerToast={triggerToast}
          onOpenSubscription={() => setIsSubscriptionOpen(true)}
        />

        <SubscriptionManagementModal
          isOpen={isSubscriptionOpen}
          onClose={() => setIsSubscriptionOpen(false)}
          currentUser={currentUser}
          triggerToast={triggerToast}
        />

        <NotificationCenterPage
          isOpen={isNotificationCenterOpen}
          onClose={() => setIsNotificationCenterOpen(false)}
          currentUser={currentUser}
          triggerToast={triggerToast}
          onOpenSettings={() => setIsNotificationSettingsOpen(true)}
          onNavigateToTarget={(targetType, targetId) => {
            setIsNotificationCenterOpen(false);
            if (targetType === 'profile' && targetId) {
              // open profile or video
            }
          }}
        />

        <NotificationSettingsPage
          isOpen={isNotificationSettingsOpen}
          onClose={() => setIsNotificationSettingsOpen(false)}
          currentUser={currentUser}
          triggerToast={triggerToast}
        />

        <AdminPanel 
          isOpen={isAdminOpen} 
          onClose={() => setIsAdminOpen(false)} 
          triggerToast={triggerToast} 
        />

        {/* Tab Overlays */}
        {activeTab === 'search' && (
          <SearchOverlay
            onClose={() => setActiveTab('home')}
            onSelectVideo={handleSelectVideo}
          />
        )}

        {activeTab === 'ai' && (
          <MessengerOverlay
            onClose={() => setActiveTab('home')}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Heart/Saves Tab Overlay */}
        {activeTab === 'activity' && (
          <SavesOverlay
            onClose={() => setActiveTab('home')}
            onSelectVideo={handleSelectVideo}
          />
        )}

        {/* BINISTA Ai Fullscreen AI Modal */}
        <BinistaAiModal
          isOpen={isBinistaAiOpen}
          onClose={() => setIsBinistaAiOpen(false)}
          isDarkMode={isDarkMode}
          activeVideoContext={selectedVideo ? { title: selectedVideo.title, description: selectedVideo.description, creator: selectedVideo.creator } : null}
        />

        {/* 🔔 Global Real-time Push Notification Banner (Heads-Up Popup at Top of Device Screen) */}
        {pushBanner && (
          <div className="fixed top-3 left-3 right-3 z-[999999] bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-3 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
                <Bell className="w-5 h-5 text-white animate-bounce" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded-md">BINISTA PUSH</span>
                  <span className="text-[10px] text-slate-400">• {pushBanner.time}</span>
                </div>
                <h4 className="text-sm font-bold text-white leading-tight truncate mt-0.5">{pushBanner.title}</h4>
                <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">{pushBanner.body}</p>
              </div>
            </div>
            <button
              onClick={() => setPushBanner(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition shrink-0"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
