'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { Topbar } from './topbar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user, hasHydrated } = useAuthStore();

  useEffect(() => {
    // CRITICAL: do nothing until zustand-persist has rehydrated from
    // localStorage. On the first client render the store holds its initial
    // state (isAuthenticated:false) even for a genuinely logged-in user;
    // acting before hydration finishes bounced people straight back to
    // /login right after a successful login — the "black screen" loop.
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (user && user.profile && !user.profile.onboardingCompleted) {
      router.replace('/onboarding');
    }
  }, [hasHydrated, isAuthenticated, user, router]);

  // Show a spinner (never a blank screen) while hydrating or redirecting.
  if (!hasHydrated || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-border-strong border-t-primary animate-spin" aria-label="Caricamento..." />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'radial-gradient(1000px 500px at 75% -10%, hsl(var(--primary)/.06), transparent 60%), hsl(var(--background))',
        position: 'relative',
      }}
    >
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Sidebar />
        <div className="lg:ml-[248px] min-h-screen flex flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </div>
  );
}
