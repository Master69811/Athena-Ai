'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { TrendingUp, Moon, Dumbbell } from 'lucide-react';
import {
  usersApi, workoutApi, recoveryApi, nutritionApi,
  progressionApi, bodyWeightApi, nutritionEngineApi,
} from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { RecoveryModal } from '@/components/recovery/RecoveryModal';
import { RecoveryRingPro, MacroBar } from '@/components/dashboard/DashboardSvgComponents';
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

const READINESS_COLOR = { green: 'hsl(var(--success))', yellow: '#eab308', orange: '#f97316', red: '#ef4444' };

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
  return <div className={`animate-pulse bg-surface-3 rounded-2xl ${className}`} />;
}

function DashboardSkeleton() {
  return (
    <div style={{ maxWidth: 1180, animation: 'fadeUp .4s ease' }}>
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
    : recoveryScore >= 80 ? 'hsl(var(--success))' : recoveryScore >= 60 ? '#eab308' : '#ef4444';

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
    const icons = [TrendingUp, Moon, Dumbbell];
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
    <div style={{ maxWidth: 1180, animation: 'fadeUp .4s ease' }}>

      {/* ── Hero band ── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, marginBottom: 22, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div className="text-display">
            {greeting}, {userName}
          </div>
          <div style={{ fontSize: 14, color: 'hsl(var(--content-secondary))', marginTop: 6 }}>
            {dashboard?.aiInsightOfTheDay || 'Sei al massimo della forma — è il momento di spingere.'}
          </div>
        </div>

        {/* Recovery score pill — the only "vital" the backend actually provides */}
        {hasRecoveryData && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div className="card card-interactive" style={{ padding: '14px 16px', minWidth: 112, cursor: 'default' }}>
              <div style={{ fontSize: 10.5, color: 'hsl(var(--content-tertiary))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em' }}>Recovery</div>
              <div style={{ margin: '7px 0 9px', letterSpacing: '-.5px' }}>
                <span className="tabular-nums" style={{ fontSize: 23, fontWeight: 700, color: 'hsl(var(--foreground))' }}>{recoveryScore}</span>
                <span style={{ fontSize: 12, color: 'hsl(var(--content-tertiary))', fontWeight: 600 }}> / 100</span>
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
          <div className="card card-interactive">
            <div className="label-caps" style={{ marginBottom: 18 }}>Recovery di oggi</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
              <div style={{ position: 'relative', width: 170, height: 170, flexShrink: 0 }}>
                <RecoveryRingPro score={recoveryScore} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="tabular-nums" style={{ fontSize: 46, fontWeight: 700, lineHeight: 1, letterSpacing: -1, color: 'hsl(var(--foreground))' }}>{recoveryDisplay}</div>
                  <div style={{ fontSize: 11, color: 'hsl(var(--content-tertiary))', fontWeight: 600, marginTop: 2 }}>/ 100</div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: recoveryStatusColor, marginBottom: 6 }}>{recoveryTitle}</div>
                <div style={{ fontSize: 13.5, color: 'hsl(var(--content-secondary))', lineHeight: 1.55, marginBottom: 16 }}>{recoveryDetail}</div>
                {readiness?.hasData && readiness.adaptation.intensity !== 'full' && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    <span style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'hsl(var(--border))', color: 'hsl(var(--foreground))', fontWeight: 600 }}>
                      Volume {Math.round(readiness.adaptation.setMultiplier * 100)}%
                    </span>
                    {readiness.adaptation.rpeAdjustment !== 0 && (
                      <span style={{ fontSize: 12, padding: '5px 10px', borderRadius: 8, background: 'hsl(var(--border))', color: 'hsl(var(--foreground))', fontWeight: 600 }}>
                        RPE {readiness.adaptation.rpeAdjustment > 0 ? '+' : ''}{readiness.adaptation.rpeAdjustment}
                      </span>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setRecoveryOpen(true)}
                  className="btn-secondary"
                  style={{
                    padding: '10px 16px', borderRadius: 12, fontSize: 13,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Registra recupero
                </button>
              </div>
            </div>
          </div>

          {/* Macro card */}
          <div className="card card-interactive">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div className="label-caps">Macro di oggi</div>
              <div style={{ fontSize: 12, color: 'hsl(var(--content-secondary))' }}>
                <b style={{ color: 'hsl(var(--foreground))' }}>{Math.round(kcalConsumed)}</b> / {kcalTarget ?? '—'} kcal
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { name: 'Proteine', label: protLabel, pct: protPct, color: 'hsl(var(--primary))' },
                { name: 'Carboidrati', label: carbLabel, pct: carbPct, color: 'hsl(var(--success))' },
                { name: 'Grassi', label: fatLabel, pct: fatPct, color: 'hsl(var(--warning))' },
              ].map(m => (
                <div key={m.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 7 }}>
                    <span style={{ fontWeight: 600, color: 'hsl(var(--foreground))' }}>{m.name}</span>
                    <span style={{ color: 'hsl(var(--content-secondary))' }}>{m.label}</span>
                  </div>
                  <MacroBar pct={m.pct * 100} color={m.color} />
                </div>
              ))}
            </div>
          </div>

          {/* Decisioni di Athena */}
          <div className="card card-interactive">
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 16 }}>
              <div className="rounded-lg" style={{
                width: 24, height: 24,
                background: 'linear-gradient(135deg,#6366f1,hsl(var(--accent)))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: '#fff',
              }}>A</div>
              <div className="label-caps">Decisioni di Athena</div>
            </div>
            {decisions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {decisions.map((d, i) => {
                  const Icon = d.icon;
                  return (
                    <div key={i} style={{
                      display: 'flex', gap: 13, padding: 14, borderRadius: 12,
                      background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--border))',
                    }}>
                      <div className="rounded-lg bg-primary/10 text-primary" style={{
                        width: 32, height: 32, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={16} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2, color: 'hsl(var(--foreground))' }}>{d.title}</div>
                        <div style={{ fontSize: 12.5, color: 'hsl(var(--content-secondary))', lineHeight: 1.5 }}>{d.body}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'hsl(var(--content-tertiary))', padding: '8px 2px' }}>
                Nessuna decisione disponibile al momento.
              </div>
            )}
          </div>
        </div>

        {/* ──── Right column ──── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Prossimo allenamento */}
          <div className="card card-interactive border-primary/25">
            <div className="label-caps" style={{ marginBottom: 14 }}>Prossimo allenamento</div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-.5px', marginBottom: 4, color: 'hsl(var(--foreground))' }}>
              {nextWorkoutDay?.name || 'Nessun allenamento programmato'}
            </div>
            <div style={{ fontSize: 13, color: 'hsl(var(--content-secondary))', marginBottom: 16 }}>
              {nextWorkoutDay?.muscleGroups?.join(', ') || (activePlan ? 'Giorno di riposo' : 'Nessun piano attivo')}
            </div>
            {exercises.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 20 }}>
                {exercises.map((e: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 14px', background: 'rgba(255,255,255,.025)',
                    border: '1px solid hsl(var(--border))', borderRadius: 12,
                  }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                      {e.exercise?.nameIt || e.exercise?.name}
                    </span>
                    <span style={{ fontSize: 12.5, color: 'hsl(var(--content-secondary))' }}>
                      {e.sets}×{e.repsMin === e.repsMax ? e.repsMin : `${e.repsMin}-${e.repsMax}`}{e.rpeTarget ? ` · RPE ${e.rpeTarget}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'hsl(var(--content-tertiary))', marginBottom: 20 }}>
                {activePlan ? 'Riposo oggi — nessun esercizio programmato.' : 'Crea un piano di allenamento per iniziare.'}
              </div>
            )}
            <button
              onClick={() => router.push('/workout/session')}
              className="btn-hero"
              style={{
                width: '100%', padding: 14, border: 'none', borderRadius: 12,
                fontSize: 14.5, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Inizia sessione →
            </button>
          </div>

          {/* Volume + Sessioni */}
          <div className="resp-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="card card-interactive" style={{ padding: 20 }}>
              <div className="label-caps" style={{ marginBottom: 10 }}>Volume settimana</div>
              <div className="tabular-nums" style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1, color: 'hsl(var(--foreground))' }}>
                {weekVolume ?? '—'}<span style={{ fontSize: 15, color: 'hsl(var(--content-tertiary))', fontWeight: 600 }}> t</span>
              </div>
            </div>
            <div className="card card-interactive" style={{ padding: 20 }}>
              <div className="label-caps" style={{ marginBottom: 10 }}>Sessioni</div>
              <div className="tabular-nums" style={{ fontSize: 30, fontWeight: 700, letterSpacing: -1, color: 'hsl(var(--foreground))' }}>
                {weekSessions}<span style={{ fontSize: 15, color: 'hsl(var(--content-tertiary))', fontWeight: 600 }}> / 5</span>
              </div>
              <div style={{ fontSize: 12, color: 'hsl(var(--content-secondary))', fontWeight: 500, margin: '4px 0 14px' }}>questa settimana</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 8, borderRadius: 4,
                    background: i < weekSessions ? 'hsl(var(--success))' : 'hsl(var(--surface-3))',
                  }} />
                ))}
              </div>
            </div>
          </div>

          {/* Trend peso */}
          <div className="card card-interactive" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
              <div className="label-caps">Trend peso · 8 settimane</div>
              {weightSnapshot && (
                <div style={{ marginLeft: 'auto', fontSize: 13, color: 'hsl(var(--success))', fontWeight: 700 }}>
                  {weightSnapshot.weeklyRateKg < 0 ? `${weightSnapshot.weeklyRateKg.toFixed(1)} kg/sett.` : `+${weightSnapshot.weeklyRateKg.toFixed(1)} kg/sett.`}
                </div>
              )}
            </div>
            {weightChartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={weightChartData}>
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="hsl(var(--accent))" strokeWidth={2.5} fill="url(#weightGrad)" dot={false} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--surface-elevated))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12 }}
                    formatter={(v: any) => [`${v} kg`, 'Peso']}
                    labelFormatter={() => ''}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'hsl(var(--content-tertiary))' }}>
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
    </div>
  );
}
