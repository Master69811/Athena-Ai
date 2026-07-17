'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { Topbar } from './topbar';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (user && user.profile && !user.profile.onboardingCompleted) {
      router.replace('/onboarding');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated) return null;

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
