// ================================================================
// ATHENA AI — Shared Constants
// ================================================================

import { SubscriptionTier, TrainingMethodology, GoalType } from '../types';

export const APP_NAME = 'Athena AI';
export const APP_VERSION = '1.0.0';

// ---- NUTRITION CONSTANTS ----

export const CALORIES_PER_KG = 7700; // kcal per kg body fat
export const PROTEIN_PER_KG_LEAN = 2.0; // g protein per kg lean mass
export const PROTEIN_PER_KG_BODYWEIGHT = 1.8; // g protein per kg bodyweight (default)

export const ACTIVITY_MULTIPLIERS = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  ACTIVE: 1.725,
  VERY_ACTIVE: 1.9,
};

export const GOAL_CALORIE_ADJUSTMENTS: Record<GoalType, number> = {
  WEIGHT_LOSS: -500,
  BODY_RECOMPOSITION: -200,
  HYPERTROPHY: 300,
  STRENGTH: 200,
  POWERBUILDING: 250,
  ATHLETIC_PERFORMANCE: 200,
  LONGEVITY: 0,
  GENERAL_HEALTH: 0,
};

export const MACRO_SPLITS: Record<GoalType, { protein: number; carbs: number; fat: number }> = {
  WEIGHT_LOSS: { protein: 0.35, carbs: 0.35, fat: 0.30 },
  BODY_RECOMPOSITION: { protein: 0.35, carbs: 0.40, fat: 0.25 },
  HYPERTROPHY: { protein: 0.30, carbs: 0.50, fat: 0.20 },
  STRENGTH: { protein: 0.30, carbs: 0.45, fat: 0.25 },
  POWERBUILDING: { protein: 0.30, carbs: 0.45, fat: 0.25 },
  ATHLETIC_PERFORMANCE: { protein: 0.25, carbs: 0.55, fat: 0.20 },
  LONGEVITY: { protein: 0.25, carbs: 0.45, fat: 0.30 },
  GENERAL_HEALTH: { protein: 0.25, carbs: 0.45, fat: 0.30 },
};

// ---- TRAINING CONSTANTS ----

export const RPE_DESCRIPTIONS: Record<number, string> = {
  6: 'Easy — could do many more reps',
  7: 'Moderate — 3+ reps in reserve',
  8: 'Hard — 2 reps in reserve',
  9: 'Very hard — 1 rep in reserve',
  10: 'Maximum — no reps in reserve',
};

export const RIR_TO_RPE: Record<number, number> = {
  4: 6,
  3: 7,
  2: 8,
  1: 9,
  0: 10,
};

export const PROGRESSION_THRESHOLDS = {
  WEIGHT_INCREASE_UPPER: 2.5, // kg for upper body
  WEIGHT_INCREASE_LOWER: 5.0, // kg for lower body
  STAGNATION_WEEKS: 3,
  DELOAD_VOLUME_MULTIPLIER: 0.6,
  DELOAD_INTENSITY_MULTIPLIER: 0.85,
};

export const METHODOLOGY_DESCRIPTIONS: Record<TrainingMethodology, { name: string; description: string; bestFor: string }> = {
  PROJECT_INVICTUS: {
    name: 'Project Invictus',
    description: 'Italian methodology based on scientific hypertrophy principles with periodized volume and intensity.',
    bestFor: 'Hypertrophy, Intermediate-Advanced',
  },
  RENAISSANCE_PERIODIZATION: {
    name: 'Renaissance Periodization (RP)',
    description: 'Evidence-based approach using MEV, MAV, and MRV concepts for maximum hypertrophy.',
    bestFor: 'Hypertrophy, All levels',
  },
  JEFF_NIPPARD: {
    name: 'Jeff Nippard Style',
    description: 'Science-based training focused on compound movements with strategic isolation work.',
    bestFor: 'Hypertrophy, Aesthetics',
  },
  HYPERTROPHY_COACH: {
    name: 'Hypertrophy Coach',
    description: 'High-frequency, high-volume approach by Joe Bennett focused on maximizing muscle growth.',
    bestFor: 'Hypertrophy, Advanced',
  },
  FIVE_THREE_ONE: {
    name: '5/3/1',
    description: 'Jim Wendler\'s legendary strength program using percentage-based linear progression.',
    bestFor: 'Strength, All levels',
  },
  JUGGERNAUT: {
    name: 'Juggernaut Method',
    description: 'Chad Wesley Smith\'s program combining strength and hypertrophy in wave-based cycles.',
    bestFor: 'Strength, Powerbuilding',
  },
  RTS: {
    name: 'Reactive Training Systems',
    description: 'Auto-regulated training using RPE to manage fatigue and drive progression.',
    bestFor: 'Strength, Advanced',
  },
  WESTSIDE: {
    name: 'Westside Barbell',
    description: 'Conjugate method using max effort and dynamic effort training.',
    bestFor: 'Powerlifting, Advanced',
  },
  HEAVY_DUTY: {
    name: 'Heavy Duty (Mike Mentzer)',
    description: 'High-intensity, low-volume training taken to absolute failure.',
    bestFor: 'Hypertrophy, Intermediate-Advanced',
  },
  DOGGCRAPP: {
    name: 'Doggcrapp (DC Training)',
    description: 'High-frequency rest-pause training with extreme stretching for rapid growth.',
    bestFor: 'Hypertrophy, Advanced',
  },
  PPL: {
    name: 'Push Pull Legs',
    description: 'Classic 3 or 6-day split separating push, pull, and leg movements.',
    bestFor: 'Hypertrophy, All levels',
  },
  UPPER_LOWER: {
    name: 'Upper/Lower Split',
    description: '4-day split alternating upper and lower body for optimal frequency.',
    bestFor: 'Hypertrophy, Strength, All levels',
  },
  ATHLETIC_PERFORMANCE: {
    name: 'Athletic Performance',
    description: 'Sport-specific training combining strength, power, speed, and conditioning.',
    bestFor: 'Athletes, Intermediate-Advanced',
  },
  FUNCTIONAL_STRENGTH: {
    name: 'Functional Strength',
    description: 'Movement-pattern based training for real-world strength and stability.',
    bestFor: 'General fitness, All levels',
  },
  HYBRID_ATHLETE: {
    name: 'Hybrid Athlete',
    description: 'Balanced approach combining strength training with cardiovascular fitness.',
    bestFor: 'Performance, Health, All levels',
  },
};

// ---- SUBSCRIPTION PLANS ----

export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, {
  name: string;
  price: number;
  features: string[];
  limits: Record<string, number | boolean>;
}> = {
  FREE: {
    name: 'Free',
    price: 0,
    features: [
      'Basic workout logging',
      '3 AI-generated workouts/month',
      'Exercise library (100 exercises)',
      'Basic progress tracking',
      'Community access',
    ],
    limits: {
      aiWorkoutsPerMonth: 3,
      exercisesAccess: 100,
      aiChatMessages: 10,
      photoAnalysis: false,
      videoAnalysis: false,
      nutritionPlan: false,
      customPlan: false,
    },
  },
  PRO: {
    name: 'Pro',
    price: 14.99,
    features: [
      'Unlimited AI workout generation',
      'Full exercise library (3000+ exercises)',
      'AI nutrition planning',
      'Advanced progress analytics',
      'AI Coach chat (unlimited)',
      'Auto-progression engine',
      'Recovery tracking',
      'Priority support',
    ],
    limits: {
      aiWorkoutsPerMonth: -1,
      exercisesAccess: -1,
      aiChatMessages: -1,
      photoAnalysis: true,
      videoAnalysis: false,
      nutritionPlan: true,
      customPlan: true,
    },
  },
  PREMIUM: {
    name: 'Premium',
    price: 29.99,
    features: [
      'Everything in Pro',
      'AI video analysis',
      'Biomechanics feedback',
      'Body photo AI analysis',
      'Advanced predictive insights',
      'Priority AI response',
      'Exclusive methodologies',
      'White-glove onboarding',
    ],
    limits: {
      aiWorkoutsPerMonth: -1,
      exercisesAccess: -1,
      aiChatMessages: -1,
      photoAnalysis: true,
      videoAnalysis: true,
      nutritionPlan: true,
      customPlan: true,
    },
  },
  COACH: {
    name: 'Coach',
    price: 79.99,
    features: [
      'Everything in Premium',
      'Manage up to 50 clients',
      'Client dashboard',
      'AI-assisted program creation',
      'Automated client reports',
      'Client progress monitoring',
      'Coach analytics',
      'White-label options',
    ],
    limits: {
      aiWorkoutsPerMonth: -1,
      exercisesAccess: -1,
      aiChatMessages: -1,
      photoAnalysis: true,
      videoAnalysis: true,
      nutritionPlan: true,
      customPlan: true,
      maxClients: 50,
    },
  },
};

export const RECOVERY_SCORE_THRESHOLDS = {
  FRESH: 80,
  NORMAL: 60,
  FATIGUED: 40,
  OVERTRAINED: 0,
};

export const HRV_REFERENCE = {
  EXCELLENT: 80,
  GOOD: 60,
  FAIR: 40,
  POOR: 20,
};
