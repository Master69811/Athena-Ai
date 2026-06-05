'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { usersApi, workoutApi, recoveryApi, nutritionApi, progressionApi } from '@/lib/api';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip,
} from 'recharts';
import { Flame, Dumbbell, TrendingUp, Zap, ChevronRight, Brain, Activity } from 'lucide-react';
import Link from 'next/link';
import { getRecoveryColor, getRecoveryLabel, formatWeight } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { InsightCard, type ProgressionInsight } from '@/components/progression/insight-card';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: usersApi.getDashboard,
    select: (res: any) => res.data,
  });

  const { data: recovery } = useQuery({
    queryKey: ['recovery-latest'],
    queryFn: recoveryApi.getLatest,
    select: (res: any) => res.data,
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

  const { data: latestInsights } = useQuery<ProgressionInsight[]>({
    queryKey: ['progression-insights-dashboard'],
    queryFn: async () => {
      const res = await progressionApi.getInsights({ limit: 3, unreadOnly: false }) as any;
      return res.data;
    },
    staleTime: 60_000,
  });

  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ['progression-unread-count'],
    queryFn: async () => {
      const res = await progressionApi.getUnreadCount() as any;
      return res.data;
    },
    staleTime: 60_000,
  });

  const unreadCount = unreadCountData?.count ?? 0;

  const recoveryScore = recovery?.score || 75;
  const recoveryColor = getRecoveryColor(recoveryScore);

  const macroData = todayNutrition?.totals
    ? [
        { name: 'Proteine', value: todayNutrition.totals.protein.consumed, target: todayNutrition.totals.protein.target, color: '#6366f1' },
        { name: 'Carboidrati', value: todayNutrition.totals.carbs.consumed, target: todayNutrition.totals.carbs.target, color: '#8b5cf6' },
        { name: 'Grassi', value: todayNutrition.totals.fat.consumed, target: todayNutrition.totals.fat.target, color: '#06b6d4' },
      ]
    : [];

  return (
    <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-6 max-w-7xl mx-auto">
      
      {/* Welcome + AI Insight */}
      <motion.div variants={fadeInUp}>
        <Card glow className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/30">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-primary font-medium mb-1">ATHENA AI — INSIGHT DEL GIORNO</p>
              <p className="text-sm text-foreground leading-relaxed">
                {dashboard?.aiInsightOfTheDay || 'Caricamento insight personalizzato...'}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* KPI Grid */}
      <motion.div variants={fadeInUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Dumbbell className="w-5 h-5" />}
          label="Allenamenti"
          value={dashboard?.workoutsThisWeek || 0}
          suffix="questa settimana"
          color="primary"
        />
        <MetricCard
          icon={<Flame className="w-5 h-5" />}
          label="Volume Totale"
          value={dashboard?.totalVolumeThisWeek ? `${(dashboard.totalVolumeThisWeek / 1000).toFixed(1)}t` : '0t'}
          suffix="questa settimana"
          color="accent"
        />
        <MetricCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Streak"
          value={dashboard?.currentStreak || 0}
          suffix="giorni consecutivi"
          color="success"
        />
        <MetricCard
          icon={<Activity className="w-5 h-5" />}
          label="Recovery"
          value={`${recoveryScore}%`}
          suffix={getRecoveryLabel(recoveryScore)}
          color={recoveryScore >= 70 ? 'success' : recoveryScore >= 50 ? 'primary' : 'warning'}
        />
      </motion.div>

      {/* Athena Insights widget */}
      {latestInsights && latestInsights.length > 0 && (
        <motion.div variants={fadeInUp}>
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  <CardTitle>Insight di Athena</CardTitle>
                  {unreadCount > 0 && (
                    <span className="text-xs font-bold text-white bg-primary px-2 py-0.5 rounded-full shadow-sm shadow-primary/40">
                      {unreadCount} nuovi
                    </span>
                  )}
                </div>
                <Link href="/progress/insights" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Vedi tutti <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </CardHeader>
            <div className="space-y-3">
              {latestInsights.slice(0, 2).map((insight) => (
                <InsightCard key={insight.id} insight={insight} compact />
              ))}
            </div>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Weight Trend Chart */}
        <motion.div variants={fadeInUp} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Andamento Peso</CardTitle>
            </CardHeader>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboard?.weightTrend || []}>
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(239,84%,67%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(239,84%,67%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(240 5% 55%)' }} tickLine={false} axisLine={false} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(240 5% 55%)' }} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(240 10% 10%)', border: '1px solid hsl(240 8% 14%)', borderRadius: '12px', color: 'hsl(0 0% 98%)' }}
                    formatter={(v: any) => [`${v} kg`, 'Peso']}
                  />
                  <Area type="monotone" dataKey="weight" stroke="hsl(239,84%,67%)" strokeWidth={2} fill="url(#weightGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </motion.div>

        {/* Recovery Score Ring */}
        <motion.div variants={fadeInUp}>
          <Card className="flex flex-col items-center justify-center gap-3 py-6">
            <p className="text-sm text-muted-foreground font-medium">Recovery Score</p>
            <div className="relative">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(240 8% 14%)" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="50"
                  fill="none"
                  stroke={recoveryColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - recoveryScore / 100)}`}
                  transform="rotate(-90 60 60)"
                  style={{ transition: 'stroke-dashoffset 1s ease-in-out', filter: `drop-shadow(0 0 8px ${recoveryColor}60)` }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold" style={{ color: recoveryColor }}>{recoveryScore}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>
            <p className="text-sm font-medium" style={{ color: recoveryColor }}>
              {getRecoveryLabel(recoveryScore)}
            </p>
            <p className="text-xs text-muted-foreground text-center px-4 leading-relaxed">
              {recovery?.recommendation || 'Registra il tuo recupero giornaliero'}
            </p>
          </Card>
        </motion.div>
      </div>

      {/* Today's Nutrition + Next Workout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Macros */}
        {todayNutrition && (
          <motion.div variants={fadeInUp}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Nutrizione Oggi</CardTitle>
                  <Link href="/nutrition" className="text-xs text-primary hover:underline">Dettagli →</Link>
                </div>
              </CardHeader>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{Math.round(todayNutrition.totals.calories.consumed)}</span>
                  <span className="text-sm text-muted-foreground">/ {todayNutrition.totals.calories.target} kcal</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, (todayNutrition.totals.calories.consumed / todayNutrition.totals.calories.target) * 100)}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {macroData.map(macro => (
                    <div key={macro.name} className="text-center">
                      <div className="text-lg font-bold" style={{ color: macro.color }}>{macro.value}g</div>
                      <div className="text-xs text-muted-foreground">{macro.name}</div>
                      <div className="text-xs text-muted-foreground">/ {macro.target}g</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Next Workout */}
        <motion.div variants={fadeInUp}>
          <Card className="flex flex-col gap-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Prossimo Allenamento</CardTitle>
                <Link href="/workout" className="text-xs text-primary hover:underline">Piano →</Link>
              </div>
            </CardHeader>
            {activePlan?.days?.[0] ? (
              <>
                <div>
                  <p className="font-semibold text-foreground">{activePlan.days[0].name}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activePlan.days[0].exercises?.length || 0} esercizi · {activePlan.name}
                  </p>
                </div>
                <div className="space-y-2">
                  {activePlan.days[0].exercises?.slice(0, 3).map((ex: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">{i + 1}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{ex.exercise?.name || 'Esercizio'}</p>
                        <p className="text-xs text-muted-foreground">{ex.sets} serie · {ex.repsMin}-{ex.repsMax} rip</p>
                      </div>
                    </div>
                  ))}
                </div>
                <Link href="/workout/session">
                  <Button variant="gradient" className="w-full">
                    <Zap className="w-4 h-4" />
                    Inizia Allenamento
                  </Button>
                </Link>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-4">
                <p className="text-sm text-muted-foreground text-center">
                  Nessun programma attivo. Genera il tuo piano con AI!
                </p>
                <Link href="/workout">
                  <Button variant="outline">Crea Piano AI</Button>
                </Link>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

function MetricCard({ icon, label, value, suffix, color }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  suffix: string;
  color: 'primary' | 'accent' | 'success' | 'warning';
}) {
  const colors = {
    primary: 'text-primary bg-primary/10',
    accent: 'text-accent bg-accent/10',
    success: 'text-[hsl(var(--success))] bg-[hsl(var(--success)/0.1)]',
    warning: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.1)]',
  };

  return (
    <Card className="hover:border-primary/20 transition-colors">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      <p className="text-xs text-muted-foreground">{suffix}</p>
    </Card>
  );
}
