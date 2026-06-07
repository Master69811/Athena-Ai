import { NutritionEngineService } from './nutrition-engine.service';
import { GoalType, NutritionDecisionType, EngineAction, WeightTrend } from '@prisma/client';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const makePrisma = (overrides: Record<string, any> = {}) =>
  ({
    user: { findMany: jest.fn().mockResolvedValue([]) },
    nutritionPlan: { findFirst: jest.fn().mockResolvedValue(null), update: jest.fn().mockResolvedValue({}) },
    nutritionDecision: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'dec-1', ...args.data })),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      count: jest.fn().mockResolvedValue(0),
    },
    mealLog: { findMany: jest.fn().mockResolvedValue([]) },
    userProfile: { findUnique: jest.fn().mockResolvedValue(null) },
    ...overrides,
  }) as any;

const makeRecovery = (engineAction: EngineAction = EngineAction.PROCEED, hasEnoughData = false) => ({
  getRecoveryContextForEngine: jest.fn().mockResolvedValue({
    hasEnoughData,
    avgScore7d: 75,
    engineAction,
    summary: `Recovery Score 75/100.`,
  }),
}) as any;

const makeBodyWeightEngine = (snapshot: Record<string, any> | null) => ({
  getLatestSnapshot: jest.fn().mockResolvedValue(snapshot),
}) as any;

const makeNutritionService = () => ({
  calculateMacros: jest.fn().mockReturnValue({ proteinG: 150, carbsG: 200, fatG: 60 }),
}) as any;

const makePlan = (goalType: GoalType, dailyCalories = 2000) => ({
  id: 'plan-1',
  goalType,
  dailyCalories,
  proteinG: 150,
  carbsG: 200,
  fatG: 60,
  isActive: true,
});

function makeMealLogs(days: number, caloriesPerDay = 2000) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return { date: d, servings: 1, foodItem: { calories: caloriesPerDay } };
  });
}

const makeSnapshot = (overrides: Record<string, any> = {}) => ({
  logCount: 14,
  weeklyRateKg: -0.15,
  ma7d: 75.5,
  ma14d: 76,
  trendDirection: WeightTrend.STABLE,
  ...overrides,
});

describe('NutritionEngineService', () => {
  let service: NutritionEngineService;

  // ─── generateAndSaveDecision ─────────────────────────────────────────────

  describe('generateAndSaveDecision', () => {
    it('returns null when snapshot is null', async () => {
      service = new NutritionEngineService(
        makePrisma(), makeRecovery(), makeBodyWeightEngine(null), makeNutritionService(),
      );
      expect(await service.generateAndSaveDecision('user-1')).toBeNull();
    });

    it('returns null when logCount < 7', async () => {
      service = new NutritionEngineService(
        makePrisma(),
        makeRecovery(),
        makeBodyWeightEngine(makeSnapshot({ logCount: 5 })),
        makeNutritionService(),
      );
      expect(await service.generateAndSaveDecision('user-1')).toBeNull();
    });

    it('returns null when a recent decision exists (debounce)', async () => {
      const recentDecision = { createdAt: new Date() }; // today
      service = new NutritionEngineService(
        makePrisma({
          nutritionDecision: {
            findFirst: jest.fn().mockResolvedValue(recentDecision),
            create: jest.fn(),
          },
        }),
        makeRecovery(),
        makeBodyWeightEngine(makeSnapshot()),
        makeNutritionService(),
      );
      expect(await service.generateAndSaveDecision('user-1')).toBeNull();
    });

    it('WEIGHT_LOSS plateau (rate > -0.2, 14+ days) → CALORIE_DECREASE', async () => {
      const prisma = makePrisma({
        nutritionPlan: { findFirst: jest.fn().mockResolvedValue(makePlan(GoalType.WEIGHT_LOSS)) },
        mealLog: {
          findMany: jest.fn().mockResolvedValue(makeMealLogs(7, 2000)),
        },
      });
      service = new NutritionEngineService(
        prisma,
        makeRecovery(),
        makeBodyWeightEngine(makeSnapshot({ weeklyRateKg: -0.1, logCount: 14 })),
        makeNutritionService(),
      );

      const decision = await service.generateAndSaveDecision('user-1');
      expect(decision).not.toBeNull();
      expect(prisma.nutritionDecision.create.mock.calls[0][0].data.type).toBe(NutritionDecisionType.CALORIE_DECREASE);
      expect(prisma.nutritionDecision.create.mock.calls[0][0].data.deltaCalories).toBe(-125);
    });

    it('WEIGHT_LOSS losing too fast (rate < -0.8) → CALORIE_INCREASE', async () => {
      const prisma = makePrisma({
        nutritionPlan: { findFirst: jest.fn().mockResolvedValue(makePlan(GoalType.WEIGHT_LOSS)) },
        mealLog: {
          findMany: jest.fn().mockResolvedValue(makeMealLogs(7, 2000)),
        },
      });
      service = new NutritionEngineService(
        prisma,
        makeRecovery(),
        makeBodyWeightEngine(makeSnapshot({ weeklyRateKg: -1.0, logCount: 10 })),
        makeNutritionService(),
      );

      const decision = await service.generateAndSaveDecision('user-1');
      expect(decision).not.toBeNull();
      expect(prisma.nutritionDecision.create.mock.calls[0][0].data.type).toBe(NutritionDecisionType.CALORIE_INCREASE);
      expect(prisma.nutritionDecision.create.mock.calls[0][0].data.deltaCalories).toBe(100);
    });

    it('WEIGHT_LOSS plateau + Recovery HOLD → MAINTAIN (no calorie cut)', async () => {
      const prisma = makePrisma({
        nutritionPlan: { findFirst: jest.fn().mockResolvedValue(makePlan(GoalType.WEIGHT_LOSS)) },
        mealLog: {
          findMany: jest.fn().mockResolvedValue(makeMealLogs(7, 2000)),
        },
      });
      service = new NutritionEngineService(
        prisma,
        makeRecovery(EngineAction.HOLD, true),
        makeBodyWeightEngine(makeSnapshot({ weeklyRateKg: 0, logCount: 14 })),
        makeNutritionService(),
      );

      const decision = await service.generateAndSaveDecision('user-1');
      expect(decision).not.toBeNull();
      expect(prisma.nutritionDecision.create.mock.calls[0][0].data.type).toBe(NutritionDecisionType.MAINTAIN);
      expect(prisma.nutritionDecision.create.mock.calls[0][0].data.deltaCalories).toBe(0);
      expect(prisma.nutritionDecision.create.mock.calls[0][0].data.rationale).toContain('Recovery Score');
    });

    it('HYPERTROPHY slow gain (rate < 0.1) → CALORIE_INCREASE', async () => {
      const prisma = makePrisma({
        nutritionPlan: { findFirst: jest.fn().mockResolvedValue(makePlan(GoalType.HYPERTROPHY)) },
        mealLog: {
          findMany: jest.fn().mockResolvedValue(makeMealLogs(7, 2000)),
        },
      });
      service = new NutritionEngineService(
        prisma,
        makeRecovery(),
        makeBodyWeightEngine(makeSnapshot({ weeklyRateKg: 0.05, logCount: 10 })),
        makeNutritionService(),
      );

      const decision = await service.generateAndSaveDecision('user-1');
      expect(decision).not.toBeNull();
      expect(prisma.nutritionDecision.create.mock.calls[0][0].data.type).toBe(NutritionDecisionType.CALORIE_INCREASE);
      expect(prisma.nutritionDecision.create.mock.calls[0][0].data.deltaCalories).toBe(150);
    });

    it('HYPERTROPHY gaining too fast (rate > 0.5) → CALORIE_DECREASE', async () => {
      const prisma = makePrisma({
        nutritionPlan: { findFirst: jest.fn().mockResolvedValue(makePlan(GoalType.HYPERTROPHY)) },
        mealLog: { findMany: jest.fn().mockResolvedValue([]) },
      });
      service = new NutritionEngineService(
        prisma,
        makeRecovery(),
        makeBodyWeightEngine(makeSnapshot({ weeklyRateKg: 0.7, logCount: 10 })),
        makeNutritionService(),
      );

      const decision = await service.generateAndSaveDecision('user-1');
      expect(decision).not.toBeNull();
      expect(prisma.nutritionDecision.create.mock.calls[0][0].data.type).toBe(NutritionDecisionType.CALORIE_DECREASE);
    });
  });

  // ─── applyDecision ────────────────────────────────────────────────────────

  describe('applyDecision', () => {
    it('throws NotFoundException for unknown decision', async () => {
      service = new NutritionEngineService(
        makePrisma(), makeRecovery(), makeBodyWeightEngine(null), makeNutritionService(),
      );
      await expect(service.applyDecision('user-1', 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if userId does not match', async () => {
      const prisma = makePrisma({
        nutritionDecision: {
          findUnique: jest.fn().mockResolvedValue({ id: 'dec-1', userId: 'other', isApplied: false, deltaCalories: -125, planId: null }),
          update: jest.fn(),
        },
      });
      service = new NutritionEngineService(prisma, makeRecovery(), makeBodyWeightEngine(null), makeNutritionService());
      await expect(service.applyDecision('user-1', 'dec-1')).rejects.toThrow(ForbiddenException);
    });

    it('updates plan dailyCalories when deltaCalories != 0', async () => {
      const prisma = makePrisma({
        nutritionDecision: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'dec-1', userId: 'user-1', isApplied: false, deltaCalories: -125, planId: 'plan-1',
          }),
          update: jest.fn().mockResolvedValue({}),
        },
        nutritionPlan: {
          findUnique: jest.fn().mockResolvedValue({ id: 'plan-1', dailyCalories: 2000, goalType: GoalType.WEIGHT_LOSS }),
          update: jest.fn().mockResolvedValue({}),
        },
        userProfile: { findUnique: jest.fn().mockResolvedValue({ weightKg: 80 }) },
      });
      service = new NutritionEngineService(prisma, makeRecovery(), makeBodyWeightEngine(null), makeNutritionService());
      const result = await service.applyDecision('user-1', 'dec-1');
      expect(result.applied).toBe(true);
      expect(result.newCalories).toBe(1875); // 2000 - 125
      expect(prisma.nutritionPlan.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ dailyCalories: 1875 }) }),
      );
    });
  });

  // ─── computeWeeklyCompliance ──────────────────────────────────────────────

  describe('computeWeeklyCompliance', () => {
    it('returns 0 loggedDays when no meal logs', async () => {
      const prisma = makePrisma({
        nutritionPlan: { findFirst: jest.fn().mockResolvedValue({ dailyCalories: 2000 }) },
      });
      service = new NutritionEngineService(prisma, makeRecovery(), makeBodyWeightEngine(null), makeNutritionService());
      const result = await service.computeWeeklyCompliance('user-1');
      expect(result.loggedDays).toBe(0);
      expect(result.complianceScore).toBe(0);
    });

    it('computes correct compliance % from meal logs', async () => {
      // 5 distinct days, each with 2000 kcal total
      const dates = Array.from({ length: 5 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return d;
      });
      const mealLogs = dates.map((date) => ({ date, servings: 1, foodItem: { calories: 2000 } }));

      const prisma = makePrisma({
        nutritionPlan: { findFirst: jest.fn().mockResolvedValue({ dailyCalories: 2000 }) },
        mealLog: { findMany: jest.fn().mockResolvedValue(mealLogs) },
      });
      service = new NutritionEngineService(prisma, makeRecovery(), makeBodyWeightEngine(null), makeNutritionService());
      const result = await service.computeWeeklyCompliance('user-1');
      expect(result.loggedDays).toBe(5);
      expect(result.complianceScore).toBe(100);
      expect(result.avgCalories).toBe(2000);
    });
  });
});
