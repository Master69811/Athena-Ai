'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Flame } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { authApi, gamificationApi } from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { NAV_ICONS } from './nav-items';

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
    <div className="chip" title={`Streak di allenamento: ${data.current} giorni`}>
      <Flame size={16} strokeWidth={2} className="text-warning" />
      <span style={{ marginLeft: 6, fontWeight: 700 }}>{data.current}</span>
      <span style={{ marginLeft: 4, color: 'hsl(var(--content-tertiary))', fontWeight: 500 }}>giorni</span>
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
  const [logoutOpen, setLogoutOpen] = useState(false);
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

  const confirmLogout = async () => {
    setLogoutOpen(false);
    await authApi.logout().catch(() => {});
    logout();
    router.push('/login');
  };

  const menuItems: Array<{ href: string; label: string; icon: keyof typeof NAV_ICONS }> = [
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
          className="card-overlay"
          style={{
            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
            minWidth: 200, zIndex: 50, padding: 6,
          }}
        >
          <div style={{ padding: '8px 10px 6px', fontSize: 12.5, fontWeight: 600, color: '#e7e7ee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {name}
          </div>
          {menuItems.map(({ href, label, icon }) => {
            const Icon = NAV_ICONS[icon];
            return (
              <Link
                key={href}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="rounded-lg hover:bg-surface-3"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 10px',
                  fontSize: 13.5, fontWeight: 600, color: '#c7c7d4',
                  textDecoration: 'none',
                }}
              >
                <Icon size={17} strokeWidth={2} />
                {label}
              </Link>
            );
          })}
          <div style={{ height: 1, background: '#1e1e2e', margin: '6px 4px' }} />
          <button
            type="button"
            role="menuitem"
            onClick={() => { setOpen(false); setLogoutOpen(true); }}
            className="rounded-lg hover:bg-surface-3"
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '9px 10px', border: 'none', background: 'transparent',
              fontSize: 13.5, fontWeight: 600, color: '#f87171', cursor: 'pointer', textAlign: 'left',
            }}
          >
            Esci
          </button>
        </div>
      )}

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
        <h1 className="text-heading" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</h1>
        <div className="hidden sm:block text-caption text-content-tertiary">{subtitle}</div>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div className="hidden md:block">
          <Clock />
        </div>

        <StreakBadge enabled={!!user} />

        {/* Avatar + account menu (only mobile path to Progress/Achievement/Impostazioni/logout) */}
        <AccountMenu name={name} initials={initials} />
      </div>
    </header>
  );
}
