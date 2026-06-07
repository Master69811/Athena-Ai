'use client';

import { useEffect, useState } from 'react';
import { X, Share, PlusSquare } from 'lucide-react';

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    };

    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return <IosBanner />;
}

function IosBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    const dismissed = sessionStorage.getItem('ios-pwa-dismissed');

    if (isIos && !isStandalone && !dismissed) {
      // Delay to not interrupt initial page load
      const t = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:hidden">
      <div className="bg-surface-elevated border border-border rounded-2xl p-4 shadow-2xl shadow-black/40 flex gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground mb-1">Aggiungi alla schermata Home</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tocca{' '}
            <Share className="w-3.5 h-3.5 inline-block mb-0.5 text-blue-400" />
            {' '}poi <span className="font-medium text-foreground">"Aggiungi alla schermata Home"</span>{' '}
            <PlusSquare className="w-3.5 h-3.5 inline-block mb-0.5" />
            {' '}per usare Athena come app nativa.
          </p>
        </div>
        <button
          onClick={() => { setShow(false); sessionStorage.setItem('ios-pwa-dismissed', '1'); }}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
