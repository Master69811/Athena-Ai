'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workoutApi } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
        <Loader2 style={{ width: 24, height: 24, color: '#6366f1', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', animation: 'fadeUp .4s ease' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .day-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 32px rgba(0,0,0,.35);
        }
        .week-chip:hover { opacity: .85; }
        .generate-btn:hover { opacity: .9; }
        .day-card { transition: transform .2s ease, box-shadow .2s ease; }
        .generate-btn { transition: opacity .15s; cursor: pointer; }
      `}</style>

      {isError ? (
        /* Error state — distinct from "no plan yet" so users don't get routed
           into the (currently broken) AI generation endpoint by mistake. */
        <div style={{
          background: '#111118', border: '1px solid rgba(239,68,68,.3)', borderRadius: 20, padding: 48,
          textAlign: 'center',
        }}>
          <p style={{ color: '#e7e7ee', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>
            Impossibile caricare i dati, riprova
          </p>
          <p style={{ color: '#a1a1b5', fontSize: 14, marginBottom: 24 }}>
            Non siamo riusciti a recuperare il tuo piano di allenamento.
          </p>
          <button
            className="generate-btn"
            onClick={() => refetch()}
            style={{
              background: 'transparent', border: '1px solid #2a2a3a', borderRadius: 12,
              padding: '10px 24px', color: '#e7e7ee', fontWeight: 700, fontSize: 14,
            }}
          >
            Riprova
          </button>
        </div>
      ) : !plan ? (
        /* Empty state */
        <div style={{
          background: '#111118', border: '1px solid #1e1e2e', borderRadius: 20, padding: 48,
          textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', boxShadow: '0 10px 30px rgba(99,102,241,.35)',
          }}>
            <span style={{ fontSize: 24 }}>✦</span>
          </div>
          <p style={{ color: '#e7e7ee', fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Nessun piano attivo</p>
          <p style={{ color: '#a1a1b5', fontSize: 14, marginBottom: 24 }}>
            Genera un programma personalizzato con Athena AI.
          </p>
          <button
            className="generate-btn"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            style={{
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
              border: 'none', borderRadius: 12, padding: '12px 28px',
              color: '#fff', fontWeight: 700, fontSize: 14,
              boxShadow: '0 10px 30px rgba(99,102,241,.35)',
            }}
          >
            {generateMutation.isPending ? 'Generazione...' : '✦ Genera Piano AI'}
          </button>
        </div>
      ) : (
        <>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
            <p style={{ color: '#a1a1b5', fontSize: 14, lineHeight: 1.6 }}>
              Programma <strong style={{ color: '#e7e7ee' }}>{plan?.name ?? 'Ipertrofia + Forza'}</strong>
              {' · '}{totalWeeks} settimane{' · '}
              <span style={{ color: '#8b5cf6' }}>generato da Athena</span>
            </p>
            <Link href="/workout/session" style={{ textDecoration: 'none' }}>
              <button
                className="generate-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  background: 'transparent',
                  border: '1.5px solid transparent',
                  backgroundImage: 'linear-gradient(#111118,#111118), linear-gradient(135deg,#6366f1,#8b5cf6)',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box',
                  borderRadius: 10, padding: '9px 18px',
                  color: '#e7e7ee', fontWeight: 600, fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontSize: 14 }}>✦</span>
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
                  className="week-chip"
                  onClick={() => setSelectedWeek(w)}
                  style={{
                    flexShrink: 0,
                    padding: '7px 16px',
                    borderRadius: 20,
                    border: isActive ? 'none' : '1px solid #2a2a3a',
                    background: isActive ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#15151d',
                    color: isActive ? '#fff' : '#a1a1b5',
                    fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  Sett. {w}
                  {w === currentWeek && (
                    <span style={{
                      position: 'absolute', top: -3, right: -3,
                      width: 7, height: 7, borderRadius: '50%',
                      background: '#8b5cf6',
                    }} />
                  )}
                </button>
              );
            })}
          </div>

          {selectedWeek !== null && selectedWeek !== currentWeek && (
            <p style={{ color: '#6b7280', fontSize: 12.5, marginTop: -16, marginBottom: 24 }}>
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
                  className="day-card"
                  style={{
                    background: '#111118',
                    border: `1px solid ${isToday ? 'rgba(99,102,241,.4)' : '#1e1e2e'}`,
                    borderRadius: 18,
                    padding: 20,
                  }}
                >
                  {/* Top row: day label + RPE badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, letterSpacing: '.14em',
                      color: '#6b7280', textTransform: 'uppercase',
                    }}>
                      {DAY_NAMES_SHORT[day.dayIndex] ?? DAY_NAMES_SHORT[i] ?? '—'}
                    </span>
                    {dayRpe > 0 && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: '#8b5cf6',
                        background: 'rgba(139,92,246,.12)', borderRadius: 6,
                        padding: '2px 8px',
                      }}>
                        RPE {dayRpe}
                      </span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 style={{
                    fontSize: 18, fontWeight: 800, letterSpacing: '-.4px',
                    color: '#e7e7ee', marginBottom: 10, lineHeight: 1.2,
                  }}>
                    {day.name}
                  </h3>

                  {/* Muscle group chips */}
                  {day.muscleGroups?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                      {day.muscleGroups.map((mg: string) => (
                        <span key={mg} style={{
                          background: '#1a1a24', border: '1px solid #1e1e2e',
                          color: '#a1a1b5', borderRadius: 7, fontSize: 11,
                          padding: '3px 8px', fontWeight: 500,
                        }}>
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
                          <span style={{ color: '#c4c4d4', fontSize: 12.5, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {ex.exercise?.name ?? ex.name}
                          </span>
                          <span style={{ color: '#6b7280', fontSize: 12, flexShrink: 0 }}>
                            {ex.sets}×{ex.repsMin}–{ex.repsMax}
                          </span>
                        </div>
                      ))}
                      {day.exercises.length > 4 && (
                        <span style={{ color: '#6b7280', fontSize: 11, marginTop: 2 }}>
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
              className="generate-btn"
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: 'transparent',
                border: '1px solid #2a2a3a',
                borderRadius: 10, padding: '10px 20px',
                color: '#a1a1b5', fontWeight: 600, fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {generateMutation.isPending ? (
                <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
              ) : (
                <span style={{ fontSize: 13 }}>✦</span>
              )}
              {generateMutation.isPending ? 'Generazione...' : 'Genera nuovo piano AI'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
