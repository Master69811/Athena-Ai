'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Dumbbell, Apple, TrendingUp, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/workout', icon: Dumbbell, label: 'Allenamento' },
  { href: '/nutrition', icon: Apple, label: 'Nutrizione' },
  { href: '/progress', icon: TrendingUp, label: 'Progressi' },
  { href: '/coach', icon: MessageCircle, label: 'Coach' },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-xl border-t border-border">
      <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} className="flex-1">
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="flex flex-col items-center gap-1 py-1"
              >
                <div className={cn('p-1.5 rounded-xl transition-all duration-200', isActive && 'bg-primary/10')}>
                  <item.icon className={cn('w-5 h-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                </div>
                <span className={cn('text-xs', isActive ? 'text-primary font-medium' : 'text-muted-foreground')}>
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
