'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker (public/sw.js) on the client.
 * Purely additive: no UI, no app logic. Registration is skipped in
 * development to avoid caching during local work.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registration failure must never break the app */
      });
    };

    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
