'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  usersApi, workoutApi, recoveryApi, nutritionApi,
  progressionApi, bodyWeightApi, nutritionEngineApi,
} from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { RecoveryModal } from '@/components/recovery/RecoveryModal';
import { toast } from 'sonner';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

/* ─── Types ─── */
type ReadinessAdaptation = {
  intensity: 'full' | 'moderate' | 'reduced' | 'rest';
  setMultiplier: number;
  rpeAdjustment: number;
  titleIt: string;
  detailIt: string;
  color: 'green' | 'yellow' | 'orange' | 'red';
};
type Readiness = {
  hasData: boolean;
  score: number;
  engineAction: string;
  adaptation: ReadinessAdaptation;
  summary: string;
};

const READINESS_COLOR = { green: '#22c55e', yellow: '#eab308', orange: '#f97316', red: '#ef4444' };

/* ─── SVG helpers ─── */
function RecoveryRingPro({ score, size = 170, sw = 13 }: { score: number; size?: number; sw?: number }) {
  const r = (size - sw) / 2;
  const cx = size / 2;
  const c = 2 * Math.PI * r;
  const col = score <= 40 ? ['#ef4444', '#f87171'] : score <= 70 ? ['#eab308', '#fbbf24'] : ['#22c55e', '#5ee89a'];
  const id = `ring-${size}`;
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const a = (i / 60) * 2 * Math.PI;
    const inner = r + sw / 2 + 4;
    const outer = inner + (i % 5 === 0 ? 6 : 3);
    return { x1: cx + Math.cos(a) * inner, y1: cx + Math.sin(a) * inner, x2: cx + Math.cos(a) * outer, y2: cx + Math.sin(a) * outer, major: i % 5 === 0 };
  });
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <linearGradient id={id + 'g'} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={col[0]} />
          <stop offset="100%" stopColor={col[1]} />
        </linearGradient>
        <filter id={id + 'f'} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g>
        {ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#2a2a3a" strokeWidth={t.major ? 1.4 : 0.7} />
        ))}
      </g>
      <g transform={`rotate(-90 ${cx} ${cx})`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#16161f" strokeWidth={sw} />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={`url(#${id}g)`} strokeWidth={sw}
          strokeLinecap="round" strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(100, score)) / 100)}
          filter={`url(#${id}f)`}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}
        />
      </g>
    </svg>
  );
}

function DonutRing({ pct, size = 190, sw = 15, color = '#6366f1' }: { pct: number; size?: number; sw?: number; color?: string }) {
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a1a24" strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        style={{ transition: 'stroke-dashoffset .8s ease' }}
      />
    </svg>
  );
}

function EcgWave() {
  const w = 420, h = 58, mid = h / 2;
  let d = `M0 ${mid}`;
  for (let s = 0; s < 5; s++) {
    const x = s * 84;
    d += ` L${x + 20} ${mid} L${x + 30} ${mid} L${x + 36} ${mid - 3} L${x + 42} ${mid + 22} L${x + 48} ${mid - 26} L${x + 54} ${mid + 6} L${x + 60} ${mid} L${x + 84} ${mid}`;
  }
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="ecgg" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.1} />
          <stop offset="50%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>
      <path d={d} fill="none" stroke="url(#ecgg)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      <circle r={3.5} fill="#fff" style={{ filter: 'drop-shadow(0 0 5px #8b5cf6)' }}>
        <animateMotion dur="3s" repeatCount="indefinite" path={d} rotate="0" />
      </circle>
    </svg>
  );
}

function MacroBar({ pct, gradient }: { pct: number; gradient: string }) {
  return (
    <div style={{ height: 9, background: '#1a1a24', borderRadius: 6, overflow: 'hidden' }}>
      <div style={{
        width: `${Math.min(100, pct)}%`, height: '100%', borderRadius: 6,
        background: gradient, transformOrigin: 'left',
        animation: 'barGrow .9s cubic-bezier(.4,0,.2,1)',
      }} />
    </div>
  );
}

/* ─── Count-up hook ─── */
function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * ease));
      if (p < 1) requestAnimationFrame(step);
    };
    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [target, duration]);
  return val;
}

/* ─── Dashboard Skeleton ─── */
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-[#1a1a24] rounded-xl ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div style={{ maxWidth: 1240, animation: 'fadeUp .4s ease' }}>
      <div style={{ display: 'flex', gap: 24, marginBottom: 22 }}>
        <div style={{ flex: 1 }}>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-4 w-48 mb-4" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[0,1,2,3].map(i => <Skeleton key={i} className="w-28 h-24 rounded-2xl" />)}
        </div>
      </div>
      <div className="resp-stack" style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─── */
export default function DashboardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: usersApi.getDashboard,
    select: (res: any) => res.data,
  });

  const { data: recovery } = useQuery({
    queryKey: ['recovery-latest'],
    queryFn: recoveryApi.getLatest,
    select: (res: any) => res.data,
  });

  const { data: readiness } = useQuery<Readiness | null>({
    queryKey: ['recovery-readiness'],
    queryFn: async () => (await recoveryApi.getReadiness() as any) ?? null,
    staleTime: 5 * 60_000,
  });

  const { data: activePlan } = useQuery({
    queryKey: ['active-plan'],
    queryFn: workoutApi.getActivePlan,
    select: (res: any) => res.data,
  });

  const { data: todayNutrition } = useQuery({
    queryKey: ['nutrition-today'],
    queryFn: () => nutritionApi.getDailyLog(new Date().toISOString().split('T')[0]),
    select: (res: any) => res.data,
  });

  const { data: nutritionPlan } = useQuery({
    queryKey: ['nutrition-plan'],
    queryFn: nutritionApi.getPlan,
    select: (res: any) => res.data,
  });

  const { data: latestInsights } = useQuery({
    queryKey: ['progression-insights-dashboard'],
    queryFn: async () => {
      const res = await progressionApi.getInsights({ limit: 3, unreadOnly: false }) as any;
      return res.data;
    },
    staleTime: 60_000,
  });

  const { data: weightSnapshot } = useQuery({
    queryKey: ['weight-snapshot'],
    queryFn: async () => {
      const res = await bodyWeightApi.getSnapshot() as any;
      return res.data as { ma7d: number; ma14d: number; weeklyRateKg: number } | null;
    },
    staleTime: 5 * 60_000,
  });

  const { data: nutritionDecisions } = useQuery({
    queryKey: ['nutrition-decisions-dashboard'],
    queryFn: async () => {
      const res = await nutritionEngineApi.getDecisions({ limit: 3, unreadOnly: false }) as any;
      return res.data as Array<{ id: string; type: string; deltaCalories: number; rationale: string }>;
    },
    staleTime: 60_000,
  });

  const applyDecisionMutation = useMutation({
    mutationFn: (id: string) => nutritionEngineApi.applyDecision(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-decisions-dashboard'] });
      toast.success('Decisione applicata!');
    },
    onError: () => toast.error('Errore nell\'applicare la decisione'),
  });

  const hasRecoveryData = recovery?.score != null;
  const recoveryScore = recovery?.score ?? 0;
  const recoveryDisplay = useCountUp(recoveryScore);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Buongiorno';
    if (h < 18) return 'Buon pomeriggio';
    return 'Buona sera';
  })();
  const userName = user?.profile?.name?.split(' ')[0] || 'Atleta';

  const recoveryStatusColor = readiness?.hasData
    ? READINESS_COLOR[readiness.adaptation.color]
    : recoveryScore >= 80 ? '#22c55e' : recoveryScore >= 60 ? '#eab308' : '#ef4444';

  const recoveryTitle = readiness?.hasData ? readiness.adaptation.titleIt
    : recoveryScore >= 80 ? 'Pronto a spingere' : recoveryScore >= 60 ? 'Allenamento moderato' : 'Recupero necessario';

  const recoveryDetail = readiness?.hasData ? readiness.adaptation.detailIt
    : 'Sonno e HRV in linea. Athena consiglia un carico pieno sull\'allenamento di forza di oggi.';

  const cal = todayNutrition?.totals;
  const kcalConsumed = (cal?.protein?.consumed ?? 0) * 4 + (cal?.carbs?.consumed ?? 0) * 4 + (cal?.fat?.consumed ?? 0) * 9;
  const kcalTarget = nutritionPlan?.dailyCalories ?? null;
  const hasMacroTargets = cal != null || nutritionPlan != null;

  const protTarget = cal?.protein?.target ?? nutritionPlan?.proteinG ?? 0;
  const carbTarget = cal?.carbs?.target ?? nutritionPlan?.carbsG ?? 0;
  const fatTarget = cal?.fat?.target ?? nutritionPlan?.fatG ?? 0;

  const protPct = protTarget ? (cal?.protein?.consumed ?? 0) / protTarget : 0;
  const carbPct = carbTarget ? (cal?.carbs?.consumed ?? 0) / carbTarget : 0;
  const fatPct  = fatTarget ? (cal?.fat?.consumed ?? 0) / fatTarget : 0;

  const protLabel = hasMacroTargets ? `${cal?.protein?.consumed ?? 0} / ${protTarget || '—'} g` : '—';
  const carbLabel = hasMacroTargets ? `${cal?.carbs?.consumed ?? 0} / ${carbTarget || '—'} g` : '—';
  const fatLabel  = hasMacroTargets ? `${cal?.fat?.consumed ?? 0} / ${fatTarget || '—'} g` : '—';

  // The plan endpoint only returns `days` (no server-computed "next workout"),
  // so derive today's session the same way apps/web/.../workout/page.tsx does.
  const todayDayIndex = new Date().getDay();
  const nextWorkoutDay = activePlan?.days?.find((d: any) => d.dayIndex === todayDayIndex) ?? activePlan?.days?.[0];
  const exercises = nextWorkoutDay?.exercises?.slice(0, 4) ?? [];

  const weekSessions = dashboard?.workoutsThisWeek ?? 0;
  const weekVolume = dashboard?.totalVolumeThisWeek
    ? (dashboard.totalVolumeThisWeek / 1000).toFixed(1)
    : null;

  const decisions = (nutritionDecisions ?? []).slice(0, 3).map((d, i) => {
    const icons = [
      'M3 17l6-6 4 4 8-8 M21 7h-5 M21 7v5',
      'M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z',
      'M6.5 6.5v11 M17.5 6.5v11 M6.5 12h11',
    ];
    return {
      icon: icons[i % icons.length],
      title: d.type === 'CALORIE_INCREASE' ? `Calorie · +${d.deltaCalories} kcal`
        : d.type === 'CALORIE_DECREASE' ? `Calorie · ${d.deltaCalories} kcal`
        : 'Nutrizione · Mantenimento',
      body: d.rationale,
    };
  });

  const weightChartData = (dashboard?.weightTrend ?? []).map((p: { date: string; weight: number }, i: number) => ({ x: i, v: p.weight }));

  if (dashboardLoading) return <DashboardSkeleton />;

  return (
    <div style={{ maxWidth: 1240, animation: 'fadeUp .4s ease' }}>

      {/* ── Hero band ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 22, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.9px', lineHeight: 1.05, color: '#e7e7ee' }}>
            {greeting}, {userName}
          </div>
          <div style={{ fontSize: 14, color: '#a1a1b5', marginTop: 6 }}>
            {dashboard?.aiInsightOfTheDay || 'Sei al massimo della forma — è il momento di spingere.'}
          </div>
          <div style={{ marginTop: 14, opacity: .9 }}>
            <EcgWave />
          </div>
        </div>

        {/* Recovery score pill — the only "vital" the backend actually provides */}
        {hasRecoveryData && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div
              className="vital-pill"
              style={{
                background: '#111118', border: '1px solid #1e1e2e', borderRadius: 16,
                padding: '14px 16px', minWidth: 112, transition: 'transform .2s, border-color .2s', cursor: 'default',
              }}
            >
              <div style={{ fontSize: 10.5, color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em' }}>Recovery</div>
              <div style={{ margin: '7px 0 9px', letterSpacing: '-.5px' }}>
                <span style={{ fontSize: 23, fontWeight: 800, color: '#e7e7ee' }}>{recoveryScore}</span>
                <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}> / 100</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Two-column grid ── */}
      <div className="resp-stack" style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 20 }}>

        {/* ──── Left column ──── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Recovery card */}
          <div
            style={{
              background: '#111118', border: `1px solid rgba(${recoveryScore >= 70 ? '34,197,94' : recoveryScore >= 40 ? '234,179,8' : '239,68,68'},.18)`,
              borderRadius: 20, padding: 24,
              boxShadow: `0 0 50px rgba(${recoveryScore >= 70 ? '34,197,94' : '234,179,8'},.12)`,
              transition: 'transform .2s, box-shadow .2s',
            }}
            className="recovery-card"
          >
            <div className="label-caps" style={{ marginBottom: 18 }}>Recovery di oggi</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
              <div style={{ position: 'relative', width: 170, height: 170, flexShrink: 0 }}>
                <RecoveryRingPro score={recoveryScore} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1, letterSpacing: -1, color: '#e7e7ee' }}>{recoveryDisplay}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, marginTop: 2 }}>/ 100</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: recoveryStatusColor, marginBottom: 6 }}>{recoveryTitle}</div>
                <div style={{ fontSize: 13.5, color: '#a1a1b5', lineHeight: 1.55, marginBottom: 16 }}>{recoveryDetail}</div>
                {readiness?.hasData && readiness.adaptation.intensity !== 'full' && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: '#1e1e2e', color: '#d1d5db', fontWeight: 600 }}>
                      Volume {Math.round(readiness.adaptation.setMultiplier * 100)}%
                    </span>
                    {readiness.adaptation.rpeAdjustment !== 0 && (
                      <span style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: '#1e1e2e', color: '#d1d5db', fontWeight: 600 }}>
                        RPE {readiness.adaptation.rpeAdjustment > 0 ? '+' : ''}{readiness.adaptation.rpeAdjustment}
                      </span>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setRecoveryOpen(true)}
                  className="btn-outline-athena"
                  style={{
                    background: '#1a1a24', border: '1px solid #2a2a3a', color: '#e7e7ee',
                    padding: '10px 16px', borderRadius: 11, fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color .15s',
                  }}
                >
                  Registra recupero
                </button>
              </div>
            </div>
          </div>

          {/* Macro card */}
          <div className="card-athena">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div className="label-caps">Macro di oggi</div>
              <div style={{ fontSize: 12, color: '#a1a1b5' }}>
                <b style={{ color: '#e7e7ee' }}>{Math.round(kcalConsumed)}</b> / {kcalTarget ?? '—'} kcal
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { name: 'Proteine', label: protLabel, pct: protPct, gradient: 'linear-gradient(90deg,#6366f1,#8b5cf6)' },
                { name: 'Carboidrati', label: carbLabel, pct: carbPct, gradient: 'linear-gradient(90deg,#22c55e,#4ade80)' },
                { name: 'Grassi', label: fatLabel, pct: fatPct, gradient: 'linear-gradient(90deg,#f59e0b,#fbbf24)' },
              ].map(m => (
                <div key={m.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 7 }}>
                    <span style={{ fontWeight: 600, color: '#e7e7ee' }}>{m.name}</span>
                    <span style={{ color: '#a1a1b5' }}>{m.label}</span>
                  </div>
                  <MacroBar pct={m.pct * 100} gradient={m.gradient} />
                </div>
              ))}
            </div>
          </div>

          {/* Decisioni di Athena */}
          <div className="card-athena">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 7,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#fff',
              }}>A</div>
              <div className="label-caps">Decisioni di Athena</div>
            </div>
            {decisions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {decisions.map((d, i) => (
                  <div key={i} style={{
                    display: 'flex', gap: 13, padding: 14, borderRadius: 13,
                    background: '#15151d', border: '1px solid #1e1e2e',
                  }}>
                    <div style={{
                      width: 34, height: 34, flexShrink: 0, borderRadius: 9,
                      background: 'rgba(99,102,241,.14)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        {d.icon.split(' M').map((seg, j) => <path key={j} d={j === 0 ? seg : 'M' + seg} />)}
                      </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2, color: '#e7e7ee' }}>{d.title}</div>
                      <div style={{ fontSize: 12.5, color: '#a1a1b5', lineHeight: 1.5 }}>{d.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#6b7280', padding: '8px 2px' }}>
                Nessuna decisione disponibile al momento.
              </div>
            )}
          </div>
        </div>

        {/* ──── Right column ──── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Prossimo allenamento */}
          <div style={{
            background: 'linear-gradient(135deg,#15131f,#111118)',
            border: '1px solid rgba(99,102,241,.25)', borderRadius: 20, padding: 24,
            position: 'relative', overflow: 'hidden', transition: 'transform .2s, box-shadow .2s',
          }} className="workout-card">
            <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'radial-gradient(circle,rgba(99,102,241,.22),transparent 70%)', pointerEvents: 'none' }} />
            <div className="label-caps" style={{ marginBottom: 14 }}>Prossimo allenamento</div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-.5px', marginBottom: 4, color: '#e7e7ee' }}>
              {nextWorkoutDay?.name || 'Nessun allenamento programmato'}
            </div>
            <div style={{ fontSize: 13, color: '#a1a1b5', marginBottom: 16 }}>
              {nextWorkoutDay?.muscleGroups?.join(', ') || (activePlan ? 'Giorno di riposo' : 'Nessun piano attivo')}
            </div>
            {exercises.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
                {exercises.map((e: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 14px', background: 'rgba(255,255,255,.025)',
                    border: '1px solid #1e1e2e', borderRadius: 11,
                  }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: '#e7e7ee' }}>
                      {e.exercise?.nameIt || e.exercise?.name}
                    </span>
                    <span style={{ fontSize: 12.5, color: '#a1a1b5' }}>
                      {e.sets}×{e.repsMin === e.repsMax ? e.repsMin : `${e.repsMin}-${e.repsMax}`}{e.rpeTarget ? ` · RPE ${e.rpeTarget}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
                {activePlan ? 'Riposo oggi — nessun esercizio programmato.' : 'Crea un piano di allenamento per iniziare.'}
              </div>
            )}
            <button
              onClick={() => router.push('/workout/session')}
              style={{
                width: '100%', padding: 14, border: 'none', borderRadius: 13,
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: '#fff', fontSize: 14.5, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 10px 30px rgba(99,102,241,.35)',
              }}
              className="start-btn"
            >
              Inizia sessione →
            </button>
          </div>

          {/* Volume + Sessioni */}
          <div className="resp-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card-athena" style={{ padding: 20 }}>
              <div className="label-caps" style={{ marginBottom: 10 }}>Volume settimana</div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1, color: '#e7e7ee' }}>
                {weekVolume ?? '—'}<span style={{ fontSize: 15, color: '#6b7280', fontWeight: 600 }}> t</span>
              </div>
            </div>
            <div className="card-athena" style={{ padding: 20 }}>
              <div className="label-caps" style={{ marginBottom: 10 }}>Sessioni</div>
              <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: -1, color: '#e7e7ee' }}>
                {weekSessions}<span style={{ fontSize: 15, color: '#6b7280', fontWeight: 600 }}> / 5</span>
              </div>
              <div style={{ fontSize: 12, color: '#a1a1b5', fontWeight: 500, margin: '4px 0 14px' }}>questa settimana</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 8, borderRadius: 4,
                    background: i < weekSessions ? 'linear-gradient(90deg,#22c55e,#4ade80)' : '#1a1a24',
                    boxShadow: i < weekSessions ? '0 0 8px rgba(34,197,94,.5)' : undefined,
                  }} />
                ))}
              </div>
            </div>
          </div>

          {/* Trend peso */}
          <div className="card-athena" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
              <div className="label-caps">Trend peso · 8 settimane</div>
              {weightSnapshot && (
                <div style={{ marginLeft: 'auto', fontSize: 13, color: '#22c55e', fontWeight: 700 }}>
                  {weightSnapshot.weeklyRateKg < 0 ? `${weightSnapshot.weeklyRateKg.toFixed(1)} kg/sett.` : `+${weightSnapshot.weeklyRateKg.toFixed(1)} kg/sett.`}
                </div>
              )}
            </div>
            {weightChartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={weightChartData}>
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#weightGrad)" dot={false} />
                  <Tooltip
                    contentStyle={{ background: '#15151d', border: '1px solid #1e1e2e', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: any) => [`${v} kg`, 'Peso']}
                    labelFormatter={() => ''}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#6b7280' }}>
                Registra il tuo peso per vedere il trend.
              </div>
            )}
          </div>
        </div>
      </div>

      <RecoveryModal open={recoveryOpen} onClose={() => {
        setRecoveryOpen(false);
        queryClient.invalidateQueries({ queryKey: ['recovery-latest'] });
        queryClient.invalidateQueries({ queryKey: ['recovery-readiness'] });
      }} />

      <style>{`
        .vital-pill:hover { transform: translateY(-3px); border-color: #2a2a3a !important; }
        .recovery-card:hover { transform: translateY(-3px); }
        .workout-card:hover { transform: translateY(-3px); box-shadow: 0 0 60px rgba(99,102,241,.22); }
        .start-btn:hover { filter: brightness(1.08); }
        .btn-outline-athena:hover { border-color: #6366f1 !important; }
      `}</style>
    </div>
  );
}
