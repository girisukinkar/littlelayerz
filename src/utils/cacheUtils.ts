/**
 * Universal Cache & Storage Utility
 * Clears localStorage, sessionStorage, service worker caches, and reloads the app cleanly.
 */
export async function clearUniversalCache(reload = true): Promise<void> {
  try {
    // 1. Clear LocalStorage
    localStorage.clear();

    // 2. Clear SessionStorage
    sessionStorage.clear();

    // 3. Clear Service Worker / CacheStorage if available
    if ('caches' in window && window.caches) {
      try {
        const cacheKeys = await window.caches.keys();
        await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
      } catch (err) {
        console.warn('Error clearing CacheStorage:', err);
      }
    }
  } catch (err) {
    console.error('Error during universal cache clear:', err);
  }

  if (reload) {
    window.location.href = '/dashboard';
  }
}
