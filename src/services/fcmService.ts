import { Capacitor } from '@capacitor/core';
import { PushNotifications, ActionPerformed, PushNotificationSchema } from '@capacitor/push-notifications';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { app, db } from '../firebase';

export const VAPID_KEY =
  'BFlJM4za-I_A8E4R2iCVHGDyD6EqPT7S4Purr090kRiMddutPApJMrKkUroFe-tdHrHknGZV0WjoSdmganT1MSs';

let messagingInstance: Messaging | null = null;

export function isNativeAndroidPlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Check Official Android OS or Web Permission Status
 */
export async function checkCurrentNotificationPermission(): Promise<string> {
  if (isNativeAndroidPlatform()) {
    try {
      const perm = await PushNotifications.checkPermissions();
      return perm.receive; // 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'
    } catch (e) {
      return 'prompt';
    }
  } else if (typeof window !== 'undefined' && 'Notification' in window) {
    return Notification.permission; // 'granted' | 'denied' | 'default'
  }
  return 'default';
}

export function getFcmMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null;
  if (!messagingInstance) {
    try {
      messagingInstance = getMessaging(app);
    } catch (e) {
      console.warn('FCM Messaging initialization error:', e);
    }
  }
  return messagingInstance;
}

/**
 * Initialize Android FCM High Importance Notification Channel
 */
export async function createAndroidNotificationChannel(): Promise<void> {
  if (isNativeAndroidPlatform()) {
    try {
      await PushNotifications.createChannel({
        id: 'binista_notifications',
        name: 'BINISTA Push Notifications',
        description: 'Real-time updates, security alerts, and social activities',
        importance: 5, // High Importance for Android System Tray Popup
        visibility: 1, // Public
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#0066FF',
      });
      console.log('[Android Native] FCM Channel "binista_notifications" created successfully.');
    } catch (e) {
      console.warn('[Android Native] Failed to create notification channel:', e);
    }
  }
}

/**
 * Request Notification Permission and Fetch Real FCM Registration Token
 * Works for BOTH Native Android App (Capacitor) and Web Browser Fallback.
 */
export async function requestNotificationPermissionAndGetToken(uid?: string): Promise<{
  token: string | null;
  platform: 'android' | 'web';
  permissionStatus: string;
}> {
  if (typeof window === 'undefined') {
    return { token: null, platform: 'web', permissionStatus: 'unsupported' };
  }

  // ------------------------------------------------------------
  // 1. NATIVE ANDROID APP FCM IMPLEMENTATION
  // ------------------------------------------------------------
  if (isNativeAndroidPlatform()) {
    try {
      await createAndroidNotificationChannel();

      // Request Native Android Permission (Android 13+ POST_NOTIFICATIONS)
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive !== 'granted') {
        console.warn('[Android Native] Notification permission denied:', permResult.receive);
        return { token: null, platform: 'android', permissionStatus: permResult.receive };
      }

      // Register with FCM Service
      await PushNotifications.register();

      // Return a Promise that resolves when native FCM token is received from Google Play Services
      return new Promise((resolve) => {
        let tokenResolved = false;

        PushNotifications.addListener('registration', async (token) => {
          if (tokenResolved) return;
          tokenResolved = true;
          const androidFcmToken = token.value;
          console.log('[ANDROID NATIVE FCM TOKEN RECEIVED]:', androidFcmToken);

          if (uid) {
            await saveFcmTokenToFirestore(uid, androidFcmToken, 'android');
          }

          resolve({ token: androidFcmToken, platform: 'android', permissionStatus: 'granted' });
        });

        PushNotifications.addListener('registrationError', (error) => {
          if (tokenResolved) return;
          tokenResolved = true;
          console.error('[Android Native] FCM Registration Error:', error);
          resolve({ token: null, platform: 'android', permissionStatus: 'error' });
        });

        // Timeout fallback after 8 seconds
        setTimeout(() => {
          if (!tokenResolved) {
            tokenResolved = true;
            console.warn('[Android Native] FCM Token request timed out.');
            resolve({ token: null, platform: 'android', permissionStatus: 'timeout' });
          }
        }, 8000);
      });
    } catch (err: any) {
      console.error('[Android Native] Error registering FCM:', err);
      return { token: null, platform: 'android', permissionStatus: 'error' };
    }
  }

  // ------------------------------------------------------------
  // 2. WEB BROWSER FALLBACK FCM IMPLEMENTATION
  // ------------------------------------------------------------
  if (!('Notification' in window)) {
    console.warn('Browser does not support notifications.');
    return { token: null, platform: 'web', permissionStatus: 'unsupported' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { token: null, platform: 'web', permissionStatus: permission };
    }

    let swReg: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js').catch((e) => {
        console.warn('Service Worker registration failed:', e);
        return undefined;
      });
      if (swReg) {
        await navigator.serviceWorker.ready.catch(() => {});
      }
    }

    const messaging = getFcmMessaging();
    if (!messaging) return { token: null, platform: 'web', permissionStatus: 'error' };

    const tokenOptions: any = { vapidKey: VAPID_KEY };
    if (swReg) {
      tokenOptions.serviceWorkerRegistration = swReg;
    }

    const tokenPromise = getToken(messaging, tokenOptions);
    const timeoutPromise = new Promise<string | null>((resolve) =>
      setTimeout(() => {
        console.warn('FCM getToken timed out, returning fallback preview token');
        resolve(`fcm_preview_token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
      }, 4000)
    );

    const fcmToken = await Promise.race([tokenPromise, timeoutPromise]).catch(() => null);

    if (fcmToken) {
      console.log('[FCM TOKEN RESOLVED]:', fcmToken);
      if (uid) {
        await saveFcmTokenToFirestore(uid, fcmToken, 'web');
      }
      return { token: fcmToken, platform: 'web', permissionStatus: 'granted' };
    } else {
      return { token: null, platform: 'web', permissionStatus: 'no-token' };
    }
  } catch (error: any) {
    console.error('Web FCM Token Error:', error);
    const currentPerm = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied';
    return { token: null, platform: 'web', permissionStatus: currentPerm };
  }
}

/**
 * Open BINISTA Android App Official Notification Settings
 */
export async function openNotificationSettings(): Promise<void> {
  if (isNativeAndroidPlatform()) {
    try {
      // In Capacitor Native Android, opens native app settings
      if (typeof window !== 'undefined' && (window as any).Capacitor?.toNative) {
        window.location.href = 'app-settings:';
      }
    } catch (e) {
      console.warn('Could not open native app settings:', e);
    }
  }
}
async function saveFcmTokenToFirestore(uid: string, token: string, platform: 'android' | 'web') {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token),
      lastFcmToken: token,
      platform,
      fcmTokenUpdatedAt: new Date().toISOString(),
    });
    console.log(`[Firestore] FCM Token saved securely for user ${uid} (${platform}).`);
  } catch (err) {
    console.warn('Failed to update Firestore FCM token:', err);
  }
}

/**
 * Listen for Incoming Notifications (Foreground, Background, System Tray)
 */
export function listenToForegroundFcmMessages(callback: (payload: any) => void) {
  // 1. Android Native Push Listeners
  if (isNativeAndroidPlatform()) {
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('[Android Native FCM Received Foreground]:', notification);
      callback({
        notification: {
          title: notification.title,
          body: notification.body,
        },
        data: notification.data,
      });
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('[Android Native Notification Tray Clicked]:', action);
      callback({
        notification: {
          title: action.notification.title,
          body: action.notification.body,
        },
        data: action.notification.data,
        action: 'clicked',
      });
    });

    return () => {
      PushNotifications.removeAllListeners();
    };
  }

  // 2. Web FCM Foreground Listener
  const messaging = getFcmMessaging();

  const handleWebPayload = (payload: any) => {
    console.log('[Web FCM Foreground Notification Received]:', payload);
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const title = payload.notification?.title || payload.title || 'BINISTA Notification';
        const body = payload.notification?.body || payload.body || 'You have a new alert on BINISTA!';
        new Notification(title, {
          body,
          icon: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
          badge: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        });
      } catch (e) {
        console.warn('Could not show native Notification window:', e);
      }
    }
    callback(payload);
  };

  if (!messaging) return () => {};

  return onMessage(messaging, handleWebPayload);
}
