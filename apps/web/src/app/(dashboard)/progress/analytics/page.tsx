'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '@/lib/api';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

/* ─── Keyframes ─── */
const KEYFRAMES = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes barGrow {
    from { transform: scaleX(0); transform-origin: left; }
    to   { transform: scaleX(1); transform-origin: left; }
  }
`;

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

const FALLBACK_MUSCLE = [
  { muscle: 'CHEST',    series: 38 },
  { muscle: 'BACK',     series: 44 },
  { muscle: 'LEGS',     series: 52 },
  { muscle: 'SHOULDERS',series: 32 },
  { muscle: 'BICEPS',   series: 24 },
  { muscle: 'TRICEPS',  series: 26 },
];

const FALLBACK_FREQ = [
  { day: 'Lun', sessions: 3 },
  { day: 'Mar', sessions: 5 },
  { day: 'Mer', sessions: 2 },
  { day: 'Gio', sessions: 4 },
  { day: 'Ven', sessions: 5 },
  { day: 'Sab', sessions: 1 },
  { day: 'Dom', sessions: 0 },
];

const LABEL_CAPS: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '.14em',
  color: '#6b7280',
  textTransform: 'uppercase',
};

const CARD: React.CSSProperties = {
  background: '#111118',
  border: '1px solid #1e1e2e',
  borderRadius: 20,
  padding: 24,
  animation: 'fadeUp .4s ease',
};

const PERIODS = [
  { label: '4 settimane', value: '4' },
  { label: '8 settimane', value: '8' },
  { label: '12 settimane', value: '12' },
];

const BAR_GRADIENTS = [
  'linear-gradient(90deg,#6366f1,#8b5cf6)',
  'linear-gradient(90deg,#22c55e,#4ade80)',
  'linear-gradient(90deg,#6366f1,#8b5cf6)',
  'linear-gradient(90deg,#22c55e,#4ade80)',
  'linear-gradient(90deg,#6366f1,#8b5cf6)',
  'linear-gradient(90deg,#22c55e,#4ade80)',
];

const tooltipStyle: React.CSSProperties = {
  background: '#111118',
  border: '1px solid #1e1e2e',
  borderRadius: 12,
  color: '#e7e7ee',
  fontSize: 12,
};

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('8');
  const weeks = parseInt(period, 10);

  const { data: muscle } = useQuery({
    queryKey: ['analytics-muscle', weeks],
    queryFn: () => analyticsApi.volumeByMuscle(weeks),
    select: (res: any) => (Array.isArray(res?.data) ? res.data : null) as Array<{ muscle: string; volume: number }> | null,
  });

  const { data: trend } = useQuery({
    queryKey: ['analytics-trend', weeks],
    queryFn: () => analyticsApi.volumeTrend(weeks),
    select: (res: any) => (Array.isArray(res?.data) ? res.data : null) as Array<{ week: string; volume: number }> | null,
  });

  const { data: frequency } = useQuery({
    queryKey: ['analytics-frequency', weeks],
    queryFn: () => analyticsApi.frequency(weeks),
    select: (res: any) => (Array.isArray(res?.data) ? res.data : null) as Array<{ day: string; sessions: number }> | null,
  });

  /* Use API data when available, otherwise fall back */
  const muscleData = (muscle ?? []).length > 0
    ? (muscle as any[]).map(m => ({
        label: MUSCLE_LABELS[m.muscle] ?? m.muscle,
        series: Math.round(m.volume / 1000),
      }))
    : FALLBACK_MUSCLE.map(m => ({ label: MUSCLE_LABELS[m.muscle], series: m.series }));

  const trendData = (trend ?? []).length > 0
    ? (trend as any[]).map(t => ({ label: t.week?.slice(5) ?? t.week, volume: t.volume }))
    : [];

  const freqData = (frequency ?? []).length > 0
    ? (frequency as any[]).map(f => ({ day: DAY_LABELS[f.day] ?? f.day, sessions: f.sessions }))
    : FALLBACK_FREQ;

  const maxSeries  = Math.max(...muscleData.map(m => m.series), 1);
  const maxSessions = Math.max(...freqData.map(f => f.sessions), 1);

  return (
    <>
      <style>{KEYFRAMES}</style>

      <div style={{ maxWidth: 1180, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Back + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/progress" aria-label="Torna ai progressi">
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: '#15151d', border: '1px solid #1e1e2e',
              color: '#a1a1b5', cursor: 'pointer',
            }}>
              <ChevronLeft size={18} />
            </div>
          </Link>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#e7e7ee' }}>Analytics</span>
        </div>

        {/* Period chips */}
        <div style={{ display: 'flex', gap: 8 }}>
          {PERIODS.map(p => {
            const active = p.value === period;
            return (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                style={active ? {
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  border: 'none',
                  color: '#fff',
                  padding: '9px 16px',
                  borderRadius: 11,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                } : {
                  background: '#15151d',
                  border: '1px solid #2a2a3a',
                  color: '#a1a1b5',
                  padding: '9px 16px',
                  borderRadius: 11,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Card: Volume per gruppo muscolare */}
          <div style={CARD}>
            <div style={{ ...LABEL_CAPS, marginBottom: 20 }}>Volume per gruppo muscolare</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {muscleData.map((m, i) => {
                const pct = Math.round((m.series / maxSeries) * 100);
                return (
                  <div key={m.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: '#e7e7ee' }}>{m.label}</span>
                      <span style={{ fontSize: 12, color: '#6b7280' }}>{m.series} serie</span>
                    </div>
                    <div style={{ height: 8, background: '#1a1a24', borderRadius: 5, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 5,
                          background: BAR_GRADIENTS[i % BAR_GRADIENTS.length],
                          width: `${pct}%`,
                          animation: 'barGrow .9s ease both',
                          animationDelay: `${i * 0.08}s`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card: Trend volume totale */}
          <div style={CARD}>
            <div style={{ ...LABEL_CAPS, marginBottom: 20 }}>Trend volume totale</div>
            {trendData.length > 0 ? (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`${(v / 1000).toFixed(1)} t`, 'Volume']} />
                    <Area type="monotone" dataKey="volume" stroke="#6366f1" strokeWidth={2} fill="url(#volGrad)" dot={false} animationDuration={1000} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Completa allenamenti per vedere il trend</span>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Frequenza per giorno */}
        <div style={CARD}>
          <div style={{ ...LABEL_CAPS, marginBottom: 20 }}>Frequenza per giorno</div>
          <div style={{
            height: 150,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 12,
            paddingBottom: 28,
            position: 'relative',
          }}>
            {freqData.map((d, i) => {
              const barH = maxSessions > 0 ? Math.round((d.sessions / maxSessions) * 110) : 0;
              return (
                <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 40 }}>
                  <div style={{
                    width: '100%',
                    height: barH || 4,
                    minHeight: 4,
                    borderRadius: '6px 6px 4px 4px',
                    background: d.sessions > 0
                      ? 'linear-gradient(180deg,#22c55e,#4ade80)'
                      : '#1a1a24',
                    transition: 'height .4s ease',
                    animation: 'fadeUp .4s ease',
                    animationDelay: `${i * 0.07}s`,
                    animationFillMode: 'both',
                  }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280' }}>{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </>
  );
}
