'use client';

import { Bell, Plus } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/workout': 'Allenamento',
  '/nutrition': 'Nutrizione',
  '/progress': 'Progressi',
  '/coach': 'AI Coach',
  '/achievements': 'Achievement',
  '/settings': 'Impostazioni',
};

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const title = Object.entries(pageTitles).find(([path]) => pathname.startsWith(path))?.[1] || 'Athena AI';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6 py-4 bg-background/95 backdrop-blur-xl border-b border-border">
      <h1 className="text-xl font-bold text-foreground">{title}</h1>
      <div className="flex items-center gap-2">
        <Button
          variant="gradient"
          size="sm"
          onClick={() => router.push('/workout/session')}
          className="hidden sm:flex"
        >
          <Plus className="w-4 h-4" />
          Inizia Allenamento
        </Button>
        <button className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors relative">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
        </button>
      </div>
    </header>
  );
}
