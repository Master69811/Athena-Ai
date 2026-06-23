'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { Topbar } from './topbar';

const HEX_GRID = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='56' height='96' viewBox='0 0 56 96'><path d='M28 0L52 14v28L28 56L4 42V14Z M28 56L52 70v28 M28 56L4 70v28' fill='none' stroke='%236366f1' stroke-width='1' stroke-opacity='0.05'/></svg>")`;

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
        background: 'radial-gradient(1200px 600px at 80% -10%, rgba(99,102,241,.10), transparent 60%), radial-gradient(900px 500px at 10% 110%, rgba(139,92,246,.08), transparent 55%), #09090f',
        position: 'relative',
      }}
    >
      {/* Hex grid texture */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.5,
          backgroundImage: HEX_GRID,
          zIndex: 0,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <Sidebar />
        <div className="lg:ml-[248px] min-h-screen flex flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-8 pb-24 lg:pb-8">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </div>
  );
}
