'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker (public/sw.js) and keeps it fresh:
 * checks for updates on load, and when a new worker takes control it
 * reloads the page once so users never stay stuck on a stale build.
 * Registration is skipped in development.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    let reloaded = false;
    const onControllerChange = () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Poke for an update immediately, and take over if one is waiting.
          reg.update().catch(() => {});
          if (reg.waiting) reg.waiting.postMessage('SKIP_WAITING');
          reg.addEventListener('updatefound', () => {
            const nw = reg.installing;
            if (!nw) return;
            nw.addEventListener('statechange', () => {
              if (nw.state === 'installed' && navigator.serviceWorker.controller) {
                nw.postMessage('SKIP_WAITING');
              }
            });
          });
        })
        .catch(() => {
          /* registration failure must never break the app */
        });
    };

    window.addEventListener('load', register);
    return () => {
      window.removeEventListener('load', register);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  return null;
}
