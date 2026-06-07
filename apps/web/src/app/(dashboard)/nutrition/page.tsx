'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nutritionApi } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Brain, Apple, Utensils, PlusCircle, Search, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const MEAL_TYPES = [
  { value: 'BREAKFAST', label: 'Colazione' },
  { value: 'LUNCH', label: 'Pranzo' },
  { value: 'DINNER', label: 'Cena' },
  { value: 'SNACK', label: 'Spuntino' },
];

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: 'Colazione', LUNCH: 'Pranzo', DINNER: 'Cena', SNACK: 'Spuntino',
};

function NutritionSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="h-36 rounded-2xl bg-muted" />
      <div className="h-52 rounded-2xl bg-muted" />
    </div>
  );
}

export default function NutritionPage() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const [mealModalOpen, setMealModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [mealType, setMealType] = useState('BREAKFAST');
  const [servings, setServings] = useState('1');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

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

  const { data: foodResults, isFetching: searching } = useQuery({
    queryKey: ['food-search', debounced],
    queryFn: () => nutritionApi.searchFood(debounced),
    select: (res: any) => res.data as any[],
    enabled: mealModalOpen && debounced.length >= 2,
  });

  const generateMutation = useMutation({
    mutationFn: nutritionApi.generatePlan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-plan'] });
      toast.success('Piano nutrizionale generato da Athena!');
    },
  });

  const logMutation = useMutation({
    mutationFn: (data: any) => nutritionApi.logMeal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nutrition-daily', today] });
      toast.success('Pasto registrato!');
      closeMealModal();
    },
    onError: (e: any) => toast.error(e?.message || 'Errore nel salvataggio del pasto'),
  });

  const closeMealModal = () => {
    setMealModalOpen(false);
    setSearch('');
    setDebounced('');
    setSelectedFood(null);
    setServings('1');
    setMealType('BREAKFAST');
  };

  const submitMeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFood) {
      toast.error('Seleziona un alimento');
      return;
    }
    const s = parseFloat(servings);
    if (!s || s <= 0) {
      toast.error('Inserisci un numero di porzioni valido');
      return;
    }
    logMutation.mutate({
      date: today,
      mealType,
      foodItemId: selectedFood.id,
      servings: s,
    });
  };

  if (planLoading) return <NutritionSkeleton />;

  const macros = dailyLog?.totals;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {!plan ? (
        <Card glow className="text-center py-12 px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Apple className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">Genera il Tuo Piano Nutrizionale</h2>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Athena calcola le tue calorie e macro basandosi su TDEE, obiettivo e stile di vita.
          </p>
          <Button variant="gradient" onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>
            <Brain className="w-4 h-4" />
            Genera Piano AI
          </Button>
        </Card>
      ) : (
        <>
          {/* Piano attivo — macros grid responsive */}
          <Card glow className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
            <p className="text-xs text-primary font-medium mb-3">PIANO ATTIVO · {plan.goalType?.replace(/_/g, ' ')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Calorie', value: Math.round(plan.dailyCalories), unit: 'kcal', color: '#6366f1' },
                { label: 'Proteine',    value: Math.round(plan.proteinG),   unit: 'g',    color: '#8b5cf6' },
                { label: 'Carboidrati', value: Math.round(plan.carbsG),     unit: 'g',    color: '#06b6d4' },
                { label: 'Grassi',      value: Math.round(plan.fatG),       unit: 'g',    color: '#10b981' },
              ].map(m => (
                <div key={m.label} className="text-center py-1">
                  <p className="text-xl sm:text-2xl font-bold tabular-nums" style={{ color: m.color }}>{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.unit}</p>
                  <p className="text-xs font-medium mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
            {plan.aiReasoning && (
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
                  <Brain className="w-3.5 h-3.5 text-primary" /> REASONING AI
                </p>
                <p className="text-sm text-muted-foreground">{plan.aiReasoning}</p>
              </div>
            )}
          </Card>

          {/* Log giornaliero */}
          {macros ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Oggi — {today}</CardTitle>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setMealModalOpen(true)}>
                    <PlusCircle className="w-4 h-4" />
                    Aggiungi pasto
                  </Button>
                </div>
              </CardHeader>
              <div className="space-y-4">
                {[
                  { label: 'Calorie',     consumed: macros.calories.consumed, target: macros.calories.target, unit: 'kcal', color: '#6366f1' },
                  { label: 'Proteine',    consumed: macros.protein.consumed,  target: macros.protein.target,  unit: 'g',    color: '#8b5cf6' },
                  { label: 'Carboidrati', consumed: macros.carbs.consumed,    target: macros.carbs.target,    unit: 'g',    color: '#06b6d4' },
                  { label: 'Grassi',      consumed: macros.fat.consumed,      target: macros.fat.target,      unit: 'g',    color: '#10b981' },
                ].map(m => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="font-medium">{m.label}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {Math.round(m.consumed)} / {Math.round(m.target)} {m.unit}
                      </span>
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
                    <p className="text-[11px] text-muted-foreground text-right mt-0.5 tabular-nums">
                      {m.target > 0 ? Math.round((m.consumed / m.target) * 100) : 0}%
                    </p>
                  </div>
                ))}
              </div>

              {/* Pasti registrati oggi */}
              {Array.isArray(dailyLog?.logs) && dailyLog.logs.length > 0 && (
                <div className="mt-5 pt-5 border-t border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground mb-3">PASTI DI OGGI</p>
                  <div className="space-y-2">
                    {dailyLog.logs.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{log.foodItem?.name ?? 'Alimento'}</p>
                          <p className="text-xs text-muted-foreground">
                            {MEAL_LABELS[log.mealType] ?? log.mealType} · {log.servings} {log.servings === 1 ? 'porzione' : 'porzioni'}
                          </p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-muted-foreground flex-shrink-0 ml-3">
                          {Math.round((log.foodItem?.calories ?? 0) * log.servings)} kcal
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ) : (
            /* Empty state: piano presente, nessun pasto registrato oggi */
            <Card>
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                  <Utensils className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="font-semibold">Nessun pasto registrato oggi</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Inizia a tracciare i tuoi pasti per vedere il progresso verso i tuoi obiettivi.
                </p>
                <Button variant="outline" size="sm" className="mt-1 gap-2" onClick={() => setMealModalOpen(true)}>
                  <PlusCircle className="w-4 h-4" />
                  Aggiungi pasto
                </Button>
              </div>
            </Card>
          )}

          <Button variant="outline" className="w-full" onClick={() => generateMutation.mutate()} loading={generateMutation.isPending}>
            <Brain className="w-4 h-4" />
            Aggiorna Piano AI
          </Button>
        </>
      )}

      {/* Meal log modal */}
      <Modal
        open={mealModalOpen}
        onClose={closeMealModal}
        title="Aggiungi pasto"
        description="Cerca un alimento e registralo nel diario di oggi."
      >
        <form onSubmit={submitMeal} className="space-y-4">
          {/* Meal type */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Tipo pasto</label>
            <div className="grid grid-cols-4 gap-2">
              {MEAL_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setMealType(t.value)}
                  className={`py-2 px-1 rounded-xl text-xs font-medium transition-colors touch-manipulation ${
                    mealType === t.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Food search */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Alimento</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setSelectedFood(null); }}
                placeholder="Cerca alimento (min. 2 lettere)…"
                className="input-field w-full pl-10"
                autoFocus
              />
            </div>

            {/* Results */}
            {debounced.length >= 2 && !selectedFood && (
              <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                {searching ? (
                  <p className="text-sm text-muted-foreground p-3 text-center">Ricerca…</p>
                ) : foodResults && foodResults.length > 0 ? (
                  foodResults.map((f: any) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFood(f)}
                      className="w-full text-left p-3 hover:bg-muted transition-colors flex items-center justify-between"
                    >
                      <span className="text-sm font-medium">
                        {f.name}{f.brand ? <span className="text-muted-foreground"> · {f.brand}</span> : null}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">{Math.round(f.calories)} kcal</span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground p-3 text-center">Nessun alimento trovato</p>
                )}
              </div>
            )}

            {/* Selected food */}
            {selectedFood && (
              <div className="mt-2 p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-primary" /> {selectedFood.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {Math.round(selectedFood.calories)} kcal · P {Math.round(selectedFood.proteinG)}g · C {Math.round(selectedFood.carbsG)}g · G {Math.round(selectedFood.fatG)}g
                    {' '}/ {selectedFood.servingSize}{selectedFood.servingUnit}
                  </p>
                </div>
                <button type="button" onClick={() => setSelectedFood(null)} className="text-xs text-primary hover:underline">
                  Cambia
                </button>
              </div>
            )}
          </div>

          {/* Servings */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Porzioni</label>
            <input
              type="number"
              step="0.25"
              min="0.25"
              inputMode="decimal"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              className="input-field w-full"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={closeMealModal}>
              Annulla
            </Button>
            <Button type="submit" variant="gradient" className="flex-1" loading={logMutation.isPending} disabled={!selectedFood}>
              Registra
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
