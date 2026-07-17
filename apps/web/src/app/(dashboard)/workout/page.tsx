'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutApi } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { getMuscleGroupLabel } from '@/lib/utils';

const DAY_NAMES_SHORT = ['LUN', 'MAR', 'MER', 'GIO', 'VEN', 'SAB', 'DOM'];

const todayDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

export default function WorkoutPage() {
  const queryClient = useQueryClient();
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

  const { data: plan, isLoading, isError, refetch } = useQuery({
    queryKey: ['active-plan'],
    queryFn: workoutApi.getActivePlan,
    select: (res: any) => res.data,
  });

  const generateMutation = useMutation({
    mutationFn: workoutApi.generateAI,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-plan'] });
      toast.success('Piano AI generato! Athena ha creato il tuo programma personalizzato.');
    },
    onError: () => toast.error('Errore nella generazione. Riprova.'),
  });

  const days: any[] = plan?.days ?? [];
  const totalWeeks: number = plan?.durationWeeks ?? 12;
  const currentWeek: number = plan?.currentWeek ?? 1;
  const activeWeek: number = selectedWeek ?? currentWeek;

  if (isLoading) {
    return (
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
          <div className="h-4 w-64 rounded-lg bg-surface-3 animate-pulse" />
          <div className="h-10 w-44 rounded-xl bg-surface-3 animate-pulse" />
        </div>
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-7 w-16 flex-shrink-0 rounded-full bg-surface-3 animate-pulse" />
          ))}
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl h-[200px] bg-surface-3 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up" style={{ maxWidth: 1180, margin: '0 auto' }}>
      {isError ? (
        /* Error state — distinct from "no plan yet" so users don't get routed
           into the (currently broken) AI generation endpoint by mistake. */
        <div className="card" style={{ borderColor: 'rgba(239,68,68,.25)', padding: 48, textAlign: 'center' }}>
          <p style={{ color: 'hsl(var(--foreground))', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
            Impossibile caricare i dati, riprova
          </p>
          <p style={{ color: 'hsl(var(--content-secondary))', fontSize: 14, marginBottom: 24 }}>
            Non siamo riusciti a recuperare il tuo piano di allenamento.
          </p>
          <button
            onClick={() => refetch()}
            className="btn-secondary inline-flex items-center rounded-xl px-6 h-10 text-sm"
          >
            Riprova
          </button>
        </div>
      ) : !plan ? (
        /* Empty state */
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <div className="w-14 h-14 rounded-2xl bg-primary/12 flex items-center justify-center mx-auto mb-4">
            <Sparkles size={24} className="text-primary" />
          </div>
          <p style={{ color: 'hsl(var(--foreground))', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Nessun piano attivo</p>
          <p style={{ color: 'hsl(var(--content-secondary))', fontSize: 14, marginBottom: 24 }}>
            Genera un programma personalizzato con Athena AI.
          </p>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="btn-hero inline-flex items-center gap-2 rounded-xl px-7 h-11 text-sm font-semibold"
          >
            {generateMutation.isPending ? (
              'Generazione...'
            ) : (
              <>
                <Sparkles size={16} />
                Genera Piano AI
              </>
            )}
          </button>
        </div>
      ) : (
        <>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
            <p style={{ color: 'hsl(var(--content-secondary))', fontSize: 14, lineHeight: 1.6 }}>
              Programma <strong style={{ color: 'hsl(var(--foreground))' }}>{plan?.name ?? 'Ipertrofia + Forza'}</strong>
              {' · '}{totalWeeks} settimane{' · '}
              <span style={{ color: 'hsl(var(--accent))' }}>generato da Athena</span>
            </p>
            <Link href="/workout/session" style={{ textDecoration: 'none' }}>
              <button className="btn-hero inline-flex items-center gap-2 rounded-xl px-5 h-10 text-sm font-semibold">
                <Sparkles size={16} />
                Inizia allenamento
              </button>
            </Link>
          </div>

          {/* Week tabs */}
          <div style={{
            display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 24,
            scrollbarWidth: 'none',
          }}>
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map(w => {
              const isActive = w === activeWeek;
              return (
                <button
                  key={w}
                  onClick={() => setSelectedWeek(w)}
                  className={`chip relative flex-shrink-0 ${isActive ? 'chip-active' : ''}`}
                >
                  Sett. {w}
                  {w === currentWeek && (
                    <span className="absolute -top-0.5 -right-0.5 w-[5px] h-[5px] rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>

          {selectedWeek !== null && selectedWeek !== currentWeek && (
            <p style={{ color: 'hsl(var(--content-tertiary))', fontSize: 12.5, marginTop: -16, marginBottom: 24 }}>
              Programmazione invariata per questa settimana.
            </p>
          )}

          {/* Day grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 16,
          }}>
            {days.map((day: any, i: number) => {
              const isToday = day.dayIndex === todayDayIndex;
              const dayExercises = day.exercises ?? [];
              const dayRpe = dayExercises.length > 0
                ? Math.max(...dayExercises.map((e: any) => e.rpeTarget ?? 0))
                : 0;
              return (
                <div
                  key={day.id ?? i}
                  className={`card card-interactive${isToday ? ' border-primary/25' : ''}`}
                >
                  {/* Top row: day label + RPE badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '.14em',
                      color: 'hsl(var(--content-tertiary))', textTransform: 'uppercase',
                    }}>
                      {DAY_NAMES_SHORT[day.dayIndex] ?? DAY_NAMES_SHORT[i] ?? '—'}
                    </span>
                    {dayRpe > 0 && (
                      <span className="text-caption bg-primary/12 text-primary rounded-xl inline-flex items-center px-2 py-0.5">
                        RPE {dayRpe}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-heading" style={{ marginBottom: 10 }}>
                    {day.name}
                  </h3>

                  {/* Muscle group chips */}
                  {day.muscleGroups?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                      {day.muscleGroups.map((mg: string) => (
                        <span key={mg} className="rounded-lg bg-surface-3 text-content-secondary text-caption px-2 py-1">
                          {getMuscleGroupLabel(mg)}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Exercise list */}
                  {day.exercises?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      {day.exercises.slice(0, 4).map((ex: any, j: number) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                          <span style={{ color: 'hsl(var(--content-secondary))', fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {ex.exercise?.name ?? ex.name}
                          </span>
                          <span style={{ color: 'hsl(var(--content-tertiary))', fontSize: 12, flexShrink: 0 }}>
                            {ex.sets}×{ex.repsMin}–{ex.repsMax}
                          </span>
                        </div>
                      ))}
                      {day.exercises.length > 4 && (
                        <span style={{ color: 'hsl(var(--content-tertiary))', fontSize: 11, marginTop: 2 }}>
                          +{day.exercises.length - 4} altri
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rigenera */}
          <div style={{ marginTop: 28, display: 'flex', gap: 12 }}>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="btn-secondary inline-flex items-center gap-2 rounded-xl px-5 h-10 text-sm"
            >
              {generateMutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {generateMutation.isPending ? 'Generazione...' : 'Genera nuovo piano AI'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
