'use client';

import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

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

function Clock() {
  const now = new Date();
  const time = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'short' });
  const dateCapitalized = date.charAt(0).toUpperCase() + date.slice(1);
  return (
    <div style={{ textAlign: 'right', lineHeight: 1.25 }}>
      <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#e7e7ee' }}>{time}</div>
      <div style={{ fontSize: 11, color: '#6b7280' }}>{dateCapitalized}</div>
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
      style={{
        flexNone: 'none',
        height: 68,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '0 32px',
        borderBottom: '1px solid #1e1e2e',
        background: 'rgba(9,9,15,.6)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      } as React.CSSProperties}
    >
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.3px', color: '#e7e7ee' }}>{title}</div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>{subtitle}</div>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
        <Clock />

        {/* Sync badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#111118', border: '1px solid #1e1e2e',
          padding: '7px 11px', borderRadius: 11,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 9px #22c55e', display: 'inline-block' }} />
          <span style={{ fontSize: 11.5, color: '#a1a1b5', fontWeight: 600 }}>Sync</span>
        </div>

        {/* Streak badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          background: '#111118', border: '1px solid #1e1e2e',
          padding: '8px 13px', borderRadius: 11,
        }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2s4 5 4 9a4 4 0 0 1-8 0c0-2 1.5-4 1.5-4" />
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e7e7ee' }}>14</span>
          <span style={{ fontSize: 12, color: '#6b7280' }}>giorni</span>
        </div>

        {/* Avatar */}
        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 15, color: '#fff', cursor: 'pointer',
        }}>
          {initials}
        </div>
      </div>
    </header>
  );
}
