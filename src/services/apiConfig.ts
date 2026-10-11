/**
 * Central API Configuration & Dynamic Base URL Resolver
 * Ensures seamless operation across both Web Browser and Capacitor Android/Play Store App.
 */

export const CLOUD_BACKEND_ORIGIN = 'https://ais-pre-6twbajs3vsvw72beceozo4-117943534727.asia-southeast1.run.app';

/**
 * Detects if the current runtime is inside an Android/Capacitor native package
 */
export function isNativeAndroidApp(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.protocol === 'capacitor:' ||
    window.location.protocol === 'file:' ||
    (window.location.hostname === 'localhost' && (!window.location.port || window.location.port === '' || window.location.port === '80' || window.location.port === '443'))
  );
}

/**
 * Returns appropriate base URL for backend calls
 */
export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  if (isNativeAndroidApp()) {
    return CLOUD_BACKEND_ORIGIN;
  }
  return '';
}

/**
 * Constructs a fully qualified API endpoint URL
 */
export function buildApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const base = getApiBaseUrl();
  return `${base}${cleanEndpoint}`;
}
