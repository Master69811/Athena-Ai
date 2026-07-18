// Centralized query key factory to avoid duplicate queries and simplify cache management
export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    me: ['auth', 'me'] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    profile: (userId: string) => ['users', userId, 'profile'] as const,
    me: ['users', 'me'] as const,
  },

  // Workout Plans
  workoutPlans: {
    all: ['workoutPlans'] as const,
    lists: () => [...queryKeys.workoutPlans.all, 'list'] as const,
    list: (userId: string) => ['workoutPlans', userId, 'list'] as const,
    detail: (planId: string) => ['workoutPlans', planId] as const,
    active: (userId: string) => ['workoutPlans', userId, 'active'] as const,
  },

  // Workout Sessions
  sessions: {
    all: ['sessions'] as const,
    list: (userId: string) => ['sessions', userId, 'list'] as const,
    detail: (sessionId: string) => ['sessions', sessionId] as const,
    history: (userId: string, limit?: number) => ['sessions', userId, 'history', limit] as const,
  },

  // Recovery
  recovery: {
    all: ['recovery'] as const,
    logs: (userId: string) => ['recovery', userId, 'logs'] as const,
    latest: (userId: string) => ['recovery', userId, 'latest'] as const,
    snapshot: (userId: string) => ['recovery', userId, 'snapshot'] as const,
    context: (userId: string) => ['recovery', userId, 'context'] as const,
  },

  // Nutrition
  nutrition: {
    all: ['nutrition'] as const,
    plan: (userId: string) => ['nutrition', userId, 'plan'] as const,
    decisions: (userId: string) => ['nutrition', userId, 'decisions'] as const,
    today: (userId: string) => ['nutrition', userId, 'today'] as const,
  },

  // Body Weight
  bodyWeight: {
    all: ['bodyWeight'] as const,
    entries: (userId: string) => ['bodyWeight', userId, 'entries'] as const,
    snapshot: (userId: string) => ['bodyWeight', userId, 'snapshot'] as const,
  },

  // Progress
  progress: {
    all: ['progress'] as const,
    measurements: (userId: string) => ['progress', userId, 'measurements'] as const,
    insights: (userId: string) => ['progress', userId, 'insights'] as const,
    analytics: {
      muscle: (userId: string) => ['progress', userId, 'analytics', 'muscle'] as const,
      trend: (userId: string) => ['progress', userId, 'analytics', 'trend'] as const,
      frequency: (userId: string) => ['progress', userId, 'analytics', 'frequency'] as const,
    },
  },

  // AI Coach
  aiCoach: {
    all: ['aiCoach'] as const,
    conversations: (userId: string) => ['aiCoach', userId, 'conversations'] as const,
    suggestions: (userId: string) => ['aiCoach', userId, 'suggestions'] as const,
  },

  // Exercises
  exercises: {
    all: ['exercises'] as const,
    list: () => ['exercises', 'list'] as const,
    detail: (exerciseId: string) => ['exercises', exerciseId] as const,
  },

  // Achievements
  achievements: {
    all: ['achievements'] as const,
    userAchievements: (userId: string) => ['achievements', userId] as const,
  },
} as const;
