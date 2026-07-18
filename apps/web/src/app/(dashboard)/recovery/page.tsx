'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { recoveryApi } from '@/lib/api';
import { RecoveryModal } from '@/components/recovery/RecoveryModal';

/* ─── helpers ───────────────────────────────────────────── */
function CapLabel({ children, mb = 0 }: { children: React.ReactNode; mb?: number }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '.14em',
      color: 'hsl(var(--content-tertiary))', textTransform: 'uppercase', margin: 0, marginBottom: mb,
    }}>
      {children}
    </p>
  );
}

function scoreColor(score: number) {
  if (score >= 80) return 'hsl(var(--success))';
  if (score >= 60) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}
function scoreLabel(score: number) {
  if (score >= 80) return 'Ottimo';
  if (score >= 60) return 'Discreto';
  return 'Scarso';
}

/* ─── recovery ring ─────────────────────────────────────── */
function RecoveryRing({ score }: { score: number }) {
  const r = (190 - 12) / 2;
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
        <circle cx={95} cy={95} r={r} fill="none" stroke="hsl(var(--surface-3))" strokeWidth={12} />
        <circle
          cx={95} cy={95} r={r}
          fill="none"
          stroke={color}
          strokeWidth={12}
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
        <span style={{ fontSize: 50, fontWeight: 700, color: 'hsl(var(--foreground))', lineHeight: 1 }}>
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
  color?: string;
}
function FactorTile({ label, value, color }: FactorTileProps) {
  return (
    <div
      className="card-inner"
      style={{
        padding: '18px 8px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 6,
      }}
    >
      <span
        className={`tabular-nums${color ? '' : ' text-content-disabled'}`}
        style={{ fontSize: 22, fontWeight: 700, color }}
      >
        {value}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '.1em',
        color: 'hsl(var(--content-tertiary))', textTransform: 'uppercase', textAlign: 'center',
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
        const hasScore = score > 0;
        const barH = hasScore ? Math.max(6, Math.round((score / 100) * MAX_H)) : 4;
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
            {hasScore && (
              <span style={{ fontSize: 10, color: 'hsl(var(--content-secondary))', fontWeight: 600 }}>
                {score}
              </span>
            )}
            {/* bar */}
            <div
              className={isToday ? 'border border-border-strong' : ''}
              style={{
                width: '100%',
                height: barH,
                background: hasScore ? 'hsl(var(--accent))' : 'hsl(var(--surface-3))',
                borderRadius: '4px 4px 0 0',
                minHeight: 4,
              }}
            />
            {/* day label */}
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: isToday ? 'hsl(var(--foreground))' : 'hsl(var(--content-tertiary))',
            }}>
              {dayLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}

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

  /* real data present? — the API only sets hasData true when a RecoveryLog
     actually exists; otherwise it returns nulls, never fabricated numbers */
  const hasData = !!latest?.hasData;
  const rec = latest ?? {};
  const score        = Math.round(rec.score ?? 0);
  const sleepHours   = rec.sleepHours   ?? 0;
  const sleepQuality = rec.sleepQuality ?? 0;
  const stressLevel  = rec.stressLevel  ?? 0;
  const energyLevel  = rec.energyLevel  ?? 0;
  const steps        = rec.steps        ?? 0;

  const history: Array<{ date: string; score: number }> = historyRaw ?? [];

  /* factor colors */
  const sleepColor  = sleepHours >= 7.5 ? 'hsl(var(--success))' : sleepHours >= 6 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';
  const qualColor   = sleepQuality >= 7 ? 'hsl(var(--success))' : sleepQuality >= 5 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';
  const stressColor = stressLevel <= 3 ? 'hsl(var(--success))' : stressLevel <= 6 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';
  const energyColor = energyLevel >= 7 ? 'hsl(var(--success))' : energyLevel >= 5 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))';

  return (
    <>
      <div className="animate-fade-up" style={{ maxWidth: 1180 }}>
        <div className="resp-stack" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>

          {/* ── LEFT: Recovery Score ── */}
          <div
            className="card"
            style={{
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0,
            }}
          >
            <CapLabel mb={18}>Recovery Score</CapLabel>

            <RecoveryRing score={hasData ? score : 0} />

            <div style={{ marginTop: 20, width: '100%' }}>
              <button
                onClick={() => setOpen(true)}
                className="btn-hero rounded-xl"
                style={{
                  width: '100%',
                  padding: '12px 15px',
                  fontSize: 13,
                }}
              >
                Registra recupero di oggi
              </button>
            </div>

            {!hasData && (
              <p style={{ fontSize: 11, color: 'hsl(var(--content-tertiary))', marginTop: 10 }}>
                Nessun dato ancora — registra il tuo primo recupero
              </p>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Fattori di oggi */}
            <div className="card">
              <CapLabel mb={18}>Fattori di oggi</CapLabel>
              <div className="resp-tiles" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10 }}>
                <FactorTile
                  label="Sonno"
                  value={hasData ? `${sleepHours}h` : '—'}
                  color={hasData ? sleepColor : undefined}
                />
                <FactorTile
                  label="Qualità"
                  value={hasData ? `${sleepQuality}/10` : '—'}
                  color={hasData ? qualColor : undefined}
                />
                <FactorTile
                  label="Stress"
                  value={hasData ? `${stressLevel}/10` : '—'}
                  color={hasData ? stressColor : undefined}
                />
                <FactorTile
                  label="Energia"
                  value={hasData ? `${energyLevel}/10` : '—'}
                  color={hasData ? energyColor : undefined}
                />
                <FactorTile
                  label="Passi"
                  value={hasData ? (steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : String(steps)) : '—'}
                  color={hasData ? (steps >= 8000 ? 'hsl(var(--success))' : steps >= 5000 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))') : undefined}
                />
              </div>
            </div>

            {/* Ultimi 7 giorni */}
            <div className="card" style={{ flex: 1 }}>
              <CapLabel mb={18}>Ultimi 7 giorni</CapLabel>
              {history.length > 0 ? (
                <WeekBarChart history={history} />
              ) : (
                /* placeholder bars when no history */
                <WeekBarChart history={[]} />
              )}
              {history.length === 0 && (
                <p style={{ fontSize: 12, color: 'hsl(var(--content-tertiary))', textAlign: 'center', marginTop: 8 }}>
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
