/**
 * Shared navigation icon paths + renderer used by both the desktop
 * sidebar and the mobile bottom nav, so the two stay visually in sync.
 *
 * Each icon is a set of SVG path segments concatenated with ' M' —
 * NavIcon splits them back into individual <path> elements.
 */

export const NAV_ICONS = {
  dashboard: 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z',
  session: 'M6.5 6.5v11 M17.5 6.5v11 M3 9.5v5 M21 9.5v5 M6.5 12h11',
  workout: 'M8 6h13 M8 12h13 M8 18h13 M3.5 6h.01 M3.5 12h.01 M3.5 18h.01',
  nutrition: 'M12 3s4 4.5 4 9a4 4 0 0 1-8 0c0-2 1.2-3.6 1.2-3.6',
  recovery: 'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z',
  progress: 'M3 17l6-6 4 4 8-8 M21 7h-5 M21 7v5',
  analytics: 'M3 3v18h18 M7 16v-5 M12 16V8 M17 16v-9',
  coach: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  achievements: 'M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M8.5 13.5L7 21l5-3 5 3-1.5-7.5',
  settings: 'M4 21v-7 M4 10V3 M12 21v-9 M12 8V3 M20 21v-5 M20 12V3 M1 14h6 M9 8h6 M17 16h6',
} as const;

export type NavIconName = keyof typeof NAV_ICONS;

export function NavIcon({ name, size = 19 }: { name: NavIconName; size?: number }) {
  const d = NAV_ICONS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d.split(' M').map((seg, i) => (
        <path key={i} d={i === 0 ? seg : 'M' + seg} />
      ))}
    </svg>
  );
}

export function isNavItemActive(pathname: string, href: string, exact?: boolean): boolean {
  return exact ? pathname === href : pathname.startsWith(href);
}
