import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  updateDoc,
  increment,
  collectionGroup,
  where,
  getDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface CommentItem {
  id: string;
  videoId: string;
  userId: string;
  username: string;
  profilePhoto: string;
  userName: string;
  userUsername: string;
  userAvatar: string;
  text: string;
  createdAt: string;
}

// In-memory reactive user profile cache for instant synchronization across comments
const commentUserProfileCache: Record<string, { name: string; avatarUrl: string; username: string }> = {};
const pendingProfileFetches = new Set<string>();

export function getCachedUserProfile(userId: string): { name: string; avatarUrl: string; username: string } | null {
  return commentUserProfileCache[userId] || null;
}

export function updateCachedUserProfile(
  userId: string,
  profile: { name?: string; avatarUrl?: string; username?: string }
): void {
  if (!userId) return;
  const existing = commentUserProfileCache[userId] || { name: '', avatarUrl: '', username: '' };
  commentUserProfileCache[userId] = {
    name: profile.name !== undefined ? profile.name : existing.name,
    avatarUrl: profile.avatarUrl !== undefined ? profile.avatarUrl : existing.avatarUrl,
    username: profile.username !== undefined ? profile.username : existing.username,
  };
}

export async function fetchAndCacheUserProfile(
  userId: string,
  onUpdated?: () => void
): Promise<{ name: string; avatarUrl: string; username: string } | null> {
  if (!userId || userId === 'guest_user' || commentUserProfileCache[userId]) {
    return commentUserProfileCache[userId] || null;
  }
  if (pendingProfileFetches.has(userId)) return null;

  pendingProfileFetches.add(userId);
  try {
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (userSnap.exists()) {
      const data = userSnap.data();
      const profile = {
        name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.username || 'User',
        avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=75',
        username: data.username || 'user',
      };
      commentUserProfileCache[userId] = profile;
      if (onUpdated) onUpdated();
      return profile;
    }
  } catch (err) {
    console.warn('Profile cache fetch warning for user', userId, err);
  } finally {
    pendingProfileFetches.delete(userId);
  }
  return null;
}

/**
 * Synchronize user comments in Firestore when the user updates their profile name/photo
 */
export async function syncUserCommentsInFirestore(
  userId: string,
  updates: { name?: string; avatarUrl?: string; username?: string }
): Promise<void> {
  if (!userId) return;

  // 1. Immediately update in-memory cache for 0ms UI reactivity
  updateCachedUserProfile(userId, updates);

  // 2. Asynchronously update Firestore comment documents authored by this user
  try {
    const commentsQuery = query(collectionGroup(db, 'comments'), where('userId', '==', userId));
    const snap = await getDocs(commentsQuery);
    if (!snap.empty) {
      const updateData: any = {};
      if (updates.name) updateData.userName = updates.name;
      if (updates.avatarUrl) {
        updateData.userAvatar = updates.avatarUrl;
        updateData.profilePhoto = updates.avatarUrl;
      }
      if (updates.username) {
        updateData.userUsername = updates.username;
        updateData.username = updates.username;
      }

      const promises = snap.docs.map((docSnap) => updateDoc(docSnap.ref, updateData).catch(() => {}));
      await Promise.all(promises);
      console.log(`[Firestore Sync] Successfully updated ${snap.size} comments for user ${userId}`);
    }
  } catch (err) {
    console.warn('syncUserCommentsInFirestore note:', err);
  }
}

/**
 * Real-time listener for video comments in Firestore
 * Path: videos/{videoId}/comments
 */
export function listenToVideoComments(
  videoId: string,
  callback: (comments: CommentItem[]) => void
): () => void {
  if (!videoId) return () => {};

  const colPath = `videos/${videoId}/comments`;
  const colRef = collection(db, 'videos', videoId, 'comments');
  const q = query(colRef);
  return onSnapshot(
    q,
    (snapshot) => {
      const list: CommentItem[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          videoId: d.videoId || videoId,
          userId: d.userId || '',
          username: d.username || d.userUsername || 'user',
          profilePhoto: d.profilePhoto || d.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=75',
          userName: d.userName || d.username || 'BINISTA User',
          userUsername: d.userUsername || d.username || 'user',
          userAvatar: d.userAvatar || d.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=75',
          text: d.text || '',
          createdAt: d.createdAt || new Date().toISOString(),
        });
      });
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      callback(list);
    },
    (error) => {
      console.warn('Comments listener warning:', error);
    }
  );
}

/**
 * Add a comment permanently to Firestore
 * Path: videos/{videoId}/comments/{commentId}
 * Also increments commentsCount in videos/{videoId} and users/{ownerUid}/videos/{videoId}
 */
export async function addVideoComment(
  videoId: string,
  data: {
    userId: string;
    userName: string;
    userUsername: string;
    userAvatar: string;
    text: string;
  },
  ownerUid?: string
): Promise<CommentItem> {
  const commentId = `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const docPath = `videos/${videoId}/comments/${commentId}`;
  const commentDocRef = doc(db, 'videos', videoId, 'comments', commentId);

  const newComment: CommentItem = {
    id: commentId,
    videoId,
    userId: data.userId || 'guest_user',
    username: data.userUsername || 'user',
    profilePhoto:
      data.userAvatar ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=75',
    userName: data.userName || 'BINISTA User',
    userUsername: data.userUsername || 'user',
    userAvatar:
      data.userAvatar ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=75',
    text: data.text.trim(),
    createdAt: new Date().toISOString(),
  };

  try {
    await setDoc(commentDocRef, newComment);

    // Atomically increment commentsCount in videos/{videoId}
    try {
      const globalVideoRef = doc(db, 'videos', videoId);
      await updateDoc(globalVideoRef, {
        commentsCount: increment(1),
      });
    } catch (_) {}

    // Also update in users/{ownerUid}/videos/{videoId} if known
    if (ownerUid) {
      try {
        const userVideoRef = doc(db, 'users', ownerUid, 'videos', videoId);
        await updateDoc(userVideoRef, {
          commentsCount: increment(1),
        });
      } catch (_) {}
    }

    console.log(`[Firestore] Comment saved permanently at ${docPath}`);
    return newComment;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
    return newComment;
  }
}

/**
 * Delete a comment permanently from Firestore
 */
export async function deleteVideoComment(
  videoId: string,
  commentId: string,
  ownerUid?: string
): Promise<void> {
  const docPath = `videos/${videoId}/comments/${commentId}`;
  const commentDocRef = doc(db, 'videos', videoId, 'comments', commentId);

  try {
    await deleteDoc(commentDocRef);

    // Atomically decrement commentsCount
    try {
      const globalVideoRef = doc(db, 'videos', videoId);
      await updateDoc(globalVideoRef, {
        commentsCount: increment(-1),
      });
    } catch (_) {}

    if (ownerUid) {
      try {
        const userVideoRef = doc(db, 'users', ownerUid, 'videos', videoId);
        await updateDoc(userVideoRef, {
          commentsCount: increment(-1),
        });
      } catch (_) {}
    }

    console.log(`[Firestore] Comment deleted at ${docPath}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, docPath);
  }
}

/**
 * Fetch one-time video comments from Firestore
 */
export async function getVideoComments(videoId: string): Promise<CommentItem[]> {
  if (!videoId) return [];
  const colRef = collection(db, 'videos', videoId, 'comments');
  const q = query(colRef);
  const snap = await getDocs(q);
  const list: CommentItem[] = [];
  snap.forEach((docSnap) => {
    const d = docSnap.data();
    list.push({
      id: docSnap.id,
      videoId: d.videoId || videoId,
      userId: d.userId || '',
      username: d.username || d.userUsername || 'user',
      profilePhoto: d.profilePhoto || d.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=75',
      userName: d.userName || d.username || 'BINISTA User',
      userUsername: d.userUsername || d.username || 'user',
      userAvatar: d.userAvatar || d.profilePhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=75',
      text: d.text || '',
      createdAt: d.createdAt || new Date().toISOString(),
    });
  });
  list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return list;
}
