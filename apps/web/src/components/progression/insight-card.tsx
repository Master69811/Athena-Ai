'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Activity, Dumbbell } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type ProgressionAction =
  | 'INCREASE_WEIGHT'
  | 'INCREASE_REPS'
  | 'INCREASE_SETS'
  | 'MAINTAIN'
  | 'DECREASE_WEIGHT'
  | 'DELOAD'
  | 'CHANGE_EXERCISE';

export interface InsightEvidenceData {
  avgRpe: number;
  avgReps: number;
  avgWeight: number;
  setCount: number;
  weeksAnalyzed: number;
  weeklyVolumes: number[];
}

export interface ProgressionInsight {
  id: string;
  action: ProgressionAction;
  oldWeight?: number;
  newWeight?: number;
  oldReps?: number;
  newReps?: number;
  reasoning: string;
  isRead: boolean;
  evidenceData?: InsightEvidenceData | null;
  appliedAt: string;
  exercise: {
    id: string;
    name: string;
    nameIt?: string;
    category: string;
    muscleGroups: string[];
  };
}

const ACTION_CONFIG: Record<
  ProgressionAction,
  { label: string; icon: React.ElementType; color: string; bg: string; border: string }
> = {
  INCREASE_WEIGHT: {
    label: 'Aumento Carico',
    icon: TrendingUp,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  INCREASE_REPS: {
    label: 'Aumento Reps',
    icon: TrendingUp,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  INCREASE_SETS: {
    label: 'Aumento Serie',
    icon: TrendingUp,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  MAINTAIN: {
    label: 'Mantenimento',
    icon: Minus,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
  },
  DECREASE_WEIGHT: {
    label: 'Riduzione Carico',
    icon: TrendingDown,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  DELOAD: {
    label: 'Deload',
    icon: TrendingDown,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  CHANGE_EXERCISE: {
    label: 'Cambia Esercizio',
    icon: RefreshCw,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/30',
  },
};

interface InsightCardProps {
  insight: ProgressionInsight;
  compact?: boolean;
}

export function InsightCard({ insight, compact = false }: InsightCardProps) {
  const config = ACTION_CONFIG[insight.action];
  const ActionIcon = config.icon;
  const evidence = insight.evidenceData;

  const weightDelta =
    insight.newWeight != null && insight.oldWeight != null
      ? insight.newWeight - insight.oldWeight
      : null;

  const formattedDate = new Date(insight.appliedAt).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={cn(
          'relative overflow-hidden transition-all duration-200',
          config.border,
          !insight.isRead && 'ring-1 ring-primary/30',
        )}
      >
        {/* Unread indicator */}
        {!insight.isRead && (
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.8)]" />
        )}

        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', config.bg)}>
            <ActionIcon className={cn('w-4.5 h-4.5', config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-xs font-bold uppercase tracking-wider', config.color)}>
                {config.label}
              </span>
              {!insight.isRead && (
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  NUOVO
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-foreground truncate mt-0.5">
              {insight.exercise.nameIt || insight.exercise.name}
            </p>
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </div>
        </div>

        {/* Before / After */}
        {insight.oldWeight != null && (
          <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-muted/40">
            <div className="text-center flex-1">
              <p className="text-xs text-muted-foreground mb-0.5">Prima</p>
              <p className="text-xl font-bold text-foreground">{insight.oldWeight.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground">kg</p>
            </div>
            <div className={cn('flex flex-col items-center gap-0.5', config.color)}>
              <ActionIcon className="w-5 h-5" />
              {weightDelta != null && weightDelta !== 0 && (
                <span className="text-xs font-bold">
                  {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)}kg
                </span>
              )}
            </div>
            <div className="text-center flex-1">
              <p className="text-xs text-muted-foreground mb-0.5">Dopo</p>
              <p className={cn('text-xl font-bold', config.color)}>
                {insight.newWeight != null ? insight.newWeight.toFixed(1) : '—'}
              </p>
              <p className="text-xs text-muted-foreground">kg</p>
            </div>
          </div>
        )}

        {/* Reasoning */}
        <p className="text-sm text-foreground/80 leading-relaxed mb-3">
          {insight.reasoning}
        </p>

        {/* Evidence bar — hidden in compact mode */}
        {!compact && evidence && (
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50">
            <EvidenceStat
              icon={<Activity className="w-3.5 h-3.5" />}
              label="RPE Medio"
              value={`${evidence.avgRpe}`}
              subValue="/ 10"
            />
            <EvidenceStat
              icon={<Dumbbell className="w-3.5 h-3.5" />}
              label="Reps Medi"
              value={`${evidence.avgReps}`}
              subValue={`su ${evidence.setCount} serie`}
            />
            <EvidenceStat
              icon={<TrendingUp className="w-3.5 h-3.5" />}
              label="Settimane"
              value={`${evidence.weeksAnalyzed}`}
              subValue="analizzate"
            />
          </div>
        )}
      </Card>
    </motion.div>
  );
}

function EvidenceStat({
  icon,
  label,
  value,
  subValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-0.5">
      <div className="text-muted-foreground mb-0.5">{icon}</div>
      <p className="text-sm font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
      <p className="text-[10px] text-muted-foreground/60">{subValue}</p>
    </div>
  );
}
