import OneSignal from 'react-onesignal';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';

export const ONESIGNAL_APP_ID = 'd28392ee-2a0f-4f62-ba65-03fb3e0915ab';

let isOneSignalInitialized = false;

/**
 * Initialize OneSignal Web & Native Push SDK
 */
export async function initOneSignal(uid?: string): Promise<void> {
  if (typeof window === 'undefined') return;
  if (isOneSignalInitialized) return;

  try {
    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      serviceWorkerParam: { scope: '/' },
      serviceWorkerPath: 'OneSignalSDKWorker.js',
    });

    isOneSignalInitialized = true;
    console.log('[OneSignal] SDK Initialized successfully with App ID:', ONESIGNAL_APP_ID);

    const subscriptionId = OneSignal.User.PushSubscription.id;
    if (subscriptionId) {
      console.log('[OneSignal Subscription ID / Player ID]:', subscriptionId);
      if (uid) {
        await saveOneSignalPlayerIdToFirestore(uid, subscriptionId);
      }
    }

    OneSignal.User.PushSubscription.addEventListener('change', async (event) => {
      const newSubId = event.current?.id;
      if (newSubId) {
        console.log('[OneSignal Subscription Updated]:', newSubId);
        if (uid) {
          await saveOneSignalPlayerIdToFirestore(uid, newSubId);
        }
      }
    });
  } catch (err) {
    console.warn('[OneSignal Init Warning]:', err);
  }
}

/**
 * Prompt User for OneSignal Push Notification Permission
 */
export async function requestOneSignalPermission(uid?: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    await initOneSignal(uid);
    await OneSignal.Notifications.requestPermission();

    const isOptedIn = OneSignal.User.PushSubscription.optedIn;
    const playerId = OneSignal.User.PushSubscription.id;

    if (playerId && uid) {
      await saveOneSignalPlayerIdToFirestore(uid, playerId);
    }

    return Boolean(isOptedIn);
  } catch (err) {
    console.error('[OneSignal Permission Error]:', err);
    return false;
  }
}

/**
 * Check Current OneSignal Permission Status
 */
export async function getOneSignalPermissionStatus(): Promise<string> {
  if (typeof window === 'undefined') return 'denied';
  try {
    const isOptedIn = OneSignal.User.PushSubscription.optedIn;
    if (isOptedIn) return 'granted';
    const permission = OneSignal.Notifications.permission;
    return permission ? 'granted' : 'denied';
  } catch (e) {
    return 'default';
  }
}

/**
 * Save OneSignal Player ID / Subscription ID to Firestore
 */
async function saveOneSignalPlayerIdToFirestore(uid: string, playerId: string) {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      oneSignalPlayerIds: arrayUnion(playerId),
      lastOneSignalPlayerId: playerId,
      oneSignalUpdatedAt: new Date().toISOString(),
    });
    console.log(`[Firestore] OneSignal Player ID ${playerId} saved for user ${uid}`);
  } catch (err) {
    console.warn('Failed to update Firestore with OneSignal Player ID:', err);
  }
}

/**
 * Trigger OneSignal Push Notification via Backend REST API
 */
export async function sendOneSignalPush(params: {
  title: string;
  body: string;
  type?: string;
  uid?: string;
}): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const res = await fetch('/api/notifications/onesignal/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: params.title,
        body: params.body,
        type: params.type || 'general',
        uid: params.uid,
      }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Failed to send OneSignal push:', err);
    return { success: false, message: err.message || 'Failed to dispatch OneSignal push' };
  }
}
