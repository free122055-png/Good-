import { db } from '../firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, setDoc } from 'firebase/firestore';

export const toggleFollowUser = async (currentUserId: string, targetUserId: string, isFollowing: boolean) => {
  if (!db) return;

  const currentUserRef = doc(db, 'users', currentUserId);
  const targetUserRef = doc(db, 'users', targetUserId);

  try {
    if (isFollowing) {
      // Unfollow
      await updateDoc(currentUserRef, {
        following: arrayRemove(targetUserId)
      });
      await updateDoc(targetUserRef, {
        followers: arrayRemove(currentUserId)
      });
    } else {
      // Follow
      // Ensure documents exist first (upsert pattern)
      const targetSnap = await getDoc(targetUserRef);
      if (!targetSnap.exists()) {
        await setDoc(targetUserRef, { followers: [] }, { merge: true });
      }
      
      await updateDoc(currentUserRef, {
        following: arrayUnion(targetUserId)
      });
      await updateDoc(targetUserRef, {
        followers: arrayUnion(currentUserId)
      });
    }
    return true;
  } catch (err) {
    console.error('Error toggling follow:', err);
    throw err;
  }
};
