'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { NavIcon, isNavItemActive, type NavIconName } from './nav-items';

const NAV: Array<{ href: string; label: string; icon: NavIconName; exact?: boolean }> = [
  { href: '/dashboard', label: 'Home', icon: 'dashboard' },
  { href: '/workout', label: 'Workout', icon: 'workout', exact: true },
  { href: '/nutrition', label: 'Nutrizione', icon: 'nutrition' },
  { href: '/recovery', label: 'Recupero', icon: 'recovery' },
  { href: '/coach', label: 'Coach', icon: 'coach' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
      aria-label="Navigazione principale"
      style={{
        background: 'rgba(17,17,24,.92)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid #1e1e2e',
        // Keep the nav clear of the iOS home indicator (viewportFit: cover).
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {NAV.map(({ href, label, icon, exact }) => {
          const isActive = isNavItemActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              style={{ flex: 1, textDecoration: 'none' }}
            >
              <motion.div whileTap={{ scale: 0.9 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '4px 0' }}>
                <div style={{
                  padding: 6, borderRadius: 10,
                  background: isActive ? 'rgba(99,102,241,.15)' : 'transparent',
                  color: isActive ? '#8b5cf6' : '#6b7280',
                  transition: 'all .15s',
                }}>
                  <NavIcon name={icon} size={22} />
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
