'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { nutritionApi } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, Apple } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function NutritionPage() {
  const today = new Date().toISOString().split('T')[0];

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ['nutrition-plan'],
    queryFn: nutritionApi.getPlan,
    select: (res: any) => res.data,
  });

  const { data: dailyLog } = useQuery({
    queryKey: ['nutrition-daily', today],
    queryFn: () => nutritionApi.getDailyLog(today),
    select: (res: any) => res.data,
  });

  const generateMutation = useMutation({
    mutationFn: nutritionApi.generatePlan,
    onSuccess: () => toast.success('Piano nutrizionale generato da Athena!'),
  });

  if (planLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const macros = dailyLog?.totals;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {!plan ? (
        <Card glow className="text-center py-12">
          <Apple className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Genera il Tuo Piano Nutrizionale</h2>
          <p className="text-muted-foreground mb-6">Athena calcola le tue calorie e macro basandosi su TDEE, obiettivo e stile di vita.</p>
          <Button variant="gradient" onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>
            <Brain className="w-4 h-4" />
            Genera Piano AI
          </Button>
        </Card>
      ) : (
        <>
          <Card glow className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <p className="text-xs text-primary font-medium mb-2">PIANO ATTIVO · {plan.goalType?.replace(/_/g,' ')}</p>
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Calorie', value: Math.round(plan.dailyCalories), unit: 'kcal', color: '#6366f1' },
                { label: 'Proteine', value: Math.round(plan.proteinG), unit: 'g', color: '#8b5cf6' },
                { label: 'Carboidrati', value: Math.round(plan.carbsG), unit: 'g', color: '#06b6d4' },
                { label: 'Grassi', value: Math.round(plan.fatG), unit: 'g', color: '#10b981' },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <p className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.unit}</p>
                  <p className="text-xs font-medium mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
            {plan.aiReasoning && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1"><Brain className="w-3.5 h-3.5 text-primary" /> REASONING AI</p>
                <p className="text-sm text-muted-foreground">{plan.aiReasoning}</p>
              </div>
            )}
          </Card>

          {macros && (
            <Card>
              <CardHeader><CardTitle>Oggi — {today}</CardTitle></CardHeader>
              <div className="space-y-4">
                {[
                  { label: 'Calorie', consumed: macros.calories.consumed, target: macros.calories.target, unit: 'kcal', color: '#6366f1' },
                  { label: 'Proteine', consumed: macros.protein.consumed, target: macros.protein.target, unit: 'g', color: '#8b5cf6' },
                  { label: 'Carboidrati', consumed: macros.carbs.consumed, target: macros.carbs.target, unit: 'g', color: '#06b6d4' },
                  { label: 'Grassi', consumed: macros.fat.consumed, target: macros.fat.target, unit: 'g', color: '#10b981' },
                ].map(m => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium">{m.label}</span>
                      <span className="text-muted-foreground">{Math.round(m.consumed)} / {Math.round(m.target)} {m.unit}</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (m.consumed / m.target) * 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full rounded-full"
                        style={{ background: m.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Button variant="outline" className="w-full" onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>
            <Brain className="w-4 h-4" />
            Aggiorna Piano AI
          </Button>
        </>
      )}
    </div>
  );
}
