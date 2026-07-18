'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sessionsApi, workoutApi, recoveryApi } from '@/lib/api';
import { toast } from 'sonner';
import { useWorkoutStore } from '@/store/workout.store';
import { useRouter } from 'next/navigation';
import { X, Check, Plus, Minus, Gauge } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

const RPE_LABELS: Record<number, string> = {
  6: 'Facile', 7: 'Moderato', 8: 'Difficile', 9: 'Molto Difficile', 10: 'Massimale',
};

type ReadinessAdaptation = {
  intensity: 'full' | 'moderate' | 'reduced' | 'rest';
  setMultiplier: number;
  rpeAdjustment: number;
  titleIt: string;
  detailIt: string;
  color: 'green' | 'yellow' | 'orange' | 'red';
};

const READINESS_BANNER: Record<ReadinessAdaptation['color'], React.CSSProperties> = {
  green:  { background: 'rgba(34,197,94,.10)',  border: '1px solid rgba(34,197,94,.25)',  color: 'hsl(var(--success))' },
  yellow: { background: 'rgba(234,179,8,.10)',  border: '1px solid rgba(234,179,8,.25)',  color: '#facc15' },
  orange: { background: 'rgba(249,115,22,.10)', border: '1px solid rgba(249,115,22,.25)', color: '#fb923c' },
  red:    { background: 'rgba(239,68,68,.10)',  border: '1px solid rgba(239,68,68,.25)',  color: '#f87171' },
};

// Elapsed-time hook
function useElapsed(running: boolean) {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);
  return secs;
}

const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function SessionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeSessionId, startSession, addSet: addSetToStore, endSession, nextExercise } = useWorkoutStore();

  const [sessionId, setSessionId] = useState<string | null>(activeSessionId);
  const [currentExIdx, setCurrentExIdx] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [weight, setWeight] = useState(60);
  const [reps, setReps] = useState(10);
  const [rpe, setRpe] = useState(8);
  const [isResting, setIsResting] = useState(false);
  const [restSeconds, setRestSeconds] = useState(0);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [completedSets, setCompletedSets] = useState<any[]>([]);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const elapsed = useElapsed(sessionStarted);

  const { data: activePlan } = useQuery({
    queryKey: ['active-plan'],
    queryFn: workoutApi.getActivePlan,
    select: (res: any) => res.data,
  });

  const { data: readiness } = useQuery({
    queryKey: ['recovery-readiness'],
    queryFn: async () => {
      const res = await recoveryApi.getReadiness() as any;
      return (res as { hasData: boolean; score: number; adaptation: ReadinessAdaptation }) ?? null;
    },
    staleTime: 5 * 60_000,
  });

  const startMutation = useMutation({
    mutationFn: (data: any) => sessionsApi.start(data),
    onSuccess: (res: any) => {
      const id = res?.data?.id;
      if (!id) { toast.error('Impossibile avviare la sessione'); return; }
      setSessionId(id);
      startSession(id);
      setSessionStarted(true);
      toast.success('Allenamento iniziato!');
    },
    onError: (e: any) => {
      setSessionId(null);
      toast.error(e?.message || 'Impossibile avviare l\'allenamento');
    },
  });

  const logSetMutation = useMutation({
    mutationFn: ({ sessionId, data }: any) => sessionsApi.logSet(sessionId, data),
    onSuccess: (res: any) => {
      if (res?.data) setCompletedSets(prev => [...prev, res.data]);
      fetchAiRecommendation();
    },
    onError: (e: any) => toast.error(e?.message || 'Serie non salvata, riprova'),
  });

  const completeMutation = useMutation({
    mutationFn: ({ sessionId, data }: any) => sessionsApi.complete(sessionId, data),
    onSuccess: () => {
      endSession();
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['gamification-streaks'] });
      toast.success('Allenamento completato! Ottimo lavoro!');
      router.push('/workout/history');
    },
    onError: (e: any) => toast.error(e?.message || 'Impossibile completare la sessione'),
  });

  const currentDay = activePlan?.days?.[0];
  const exercises = currentDay?.exercises || [];
  const currentExercise = exercises[currentExIdx];
  const totalExercises = exercises.length;

  const adaptation = readiness?.hasData ? readiness.adaptation : null;
  const adaptedSets = currentExercise
    ? Math.max(1, Math.round(currentExercise.sets * (adaptation?.setMultiplier ?? 1)))
    : 0;
  const adaptedRpeTarget = currentExercise
    ? Math.min(10, Math.max(5, (currentExercise.rpeTarget || 8) + (adaptation?.rpeAdjustment ?? 0)))
    : 8;

  useEffect(() => {
    if (currentExercise) setRpe(adaptedRpeTarget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExIdx, readiness?.hasData]);

  useEffect(() => {
    if (sessionId || !activePlan) return;
    let cancelled = false;
    (async () => {
      try {
        const activeRes = await sessionsApi.getActive() as any;
        const activeId = activeRes?.data?.id;
        if (cancelled) return;
        if (activeId) {
          setSessionId(activeId);
          startSession(activeId);
          setSessionStarted(true);
          return;
        }
      } catch {
        // no active session found / lookup failed — fall through to start a new one
      }
      if (!cancelled) {
        startMutation.mutate({ planId: activePlan.id, dayId: currentDay?.id });
      }
    })();
    return () => { cancelled = true; };
  }, [activePlan]);

  // Rest countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isResting && restSeconds > 0) {
      timer = setTimeout(() => setRestSeconds(s => s - 1), 1000);
    } else if (isResting && restSeconds === 0) {
      setIsResting(false);
      toast.info('Recupero completato — pronto per la serie successiva!');
    }
    return () => clearTimeout(timer);
  }, [isResting, restSeconds]);

  const fetchAiRecommendation = useCallback(async () => {
    if (!currentExercise || !sessionId) return;
    try {
      const exerciseSets = completedSets.filter(s => s.exerciseId === currentExercise.exerciseId);
      const res = await sessionsApi.getSetRecommendation({
        exerciseId: currentExercise.exerciseId,
        previousSets: exerciseSets.map(s => ({ weightKg: s.weightKg, reps: s.reps, rpe: s.rpe || 8 })),
        targetSets: adaptedSets,
        targetRepsMin: currentExercise.repsMin,
        targetRepsMax: currentExercise.repsMax,
        targetRpe: adaptedRpeTarget,
      });
      setAiRecommendation((res as any)?.data?.recommendation || null);
    } catch {}
  }, [completedSets, currentExercise, sessionId, adaptedSets, adaptedRpeTarget]);

  const handleLogSet = (isWarmupSet: boolean) => {
    if (!sessionId || !currentExercise) return;
    logSetMutation.mutate({
      sessionId,
      data: { exerciseId: currentExercise.exerciseId, setNumber: currentSet, weightKg: weight, reps, rpe, isWarmup: isWarmupSet },
    });
    addSetToStore({
      exerciseId: currentExercise.exerciseId,
      exerciseName: currentExercise.exercise?.name || '',
      setNumber: currentSet, weightKg: weight, reps, rpe, isWarmup: isWarmupSet,
    });
    if (!isWarmupSet) {
      setCurrentSet(s => s + 1);
      setIsResting(true);
      setRestSeconds(currentExercise.restSeconds || 90);
    }
    if (isWarmupSet) {
      toast.success(`Riscaldamento registrato: ${weight}kg × ${reps} rip`);
    } else {
      toast.success(`Serie ${currentSet} completata! ${weight}kg × ${reps} rip @ RPE ${rpe}`);
    }
  };

  const handleNextExercise = () => {
    if (currentExIdx < totalExercises - 1) {
      setCurrentExIdx(i => i + 1);
      setCurrentSet(1);
      setIsResting(false);
      setAiRecommendation(null);
      nextExercise();
    }
  };

  const handleCompleteSession = () => {
    if (!sessionId) return;
    completeMutation.mutate({ sessionId, data: { rpe } });
  };

  if (!activePlan) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <p style={{ color: 'hsl(var(--content-secondary))' }}>Nessun programma attivo.</p>
        <button
          onClick={() => router.push('/workout')}
          className="btn-hero inline-flex items-center rounded-xl px-6 h-11 text-sm font-bold"
        >
          Crea Piano AI
        </button>
      </div>
    );
  }

  const progressPct = totalExercises > 0 ? ((currentExIdx) / totalExercises) * 100 : 0;
  const exerciseSets = completedSets.filter(s => s.exerciseId === currentExercise?.exerciseId);

  return (
    <div className="animate-fade-up" style={{ maxWidth: 1180, margin: '0 auto', paddingBottom: 40 }}>
      {/* ── Top header ─────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ color: 'hsl(var(--foreground))', fontWeight: 700, fontSize: 22, margin: 0, lineHeight: 1.2 }}>
            {currentDay?.name ?? 'Sessione'}
          </h1>
          <p style={{ color: 'hsl(var(--content-tertiary))', fontSize: 13, margin: '4px 0 0' }}>
            Esercizio {currentExIdx + 1} di {totalExercises || 1} · {fmt(elapsed)} trascorsi
          </p>
        </div>
        <button
          onClick={() => setShowExitConfirm(true)}
          aria-label="Esci dall'allenamento"
          className="w-10 h-10 rounded-xl bg-surface-3 border border-border-strong flex items-center justify-center text-content-secondary flex-shrink-0"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Progress bar ───────────────────────────────── */}
      <div className="bg-surface-3 rounded-lg overflow-hidden mb-5" style={{ height: 6 }}>
        <div
          className="h-full rounded-lg"
          style={{ width: `${progressPct}%`, background: 'hsl(var(--primary))', transition: 'width .4s ease' }}
        />
      </div>

      {/* ── Recovery adaptation banner ─────────────────── */}
      {adaptation && adaptation.intensity !== 'full' && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '10px 14px', borderRadius: 12, marginBottom: 16,
          ...READINESS_BANNER[adaptation.color],
        }}>
          <Gauge size={15} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>
              Adattato al recupero · {adaptation.titleIt}
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, opacity: .8 }}>
              Volume {Math.round(adaptation.setMultiplier * 100)}%
              {adaptation.rpeAdjustment !== 0 && <> · RPE {adaptation.rpeAdjustment > 0 ? '+' : ''}{adaptation.rpeAdjustment}</>}
            </p>
          </div>
        </div>
      )}

      {/* ── Two-column layout ──────────────────────────── */}
      <div className="resp-stack" style={{
        display: 'grid', gridTemplateColumns: 'clamp(220px,300px,300px) 1fr', gap: 20,
        alignItems: 'start',
      }}>

        {/* LEFT — exercise list (below the main card on phones) */}
        <div className="card order-2 md:order-1" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {exercises.map((ex: any, i: number) => {
            const exSets = completedSets.filter(s => s.exerciseId === ex.exerciseId);
            const isActive = i === currentExIdx;
            const isDone = exSets.length >= (Math.max(1, Math.round(ex.sets * (adaptation?.setMultiplier ?? 1))));
            const adaptEx = Math.max(1, Math.round(ex.sets * (adaptation?.setMultiplier ?? 1)));

            return (
              <div
                key={ex.id ?? i}
                onClick={() => { setCurrentExIdx(i); setCurrentSet(1); setAiRecommendation(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '11px 10px',
                  borderRadius: 12, cursor: 'pointer',
                  border: isActive ? '1px solid rgba(99,102,241,.4)' : '1px solid transparent',
                  background: isActive ? 'rgba(99,102,241,.08)' : 'transparent',
                  transition: 'background .15s ease',
                }}
              >
                {/* Badge */}
                <div style={{
                  width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                  ...(isDone
                    ? { background: 'rgba(34,197,94,.16)', color: 'hsl(var(--success))' }
                    : isActive
                    ? { background: 'hsl(var(--primary))', color: '#fff' }
                    : { background: 'hsl(var(--surface-3))', color: 'hsl(var(--content-tertiary))' }),
                }}>
                  {isDone ? <Check size={12} /> : i + 1}
                </div>
                {/* Name + meta */}
                <div style={{ minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontSize: 13, fontWeight: 600,
                    color: isActive ? 'hsl(var(--foreground))' : 'hsl(var(--content-secondary))',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {ex.exercise?.name ?? `Esercizio ${i + 1}`}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: 'hsl(var(--content-tertiary))' }}>
                    {exSets.length}/{adaptEx} serie
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT — main exercise card (on top on phones) */}
        <div className="order-1 md:order-2" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {currentExercise ? (
            <div className="card">
              {/* Exercise name + target */}
              <div style={{ marginBottom: 20 }}>
                <h2 style={{ margin: 0, color: 'hsl(var(--foreground))', fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>
                  {currentExercise.exercise?.name ?? 'Esercizio'}
                </h2>
                <p style={{ margin: '5px 0 0', color: 'hsl(var(--content-tertiary))', fontSize: 13 }}>
                  {adaptedSets} serie · {currentExercise.repsMin}–{currentExercise.repsMax} rip · RPE {adaptedRpeTarget}
                </p>
              </div>

              {/* Steppers grid */}
              <div className="resp-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 20 }}>
                {/* Weight */}
                <div className="card-inner" style={{ textAlign: 'center' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: 'hsl(var(--content-tertiary))', textTransform: 'uppercase' }}>
                    Peso (kg)
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <button
                      onClick={() => setWeight(w => Math.max(0, Math.round((w - 2.5) * 10) / 10))}
                      className="w-10 h-10 rounded-xl bg-surface-3 border border-border-strong text-foreground flex items-center justify-center"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-bold tabular-nums" style={{ fontSize: 34, color: 'hsl(var(--foreground))', minWidth: 64, display: 'block', textAlign: 'center' }}>
                      {weight}
                    </span>
                    <button
                      onClick={() => setWeight(w => Math.round((w + 2.5) * 10) / 10)}
                      className="w-10 h-10 rounded-xl bg-surface-3 border border-border-strong text-foreground flex items-center justify-center"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {/* Reps */}
                <div className="card-inner" style={{ textAlign: 'center' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: 'hsl(var(--content-tertiary))', textTransform: 'uppercase' }}>
                    Ripetizioni
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <button
                      onClick={() => setReps(r => Math.max(1, r - 1))}
                      className="w-10 h-10 rounded-xl bg-surface-3 border border-border-strong text-foreground flex items-center justify-center"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-bold tabular-nums" style={{ fontSize: 34, color: 'hsl(var(--foreground))', minWidth: 48, display: 'block', textAlign: 'center' }}>
                      {reps}
                    </span>
                    <button
                      onClick={() => setReps(r => r + 1)}
                      className="w-10 h-10 rounded-xl bg-surface-3 border border-border-strong text-foreground flex items-center justify-center"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* RPE selector */}
              <div style={{ marginBottom: 20 }}>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: 'hsl(var(--content-tertiary))', textTransform: 'uppercase' }}>
                  RPE — {RPE_LABELS[rpe] ?? ''}
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[6, 7, 8, 9, 10].map(r => (
                    <button
                      key={r}
                      onClick={() => setRpe(r)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${
                        rpe === r
                          ? 'bg-primary text-white'
                          : 'bg-surface-elevated border border-border-strong text-content-secondary'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI tip + Log set button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                {aiRecommendation && (
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0,
                    background: 'rgba(99,102,241,.08)', border: '1px solid rgba(99,102,241,.22)',
                    borderRadius: 12, padding: '0 16px', height: 46,
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontSize: 11, fontWeight: 700,
                    }}>A</div>
                    <p style={{ margin: 0, color: 'hsl(var(--content-secondary))', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {aiRecommendation}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => handleLogSet(false)}
                  disabled={logSetMutation.isPending}
                  className="btn-hero inline-flex items-center gap-2 rounded-xl px-6 h-11 text-sm font-semibold whitespace-nowrap flex-shrink-0"
                >
                  <Check size={15} />
                  {logSetMutation.isPending ? 'Salvo...' : `Registra serie ${currentSet}`}
                </button>
              </div>

              {/* Warmup shortcut */}
              <button
                onClick={() => handleLogSet(true)}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  color: 'hsl(var(--content-tertiary))', fontSize: 12, cursor: 'pointer',
                  textDecoration: 'underline', textDecorationStyle: 'dotted',
                }}
              >
                + Aggiungi serie di riscaldamento
              </button>

              {/* Logged sets */}
              {exerciseSets.length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {exerciseSets.map((s: any, i: number) => (
                    <div key={i} className="card-inner" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                        background: 'rgba(34,197,94,.16)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check size={11} color="hsl(var(--success))" />
                      </div>
                      <span style={{ color: 'hsl(var(--content-secondary))', fontSize: 13, flex: 1 }}>
                        <strong>{s.weightKg}kg × {s.reps}</strong>
                      </span>
                      <span style={{ color: 'hsl(var(--content-tertiary))', fontSize: 12 }}>RPE {s.rpe}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ padding: 40, textAlign: 'center', color: 'hsl(var(--content-tertiary))' }}>
              Nessun esercizio disponibile
            </div>
          )}

          {/* Rest timer card */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: 'hsl(var(--content-tertiary))', textTransform: 'uppercase' }}>
                Recupero
              </p>
              <span
                className="font-bold tabular-nums"
                style={{
                  fontSize: 40, lineHeight: 1,
                  color: isResting && restSeconds > 0 ? 'hsl(var(--accent))' : undefined,
                }}
                {...(!(isResting && restSeconds > 0) ? {} : {})}
              >
                <span className={isResting && restSeconds > 0 ? '' : 'text-content-disabled'} style={isResting && restSeconds > 0 ? { color: 'hsl(var(--accent))' } : undefined}>
                  {fmt(restSeconds)}
                </span>
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setIsResting(true); setRestSeconds(s => s + 30); }}
                className="btn-secondary rounded-xl px-4 h-9 text-sm"
              >
                +30s
              </button>
              <button
                onClick={() => { setIsResting(false); setRestSeconds(0); }}
                className="btn-secondary rounded-xl px-4 h-9 text-sm"
              >
                Salta
              </button>
            </div>
          </div>

          {/* Navigation row */}
          <div style={{ display: 'flex', gap: 10 }}>
            {currentExIdx > 0 && (
              <button
                onClick={() => setCurrentExIdx(i => i - 1)}
                className="btn-secondary rounded-xl px-5 h-11 text-sm"
              >
                ← Prec.
              </button>
            )}

            {currentExIdx < totalExercises - 1 ? (
              <button
                onClick={handleNextExercise}
                className="btn-secondary flex-1 rounded-xl px-5 h-11 text-sm"
              >
                Prossimo esercizio →
              </button>
            ) : (
              <button
                onClick={handleCompleteSession}
                disabled={completeMutation.isPending}
                className="btn-secondary flex-1 rounded-xl px-5 h-11 text-sm"
              >
                {completeMutation.isPending ? 'Completamento...' : 'Completa allenamento ✓'}
              </button>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        title="Terminare l'allenamento?"
        description="I progressi non salvati andranno persi."
      >
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setShowExitConfirm(false)}>
            Annulla
          </Button>
          <Button type="button" variant="destructive" className="flex-1" onClick={() => router.push('/workout')}>
            Termina
          </Button>
        </div>
      </Modal>
    </div>
  );
}
