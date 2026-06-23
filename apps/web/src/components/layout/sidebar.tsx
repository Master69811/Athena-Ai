'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { authApi, progressionApi } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

const NAV = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
  },
  {
    href: '/workout/session',
    label: 'Sessione live',
    icon: 'M6.5 6.5v11 M17.5 6.5v11 M3 9.5v5 M21 9.5v5 M6.5 12h11',
    exact: true,
  },
  {
    href: '/workout',
    label: 'Piano workout',
    icon: 'M8 6h13 M8 12h13 M8 18h13 M3.5 6h.01 M3.5 12h.01 M3.5 18h.01',
    exact: true,
  },
  {
    href: '/nutrition',
    label: 'Nutrizione',
    icon: 'M12 3s4 4.5 4 9a4 4 0 0 1-8 0c0-2 1.2-3.6 1.2-3.6',
  },
  {
    href: '/recovery',
    label: 'Recupero',
    icon: 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z',
  },
  {
    href: '/progress',
    label: 'Progress',
    icon: 'M3 17l6-6 4 4 8-8 M21 7h-5 M21 7v5',
    exact: true,
  },
  {
    href: '/progress/analytics',
    label: 'Analytics',
    icon: 'M3 3v18h18 M7 16v-5 M12 16V8 M17 16v-9',
  },
  {
    href: '/coach',
    label: 'AI Coach',
    icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  },
  {
    href: '/achievements',
    label: 'Achievement',
    icon: 'M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M8.5 13.5L7 21l5-3 5 3-1.5-7.5',
  },
  {
    href: '/settings',
    label: 'Impostazioni',
    icon: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
  },
];

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d.split(' M').map((seg, i) => (
        <path key={i} d={i === 0 ? seg : 'M' + seg} />
      ))}
    </svg>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['progression-unread-count'],
    queryFn: async () => {
      const res = await progressionApi.getUnreadCount() as any;
      return res.data;
    },
    staleTime: 60_000,
    enabled: !!user,
  });

  const handleLogout = async () => {
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
          className="animate-logo-pulse"
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 800, fontSize: 18, color: '#fff',
          }}
        >
          A
        </div>
        <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-.4px', color: '#e7e7ee' }}>Athena</div>
        <span style={{
          marginLeft: 'auto', fontSize: 9, fontWeight: 700, letterSpacing: '.12em',
          color: '#8b5cf6', border: '1px solid rgba(139,92,246,.35)',
          padding: '3px 6px', borderRadius: 6,
        }}>
          AI
        </span>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
        {NAV.map(({ href, label, icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '10px 12px', borderRadius: 11,
                  fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                  transition: 'all .15s',
                  background: isActive ? 'linear-gradient(135deg,rgba(99,102,241,.18),rgba(139,92,246,.12))' : 'transparent',
                  color: isActive ? '#fff' : '#8b8b9a',
                }}
                className={!isActive ? 'sidebar-item' : ''}
              >
                <NavIcon d={icon} />
                <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
                {isActive && (
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#8b5cf6', boxShadow: '0 0 10px #8b5cf6',
                  }} />
                )}
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
      <div
        style={{
          marginTop: 14, padding: 12, borderRadius: 14,
          background: 'linear-gradient(135deg,rgba(99,102,241,.14),rgba(139,92,246,.10))',
          border: '1px solid rgba(99,102,241,.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 15, color: '#fff',
              cursor: 'pointer',
            }}
            onClick={handleLogout}
            title="Esci"
          >
            {initials}
          </div>
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

      <style>{`
        .sidebar-item:hover { background: #1a1a24 !important; color: #e7e7ee !important; }
      `}</style>
    </aside>
  );
}
