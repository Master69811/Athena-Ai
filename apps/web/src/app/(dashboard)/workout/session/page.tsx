'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { sessionsApi, workoutApi, recoveryApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { useWorkoutStore } from '@/store/workout.store';
import { useRouter } from 'next/navigation';
import {
  Timer, ChevronRight, ChevronLeft, Check, Zap, Brain,
  Plus, Minus, Flag, X, RotateCcw, Gauge,
} from 'lucide-react';

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

const READINESS_BANNER: Record<ReadinessAdaptation['color'], string> = {
  green: 'bg-green-500/10 border-green-500/25 text-green-400',
  yellow: 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400',
  orange: 'bg-orange-500/10 border-orange-500/25 text-orange-400',
  red: 'bg-red-500/10 border-red-500/25 text-red-400',
};

export default function SessionPage() {
  const router = useRouter();
  const { activeSessionId, startSession, addSet: addSetToStore, endSession, currentExerciseIndex, nextExercise } = useWorkoutStore();

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
  const [isWarmup, setIsWarmup] = useState(false);

  const { data: activePlan } = useQuery({
    queryKey: ['active-plan'],
    queryFn: workoutApi.getActivePlan,
    select: (res: any) => res.data,
  });

  const { data: readiness } = useQuery({
    queryKey: ['recovery-readiness'],
    queryFn: async () => {
      const res = await recoveryApi.getReadiness() as any;
      return res.data as { hasData: boolean; score: number; adaptation: ReadinessAdaptation };
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
      toast.success('Allenamento completato! Ottimo lavoro!');
      router.push('/workout/history');
    },
    onError: (e: any) => toast.error(e?.message || 'Impossibile completare la sessione'),
  });

  const currentDay = activePlan?.days?.[0];
  const exercises = currentDay?.exercises || [];
  const currentExercise = exercises[currentExIdx];
  const totalExercises = exercises.length;

  // Recovery-driven adaptation of today's targets (sets + RPE).
  const adaptation = readiness?.hasData ? readiness.adaptation : null;
  const adaptedSets = currentExercise
    ? Math.max(1, Math.round(currentExercise.sets * (adaptation?.setMultiplier ?? 1)))
    : 0;
  const adaptedRpeTarget = currentExercise
    ? Math.min(10, Math.max(5, (currentExercise.rpeTarget || 8) + (adaptation?.rpeAdjustment ?? 0)))
    : 8;

  // Seed the RPE selector with the (adapted) target when switching exercises.
  useEffect(() => {
    if (currentExercise) setRpe(adaptedRpeTarget);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExIdx, readiness?.hasData]);

  useEffect(() => {
    if (!sessionId && activePlan) {
      startMutation.mutate({ planId: activePlan.id, dayId: currentDay?.id });
    }
  }, [activePlan]);

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

  const handleLogSet = () => {
    if (!sessionId || !currentExercise) return;
    logSetMutation.mutate({
      sessionId,
      data: {
        exerciseId: currentExercise.exerciseId,
        setNumber: currentSet,
        weightKg: weight,
        reps,
        rpe,
        isWarmup,
      },
    });

    addSetToStore({ exerciseId: currentExercise.exerciseId, exerciseName: currentExercise.exercise?.name || '', setNumber: currentSet, weightKg: weight, reps, rpe, isWarmup });

    if (!isWarmup) {
      setCurrentSet(s => s + 1);
      setIsResting(true);
      setRestSeconds(currentExercise.restSeconds || 90);
    }
    setIsWarmup(false);
    if (isWarmup) {
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

  const formatTime = (secs: number) => `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  if (!activePlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">Nessun programma attivo.</p>
        <Button onClick={() => router.push('/workout')} variant="gradient">Crea Piano AI</Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-32 lg:pb-6">

      {/* Header Progress */}
      <div className="flex items-center justify-between">
        <button onClick={() => router.push('/workout')} aria-label="Esci dall'allenamento" className="w-9 h-9 -ml-1.5 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all touch-manipulation">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          {exercises.map((_: any, i: number) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === currentExIdx ? 'w-6 bg-primary' : i < currentExIdx ? 'w-3 bg-primary/50' : 'w-3 bg-muted'}`}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-muted-foreground tabular-nums">{currentExIdx + 1}/{totalExercises}</span>
      </div>

      {/* Recovery adaptation banner */}
      {adaptation && adaptation.intensity !== 'full' && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          <div className={`flex items-start gap-3 p-3 rounded-xl border ${READINESS_BANNER[adaptation.color]}`}>
            <Gauge className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-bold">Adattato al recupero · {adaptation.titleIt}</p>
              <p className="text-xs opacity-80 leading-relaxed mt-0.5">
                Target di oggi: volume {Math.round(adaptation.setMultiplier * 100)}%
                {adaptation.rpeAdjustment !== 0 && <> · RPE {adaptation.rpeAdjustment > 0 ? '+' : ''}{adaptation.rpeAdjustment}</>}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Rest Timer */}
      <AnimatePresence>
        {isResting && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Card glow className="text-center py-6">
              <Timer className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-4xl font-bold text-primary tabular-nums">{formatTime(restSeconds)}</p>
              <p className="text-sm text-muted-foreground mt-1">Recupero</p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={() => setIsResting(false)}>
                Salta Recupero
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Exercise */}
      {currentExercise && (
        <motion.div layout>
          <Card elevated>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-primary font-medium mb-1">
                  {currentExercise.exercise?.category || 'COMPOUND'} · {currentExercise.exercise?.muscleGroups?.[0] || ''}
                </p>
                <h2 className="text-xl font-bold">{currentExercise.exercise?.name || 'Esercizio'}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {adaptedSets} serie · {currentExercise.repsMin}–{currentExercise.repsMax} rip · RPE {adaptedRpeTarget} · {Math.floor((currentExercise.restSeconds || 90) / 60)}:{String((currentExercise.restSeconds || 90) % 60).padStart(2,'0')} recupero
                </p>
              </div>
              <span className="bg-primary/10 text-primary text-xs font-bold px-2.5 py-1 rounded-lg">
                Serie {currentSet}/{adaptedSets}
              </span>
            </div>

            {/* Completed sets */}
            {completedSets.filter(s => s.exerciseId === currentExercise.exerciseId).map((s, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50 mb-2">
                <Check className="w-4 h-4 text-success flex-shrink-0" />
                <span className="text-sm">Serie {s.setNumber}: <strong>{s.weightKg}kg × {s.reps}</strong> @ RPE {s.rpe}</span>
              </div>
            ))}
          </Card>
        </motion.div>
      )}

      {/* Weight + Reps Input */}
      <Card elevated>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2 block">Peso (kg)</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeight(w => Math.max(0, Math.round((w - 2.5) * 10) / 10))}
                className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center hover:bg-primary/10 active:scale-95 transition-all touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex-1 text-center">
                <span className="text-3xl font-bold tabular-nums">{weight}</span>
              </div>
              <button
                onClick={() => setWeight(w => Math.round((w + 2.5) * 10) / 10)}
                className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center hover:bg-primary/10 active:scale-95 transition-all touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-2 block">Ripetizioni</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setReps(r => Math.max(1, r - 1))}
                className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center hover:bg-primary/10 active:scale-95 transition-all touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex-1 text-center">
                <span className="text-3xl font-bold tabular-nums">{reps}</span>
              </div>
              <button
                onClick={() => setReps(r => r + 1)}
                className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center hover:bg-primary/10 active:scale-95 transition-all touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* RPE Selector */}
      <Card>
        <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3 block">
          RPE — {RPE_LABELS[rpe] || ''}
        </label>
        <div className="flex gap-2">
          {[6, 7, 8, 9, 10].map(r => (
            <button
              key={r}
              onClick={() => setRpe(r)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                rpe === r ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {rpe === 10 ? '0 rip in riserva' : rpe === 9 ? '1 rip in riserva' : rpe === 8 ? '2 rip in riserva' : rpe === 7 ? '3+ rip in riserva' : 'Facile'}
        </p>
      </Card>

      {/* AI Recommendation */}
      <AnimatePresence>
        {aiRecommendation && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-primary/5 border-primary/20">
              <div className="flex items-start gap-3">
                <Brain className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-primary font-medium mb-1">ATHENA SUGGERISCE</p>
                  <p className="text-sm text-foreground">{aiRecommendation}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex gap-3">
        {currentExIdx > 0 && (
          <Button variant="outline" size="icon" onClick={() => setCurrentExIdx(i => i - 1)}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}

        <Button
          variant="gradient"
          size="lg"
          className="flex-1 text-base"
          onClick={handleLogSet}
          loading={logSetMutation.isPending}
        >
          <Check className="w-5 h-5" />
          Completa Serie {currentSet}
        </Button>

        {currentExIdx < totalExercises - 1 ? (
          <Button variant="outline" size="icon" onClick={handleNextExercise}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        ) : (
          <Button variant="success" size="icon" onClick={handleCompleteSession} loading={completeMutation.isPending}>
            <Flag className="w-5 h-5" />
          </Button>
        )}
      </div>

      {currentExercise && (
        <button
          onClick={() => { setIsWarmup(true); handleLogSet(); }}
          className="w-full text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
        >
          + Aggiungi serie di riscaldamento
        </button>
      )}
    </div>
  );
}
