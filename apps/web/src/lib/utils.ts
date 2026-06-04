import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWeight(kg: number, unit: 'kg' | 'lbs' = 'kg') {
  if (unit === 'lbs') return `${(kg * 2.20462).toFixed(1)} lbs`;
  return `${kg} kg`;
}

export function calculateBMI(weightKg: number, heightCm: number) {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function estimate1RM(weightKg: number, reps: number): number {
  // Epley formula
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function getGoalLabel(goal: string): string {
  const labels: Record<string, string> = {
    WEIGHT_LOSS: 'Dimagrimento',
    BODY_RECOMPOSITION: 'Ricomposizione',
    HYPERTROPHY: 'Ipertrofia',
    STRENGTH: 'Forza',
    POWERBUILDING: 'Powerbuilding',
    ATHLETIC_PERFORMANCE: 'Performance',
    LONGEVITY: 'Longevità',
    GENERAL_HEALTH: 'Salute Generale',
  };
  return labels[goal] || goal;
}

export function getMuscleGroupLabel(muscle: string): string {
  const labels: Record<string, string> = {
    CHEST: 'Petto',
    BACK: 'Schiena',
    SHOULDERS: 'Spalle',
    BICEPS: 'Bicipiti',
    TRICEPS: 'Tricipiti',
    CORE: 'Core',
    GLUTES: 'Glutei',
    QUADS: 'Quadricipiti',
    HAMSTRINGS: 'Femorali',
    CALVES: 'Polpacci',
    FOREARMS: 'Avambracci',
    FULL_BODY: 'Corpo Intero',
  };
  return labels[muscle] || muscle;
}

export function getRecoveryColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#6366f1';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

export function getRecoveryLabel(score: number): string {
  if (score >= 80) return 'Eccellente';
  if (score >= 60) return 'Buono';
  if (score >= 40) return 'Affaticato';
  return 'Sovrallenato';
}
