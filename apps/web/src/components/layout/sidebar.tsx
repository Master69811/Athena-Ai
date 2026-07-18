'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { authApi, progressionApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/modal';
import { NAV_ICONS, isNavItemActive, type NavIconName } from './nav-items';

const NAV: Array<{ href: string; label: string; icon: NavIconName; exact?: boolean }> = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/workout/session', label: 'Sessione live', icon: 'session', exact: true },
  { href: '/workout', label: 'Piano workout', icon: 'workout', exact: true },
  { href: '/nutrition', label: 'Nutrizione', icon: 'nutrition' },
  { href: '/recovery', label: 'Recupero', icon: 'recovery' },
  { href: '/progress', label: 'Progress', icon: 'progress', exact: true },
  { href: '/progress/analytics', label: 'Analytics', icon: 'analytics' },
  { href: '/coach', label: 'AI Coach', icon: 'coach' },
  { href: '/achievements', label: 'Achievement', icon: 'achievements' },
  { href: '/settings', label: 'Impostazioni', icon: 'settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [logoutOpen, setLogoutOpen] = useState(false);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['progression-unread-count'],
    queryFn: async () => {
      const res = await progressionApi.getUnreadCount() as any;
      return res.data;
    },
    staleTime: 60_000,
    enabled: !!user,
  });

  const confirmLogout = async () => {
    setLogoutOpen(false);
    await authApi.logout().catch(() => {});
    logout();
    router.push('/login');
  };

  const name = user?.profile?.name || user?.email || 'Utente';
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 h-screen z-40"
      style={{
        width: 248,
        background: 'rgba(17,17,24,.7)',
        backdropFilter: 'blur(20px)',
        borderRight: '1px solid #1e1e2e',
        padding: '22px 16px',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '6px 8px 22px' }}>
        <div
          className="rounded-lg"
          style={{
            width: 34, height: 34,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 18, color: '#fff',
          }}
        >
          A
        </div>
        <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-.4px', color: '#e7e7ee' }}>Athena</div>
      </div>

      {/* Nav */}
      <nav aria-label="Navigazione principale" style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
        {NAV.map(({ href, label, icon, exact }) => {
          const isActive = isNavItemActive(pathname, href, exact);
          const Icon = NAV_ICONS[icon];
          return (
            <Link
              key={href}
              href={href}
              style={{ textDecoration: 'none' }}
              aria-current={isActive ? 'page' : undefined}
            >
              <div
                className={
                  'relative flex items-center gap-[11px] px-3 py-[10px] rounded-xl text-[13.5px] font-semibold cursor-pointer transition-colors ' +
                  (isActive ? 'text-foreground' : 'text-content-secondary hover:bg-surface-3 hover:text-foreground')
                }
                style={{ background: isActive ? 'hsl(var(--primary)/.12)' : undefined }}
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
                    style={{ width: 3, height: 16, background: 'hsl(var(--primary))' }}
                    aria-hidden="true"
                  />
                )}
                <Icon size={19} strokeWidth={2} />
                <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
                {href === '/progress' && !isActive && (unreadData?.count ?? 0) > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: '#fff',
                    background: '#6366f1', padding: '1px 6px', borderRadius: 20,
                  }}>
                    {(unreadData?.count ?? 0) > 9 ? '9+' : unreadData?.count}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div className="card-inner" style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            style={{
              width: 36, height: 36, borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 15, color: '#fff',
              cursor: 'pointer', flexShrink: 0,
            }}
            onClick={() => setLogoutOpen(true)}
            title="Esci"
            aria-label="Esci dall'account"
          >
            {initials}
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: '#e7e7ee',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {name}
            </div>
            <div style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 600 }}>
              {user?.subscriptionTier === 'PRO' ? 'PRO · attivo' : 'FREE · attivo'}
            </div>
          </div>
        </div>
      </div>

      <Modal open={logoutOpen} onClose={() => setLogoutOpen(false)} title="Vuoi uscire dall'account?">
        <div className="flex gap-3 pt-1">
          <button type="button" className="btn-secondary flex-1 h-10 rounded-xl text-sm" onClick={() => setLogoutOpen(false)}>
            Annulla
          </button>
          <button
            type="button"
            className="flex-1 h-10 rounded-xl text-sm font-semibold bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
            onClick={confirmLogout}
          >
            Esci
          </button>
        </div>
      </Modal>
    </aside>
  );
}
