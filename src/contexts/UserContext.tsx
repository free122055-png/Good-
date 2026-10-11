import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { db, auth } from '../firebase';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { UserData, getSessionUser, saveSessionUser } from '../services/authService';
import { syncUserCommentsInFirestore, updateCachedUserProfile } from '../services/commentService';

interface UserContextType {
  currentUser: UserData | null;
  loading: boolean;
  updateUserProfile: (data: Partial<UserData>) => Promise<void>;
  logout: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserData | null>(getSessionUser());
  const [loading, setLoading] = useState(!getSessionUser());

  useEffect(() => {
    let unsubscribeFirestore: (() => void) | null = null;

    const cleanupFirestore = () => {
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }
    };

    // Helper: listen to a specific user doc in Firestore
    const listenToUserDoc = (targetUid: string) => {
      cleanupFirestore();
      const userRef = doc(db, 'users', targetUid);
      unsubscribeFirestore = onSnapshot(
        userRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as UserData;
            const updatedUser = { ...data, uid: targetUid, id: targetUid };
            setCurrentUser(updatedUser);
            saveSessionUser(updatedUser);
            updateCachedUserProfile(targetUid, {
              name: updatedUser.name,
              avatarUrl: updatedUser.avatarUrl,
              username: updatedUser.username,
            });
          } else {
            // User not found in Firestore doc
            const local = getSessionUser();
            if (local && local.uid === targetUid) {
              // Retain local session until explicit logout
              setCurrentUser(local);
            } else {
              setCurrentUser(null);
            }
          }
          setLoading(false);
        },
        (error) => {
          console.error('Firestore snapshot error:', error);
          setLoading(false);
        }
      );
    };

    // Listen for Auth changes (Firebase Auth)
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Authenticated with Firebase, check direct doc
        const userRef = doc(db, 'users', firebaseUser.uid);
        try {
          cleanupFirestore();
          unsubscribeFirestore = onSnapshot(userRef, async (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data() as UserData;
              const updatedUser = { ...data, uid: firebaseUser.uid, id: firebaseUser.uid };
              setCurrentUser(updatedUser);
              saveSessionUser(updatedUser);
              updateCachedUserProfile(firebaseUser.uid, {
                name: updatedUser.name,
                avatarUrl: updatedUser.avatarUrl,
                username: updatedUser.username,
              });
              setLoading(false);
            } else {
              // Direct doc not found by firebaseUser.uid, check if user exists by phone or email or session
              const localUser = getSessionUser();
              if (localUser && localUser.uid) {
                listenToUserDoc(localUser.uid);
              } else {
                setLoading(false);
              }
            }
          }, () => {
            const localUser = getSessionUser();
            if (localUser && localUser.uid) {
              listenToUserDoc(localUser.uid);
            } else {
              setLoading(false);
            }
          });
        } catch (e) {
          console.warn('Auth snapshot setup error:', e);
          const localUser = getSessionUser();
          if (localUser && localUser.uid) {
            listenToUserDoc(localUser.uid);
          } else {
            setLoading(false);
          }
        }
      } else {
        // Not authenticated with Firebase SDK, check local session (Phone no OTP or Email OTP)
        const localUser = getSessionUser();
        if (localUser && localUser.uid) {
          listenToUserDoc(localUser.uid);
        } else {
          cleanupFirestore();
          setCurrentUser(null);
          setLoading(false);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      cleanupFirestore();
    };
  }, []);

  const logout = async () => {
    try {
      // 1. Clear Local Storage Session first
      const { clearSessionUser } = await import('../services/authService');
      clearSessionUser();

      // 2. Firebase Auth Sign Out
      await auth.signOut();

      // 3. Clear Local State Immediately
      setCurrentUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
      const { clearSessionUser } = await import('../services/authService');
      clearSessionUser();
      setCurrentUser(null);
    }
  };

  const updateUserProfile = async (data: Partial<UserData>) => {
    if (!currentUser || !currentUser.uid) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, data);

      const mergedUser = { ...currentUser, ...data };
      setCurrentUser(mergedUser);
      saveSessionUser(mergedUser);

      // Instantly synchronize user profile across comment cache and Firestore comments
      updateCachedUserProfile(currentUser.uid, {
        name: mergedUser.name,
        avatarUrl: mergedUser.avatarUrl,
        username: mergedUser.username,
      });

      // Background sync all previous comments in Firestore
      syncUserCommentsInFirestore(currentUser.uid, {
        name: mergedUser.name,
        avatarUrl: mergedUser.avatarUrl,
        username: mergedUser.username,
      }).catch((e) => console.warn('Background comments sync note:', e));
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  return (
    <UserContext.Provider value={{ currentUser, loading, updateUserProfile, logout }}>
      {children}
    </UserContext.Provider>
  );
};
