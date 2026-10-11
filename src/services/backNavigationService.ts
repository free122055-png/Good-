import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export type BackHandler = () => boolean;

const backHandlers: BackHandler[] = [];
let lastExitPressTime = 0;

/**
 * Register a back handler onto the navigation stack.
 * Returns an unsubscribe function.
 */
export function registerBackHandler(handler: BackHandler): () => void {
  backHandlers.push(handler);

  // Push state to browser history stack so Android Back gesture / popstate fires
  if (typeof window !== 'undefined' && window.history) {
    try {
      window.history.pushState({ stackDepth: backHandlers.length, time: Date.now() }, '');
    } catch (e) {}
  }

  return () => {
    const idx = backHandlers.indexOf(handler);
    if (idx !== -1) {
      backHandlers.splice(idx, 1);
    }
  };
}

/**
 * Trigger back action globally.
 * Traverses handlers from newest to oldest (LIFO order).
 */
export function dispatchGlobalBack(onShowExitToast?: (msg: string) => void): void {
  // Try back handlers in reverse (newest modal/subpage first)
  for (let i = backHandlers.length - 1; i >= 0; i--) {
    const handled = backHandlers[i]();
    if (handled) {
      return; // Successfully handled by a subpage or modal
    }
  }

  // If no modal or subpage handled it, user is on Home screen
  const now = Date.now();
  if (now - lastExitPressTime < 2000) {
    // Second back press within 2 seconds -> Exit App
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.exitApp();
    } else {
      console.log('[Android Back Navigation] Exit app triggered at root level.');
    }
  } else {
    lastExitPressTime = now;
    if (onShowExitToast) {
      onShowExitToast('অ্যাপ থেকে বের হতে আবার ব্যাকে চাপুন (Press back again to exit)');
    }
  }
}

/**
 * Setup global listeners for both Android Native Hardware Back Button & Web Browser PopState
 */
export function setupGlobalBackNavigation(onShowExitToast?: (msg: string) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  // 1. PopState Event Listener (Android Back Gesture & Browser Back)
  const handlePopState = (e: PopStateEvent) => {
    dispatchGlobalBack(onShowExitToast);
  };
  window.addEventListener('popstate', handlePopState);

  // 2. Capacitor Native Hardware BackButton Listener
  let nativeListener: any = null;
  if (Capacitor.isNativePlatform()) {
    CapacitorApp.addListener('backButton', () => {
      dispatchGlobalBack(onShowExitToast);
    }).then((l) => {
      nativeListener = l;
    });
  }

  return () => {
    window.removeEventListener('popstate', handlePopState);
    if (nativeListener) {
      nativeListener.remove();
    }
  };
}
