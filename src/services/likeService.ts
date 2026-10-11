import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export interface LikeState {
  isLiked: boolean;
  likesCount: number;
}

/**
 * Check if a specific user has liked a video
 * Path: videos/{videoId}/likes/{uid}
 */
export async function checkIfUserLikedVideo(videoId: string, uid: string): Promise<boolean> {
  if (!videoId || !uid) return false;
  try {
    const likeDocRef = doc(db, 'videos', videoId, 'likes', uid);
    const snap = await getDoc(likeDocRef);
    return snap.exists();
  } catch (error) {
    console.warn(`[Firestore] Failed to check like for video ${videoId}:`, error);
    return false;
  }
}

/**
 * Toggle Like on a video
 * - Creates/Deletes videos/{videoId}/likes/{uid}
 * - Updates likesCount atomically in videos/{videoId} and users/{ownerUid}/videos/{videoId}
 */
export async function toggleVideoLike(
  videoId: string,
  uid: string,
  currentStatus: boolean,
  ownerUid?: string
): Promise<{ isLiked: boolean }> {
  if (!videoId || !uid) {
    return { isLiked: !currentStatus };
  }

  const likeDocRef = doc(db, 'videos', videoId, 'likes', uid);
  const globalVideoRef = doc(db, 'videos', videoId);

  try {
    if (currentStatus) {
      // UNLIKE: Remove like document & decrement count
      await deleteDoc(likeDocRef);

      try {
        await updateDoc(globalVideoRef, {
          likesCount: increment(-1),
        });
      } catch (_) {}

      if (ownerUid) {
        try {
          const userVideoRef = doc(db, 'users', ownerUid, 'videos', videoId);
          await updateDoc(userVideoRef, {
            likesCount: increment(-1),
          });
        } catch (_) {}
      }

      console.log(`[Firestore] Video ${videoId} unliked by user ${uid}`);
      return { isLiked: false };
    } else {
      // LIKE: Add like document & increment count
      await setDoc(likeDocRef, {
        uid,
        videoId,
        createdAt: new Date().toISOString(),
      });

      try {
        await updateDoc(globalVideoRef, {
          likesCount: increment(1),
        });
      } catch (_) {}

      if (ownerUid) {
        try {
          const userVideoRef = doc(db, 'users', ownerUid, 'videos', videoId);
          await updateDoc(userVideoRef, {
            likesCount: increment(1),
          });
        } catch (_) {}
      }

      console.log(`[Firestore] Video ${videoId} liked by user ${uid}`);
      return { isLiked: true };
    }
  } catch (error) {
    handleFirestoreError(
      error,
      currentStatus ? OperationType.DELETE : OperationType.CREATE,
      `videos/${videoId}/likes/${uid}`
    );
    return { isLiked: currentStatus };
  }
}

/**
 * Real-time listener for video likes count and user's liked status
 */
export function listenToVideoLikes(
  videoId: string,
  uid: string | undefined,
  callback: (state: LikeState) => void
): () => void {
  if (!videoId) return () => {};

  const globalVideoRef = doc(db, 'videos', videoId);

  // 1. Listen to global video document for likesCount
  const unsubVideo = onSnapshot(
    globalVideoRef,
    async (docSnap) => {
      let count = 0;
      if (docSnap.exists()) {
        const data = docSnap.data();
        count = typeof data.likesCount === 'number' ? data.likesCount : parseInt(data.likesCount || '0', 10);
      }

      let isLiked = false;
      if (uid) {
        try {
          const likeDocRef = doc(db, 'videos', videoId, 'likes', uid);
          const likeSnap = await getDoc(likeDocRef);
          isLiked = likeSnap.exists();
        } catch (_) {}
      }

      callback({
        isLiked,
        likesCount: Math.max(0, count),
      });
    },
    (err) => {
      console.warn('Likes count listener notice:', err);
    }
  );

  return unsubVideo;
}
