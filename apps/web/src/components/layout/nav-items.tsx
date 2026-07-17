/**
 * Shared navigation icon set + active-state helper used by both the
 * desktop sidebar and the mobile bottom nav, so the two stay visually
 * in sync. Icons are lucide-react components, referenced directly by
 * consumers (e.g. `const Icon = NAV_ICONS[icon]; <Icon size={19} />`).
 */

import {
  LayoutGrid,
  Timer,
  Dumbbell,
  Flame,
  Moon,
  TrendingUp,
  BarChart3,
  MessageCircle,
  Award,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';

export const NAV_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutGrid,
  session: Timer,
  workout: Dumbbell,
  nutrition: Flame,
  recovery: Moon,
  progress: TrendingUp,
  analytics: BarChart3,
  coach: MessageCircle,
  achievements: Award,
  settings: SlidersHorizontal,
};

export type NavIconName = keyof typeof NAV_ICONS;

export function isNavItemActive(pathname: string, href: string, exact?: boolean): boolean {
  return exact ? pathname === href : pathname.startsWith(href);
}
