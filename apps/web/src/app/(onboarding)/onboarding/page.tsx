'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { usersApi, workoutApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  User, Target, BarChart3, Calendar, Heart, Dumbbell, Brain,
  CheckCircle2, ChevronRight, ChevronLeft, Zap, Check,
} from 'lucide-react';

const STEPS = ['Profilo', 'Obiettivi', 'Livello', 'Disponibilità', 'Stile di Vita', 'Metodologia', 'Completato'];

const STEP_CTAS = [
  'Imposta obiettivi →',
  'Scegli il livello →',
  'Configura disponibilità →',
  'Personalizza lo stile →',
  'Scegli metodologia →',
  'Genera il mio piano →',
];

const GOALS = [
  { value: 'HYPERTROPHY',        label: 'Ipertrofia',      desc: 'Aumenta la massa muscolare',          icon: '💪', color: 'from-violet-500 to-purple-600' },
  { value: 'WEIGHT_LOSS',        label: 'Dimagrimento',    desc: 'Riduci il grasso corporeo',           icon: '🔥', color: 'from-orange-500 to-red-500' },
  { value: 'STRENGTH',           label: 'Forza',           desc: 'Aumenta la forza massimale',          icon: '⚡', color: 'from-yellow-500 to-amber-500' },
  { value: 'POWERBUILDING',      label: 'Powerbuilding',   desc: 'Forza + massa muscolare',             icon: '🏋️', color: 'from-blue-500 to-indigo-500' },
  { value: 'BODY_RECOMPOSITION', label: 'Ricomposizione',  desc: 'Perdi grasso, guadagna muscolo',      icon: '🔄', color: 'from-emerald-500 to-teal-500' },
  { value: 'ATHLETIC_PERFORMANCE', label: 'Performance',  desc: 'Migliora le prestazioni atletiche',   icon: '🏆', color: 'from-cyan-500 to-blue-500' },
  { value: 'LONGEVITY',          label: 'Longevità',       desc: 'Salute a lungo termine',              icon: '🌿', color: 'from-green-500 to-emerald-500' },
  { value: 'GENERAL_HEALTH',     label: 'Salute Generale', desc: 'Forma fisica complessiva',            icon: '❤️', color: 'from-pink-500 to-rose-500' },
];

const LEVELS = [
  { value: 'BEGINNER',     label: 'Principiante', desc: 'Meno di 1 anno di allenamento',      years: '0–1 anno' },
  { value: 'INTERMEDIATE', label: 'Intermedio',   desc: '1–3 anni di allenamento costante',   years: '1–3 anni' },
  { value: 'ADVANCED',     label: 'Avanzato',     desc: 'Oltre 3 anni di allenamento serio',  years: '3+ anni' },
];

const METHODOLOGIES = [
  { value: 'PPL',                       label: 'Push Pull Legs',            desc: 'Classico e versatile, perfetto per principianti e intermedi' },
  { value: 'UPPER_LOWER',               label: 'Upper/Lower',               desc: 'Alta frequenza per ogni gruppo muscolare, ideale 4 giorni' },
  { value: 'RENAISSANCE_PERIODIZATION', label: 'Renaissance Periodization', desc: 'Basato su MEV/MAV/MRV scientifico, per massimizzare l\'ipertrofia' },
  { value: 'PROJECT_INVICTUS',          label: 'Project Invictus',          desc: 'Metodologia italiana evidence-based, periodizzazione avanzata' },
  { value: 'FIVE_THREE_ONE',            label: '5/3/1 (Wendler)',           desc: 'Progressione lineare sulla forza, semplice ed efficace' },
  { value: 'JUGGERNAUT',                label: 'Juggernaut',                desc: 'Combina forza e ipertrofia in cicli ondulati' },
  { value: 'HEAVY_DUTY',                label: 'Heavy Duty',                desc: 'Alta intensità, basso volume, portato al cedimento' },
  { value: 'HYBRID_ATHLETE',            label: 'Hybrid Athlete',            desc: 'Forza + condizionamento aerobico combinati' },
];

const GENERATION_STAGES = [
  { icon: User,       text: 'Analizzando il tuo profilo',      detail: 'Parametri biometrici e obiettivi' },
  { icon: BarChart3,  text: 'Calcolando il tuo TDEE',          detail: 'Metabolismo basale + attività' },
  { icon: Dumbbell,   text: 'Costruendo il programma',         detail: 'Volume, intensità e frequenza' },
  { icon: Heart,      text: 'Ottimizzando il recupero',        detail: 'Recovery e progressione integrati' },
];

function GeneratingScreen({ stage }: { stage: number }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />
      <div className="w-full max-w-sm relative text-center space-y-8">
        {/* Pulsing brain icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary to-accent opacity-20 animate-ping" style={{ animationDuration: '2s' }} />
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/40">
            <Brain className="w-12 h-12 text-white" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-1">Athena sta lavorando…</h2>
          <p className="text-muted-foreground text-sm">Costruendo il tuo programma personalizzato</p>
        </div>

        {/* Step-by-step progress */}
        <div className="space-y-2 text-left">
          {GENERATION_STAGES.map((s, i) => {
            const StageIcon = s.icon;
            const done    = i < stage;
            const active  = i === stage;
            const pending = i > stage;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: pending ? 0.35 : 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${active ? 'bg-primary/10 border border-primary/20' : 'bg-transparent'}`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  done   ? 'bg-green-500/20 text-green-400' :
                  active ? 'bg-primary/20 text-primary' :
                           'bg-muted text-muted-foreground'
                }`}>
                  {done ? <Check className="w-4 h-4" /> : <StageIcon className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {s.text}
                  </p>
                  {active && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-muted-foreground mt-0.5"
                    >
                      {s.detail}
                    </motion.p>
                  )}
                </div>
                {active && (
                  <div className="flex gap-0.5 flex-shrink-0">
                    {[0, 1, 2].map(j => (
                      <div
                        key={j}
                        className="w-1.5 h-1.5 rounded-full bg-primary"
                        style={{ animation: `bounce 1s ${j * 0.15}s infinite` }}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
            animate={{ width: `${Math.min(100, ((stage + 1) / GENERATION_STAGES.length) * 100)}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}

function CelebrationScreen({ data: userData, onContinue }: { data: any; onContinue: () => void }) {
  useEffect(() => {
    const t = setTimeout(onContinue, 3000);
    return () => clearTimeout(t);
  }, [onContinue]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-gradient-radial from-green-500/5 via-transparent to-transparent" />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-sm relative text-center space-y-6"
      >
        {/* Animated checkmark */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto shadow-2xl shadow-green-500/40"
        >
          <CheckCircle2 className="w-12 h-12 text-white" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="text-3xl font-bold mb-2">Piano creato!</h2>
          <p className="text-muted-foreground">Il tuo programma personalizzato è pronto.</p>
        </motion.div>

        {/* Personalized stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card grid grid-cols-3 gap-4 text-center py-4"
        >
          <div>
            <p className="text-2xl font-bold text-primary tabular-nums">{userData.trainingDaysPerWeek}g</p>
            <p className="text-xs text-muted-foreground mt-0.5">sessioni/sett</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-accent tabular-nums">{userData.sessionDurationMinutes}m</p>
            <p className="text-xs text-muted-foreground mt-0.5">per sessione</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">AI</p>
            <p className="text-xs text-muted-foreground mt-0.5">personalizzato</p>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-xs text-muted-foreground"
        >
          Accesso al piano tra qualche secondo…
        </motion.p>
      </motion.div>
    </div>
  );
}

const ONBOARDING_DRAFT_KEY = 'athena-onboarding-draft';

const DEFAULT_ONBOARDING_DATA = {
  name: '', age: 25, gender: 'MALE', heightCm: 175, weightKg: 75,
  bodyFatPercentage: undefined as number | undefined,
  goalType: '', experienceLevel: '', methodology: '',
  trainingDaysPerWeek: 4, sessionDurationMinutes: 60,
  hasGym: true, equipment: [] as string[], injuries: [] as string[],
  sleepHoursAvg: 7.5, stressLevel: 5, dailyStepsAvg: 8000, workType: 'MODERATE',
};

function GenerationFailedScreen({ retrying, onRetry, onGoToWorkout }: { retrying: boolean; onRetry: () => void; onGoToWorkout: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-gradient-radial from-orange-500/5 via-transparent to-transparent" />
      <div className="w-full max-w-sm relative text-center space-y-6">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center mx-auto shadow-2xl shadow-orange-500/40">
          <Brain className="w-10 h-10 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Generazione non riuscita</h2>
          <p className="text-muted-foreground text-sm">
            Il tuo profilo è salvato, ma la generazione del piano AI non è riuscita. Puoi riprovare senza rifare il form.
          </p>
        </div>
        <div className="space-y-3">
          <Button variant="gradient" size="xl" onClick={onRetry} loading={retrying} className="w-full">
            <Zap className="w-5 h-5" />
            Riprova
          </Button>
          <button onClick={onGoToWorkout} className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">
            Vai ad Allenamento e genera più tardi
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();
  const [step, setStep] = useState(() => {
    try {
      const saved = sessionStorage.getItem(ONBOARDING_DRAFT_KEY);
      return saved ? (JSON.parse(saved).step as number) : 0;
    } catch {
      return 0;
    }
  });
  const [loading, setLoading] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generationStage, setGenerationStage] = useState(0);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [data, setData] = useState(() => {
    try {
      const saved = sessionStorage.getItem(ONBOARDING_DRAFT_KEY);
      const parsedData = saved ? (JSON.parse(saved).data as Partial<typeof DEFAULT_ONBOARDING_DATA> | undefined) : undefined;
      return parsedData ? { ...DEFAULT_ONBOARDING_DATA, ...parsedData } : DEFAULT_ONBOARDING_DATA;
    } catch {
      return DEFAULT_ONBOARDING_DATA;
    }
  });

  const update = (fields: Partial<typeof data>) => setData(prev => ({ ...prev, ...fields }));

  // Persist wizard progress so a failed AI generation (or accidental navigation)
  // doesn't force the user to refill all 7 steps from scratch.
  useEffect(() => {
    try {
      sessionStorage.setItem(ONBOARDING_DRAFT_KEY, JSON.stringify({ step, data }));
    } catch {
      // sessionStorage unavailable (e.g. private mode quota) — non-fatal.
    }
  }, [step, data]);

  // Advance generation stages while generating
  useEffect(() => {
    if (!generatingPlan) { setGenerationStage(0); return; }
    const interval = setInterval(() => {
      setGenerationStage(prev => Math.min(prev + 1, GENERATION_STAGES.length - 1));
    }, 1300);
    return () => clearInterval(interval);
  }, [generatingPlan]);

  const handleSubmit = async () => {
    setLoading(true);
    let onboardingDone = false;
    try {
      const response: any = await usersApi.completeOnboarding(data);
      onboardingDone = true;
      // AppLayout gates every protected route on user.profile.onboardingCompleted
      // from the persisted auth store. That store is only ever written at
      // login/register (always onboardingCompleted:false at that point) and was
      // never refreshed after onboarding finished, so AppLayout kept bouncing
      // freshly-onboarded users straight back to a blank /onboarding. Update the
      // cached profile here, synchronously before any navigation, so the guard
      // sees the true value immediately.
      const updatedProfile = response?.data?.profile;
      if (updatedProfile && user) {
        setUser({ ...user, profile: updatedProfile });
      }
      setGeneratingPlan(true);
      await workoutApi.generateAI();
      setGeneratingPlan(false);
      setShowCelebration(true);
      try { sessionStorage.removeItem(ONBOARDING_DRAFT_KEY); } catch { /* non-fatal */ }
    } catch {
      setGeneratingPlan(false);
      if (onboardingDone) {
        // Profile is already saved server-side — don't make the user redo the form.
        // Let them retry just the AI generation, or leave for /workout on their own terms.
        toast('Profilo creato. La generazione del piano AI non è riuscita.', { icon: '⚡' });
        setGenerationFailed(true);
      } else {
        toast.error('Errore durante la creazione del profilo. Riprova.');
      }
    } finally {
      setLoading(false);
    }
  };

  const retryGeneration = async () => {
    setLoading(true);
    try {
      setGeneratingPlan(true);
      await workoutApi.generateAI();
      setGeneratingPlan(false);
      setGenerationFailed(false);
      setShowCelebration(true);
      try { sessionStorage.removeItem(ONBOARDING_DRAFT_KEY); } catch { /* non-fatal */ }
    } catch {
      setGeneratingPlan(false);
      toast.error('Generazione ancora non riuscita. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    // Step 0: Personal
    <div key="personal" className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-sm font-medium text-foreground mb-1.5 block">Nome</label>
          <input value={data.name} onChange={e => update({ name: e.target.value })} className="input-field" placeholder="Il tuo nome" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Età</label>
          <input type="number" value={data.age} onChange={e => update({ age: +e.target.value })} className="input-field" min={13} max={100} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Sesso</label>
          <select value={data.gender} onChange={e => update({ gender: e.target.value })} className="input-field">
            <option value="MALE">Maschio</option>
            <option value="FEMALE">Femmina</option>
            <option value="OTHER">Altro</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Altezza (cm)</label>
          <input type="number" value={data.heightCm} onChange={e => update({ heightCm: +e.target.value })} className="input-field" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Peso (kg)</label>
          <input type="number" value={data.weightKg} onChange={e => update({ weightKg: +e.target.value })} className="input-field" step="0.1" />
        </div>
        <div className="col-span-2">
          <label className="text-sm font-medium mb-1.5 block">Body Fat % <span className="text-muted-foreground">(opzionale)</span></label>
          <input type="number" value={data.bodyFatPercentage || ''} onChange={e => update({ bodyFatPercentage: e.target.value ? +e.target.value : undefined })} className="input-field" min={3} max={60} />
        </div>
      </div>
    </div>,

    // Step 1: Goals
    <div key="goals" className="grid grid-cols-2 gap-3">
      {GOALS.map(goal => (
        <button
          key={goal.value}
          onClick={() => update({ goalType: goal.value })}
          className={`p-4 rounded-2xl border text-left transition-all duration-200 ${data.goalType === goal.value ? 'border-primary bg-primary/10 glow-border' : 'border-border bg-surface hover:border-border/80'}`}
        >
          <span className="text-2xl">{goal.icon}</span>
          <p className="font-semibold text-sm mt-2">{goal.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{goal.desc}</p>
        </button>
      ))}
    </div>,

    // Step 2: Level
    <div key="level" className="space-y-3">
      {LEVELS.map(level => (
        <button
          key={level.value}
          onClick={() => update({ experienceLevel: level.value })}
          className={`w-full p-5 rounded-2xl border text-left transition-all duration-200 ${data.experienceLevel === level.value ? 'border-primary bg-primary/10 glow-border' : 'border-border bg-surface hover:border-border/80'}`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">{level.label}</p>
              <p className="text-sm text-muted-foreground mt-1">{level.desc}</p>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-lg">{level.years}</span>
          </div>
        </button>
      ))}
    </div>,

    // Step 3: Availability
    <div key="avail" className="space-y-5">
      <div>
        <label className="text-sm font-medium mb-3 block">Giorni di allenamento a settimana: <strong>{data.trainingDaysPerWeek}</strong></label>
        <div className="flex gap-2">
          {[2, 3, 4, 5, 6].map(d => (
            <button key={d} onClick={() => update({ trainingDaysPerWeek: d })}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${data.trainingDaysPerWeek === d ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
              {d}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-3 block">Durata sessione: <strong>{data.sessionDurationMinutes} min</strong></label>
        <div className="flex gap-2">
          {[45, 60, 75, 90].map(m => (
            <button key={m} onClick={() => update({ sessionDurationMinutes: m })}
              className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${data.sessionDurationMinutes === m ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
              {m}m
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        {[{ v: true, l: '🏋️ Palestra', d: 'Accesso a macchinari completi' }, { v: false, l: '🏠 Casa', d: 'Allenamento a casa' }].map(opt => (
          <button key={String(opt.v)} onClick={() => update({ hasGym: opt.v })}
            className={`flex-1 p-4 rounded-2xl border text-left transition-all ${data.hasGym === opt.v ? 'border-primary bg-primary/10' : 'border-border bg-surface'}`}>
            <p className="font-semibold text-sm">{opt.l}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{opt.d}</p>
          </button>
        ))}
      </div>
    </div>,

    // Step 4: Lifestyle
    <div key="lifestyle" className="space-y-5">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Ore di sonno media: <strong>{data.sleepHoursAvg}h</strong></label>
        <input type="range" min={4} max={12} step={0.5} value={data.sleepHoursAvg} onChange={e => update({ sleepHoursAvg: +e.target.value })} className="w-full accent-primary" />
        <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>4h</span><span>12h</span></div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Livello di stress quotidiano: <strong>{data.stressLevel}/10</strong></label>
        <input type="range" min={1} max={10} value={data.stressLevel} onChange={e => update({ stressLevel: +e.target.value })} className="w-full accent-primary" />
        <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>Basso</span><span>Alto</span></div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Passi medi giornalieri: <strong>{data.dailyStepsAvg.toLocaleString()}</strong></label>
        <input type="range" min={1000} max={20000} step={500} value={data.dailyStepsAvg} onChange={e => update({ dailyStepsAvg: +e.target.value })} className="w-full accent-primary" />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Tipo di lavoro</label>
        <div className="grid grid-cols-2 gap-2">
          {[['SEDENTARY', 'Sedentario'], ['LIGHT', 'Leggero'], ['MODERATE', 'Moderato'], ['ACTIVE', 'Attivo']].map(([v, l]) => (
            <button key={v} onClick={() => update({ workType: v })}
              className={`py-2.5 rounded-xl text-sm font-medium transition-all ${data.workType === v ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>,

    // Step 5: Methodology
    <div key="method" className="space-y-3 max-h-[420px] overflow-y-auto no-scrollbar">
      {METHODOLOGIES.map(m => (
        <button key={m.value} onClick={() => update({ methodology: m.value })}
          className={`w-full p-4 rounded-2xl border text-left transition-all ${data.methodology === m.value ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:border-border/80'}`}>
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-sm">{m.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
            </div>
            {data.methodology === m.value && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
          </div>
        </button>
      ))}
    </div>,

    // Step 6: Confirm & launch
    <div key="complete" className="text-center py-6">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-primary/40 animate-pulse-glow">
        <Brain className="w-10 h-10 text-white" />
      </div>
      <h3 className="text-2xl font-bold mb-2">Athena è pronta!</h3>
      <p className="text-muted-foreground mb-5 max-w-sm mx-auto">
        Il tuo profilo è completo. Athena genererà il piano personalizzato al 100%.
      </p>
      <div className="glass-card text-left space-y-3 mb-6">
        {[
          ['Obiettivo',        GOALS.find(g => g.value === data.goalType)?.label || '—'],
          ['Livello',          LEVELS.find(l => l.value === data.experienceLevel)?.label || '—'],
          ['Metodologia',      METHODOLOGIES.find(m => m.value === data.methodology)?.label || '—'],
          ['Giorni/settimana', `${data.trainingDaysPerWeek} giorni`],
          ['Sessione',         `${data.sessionDurationMinutes} minuti`],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>
      <Button variant="gradient" size="xl" onClick={handleSubmit} loading={loading} className="w-full">
        <Zap className="w-5 h-5" />
        Attiva Athena AI
      </Button>
    </div>,
  ];

  const stepIcons = [User, Target, BarChart3, Calendar, Heart, Dumbbell, CheckCircle2];
  const StepIcon = stepIcons[step];

  const canProceed = [
    () => data.name.length >= 2 && data.age >= 13,
    () => !!data.goalType,
    () => !!data.experienceLevel,
    () => true,
    () => true,
    () => !!data.methodology,
    () => true,
  ][step]();

  // Celebration screen (post-generation)
  if (showCelebration) {
    return <CelebrationScreen data={data} onContinue={() => router.push('/workout')} />;
  }

  // Generation screen
  if (generatingPlan) {
    return <GeneratingScreen stage={generationStage} />;
  }

  // Profile saved but AI plan generation failed — let the user retry without redoing the form.
  if (generationFailed) {
    return (
      <GenerationFailedScreen
        retrying={loading}
        onRetry={retryGeneration}
        onGoToWorkout={() => router.push('/workout')}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent" />

      <div className="w-full max-w-md relative">
        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-5">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
              animate={{ width: `${((step) / (STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            {step + 1} / {STEPS.length}
          </span>
        </div>

        <div className="glass-card-elevated p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <StepIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Passo {step + 1} di {STEPS.length}</p>
              <h2 className="font-bold">{STEPS[step]}</h2>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22 }}
            >
              {steps[step]}
            </motion.div>
          </AnimatePresence>

          {step < STEPS.length - 1 && (
            <div className="flex gap-3 mt-6">
              {step > 0 && (
                <Button variant="ghost" onClick={() => setStep(s => s - 1)} size="md" aria-label="Passo precedente">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="gradient"
                className="flex-1"
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed}
              >
                {STEP_CTAS[step]}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
