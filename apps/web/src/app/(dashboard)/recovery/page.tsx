'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { recoveryApi } from '@/lib/api';
import { RecoveryModal } from '@/components/recovery/RecoveryModal';

/* ─── keyframes ─────────────────────────────────────────── */
const STYLES = `
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(14px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

/* ─── helpers ───────────────────────────────────────────── */
function CapLabel({ children, mb = 0 }: { children: React.ReactNode; mb?: number }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '.14em',
      color: '#6b7280', textTransform: 'uppercase', margin: 0, marginBottom: mb,
    }}>
      {children}
    </p>
  );
}

function scoreColor(score: number) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}
function scoreLabel(score: number) {
  if (score >= 80) return 'Ottimo';
  if (score >= 60) return 'Discreto';
  return 'Scarso';
}

/* ─── recovery ring ─────────────────────────────────────── */
function RecoveryRing({ score }: { score: number }) {
  const r = (190 - 15) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, score / 100);
  const color = scoreColor(score);
  const label = scoreLabel(score);

  return (
    <div style={{ position: 'relative', width: 190, height: 190, margin: '0 auto' }}>
      <svg
        width={190} height={190}
        style={{ transform: 'rotate(-90deg)', display: 'block' }}
      >
        <circle cx={95} cy={95} r={r} fill="none" stroke="#1a1a24" strokeWidth={15} />
        <circle
          cx={95} cy={95} r={r}
          fill="none"
          stroke={color}
          strokeWidth={15}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 4,
      }}>
        <span style={{ fontSize: 50, fontWeight: 800, color: '#e7e7ee', lineHeight: 1 }}>
          {score}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{label}</span>
      </div>
    </div>
  );
}

/* ─── factor tile ───────────────────────────────────────── */
interface FactorTileProps {
  label: string;
  value: string;
  color: string;
}
function FactorTile({ label, value, color }: FactorTileProps) {
  return (
    <div style={{
      background: '#15151d',
      border: '1px solid #1e1e2e',
      borderRadius: 14,
      padding: '18px 8px',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 6,
    }}>
      <span style={{ fontSize: 22, fontWeight: 800, color }}>{value}</span>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '.1em',
        color: '#6b7280', textTransform: 'uppercase', textAlign: 'center',
      }}>
        {label}
      </span>
    </div>
  );
}

/* ─── 7-day bar chart ───────────────────────────────────── */
const DAY_LABELS = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'];

interface WeekBarChartProps {
  history: Array<{ date: string; score: number }>;
}
function WeekBarChart({ history }: WeekBarChartProps) {
  const MAX_H = 80;
  const today = new Date().toISOString().split('T')[0];

  // build last-7-day slots
  const slots = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = DAY_LABELS[d.getDay() === 0 ? 6 : d.getDay() - 1];
    const entry = history.find(h => h.date === dateStr);
    return { dateStr, dayLabel, score: entry?.score ?? 0, isToday: dateStr === today };
  });

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
      gap: 8, padding: '8px 0',
    }}>
      {slots.map(({ dateStr, dayLabel, score, isToday }) => {
        const barH = score > 0 ? Math.max(6, Math.round((score / 100) * MAX_H)) : 6;
        return (
          <div
            key={dateStr}
            style={{
              flex: 1,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 6,
            }}
          >
            {/* score label above */}
            {score > 0 && (
              <span style={{ fontSize: 10, color: '#a1a1b5', fontWeight: 600 }}>
                {score}
              </span>
            )}
            {/* bar */}
            <div
              style={{
                width: '100%',
                height: barH,
                background: '#8b5cf6',
                opacity: isToday ? 1 : 0.4,
                borderRadius: '4px 4px 0 0',
                minHeight: 6,
              }}
            />
            {/* day label */}
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: isToday ? '#e7e7ee' : '#6b7280',
            }}>
              {dayLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── fallback data ─────────────────────────────────────── */
const FALLBACK = {
  score: 92,
  sleepHours: 8.2,
  sleepQuality: 9,
  stressLevel: 2,
  energyLevel: 9,
  steps: 9400,
};

/* ─── page ──────────────────────────────────────────────── */
export default function RecoveryPage() {
  const [open, setOpen] = useState(false);

  const { data: latest } = useQuery({
    queryKey: ['recovery-latest'],
    queryFn: recoveryApi.getLatest,
    select: (res: any) => res.data,
  });

  const { data: historyRaw } = useQuery({
    queryKey: ['recovery-history', 7],
    queryFn: () => recoveryApi.getHistory(7),
    select: (res: any) => (Array.isArray(res.data) ? res.data : []) as Array<{ date: string; score: number }>,
  });

  /* use API data or fallback */
  const rec = latest ?? FALLBACK;
  const score        = Math.round(rec.score ?? FALLBACK.score);
  const sleepHours   = rec.sleepHours   ?? FALLBACK.sleepHours;
  const sleepQuality = rec.sleepQuality ?? FALLBACK.sleepQuality;
  const stressLevel  = rec.stressLevel  ?? FALLBACK.stressLevel;
  const energyLevel  = rec.energyLevel  ?? FALLBACK.energyLevel;
  const steps        = rec.steps        ?? FALLBACK.steps;

  const history: Array<{ date: string; score: number }> = historyRaw ?? [];

  /* factor colors */
  const sleepColor  = sleepHours >= 7.5 ? '#22c55e' : sleepHours >= 6 ? '#f59e0b' : '#ef4444';
  const qualColor   = sleepQuality >= 7 ? '#22c55e' : sleepQuality >= 5 ? '#f59e0b' : '#ef4444';
  const stressColor = stressLevel <= 3 ? '#22c55e' : stressLevel <= 6 ? '#f59e0b' : '#ef4444';
  const energyColor = energyLevel >= 7 ? '#22c55e' : energyLevel >= 5 ? '#f59e0b' : '#ef4444';

  return (
    <>
      <style>{STYLES}</style>

      <div style={{ maxWidth: 1180, animation: 'fadeUp .4s ease' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>

          {/* ── LEFT: Recovery Score ── */}
          <div style={{
            background: '#111118',
            border: '1px solid rgba(34,197,94,.18)',
            boxShadow: '0 0 50px rgba(34,197,94,.12)',
            borderRadius: 20,
            padding: 24,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0,
          }}>
            <CapLabel mb={18}>Recovery Score</CapLabel>

            <RecoveryRing score={score} />

            <div style={{ marginTop: 20, width: '100%' }}>
              <button
                onClick={() => setOpen(true)}
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  border: 'none',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Registra recupero di oggi
              </button>
            </div>

            {!latest && (
              <p style={{ fontSize: 11, color: '#6b7280', marginTop: 10 }}>
                Dati di esempio — registra il tuo recupero
              </p>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Fattori di oggi */}
            <div style={{
              background: '#111118',
              border: '1px solid #1e1e2e',
              borderRadius: 20,
              padding: 24,
            }}>
              <CapLabel mb={18}>Fattori di oggi</CapLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
                <FactorTile
                  label="Sonno"
                  value={`${sleepHours}h`}
                  color={sleepColor}
                />
                <FactorTile
                  label="Qualità"
                  value={`${sleepQuality}/10`}
                  color={qualColor}
                />
                <FactorTile
                  label="Stress"
                  value={`${stressLevel}/10`}
                  color={stressColor}
                />
                <FactorTile
                  label="Energia"
                  value={`${energyLevel}/10`}
                  color={energyColor}
                />
                <FactorTile
                  label="Passi"
                  value={steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : String(steps)}
                  color={steps >= 8000 ? '#22c55e' : steps >= 5000 ? '#f59e0b' : '#ef4444'}
                />
              </div>
            </div>

            {/* Ultimi 7 giorni */}
            <div style={{
              background: '#111118',
              border: '1px solid #1e1e2e',
              borderRadius: 20,
              padding: 24,
              flex: 1,
            }}>
              <CapLabel mb={18}>Ultimi 7 giorni</CapLabel>
              {history.length > 0 ? (
                <WeekBarChart history={history} />
              ) : (
                /* placeholder bars when no history */
                <WeekBarChart history={[]} />
              )}
              {history.length === 0 && (
                <p style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 8 }}>
                  Registra il recupero ogni giorno per vedere il tuo andamento
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <RecoveryModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
