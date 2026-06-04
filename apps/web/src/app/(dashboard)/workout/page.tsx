'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { workoutApi } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Zap, Brain, Dumbbell, ChevronRight, Calendar, Clock, BarChart3, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { getMuscleGroupLabel } from '@/lib/utils';

const DAY_NAMES = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export default function WorkoutPage() {
  const queryClient = useQueryClient();

  const { data: plan, isLoading } = useQuery({
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {!plan ? (
        <Card glow className="text-center py-12 bg-gradient-to-b from-primary/5 to-transparent">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary/30">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Genera il Tuo Piano AI</h2>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Athena creerà un programma completamente personalizzato basato sul tuo profilo, obiettivi e metodologia scelta.
          </p>
          <Button
            variant="gradient"
            size="xl"
            onClick={() => generateMutation.mutate()}
            loading={generateMutation.isPending}
          >
            <Zap className="w-5 h-5" />
            {generateMutation.isPending ? 'Athena sta analizzando il tuo profilo...' : 'Genera Piano Personalizzato'}
          </Button>
        </Card>
      ) : (
        <>
          {/* Plan Header */}
          <Card glow className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-primary font-medium mb-1">PROGRAMMA ATTIVO · Settimana {plan.currentWeek}/{plan.durationWeeks}</p>
                <h2 className="text-xl font-bold">{plan.name}</h2>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                <div className="flex items-center gap-4 mt-3">
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {plan.daysPerWeek} giorni/settimana
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    {plan.durationWeeks} settimane
                  </span>
                  <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-lg capitalize">
                    {plan.methodology?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
              <Link href="/workout/session">
                <Button variant="gradient" size="md">
                  <Zap className="w-4 h-4" />
                  Allena
                </Button>
              </Link>
            </div>

            {/* AI Reasoning */}
            {plan.aiReasoning && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-primary font-medium mb-1 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" /> PERCHÉ QUESTO PROGRAMMA
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">{plan.aiReasoning}</p>
              </div>
            )}
          </Card>

          {/* Weekly Schedule */}
          <div className="grid gap-4">
            {plan.days?.map((day: any, i: number) => (
              <motion.div
                key={day.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="hover:border-primary/20 transition-all duration-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-xs text-primary font-medium">{DAY_NAMES[day.dayIndex]?.slice(0, 3).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-foreground">{day.name}</h3>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {day.exercises?.length || 0} esercizi
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {day.muscleGroups?.map((mg: string) => (
                          <span key={mg} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-lg">
                            {getMuscleGroupLabel(mg)}
                          </span>
                        ))}
                      </div>

                      {/* Exercise list */}
                      <div className="mt-3 space-y-1.5">
                        {day.exercises?.slice(0, 4).map((ex: any, j: number) => (
                          <div key={j} className="flex items-center gap-2.5 text-sm">
                            <span className="w-5 h-5 rounded bg-muted text-muted-foreground text-xs flex items-center justify-center flex-shrink-0">
                              {j + 1}
                            </span>
                            <span className="text-foreground font-medium truncate">{ex.exercise?.name}</span>
                            <span className="text-muted-foreground text-xs flex-shrink-0 ml-auto">
                              {ex.sets}×{ex.repsMin}–{ex.repsMax} · {ex.weightSuggestion || 'RPE ' + (ex.rpeTarget || 8)}
                            </span>
                          </div>
                        ))}
                        {day.exercises?.length > 4 && (
                          <p className="text-xs text-muted-foreground pl-7">+{day.exercises.length - 4} altri esercizi</p>
                        )}
                      </div>
                    </div>
                  </div>
                  {day.notes && (
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border italic">"{day.notes}"</p>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Regenerate */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => generateMutation.mutate()}
              loading={generateMutation.isPending}
            >
              <Brain className="w-4 h-4" />
              Rigenera Piano AI
            </Button>
            <Link href="/workout/exercises" className="flex-1">
              <Button variant="ghost" className="w-full">
                <Dumbbell className="w-4 h-4" />
                Libreria Esercizi
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
