import { ProgramAdjustmentService } from './program-engine.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

// Minimal plan fixture used across tests
const mockExercise = {
  id: 'ex-1',
  name: 'Bench Press',
  nameIt: 'Panca Piana',
  alternatives: ['Incline Bench Press', 'Dumbbell Press'],
};

const mockPlanExercise = {
  id: 'pe-1',
  exerciseId: 'ex-1',
  sets: 4,
  repsMin: 6,
  repsMax: 10,
  rpeTarget: 8,
  rirTarget: 2,
  restSeconds: 180,
  recommendedWeightKg: 95,
  deloadActive: false,
  exercise: mockExercise,
};

const mockPlan = {
  id: 'plan-1',
  name: 'PPL Hypertrophy',
  days: [
    {
      id: 'day-1',
      name: 'Push',
      exercises: [mockPlanExercise],
    },
  ],
};

const makePrisma = (overrides: Record<string, any> = {}) =>
  ({
    user: { findMany: jest.fn().mockResolvedValue([]) },
    workoutPlan: { findFirst: jest.fn().mockResolvedValue(null) },
    workoutExercise: { update: jest.fn().mockResolvedValue({}) },
    aIProgressionDecision: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
    },
    programVersion: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'v-1', versionNumber: 1, planId: 'plan-1', createdAt: new Date() }),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    programAdjustment: {
      create: jest.fn().mockImplementation((args) => Promise.resolve({ id: 'adj-1', ...args.data })),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    exercise: { findFirst: jest.fn().mockResolvedValue(null) },
    ...overrides,
  }) as any;

const makeRecovery = (contextOverrides: Record<string, any> = {}) =>
  ({
    getRecoveryContextForEngine: jest.fn().mockResolvedValue({
      hasEnoughData: false,
      avgScore7d: 75,
      minScore7d: 65,
      consecutiveLowDays: 0,
      trendDirection: 'STABLE',
      overreachingRisk: 'NONE',
      engineAction: 'PROCEED',
      summary: 'Dati insufficienti per valutare il recupero.',
      ...contextOverrides,
    }),
  }) as any;

describe('ProgramAdjustmentService', () => {
  let service: ProgramAdjustmentService;

  // ─── createPlanSnapshot ──────────────────────────────────────────────────

  describe('createPlanSnapshot', () => {
    beforeEach(() => {
      service = new ProgramAdjustmentService(makePrisma(), makeRecovery());
    });

    it('captures all exercise fields accurately', () => {
      const snap = service.createPlanSnapshot(mockPlan) as any;
      expect(snap.planId).toBe('plan-1');
      expect(snap.days).toHaveLength(1);
      const ex = snap.days[0].exercises[0];
      expect(ex.sets).toBe(4);
      expect(ex.repsMin).toBe(6);
      expect(ex.repsMax).toBe(10);
      expect(ex.recommendedWeightKg).toBe(95);
      expect(ex.deloadActive).toBe(false);
    });

    it('includes capturedAt timestamp', () => {
      const snap = service.createPlanSnapshot(mockPlan) as any;
      expect(typeof snap.capturedAt).toBe('string');
    });
  });

  // ─── applyPendingDecisions (no decisions) ───────────────────────────────

  describe('applyPendingDecisions — no pending decisions', () => {
    it('returns applied=0 when no active plan', async () => {
      service = new ProgramAdjustmentService(makePrisma(), makeRecovery());
      const result = await service.applyPendingDecisions('user-1');
      expect(result.applied).toBe(0);
      expect(result.versionId).toBeNull();
    });

    it('returns applied=0 when decisions list is empty', async () => {
      service = new ProgramAdjustmentService(
        makePrisma({
          workoutPlan: { findFirst: jest.fn().mockResolvedValue(mockPlan) },
        }),
        makeRecovery(),
      );
      const result = await service.applyPendingDecisions('user-1');
      expect(result.applied).toBe(0);
    });
  });

  // ─── INCREASE_WEIGHT ─────────────────────────────────────────────────────

  describe('INCREASE_WEIGHT decision', () => {
    beforeEach(() => {
      const decision = {
        id: 'd-1',
        action: 'INCREASE_WEIGHT',
        exerciseId: 'ex-1',
        oldWeight: 95,
        newWeight: 97.5,
        reasoning: 'RPE medio 6.5 per 3 settimane. Aumento carico di 2.5kg.',
        exercise: mockExercise,
        isApplied: false,
      };

      service = new ProgramAdjustmentService(
        makePrisma({
          workoutPlan: { findFirst: jest.fn().mockResolvedValue(mockPlan) },
          aIProgressionDecision: {
            findMany: jest.fn().mockResolvedValue([decision]),
            update: jest.fn().mockResolvedValue({}),
          },
        }),
        makeRecovery(),
      );
    });

    it('applies weight increase and returns 1 adjustment', async () => {
      const result = await service.applyPendingDecisions('user-1');
      expect(result.applied).toBe(1);
      expect(result.versionId).toBe('v-1');
    });

    it('calls workoutExercise.update with recommendedWeightKg=97.5', async () => {
      const prisma = makePrisma({
        workoutPlan: { findFirst: jest.fn().mockResolvedValue(mockPlan) },
        aIProgressionDecision: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'd-1', action: 'INCREASE_WEIGHT', exerciseId: 'ex-1',
              newWeight: 97.5, reasoning: 'test', exercise: mockExercise, isApplied: false,
            },
          ]),
          update: jest.fn().mockResolvedValue({}),
        },
      });
      service = new ProgramAdjustmentService(prisma, makeRecovery());
      await service.applyPendingDecisions('user-1');
      expect(prisma.workoutExercise.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ recommendedWeightKg: 97.5 }),
        }),
      );
    });
  });

  // ─── DECREASE_WEIGHT ─────────────────────────────────────────────────────

  describe('DECREASE_WEIGHT decision', () => {
    it('decreases recommendedWeightKg', async () => {
      const prisma = makePrisma({
        workoutPlan: { findFirst: jest.fn().mockResolvedValue(mockPlan) },
        aIProgressionDecision: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'd-2', action: 'DECREASE_WEIGHT', exerciseId: 'ex-1',
              oldWeight: 95, newWeight: 92.5, reasoning: 'RPE troppo alto.', exercise: mockExercise, isApplied: false,
            },
          ]),
          update: jest.fn().mockResolvedValue({}),
        },
      });
      service = new ProgramAdjustmentService(prisma, makeRecovery());
      const result = await service.applyPendingDecisions('user-1');
      expect(result.applied).toBe(1);
      expect(prisma.workoutExercise.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { recommendedWeightKg: 92.5 } }),
      );
    });
  });

  // ─── DELOAD ──────────────────────────────────────────────────────────────

  describe('DELOAD decision', () => {
    it('reduces sets by 30% and rpeTarget by 3, sets deloadActive=true', async () => {
      const prisma = makePrisma({
        workoutPlan: { findFirst: jest.fn().mockResolvedValue(mockPlan) },
        aIProgressionDecision: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'd-3', action: 'DELOAD', exerciseId: 'ex-1',
              reasoning: 'Plateau rilevato.', exercise: mockExercise, isApplied: false,
            },
          ]),
          update: jest.fn().mockResolvedValue({}),
        },
      });
      service = new ProgramAdjustmentService(prisma, makeRecovery());
      const result = await service.applyPendingDecisions('user-1');
      expect(result.applied).toBe(2); // sets + rpeTarget adjustments

      const call = prisma.workoutExercise.update.mock.calls[0];
      expect(call[0].data.deloadActive).toBe(true);
      expect(call[0].data.sets).toBe(Math.max(1, Math.ceil(4 * 0.7))); // 3
      expect(call[0].data.rpeTarget).toBe(Math.max(5, 8 - 3)); // 5
    });

    it('skips deload if exercise already in deload', async () => {
      const deloadedExercise = { ...mockPlanExercise, deloadActive: true };
      const planWithDeload = {
        ...mockPlan,
        days: [{ id: 'day-1', name: 'Push', exercises: [deloadedExercise] }],
      };
      const prisma = makePrisma({
        workoutPlan: { findFirst: jest.fn().mockResolvedValue(planWithDeload) },
        aIProgressionDecision: {
          findMany: jest.fn().mockResolvedValue([
            { id: 'd-4', action: 'DELOAD', exerciseId: 'ex-1', reasoning: 'test', exercise: mockExercise, isApplied: false },
          ]),
          update: jest.fn().mockResolvedValue({}),
        },
      });
      service = new ProgramAdjustmentService(prisma, makeRecovery());
      const result = await service.applyPendingDecisions('user-1');
      expect(result.applied).toBe(0);
    });
  });

  // ─── Recovery-gated decisions ─────────────────────────────────────────────

  describe('Recovery Engine gate', () => {
    const increaseDecision = {
      id: 'd-rec-1',
      action: 'INCREASE_WEIGHT',
      exerciseId: 'ex-1',
      oldWeight: 95,
      newWeight: 97.5,
      reasoning: 'RPE medio 6.5 per 3 settimane.',
      exercise: mockExercise,
      isApplied: false,
    };

    it('creates PROGRESSION_HELD adjustment when engineAction=HOLD', async () => {
      const prisma = makePrisma({
        workoutPlan: { findFirst: jest.fn().mockResolvedValue(mockPlan) },
        aIProgressionDecision: {
          findMany: jest.fn().mockResolvedValue([increaseDecision]),
          update: jest.fn().mockResolvedValue({}),
        },
      });
      service = new ProgramAdjustmentService(
        prisma,
        makeRecovery({
          hasEnoughData: true,
          engineAction: 'HOLD',
          avgScore7d: 42,
          summary: 'Recovery Score medio 42/100 negli ultimi 7 giorni (trend stabile). Progressione sospesa.',
        }),
      );
      const result = await service.applyPendingDecisions('user-1');
      expect(result.applied).toBe(1);
      expect(prisma.workoutExercise.update).not.toHaveBeenCalled();
      const createdAdj = prisma.programAdjustment.create.mock.calls[0][0].data;
      expect(createdAdj.type).toBe('PROGRESSION_HELD');
      expect(createdAdj.rationale).toContain('Recovery Score medio 42/100');
      expect(createdAdj.rationale).toContain('Carico non aumentato');
    });

    it('triggers deload when engineAction=DELOAD and exercise not in deload', async () => {
      const prisma = makePrisma({
        workoutPlan: { findFirst: jest.fn().mockResolvedValue(mockPlan) },
        aIProgressionDecision: {
          findMany: jest.fn().mockResolvedValue([increaseDecision]),
          update: jest.fn().mockResolvedValue({}),
        },
      });
      service = new ProgramAdjustmentService(
        prisma,
        makeRecovery({
          hasEnoughData: true,
          engineAction: 'DELOAD',
          avgScore7d: 30,
          summary: 'Recovery Score medio 30/100. Deload attivato.',
        }),
      );
      const result = await service.applyPendingDecisions('user-1');
      expect(result.applied).toBe(2); // SETS_DECREASE + DELOAD adjustments
      const updateCall = prisma.workoutExercise.update.mock.calls[0][0].data;
      expect(updateCall.deloadActive).toBe(true);
    });

    it('applies CAUTION weight increase with recovery context appended to rationale', async () => {
      const prisma = makePrisma({
        workoutPlan: { findFirst: jest.fn().mockResolvedValue(mockPlan) },
        aIProgressionDecision: {
          findMany: jest.fn().mockResolvedValue([increaseDecision]),
          update: jest.fn().mockResolvedValue({}),
        },
      });
      service = new ProgramAdjustmentService(
        prisma,
        makeRecovery({
          hasEnoughData: true,
          engineAction: 'CAUTION',
          avgScore7d: 58,
          summary: 'Recovery Score medio 58/100 (trend stabile). Progressione applicata con cautela.',
        }),
      );
      const result = await service.applyPendingDecisions('user-1');
      expect(result.applied).toBe(1);
      expect(prisma.workoutExercise.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { recommendedWeightKg: 97.5 } }),
      );
      const adjRationale = prisma.programAdjustment.create.mock.calls[0][0].data.rationale;
      expect(adjRationale).toContain('Recovery Score medio 58/100');
    });
  });

  // ─── processExpiredDeloads ───────────────────────────────────────────────

  describe('processExpiredDeloads', () => {
    it('reverts expired deload adjustments and sets deloadActive=false', async () => {
      const expiredAdj = {
        id: 'adj-exp-1',
        planExerciseId: 'pe-1',
        field: 'sets',
        oldValue: { value: 4 },
        newValue: { value: 3 },
        type: 'SETS_DECREASE',
        isReverted: false,
        revertAfterDate: new Date('2020-01-01'),
      };
      const prisma = makePrisma({
        programAdjustment: {
          findMany: jest.fn().mockResolvedValue([expiredAdj]),
          update: jest.fn().mockResolvedValue({}),
        },
      });
      service = new ProgramAdjustmentService(prisma, makeRecovery());
      const result = await service.processExpiredDeloads();
      expect(result.processed).toBe(1);
      expect(prisma.workoutExercise.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ sets: 4, deloadActive: false }),
        }),
      );
    });

    it('returns processed=0 when no expired deloads', async () => {
      service = new ProgramAdjustmentService(makePrisma(), makeRecovery());
      const result = await service.processExpiredDeloads();
      expect(result.processed).toBe(0);
    });
  });

  // ─── revertAdjustment ────────────────────────────────────────────────────

  describe('revertAdjustment', () => {
    it('throws NotFoundException for unknown adjustment', async () => {
      service = new ProgramAdjustmentService(makePrisma(), makeRecovery());
      await expect(service.revertAdjustment('user-1', 'bad-id')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if userId does not match', async () => {
      const prisma = makePrisma({
        programAdjustment: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'adj-1', userId: 'other-user', isReverted: false, field: 'sets', planExerciseId: 'pe-1', oldValue: { value: 4 },
          }),
          update: jest.fn(),
        },
      });
      service = new ProgramAdjustmentService(prisma, makeRecovery());
      await expect(service.revertAdjustment('user-1', 'adj-1')).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if already reverted', async () => {
      const prisma = makePrisma({
        programAdjustment: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'adj-1', userId: 'user-1', isReverted: true, field: 'sets', planExerciseId: 'pe-1', oldValue: { value: 4 },
          }),
          update: jest.fn(),
        },
      });
      service = new ProgramAdjustmentService(prisma, makeRecovery());
      await expect(service.revertAdjustment('user-1', 'adj-1')).rejects.toThrow(BadRequestException);
    });

    it('restores recommendedWeightKg and marks as reverted', async () => {
      const prisma = makePrisma({
        programAdjustment: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'adj-1', userId: 'user-1', isReverted: false,
            field: 'recommendedWeightKg', planExerciseId: 'pe-1', oldValue: { value: 95 },
          }),
          update: jest.fn().mockResolvedValue({}),
        },
      });
      service = new ProgramAdjustmentService(prisma, makeRecovery());
      const result = await service.revertAdjustment('user-1', 'adj-1');
      expect(result.reverted).toBe(true);
      expect(prisma.workoutExercise.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { recommendedWeightKg: 95 } }),
      );
    });
  });

  // ─── restoreVersion ──────────────────────────────────────────────────────

  describe('restoreVersion', () => {
    it('throws NotFoundException for unknown version', async () => {
      service = new ProgramAdjustmentService(makePrisma(), makeRecovery());
      await expect(service.restoreVersion('user-1', 'v-bad')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if version belongs to another user', async () => {
      const prisma = makePrisma({
        programVersion: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'v-1', userId: 'other', planId: 'plan-1', createdAt: new Date(),
            snapshot: { days: [] },
          }),
        },
      });
      service = new ProgramAdjustmentService(prisma, makeRecovery());
      await expect(service.restoreVersion('user-1', 'v-1')).rejects.toThrow(ForbiddenException);
    });

    it('restores all exercises from snapshot and returns correct count', async () => {
      const snap = {
        days: [
          {
            id: 'day-1',
            exercises: [
              { id: 'pe-1', exerciseId: 'ex-1', sets: 4, repsMin: 6, repsMax: 10, rpeTarget: 8, rirTarget: 2, restSeconds: 180, recommendedWeightKg: 95, deloadActive: false },
            ],
          },
        ],
      };
      const prisma = makePrisma({
        programVersion: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'v-1', userId: 'user-1', planId: 'plan-1', createdAt: new Date(0), snapshot: snap,
          }),
        },
        programAdjustment: {
          updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        },
      });
      service = new ProgramAdjustmentService(prisma, makeRecovery());
      const result = await service.restoreVersion('user-1', 'v-1');
      expect(result.restored).toBe(1);
      expect(prisma.workoutExercise.update).toHaveBeenCalledTimes(1);
    });
  });
});
