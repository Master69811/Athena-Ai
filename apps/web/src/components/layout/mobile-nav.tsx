'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d.split(' M').map((seg, i) => <path key={i} d={i === 0 ? seg : 'M' + seg} />)}
    </svg>
  );
}

const NAV = [
  { href: '/dashboard',   label: 'Home',       icon: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z' },
  { href: '/workout',     label: 'Workout',    icon: 'M8 6h13 M8 12h13 M8 18h13 M3.5 6h.01 M3.5 12h.01 M3.5 18h.01', exact: true },
  { href: '/nutrition',   label: 'Nutrizione', icon: 'M12 3s4 4.5 4 9a4 4 0 0 1-8 0c0-2 1.2-3.6 1.2-3.6' },
  { href: '/recovery',    label: 'Recupero',   icon: 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z' },
  { href: '/coach',       label: 'Coach',      icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{ background: 'rgba(17,17,24,.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid #1e1e2e' }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {NAV.map(({ href, label, icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link key={href} href={href} style={{ flex: 1, textDecoration: 'none' }}>
              <motion.div whileTap={{ scale: 0.9 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 0' }}>
                <div style={{
                  padding: 6, borderRadius: 10,
                  background: isActive ? 'rgba(99,102,241,.15)' : 'transparent',
                  color: isActive ? '#8b5cf6' : '#6b7280',
                  transition: 'all .15s',
                }}>
                  <NavIcon d={icon} />
                </div>
                <span style={{ fontSize: 11, color: isActive ? '#a5b4fc' : '#6b7280', fontWeight: isActive ? 600 : 400 }}>{label}</span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
