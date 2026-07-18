'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nutritionApi } from '@/lib/api';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import {
  Search, Check, PlusCircle, Brain, Apple, Utensils,
  Sunrise, Sun, Moon, Cookie, UtensilsCrossed,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

/* ─── constants ─────────────────────────────────────────── */
const MEAL_TYPES = [
  { value: 'BREAKFAST', label: 'Colazione', emoji: '☀️' },
  { value: 'LUNCH',     label: 'Pranzo',    emoji: '🥗' },
  { value: 'DINNER',    label: 'Cena',      emoji: '🍽️' },
  { value: 'SNACK',     label: 'Spuntino',  emoji: '🍎' },
];
const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: 'Colazione', LUNCH: 'Pranzo', DINNER: 'Cena', SNACK: 'Spuntino',
};
const MEAL_ICONS: Record<string, typeof Sunrise> = {
  BREAKFAST: Sunrise, LUNCH: Sun, DINNER: Moon, SNACK: Cookie,
};

/* ─── sub-components ────────────────────────────────────── */
function MealIcon({ type }: { type: string }) {
  const Icon = MEAL_ICONS[type] ?? UtensilsCrossed;
  return (
    <div className="w-10 h-10 rounded-xl bg-surface-3 text-content-secondary flex items-center justify-center flex-shrink-0">
      <Icon size={20} />
    </div>
  );
}

function CapLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '.14em',
      color: 'hsl(var(--content-tertiary))', textTransform: 'uppercase', marginBottom: 0,
    }}>
      {children}
    </p>
  );
}

interface DonutProps {
  consumed: number;
  target: number;
}
function CalorieDonut({ consumed, target }: DonutProps) {
  const r = (190 - 12) / 2;
  const circ = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, consumed / target) : 0;
  const remaining = Math.max(0, target - consumed);

  return (
    <div style={{ position: 'relative', width: 190, height: 190, margin: '0 auto' }}>
      <svg
        width={190}
        height={190}
        style={{ transform: 'rotate(-90deg)', display: 'block' }}
      >
        {/* track */}
        <circle
          cx={95} cy={95} r={r}
          fill="none"
          stroke="hsl(var(--surface-3))"
          strokeWidth={12}
        />
        {/* fill */}
        <circle
          cx={95} cy={95} r={r}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      {/* centred text */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 2,
      }}>
        <span style={{ fontSize: 38, fontWeight: 700, color: 'hsl(var(--foreground))', lineHeight: 1 }}>
          {Math.round(consumed)}
        </span>
        <span style={{ fontSize: 12, color: 'hsl(var(--content-tertiary))' }}>
          di {Math.round(target)} kcal
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'hsl(var(--success))' }}>
          {Math.round(remaining)} rimanenti
        </span>
      </div>
    </div>
  );
}

interface MacroBarProps {
  label: string;
  consumed: number;
  target: number;
  unit: string;
  color: string;
}
function MacroBar({ label, consumed, target, unit, color }: MacroBarProps) {
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <CapLabel>{label}</CapLabel>
        <span style={{ fontSize: 12, color: 'hsl(var(--content-secondary))', fontWeight: 600 }}>
          {Math.round(consumed)} / {Math.round(target)} {unit}
        </span>
      </div>
      <div style={{ height: 8, background: 'hsl(var(--surface-3))', borderRadius: 6, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: 6,
            transformOrigin: 'left',
            animation: 'barGrow .9s cubic-bezier(.4,0,.2,1)',
          }}
        />
      </div>
    </div>
  );
}

/* ─── empty / no-plan states ────────────────────────────── */
function NoPlanState({ onGenerate, loading }: { onGenerate: () => void; loading: boolean }) {
  return (
    <div className="card animate-fade-up" style={{
      gridColumn: '1 / -1',
      padding: 48,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 16, textAlign: 'center',
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 18,
        background: 'rgba(99,102,241,.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Apple size={32} color="hsl(var(--primary))" />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'hsl(var(--foreground))', margin: 0 }}>
        Genera il Tuo Piano Nutrizionale
      </h2>
      <p style={{ fontSize: 14, color: 'hsl(var(--content-secondary))', maxWidth: 340, margin: 0 }}>
        Athena calcola le tue calorie e macro basandosi su TDEE, obiettivo e stile di vita.
      </p>
      <button
        onClick={onGenerate}
        disabled={loading}
        className="btn-secondary rounded-xl"
        style={{
          padding: '9px 15px',
          fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8,
          opacity: loading ? .6 : 1,
        }}
      >
        <Brain size={16} />
        {loading ? 'Generazione…' : 'Genera Piano AI'}
      </button>
    </div>
  );
}

/* ─── page ──────────────────────────────────────────────── */
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

  const { data: dailyLog, isError: dailyError, refetch: refetchDaily } = useQuery({
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
      queryClient.invalidateQueries({ queryKey: ['nutrition-daily', today] });
      toast.success('Piano nutrizionale generato da Athena!');
    },
    onError: (e: any) => toast.error(e?.message || 'Generazione piano fallita, riprova'),
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
    if (!selectedFood) { toast.error('Seleziona un alimento'); return; }
    const s = parseFloat(servings);
    if (!s || s <= 0) { toast.error('Inserisci un numero di porzioni valido'); return; }
    logMutation.mutate({ date: today, mealType, foodItemId: selectedFood.id, servings: s });
  };

  /* derived */
  const macros   = dailyLog?.totals;
  const calories = macros?.calories;
  const protein  = macros?.protein;
  const carbs    = macros?.carbs;
  const fat      = macros?.fat;

  const consumed = calories?.consumed ?? 0;
  const target   = calories?.target  ?? (plan?.dailyCalories ?? 2000);

  /* ── render ─────────────────────────────────────────── */
  return (
    <>
      <div className="animate-fade-up" style={{ maxWidth: 1180 }}>
        {planLoading ? (
          /* skeleton — mirrors the real two-column layout */
          <div className="resp-stack" style={{
            display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card animate-pulse" style={{ height: 320 }} />
              <div className="card animate-pulse" style={{ height: 320 }} />
            </div>
            <div className="card animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-surface-3 rounded-xl" />
              ))}
            </div>
          </div>
        ) : !plan ? (
          <NoPlanState onGenerate={() => generateMutation.mutate()} loading={generateMutation.isPending} />
        ) : (
          <div className="resp-stack" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20 }}>

            {/* ── LEFT COLUMN ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Obiettivo calorico */}
              <div className="card border-primary/18" style={{ textAlign: 'center' }}>
                <CapLabel>Obiettivo Calorico</CapLabel>
                <div style={{ marginTop: 18, marginBottom: 14 }}>
                  <CalorieDonut consumed={consumed} target={target} />
                </div>
                <p style={{ fontSize: 13, color: 'hsl(var(--content-secondary))', margin: '8px 0 0' }}>
                  Obiettivo: <strong style={{ color: 'hsl(var(--foreground))' }}>{Math.round(target)} kcal</strong>
                </p>
                {dailyError ? (
                  <p style={{ fontSize: 12, color: 'hsl(var(--destructive))', marginTop: 6 }}>
                    Impossibile caricare i dati, riprova
                  </p>
                ) : !macros && (
                  <p style={{ fontSize: 12, color: 'hsl(var(--content-tertiary))', marginTop: 6 }}>
                    Nessun pasto registrato oggi
                  </p>
                )}
              </div>

              {/* Macro */}
              <div className="card">
                <CapLabel>Macronutrienti</CapLabel>
                <div style={{ marginTop: 18 }}>
                  <MacroBar
                    label="Proteine"
                    consumed={protein?.consumed ?? 0}
                    target={protein?.target ?? plan?.proteinG ?? 150}
                    unit="g"
                    color="hsl(var(--primary))"
                  />
                  <MacroBar
                    label="Carboidrati"
                    consumed={carbs?.consumed ?? 0}
                    target={carbs?.target ?? plan?.carbsG ?? 250}
                    unit="g"
                    color="hsl(var(--success))"
                  />
                  <MacroBar
                    label="Grassi"
                    consumed={fat?.consumed ?? 0}
                    target={fat?.target ?? plan?.fatG ?? 70}
                    unit="g"
                    color="hsl(var(--warning))"
                  />
                </div>

                {/* Aggiorna piano */}
                <button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  className="btn-secondary rounded-xl"
                  style={{
                    marginTop: 16,
                    width: '100%',
                    padding: '9px 15px',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Brain size={14} />
                  {generateMutation.isPending ? 'Aggiornamento…' : 'Aggiorna Piano AI'}
                </button>
              </div>
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              {/* header */}
              <div style={{
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', marginBottom: 20,
              }}>
                <CapLabel>Pasti di oggi</CapLabel>
                <button
                  onClick={() => setMealModalOpen(true)}
                  className="btn-hero rounded-xl"
                  style={{
                    padding: '9px 15px',
                    fontSize: 13,
                    display: 'flex', alignItems: 'center', gap: 7,
                  }}
                >
                  <PlusCircle size={14} />
                  Aggiungi pasto
                </button>
              </div>

              {/* meal list */}
              {dailyError ? (
                <div style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 12, textAlign: 'center',
                }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0 }}>
                    Impossibile caricare i dati, riprova
                  </p>
                  <button
                    onClick={() => refetchDaily()}
                    className="btn-secondary rounded-xl"
                    style={{ padding: '9px 15px', fontSize: 13 }}
                  >
                    Riprova
                  </button>
                </div>
              ) : Array.isArray(dailyLog?.logs) && dailyLog.logs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dailyLog.logs.map((log: any) => {
                    const kcal = Math.round((log.foodItem?.calories ?? 0) * log.servings);
                    const type = log.mealType as string;
                    const loggedAt = log.createdAt
                      ? new Date(log.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
                      : '';
                    return (
                      <div
                        key={log.id}
                        className="card-inner"
                        style={{
                          borderRadius: 12,
                          padding: 15,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 15,
                        }}
                      >
                        {/* icon tile */}
                        <MealIcon type={type} />
                        {/* name + meta */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: 14, fontWeight: 600, color: 'hsl(var(--foreground))',
                            margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {log.foodItem?.name ?? 'Alimento'}
                          </p>
                          <p style={{ fontSize: 12, color: 'hsl(var(--content-tertiary))', margin: '2px 0 0' }}>
                            {MEAL_LABELS[type] ?? type}
                            {loggedAt ? ` · ${loggedAt}` : ''}
                            {` · P ${Math.round((log.foodItem?.proteinG ?? 0) * log.servings)}g`}
                            {` C ${Math.round((log.foodItem?.carbsG ?? 0) * log.servings)}g`}
                            {` G ${Math.round((log.foodItem?.fatG ?? 0) * log.servings)}g`}
                          </p>
                        </div>
                        {/* kcal */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: 'hsl(var(--foreground))' }}>
                            {kcal}
                          </span>
                          <span style={{ fontSize: 11, color: 'hsl(var(--content-tertiary))', marginLeft: 3 }}>kcal</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* empty state */
                <div style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 12, textAlign: 'center',
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: 'hsl(var(--surface-3))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Utensils size={24} color="hsl(var(--content-tertiary))" />
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'hsl(var(--foreground))', margin: 0 }}>
                    Nessun pasto registrato oggi
                  </p>
                  <p style={{ fontSize: 13, color: 'hsl(var(--content-tertiary))', maxWidth: 280, margin: 0 }}>
                    Inizia a tracciare i tuoi pasti per vedere il progresso verso i tuoi obiettivi.
                  </p>
                  <button
                    onClick={() => setMealModalOpen(true)}
                    className="btn-secondary rounded-xl"
                    style={{
                      padding: '9px 15px',
                      fontSize: 13,
                      display: 'flex', alignItems: 'center', gap: 8, marginTop: 4,
                    }}
                  >
                    <PlusCircle size={14} />
                    Aggiungi pasto
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Add meal modal ── */}
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
                    mealType === t.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
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
                        {f.name}
                        {f.brand ? <span className="text-muted-foreground"> · {f.brand}</span> : null}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {Math.round(f.calories)} kcal
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground p-3 text-center">Nessun alimento trovato</p>
                )}
              </div>
            )}

            {selectedFood && (
              <div className="mt-2 p-3 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-primary" /> {selectedFood.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {Math.round(selectedFood.calories)} kcal · P {Math.round(selectedFood.proteinG)}g
                    {' '}· C {Math.round(selectedFood.carbsG)}g · G {Math.round(selectedFood.fatG)}g
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
            <Button
              type="submit"
              variant="gradient"
              className="flex-1"
              loading={logMutation.isPending}
              disabled={!selectedFood}
            >
              Registra
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
