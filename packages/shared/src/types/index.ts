// ================================================================
// ATHENA AI — Shared TypeScript Types
// ================================================================

// ---- ENUMS ----

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum GoalType {
  WEIGHT_LOSS = 'WEIGHT_LOSS',
  BODY_RECOMPOSITION = 'BODY_RECOMPOSITION',
  HYPERTROPHY = 'HYPERTROPHY',
  STRENGTH = 'STRENGTH',
  POWERBUILDING = 'POWERBUILDING',
  ATHLETIC_PERFORMANCE = 'ATHLETIC_PERFORMANCE',
  LONGEVITY = 'LONGEVITY',
  GENERAL_HEALTH = 'GENERAL_HEALTH',
}

export enum ExperienceLevel {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
}

export enum TrainingMethodology {
  // Hypertrophy
  PROJECT_INVICTUS = 'PROJECT_INVICTUS',
  RENAISSANCE_PERIODIZATION = 'RENAISSANCE_PERIODIZATION',
  JEFF_NIPPARD = 'JEFF_NIPPARD',
  HYPERTROPHY_COACH = 'HYPERTROPHY_COACH',
  // Strength
  FIVE_THREE_ONE = 'FIVE_THREE_ONE',
  JUGGERNAUT = 'JUGGERNAUT',
  RTS = 'RTS',
  WESTSIDE = 'WESTSIDE',
  // Bodybuilding
  HEAVY_DUTY = 'HEAVY_DUTY',
  DOGGCRAPP = 'DOGGCRAPP',
  PPL = 'PPL',
  UPPER_LOWER = 'UPPER_LOWER',
  // Performance
  ATHLETIC_PERFORMANCE = 'ATHLETIC_PERFORMANCE',
  FUNCTIONAL_STRENGTH = 'FUNCTIONAL_STRENGTH',
  HYBRID_ATHLETE = 'HYBRID_ATHLETE',
}

export enum MuscleGroup {
  CHEST = 'CHEST',
  BACK = 'BACK',
  SHOULDERS = 'SHOULDERS',
  BICEPS = 'BICEPS',
  TRICEPS = 'TRICEPS',
  FOREARMS = 'FOREARMS',
  CORE = 'CORE',
  GLUTES = 'GLUTES',
  QUADS = 'QUADS',
  HAMSTRINGS = 'HAMSTRINGS',
  CALVES = 'CALVES',
  FULL_BODY = 'FULL_BODY',
  UPPER_BODY = 'UPPER_BODY',
  LOWER_BODY = 'LOWER_BODY',
}

export enum Equipment {
  BARBELL = 'BARBELL',
  DUMBBELL = 'DUMBBELL',
  CABLE = 'CABLE',
  MACHINE = 'MACHINE',
  BODYWEIGHT = 'BODYWEIGHT',
  KETTLEBELL = 'KETTLEBELL',
  RESISTANCE_BAND = 'RESISTANCE_BAND',
  PULL_UP_BAR = 'PULL_UP_BAR',
  BENCH = 'BENCH',
  SQUAT_RACK = 'SQUAT_RACK',
  SMITH_MACHINE = 'SMITH_MACHINE',
  NONE = 'NONE',
}

export enum ExerciseDifficulty {
  BEGINNER = 'BEGINNER',
  INTERMEDIATE = 'INTERMEDIATE',
  ADVANCED = 'ADVANCED',
  EXPERT = 'EXPERT',
}

export enum ExerciseCategory {
  COMPOUND = 'COMPOUND',
  ISOLATION = 'ISOLATION',
  CARDIO = 'CARDIO',
  MOBILITY = 'MOBILITY',
  PLYOMETRIC = 'PLYOMETRIC',
  OLYMPIC = 'OLYMPIC',
}

export enum MealType {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  SNACK = 'SNACK',
  PRE_WORKOUT = 'PRE_WORKOUT',
  POST_WORKOUT = 'POST_WORKOUT',
}

export enum SubscriptionTier {
  FREE = 'FREE',
  PRO = 'PRO',
  PREMIUM = 'PREMIUM',
  COACH = 'COACH',
}

export enum UserRole {
  USER = 'USER',
  TRAINER = 'TRAINER',
  ADMIN = 'ADMIN',
}

export enum WorkoutSplitType {
  FULL_BODY = 'FULL_BODY',
  UPPER_LOWER = 'UPPER_LOWER',
  PUSH_PULL_LEGS = 'PUSH_PULL_LEGS',
  BROSPLIT = 'BROSPLIT',
  ARNOLD_SPLIT = 'ARNOLD_SPLIT',
  CUSTOM = 'CUSTOM',
}

export enum AIMessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

export enum ProgressionAction {
  INCREASE_WEIGHT = 'INCREASE_WEIGHT',
  INCREASE_REPS = 'INCREASE_REPS',
  INCREASE_SETS = 'INCREASE_SETS',
  MAINTAIN = 'MAINTAIN',
  DECREASE_WEIGHT = 'DECREASE_WEIGHT',
  DELOAD = 'DELOAD',
  CHANGE_EXERCISE = 'CHANGE_EXERCISE',
}

export enum FatigueLevel {
  FRESH = 'FRESH',
  NORMAL = 'NORMAL',
  FATIGUED = 'FATIGUED',
  OVERTRAINED = 'OVERTRAINED',
}

export enum TrainerClientStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  TERMINATED = 'TERMINATED',
}

export enum AchievementCategory {
  CONSISTENCY = 'CONSISTENCY',
  STRENGTH = 'STRENGTH',
  VOLUME = 'VOLUME',
  NUTRITION = 'NUTRITION',
  BODY_COMPOSITION = 'BODY_COMPOSITION',
  MILESTONE = 'MILESTONE',
  SOCIAL = 'SOCIAL',
}

export enum AchievementRarity {
  COMMON = 'COMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

export enum WorkType {
  SEDENTARY = 'SEDENTARY',
  LIGHT = 'LIGHT',
  MODERATE = 'MODERATE',
  ACTIVE = 'ACTIVE',
  VERY_ACTIVE = 'VERY_ACTIVE',
}

// ---- CORE ENTITIES ----

export interface User {
  id: string;
  email: string;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
  isActive: boolean;
  emailVerified: boolean;
  googleId?: string;
  appleId?: string;
  createdAt: Date;
  updatedAt: Date;
  profile?: UserProfile;
}

export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  bodyFatPercentage?: number;
  goalType: GoalType;
  experienceLevel: ExperienceLevel;
  methodology: TrainingMethodology;
  trainingDaysPerWeek: number;
  sessionDurationMinutes: number;
  hasGym: boolean;
  equipment: Equipment[];
  injuries: string[];
  stressLevel: number; // 1-10
  sleepHoursAvg: number;
  dailyStepsAvg: number;
  workType: WorkType;
  avatarUrl?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BodyMeasurement {
  id: string;
  userId: string;
  date: Date;
  weightKg: number;
  bodyFatPct?: number;
  leanMassKg?: number;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  armLeftCm?: number;
  armRightCm?: number;
  thighLeftCm?: number;
  thighRightCm?: number;
  calfLeftCm?: number;
  calfRightCm?: number;
  photoFrontUrl?: string;
  photoSideUrl?: string;
  photoBackUrl?: string;
  notes?: string;
}

// ---- EXERCISES ----

export interface Exercise {
  id: string;
  name: string;
  nameIt?: string;
  category: ExerciseCategory;
  muscleGroups: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment[];
  difficulty: ExerciseDifficulty;
  instructions: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
  animationUrl?: string;
  commonMistakes: string[];
  variations: string[];
  progressions: string[];
  regressions: string[];
  alternatives: string[];
  isCustom: boolean;
  creatorId?: string;
  createdAt: Date;
}

// ---- WORKOUT PLANS ----

export interface WorkoutPlan {
  id: string;
  userId: string;
  name: string;
  description?: string;
  methodology: TrainingMethodology;
  splitType: WorkoutSplitType;
  goal: GoalType;
  daysPerWeek: number;
  durationWeeks: number;
  currentWeek: number;
  isActive: boolean;
  isAIGenerated: boolean;
  aiReasoning?: string;
  days: WorkoutDay[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutDay {
  id: string;
  planId: string;
  dayIndex: number; // 0-6 (Mon-Sun)
  name: string;
  muscleGroups: MuscleGroup[];
  notes?: string;
  exercises: WorkoutExercise[];
}

export interface WorkoutExercise {
  id: string;
  dayId: string;
  exerciseId: string;
  exercise?: Exercise;
  order: number;
  sets: number;
  repsMin: number;
  repsMax: number;
  rpeTarget?: number;
  rirTarget?: number;
  restSeconds: number;
  notes?: string;
  supersetGroup?: string;
}

// ---- WORKOUT SESSIONS ----

export interface WorkoutSession {
  id: string;
  userId: string;
  planId?: string;
  dayId?: string;
  startedAt: Date;
  completedAt?: Date;
  durationMinutes?: number;
  rpe?: number; // overall session RPE
  energyLevel?: number; // 1-10
  notes?: string;
  aiAnalysis?: string;
  sets: WorkoutSet[];
}

export interface WorkoutSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  exercise?: Exercise;
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe?: number;
  rir?: number;
  isWarmup: boolean;
  isDropset: boolean;
  notes?: string;
  completedAt: Date;
}

export interface Exercise1RM {
  id: string;
  userId: string;
  exerciseId: string;
  exercise?: Exercise;
  estimated1RM: number;
  date: Date;
  method: 'EPLEY' | 'BRZYCKI' | 'DIRECT';
}

// ---- NUTRITION ----

export interface NutritionPlan {
  id: string;
  userId: string;
  goalType: GoalType;
  dailyCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  mealsPerDay: number;
  notes?: string;
  isActive: boolean;
  aiReasoning?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  servingSize: number;
  servingUnit: string;
  barcode?: string;
}

export interface MealLog {
  id: string;
  userId: string;
  date: Date;
  mealType: MealType;
  foodItemId: string;
  foodItem?: FoodItem;
  servings: number;
  notes?: string;
}

export interface DailyNutritionSummary {
  date: Date;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  meals: MealLog[];
}

export interface WeeklyNutritionCheck {
  id: string;
  userId: string;
  weekStart: Date;
  avgDailyCalories: number;
  weightChange: number; // kg
  actionTaken: string;
  newCalories?: number;
  aiNotes: string;
}

// ---- RECOVERY ----

export interface RecoveryLog {
  id: string;
  userId: string;
  date: Date;
  sleepHours: number;
  sleepQuality: number; // 1-10
  stressLevel: number; // 1-10
  steps: number;
  hrv?: number;
  restingHR?: number;
  energyLevel: number; // 1-10
  overallScore: number; // 0-100
  fatigueLevel: FatigueLevel;
  notes?: string;
}

export interface RecoveryInsight {
  score: number;
  level: FatigueLevel;
  recommendation: string;
  adjustments: {
    volumeMultiplier: number;
    intensityMultiplier: number;
    skipSession: boolean;
  };
}

// ---- AI ----

export interface AIConversation {
  id: string;
  userId: string;
  title: string;
  context?: string;
  messages: AIMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: AIMessageRole;
  content: string;
  tokens?: number;
  createdAt: Date;
}

export interface AIWorkoutRecommendation {
  exerciseId: string;
  recommendedWeight: number;
  recommendedReps: number;
  recommendedSets: number;
  reasoning: string;
  progressionAction: ProgressionAction;
}

export interface AIProgressionDecision {
  exerciseId: string;
  action: ProgressionAction;
  oldWeight?: number;
  newWeight?: number;
  oldReps?: number;
  newReps?: number;
  reasoning: string;
  appliedAt: Date;
}

// ---- GAMIFICATION ----

export interface Achievement {
  id: string;
  name: string;
  nameIt: string;
  description: string;
  descriptionIt: string;
  iconUrl?: string;
  category: AchievementCategory;
  points: number;
  rarity: AchievementRarity;
  criteria: Record<string, unknown>;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  achievement?: Achievement;
  earnedAt: Date;
  progress: number; // 0-100
}

export interface Streak {
  id: string;
  userId: string;
  type: 'WORKOUT' | 'NUTRITION' | 'RECOVERY';
  currentCount: number;
  longestCount: number;
  lastActivityDate: Date;
  startDate: Date;
}

// ---- SUBSCRIPTIONS ----

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId?: string;
}

// ---- TRAINER ----

export interface TrainerClient {
  id: string;
  trainerId: string;
  clientId: string;
  client?: User;
  status: TrainerClientStatus;
  notes?: string;
  createdAt: Date;
}

// ---- PROGRESS ----

export interface ProgressPhoto {
  id: string;
  userId: string;
  url: string;
  date: Date;
  type: 'FRONT' | 'SIDE' | 'BACK';
  aiAnalysis?: string;
  bodyFatEstimate?: number;
}

export interface VideoAnalysis {
  id: string;
  userId: string;
  videoUrl: string;
  exerciseId: string;
  analysisResult: string;
  errors: string[];
  corrections: string[];
  score: number; // 0-100
  createdAt: Date;
}

export interface StrengthProgress {
  exerciseId: string;
  exercise?: Exercise;
  history: Array<{
    date: Date;
    estimated1RM: number;
    bestSet: { weight: number; reps: number };
  }>;
  progressPercent: number;
}

// ---- API RESPONSES ----

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface ApiError {
  success: false;
  error: string;
  message: string;
  statusCode: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ---- ONBOARDING ----

export interface OnboardingData {
  personal: {
    name: string;
    age: number;
    gender: Gender;
    heightCm: number;
    weightKg: number;
    bodyFatPercentage?: number;
  };
  goals: {
    goalType: GoalType;
    targetWeight?: number;
  };
  level: {
    experienceLevel: ExperienceLevel;
  };
  availability: {
    trainingDaysPerWeek: number;
    sessionDurationMinutes: number;
    hasGym: boolean;
    equipment: Equipment[];
  };
  lifestyle: {
    sleepHoursAvg: number;
    stressLevel: number;
    dailyStepsAvg: number;
    workType: WorkType;
  };
  methodology: {
    methodology: TrainingMethodology;
  };
  limitations: {
    injuries: string[];
  };
}

// ---- DASHBOARD ----

export interface DashboardStats {
  workoutsThisWeek: number;
  totalVolumeThisWeek: number;
  prsThisMonth: number;
  currentStreak: number;
  recoveryScore: number;
  weeklyVolume: Array<{ day: string; volume: number }>;
  weightTrend: Array<{ date: string; weight: number }>;
  todayMacros: {
    calories: { consumed: number; target: number };
    protein: { consumed: number; target: number };
    carbs: { consumed: number; target: number };
    fat: { consumed: number; target: number };
  };
  nextWorkout?: WorkoutDay;
  aiInsightOfTheDay: string;
}

export interface PredictiveInsight {
  timeframe: '4_WEEKS' | '12_WEEKS' | '24_WEEKS';
  predictedWeightKg: number;
  predictedBodyFatPct?: number;
  predictedLeanMassKg?: number;
  confidence: number; // 0-1
  assumptions: string[];
}
