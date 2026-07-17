'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { authApi, gamificationApi } from '@/lib/api';
import { NavIcon } from './nav-items';

const PAGE_META: Record<string, [string, string]> = {
  '/dashboard':          ['Dashboard', 'La tua giornata in un colpo d\'occhio'],
  '/workout/session':    ['Sessione live', 'Registra le tue serie in tempo reale'],
  '/workout':            ['Piano workout', 'Il tuo programma adattivo'],
  '/nutrition':          ['Nutrizione', 'Diario alimentare di oggi'],
  '/recovery':           ['Recupero', 'Sonno, stress ed energia'],
  '/progress/analytics': ['Analytics', 'Carico e frequenza di allenamento'],
  '/progress':           ['Progress', 'La tua evoluzione nel tempo'],
  '/coach':              ['AI Coach', 'Athena conosce tutto il tuo profilo'],
  '/achievements':       ['Achievement', 'I traguardi che hai sbloccato'],
  '/settings':           ['Impostazioni', 'Profilo, abbonamento e preferenze'],
};

function getPageMeta(pathname: string): [string, string] {
  for (const [path, meta] of Object.entries(PAGE_META)) {
    if (pathname === path || pathname.startsWith(path + '/')) {
      return meta;
    }
  }
  return ['Athena AI', 'Centro di comando'];
}

/**
 * Live clock. Rendered only after mount (and ticking every 30s) so the
 * server-rendered HTML never contains a timestamp that differs from the
 * client's — avoiding a React hydration mismatch.
 */
function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <div style={{ width: 90 }} aria-hidden="true" />;
  }

  const time = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' });
  const dateCapitalized = date.charAt(0).toUpperCase() + date.slice(1);
  return (
    <div style={{ textAlign: 'right', lineHeight: 1.25 }}>
      <time style={{ display: 'block', fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#e7e7ee' }}>{time}</time>
      <div style={{ fontSize: 11, color: '#6b7280' }}>{dateCapitalized}</div>
    </div>
  );
}

/** Workout streak badge — hidden until real data is available (no fake numbers). */
function StreakBadge({ enabled }: { enabled: boolean }) {
  const { data } = useQuery<{ current: number }>({
    queryKey: ['gamification-streaks'],
    queryFn: async () => {
      const res = (await gamificationApi.getStreaks()) as any;
      const streaks = res.data;
      // API may return a list of streaks or a single object.
      const workout = Array.isArray(streaks)
        ? streaks.find((s: any) => s.type === 'WORKOUT') ?? streaks[0]
        : streaks;
      return { current: workout?.currentCount ?? workout?.current ?? 0 };
    },
    staleTime: 5 * 60 * 1000,
    enabled,
  });

  if (!data || data.current <= 0) return null;

  return (
    <div
      title={`Streak di allenamento: ${data.current} giorni`}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        background: '#111118', border: '1px solid #1e1e2e',
        padding: '8px 13px', borderRadius: 11,
      }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2s4 5 4 9a4 4 0 0 1-8 0c0-2 1.5-4 1.5-4" />
      </svg>
      <span style={{ fontSize: 13, fontWeight: 700, color: '#e7e7ee' }}>{data.current}</span>
      <span style={{ fontSize: 12, color: '#6b7280' }}>giorni</span>
    </div>
  );
}

/**
 * Account menu anchored to the avatar button. This is the only way to reach
 * Progress / Achievement / Impostazioni / logout on small screens, since the
 * full sidebar is desktop-only (`hidden lg:flex`) — so it must stay usable
 * at every viewport size, not just `lg:`.
 */
function AccountMenu({ name, initials }: { name: string; initials: string }) {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  const handleLogout = async () => {
    setOpen(false);
    if (!window.confirm("Vuoi uscire dall'account?")) return;
    await authApi.logout().catch(() => {});
    logout();
    router.push('/login');
  };

  const menuItems: Array<{ href: string; label: string; icon: Parameters<typeof NavIcon>[0]['name'] }> = [
    { href: '/progress', label: 'Progress', icon: 'progress' },
    { href: '/achievements', label: 'Achievement', icon: 'achievements' },
    { href: '/settings', label: 'Impostazioni', icon: 'settings' },
  ];

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account di ${name}`}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        style={{
          width: 38, height: 38, borderRadius: 11, border: 'none',
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 15, color: '#fff', flexShrink: 0,
          cursor: 'pointer',
        }}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={`Account di ${name}`}
          style={{
            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
            minWidth: 200, zIndex: 50,
            background: '#111118', border: '1px solid #1e1e2e',
            borderRadius: 14, padding: 6,
            boxShadow: '0 12px 32px rgba(0,0,0,.45)',
          }}
        >
          <div style={{ padding: '8px 10px 6px', fontSize: 12.5, fontWeight: 600, color: '#e7e7ee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name}
          </div>
          {menuItems.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              role="menuitem"
              onClick={() => setOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 9,
                fontSize: 13.5, fontWeight: 600, color: '#c7c7d4',
                textDecoration: 'none',
              }}
              className="sidebar-item"
            >
              <NavIcon name={icon} size={17} />
              {label}
            </Link>
          ))}
          <div style={{ height: 1, background: '#1e1e2e', margin: '6px 4px' }} />
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 10px', borderRadius: 9, border: 'none', background: 'transparent',
              fontSize: 13.5, fontWeight: 600, color: '#f87171', cursor: 'pointer', textAlign: 'left',
            }}
            className="sidebar-item"
          >
            Esci
          </button>
        </div>
      )}

      <style>{`
        .sidebar-item:hover { background: #1a1a24 !important; }
      `}</style>
    </div>
  );
}

export function Topbar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [title, subtitle] = getPageMeta(pathname);

  const name = user?.profile?.name || user?.email || 'Utente';
  const initials = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header
      className="px-4 sm:px-6 lg:px-8"
      style={{
        flex: 'none',
        height: 68,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        borderBottom: '1px solid #1e1e2e',
        background: 'rgba(9,9,15,.6)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.3px', color: '#e7e7ee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
        <div className="hidden sm:block" style={{ fontSize: 12, color: '#6b7280' }}>{subtitle}</div>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="hidden md:block">
          <Clock />
        </div>

        {/* Sync badge */}
        <div
          className="hidden sm:flex"
          style={{
            alignItems: 'center', gap: 6,
            background: '#111118', border: '1px solid #1e1e2e',
            padding: '7px 11px', borderRadius: 11,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 9px #22c55e', display: 'inline-block' }} aria-hidden="true" />
          <span style={{ fontSize: 11.5, color: '#a1a1b5', fontWeight: 600 }}>Sync</span>
        </div>

        <StreakBadge enabled={!!user} />

        {/* Avatar + account menu (only mobile path to Progress/Achievement/Impostazioni/logout) */}
        <AccountMenu name={name} initials={initials} />
      </div>
    </header>
  );
}
