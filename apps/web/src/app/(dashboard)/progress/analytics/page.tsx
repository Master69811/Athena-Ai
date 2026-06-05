'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell,
} from 'recharts';
import { BarChart3, Dumbbell, CalendarDays, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

const MUSCLE_LABELS: Record<string, string> = {
  CHEST: 'Petto', BACK: 'Schiena', SHOULDERS: 'Spalle', BICEPS: 'Bicipiti',
  TRICEPS: 'Tricipiti', LEGS: 'Gambe', QUADS: 'Quadricipiti', HAMSTRINGS: 'Femorali',
  GLUTES: 'Glutei', CALVES: 'Polpacci', ABS: 'Addominali', CORE: 'Core', FOREARMS: 'Avambracci',
};

const DAY_LABELS: Record<string, string> = {
  Monday: 'Lun', Tuesday: 'Mar', Wednesday: 'Mer', Thursday: 'Gio',
  Friday: 'Ven', Saturday: 'Sab', Sunday: 'Dom',
  Mon: 'Lun', Tue: 'Mar', Wed: 'Mer', Thu: 'Gio', Fri: 'Ven', Sat: 'Sab', Sun: 'Dom',
};

const BAR_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#a855f7'];

const tooltipStyle = {
  background: 'hsl(240 10% 10%)',
  border: '1px solid hsl(240 8% 14%)',
  borderRadius: '12px',
  color: 'hsl(0 0% 98%)',
};

function AnalyticsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-muted" />
      <div className="h-64 rounded-2xl bg-muted" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-56 rounded-2xl bg-muted" />
        <div className="h-56 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-52 gap-2 text-center">
      <BarChart3 className="w-9 h-9 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground/70">Completa alcuni allenamenti per vedere i dati.</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: muscle, isLoading: l1 } = useQuery({
    queryKey: ['analytics-muscle'],
    queryFn: () => analyticsApi.volumeByMuscle(4),
    select: (res: any) => (Array.isArray(res?.data) ? res.data : []) as Array<{ muscle: string; volume: number }>,
  });

  const { data: trend, isLoading: l2 } = useQuery({
    queryKey: ['analytics-trend'],
    queryFn: () => analyticsApi.volumeTrend(12),
    select: (res: any) => (Array.isArray(res?.data) ? res.data : []) as Array<{ week: string; volume: number }>,
  });

  const { data: frequency, isLoading: l3 } = useQuery({
    queryKey: ['analytics-frequency'],
    queryFn: () => analyticsApi.frequency(8),
    select: (res: any) => (Array.isArray(res?.data) ? res.data : []) as Array<{ day: string; sessions: number }>,
  });

  if (l1 || l2 || l3) return <AnalyticsSkeleton />;

  const muscleData = (muscle ?? []).map(m => ({ ...m, label: MUSCLE_LABELS[m.muscle] ?? m.muscle, t: (m.volume / 1000).toFixed(1) }));
  const trendData = (trend ?? []).map(t => ({ ...t, label: t.week?.slice(5) ?? t.week, volumeT: Math.round(t.volume / 1000 * 10) / 10 }));
  const freqData = (frequency ?? []).map(f => ({ ...f, label: DAY_LABELS[f.day] ?? f.day }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/progress" aria-label="Torna ai progressi" className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all touch-manipulation">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      {/* Weekly volume trend */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <CardTitle>Volume Settimanale (ultime 12 sett.)</CardTitle>
          </div>
        </CardHeader>
        {trendData.length > 0 ? (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(239,84%,67%)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(239,84%,67%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(240 5% 55%)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(240 5% 55%)' }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${(v / 1000).toFixed(1)} t`, 'Volume']} />
                <Area type="monotone" dataKey="volume" stroke="hsl(239,84%,67%)" strokeWidth={2} fill="url(#volGrad)" dot={false} animationDuration={1000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart label="Nessun dato di volume ancora" />
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Volume by muscle group */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-primary" />
              <CardTitle>Volume per Gruppo (4 sett.)</CardTitle>
            </div>
          </CardHeader>
          {muscleData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={muscleData} layout="vertical" margin={{ left: 8 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(240 5% 55%)' }} tickLine={false} axisLine={false} hide />
                  <YAxis type="category" dataKey="label" width={80} tick={{ fontSize: 11, fill: 'hsl(240 5% 70%)' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(240 8% 14% / 0.4)' }} formatter={(v: any) => [`${(v / 1000).toFixed(1)} t`, 'Volume']} />
                  <Bar dataKey="volume" radius={[0, 6, 6, 0]} animationDuration={900}>
                    {muscleData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart label="Nessun volume registrato" />
          )}
        </Card>

        {/* Training frequency by day */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              <CardTitle>Frequenza (8 sett.)</CardTitle>
            </div>
          </CardHeader>
          {freqData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={freqData}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(240 5% 55%)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(240 5% 55%)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(240 8% 14% / 0.4)' }} formatter={(v: any) => [`${v}`, 'Sessioni']} />
                  <Bar dataKey="sessions" fill="hsl(262 80% 65%)" radius={[6, 6, 0, 0]} animationDuration={900} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart label="Nessuna sessione ancora" />
          )}
        </Card>
      </div>
    </div>
  );
}
