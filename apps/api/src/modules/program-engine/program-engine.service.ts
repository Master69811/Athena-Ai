import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AdjustmentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const BATCH_SIZE = 100;
const MAX_SETS = 6;
const DELOAD_SET_RATIO = 0.7;
const DELOAD_RPE_REDUCTION = 3;
const DELOAD_DAYS = 7;

@Injectable()
export class ProgramAdjustmentService {
  private readonly logger = new Logger(ProgramAdjustmentService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Scheduled jobs ────────────────────────────────────────────────────────

  /** Runs 30 min after progression cron (Monday 00:30) */
  @Cron('30 0 * * 1')
  async scheduledApply() {
    this.logger.log('Adaptive Program Engine: starting scheduled application...');
    let offset = 0;
    let total = 0;

    while (true) {
      const users = await this.prisma.user.findMany({
        where: { isActive: true, profile: { is: { onboardingCompleted: true } } },
        select: { id: true },
        skip: offset,
        take: BATCH_SIZE,
      });
      if (users.length === 0) break;

      for (const user of users) {
        const result = await this.applyPendingDecisions(user.id).catch((e) => {
          this.logger.error(`Engine failed for ${user.id}: ${e.message}`);
          return { applied: 0 };
        });
        total += result.applied;
      }

      offset += BATCH_SIZE;
      if (users.length < BATCH_SIZE) break;
    }

    this.logger.log(`Engine applied ${total} adjustments.`);
  }

  /** Runs Monday 00:45 to restore expired deloads */
  @Cron('45 0 * * 1')
  async scheduledDeloadRestore() {
    const result = await this.processExpiredDeloads();
    this.logger.log(`Deload restore: ${result.processed} adjustments reverted.`);
  }

  // ─── Core engine ───────────────────────────────────────────────────────────

  async applyPendingDecisions(
    userId: string,
    planId?: string,
  ): Promise<{ applied: number; versionId: string | null; adjustments: any[] }> {
    const plan = await this.prisma.workoutPlan.findFirst({
      where: { userId, isActive: true, ...(planId ? { id: planId } : {}) },
      include: {
        days: {
          include: {
            exercises: { include: { exercise: true } },
          },
        },
      },
    });
    if (!plan) return { applied: 0, versionId: null, adjustments: [] };

    const planExerciseMap = new Map(
      plan.days.flatMap((d) => d.exercises).map((e) => [e.exerciseId, e]),
    );

    const decisions = await this.prisma.aIProgressionDecision.findMany({
      where: {
        userId,
        isApplied: false,
        exerciseId: { in: [...planExerciseMap.keys()] },
      },
      include: { exercise: true },
      orderBy: { appliedAt: 'asc' },
    });

    if (decisions.length === 0) return { applied: 0, versionId: null, adjustments: [] };

    const version = await this.createVersion(userId, plan, 'Adaptive Program Engine — weekly auto-apply');

    const adjustments: any[] = [];
    for (const decision of decisions) {
      const planExercise = planExerciseMap.get(decision.exerciseId);
      if (!planExercise) continue;

      const newAdj = await this.applyDecision(
        userId,
        plan.id,
        planExercise,
        version.id,
        decision,
      );
      adjustments.push(...newAdj);

      await this.prisma.aIProgressionDecision.update({
        where: { id: decision.id },
        data: { isApplied: true, appliedToVersionId: version.id },
      });
    }

    this.logger.log(
      `Applied ${adjustments.length} adjustments to plan ${plan.id} (version ${version.versionNumber}).`,
    );

    return { applied: adjustments.length, versionId: version.id, adjustments };
  }

  // ─── Version management ────────────────────────────────────────────────────

  private async createVersion(userId: string, plan: any, reason: string) {
    const last = await this.prisma.programVersion.findFirst({
      where: { planId: plan.id },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });

    return this.prisma.programVersion.create({
      data: {
        userId,
        planId: plan.id,
        versionNumber: (last?.versionNumber ?? 0) + 1,
        snapshot: this.createPlanSnapshot(plan),
        triggerReason: reason,
      },
    });
  }

  createPlanSnapshot(plan: any): object {
    return {
      planId: plan.id,
      name: plan.name,
      capturedAt: new Date().toISOString(),
      days: plan.days.map((day: any) => ({
        id: day.id,
        name: day.name,
        exercises: day.exercises.map((ex: any) => ({
          id: ex.id,
          exerciseId: ex.exerciseId,
          exerciseName: ex.exercise?.name ?? null,
          sets: ex.sets,
          repsMin: ex.repsMin,
          repsMax: ex.repsMax,
          rpeTarget: ex.rpeTarget ?? null,
          rirTarget: ex.rirTarget ?? null,
          restSeconds: ex.restSeconds,
          recommendedWeightKg: ex.recommendedWeightKg ?? null,
          deloadActive: ex.deloadActive,
        })),
      })),
    };
  }

  // ─── Decision → Adjustments ────────────────────────────────────────────────

  private async applyDecision(
    userId: string,
    planId: string,
    planExercise: any,
    versionId: string,
    decision: any,
  ): Promise<any[]> {
    switch (decision.action) {
      case 'INCREASE_WEIGHT':
        return this.applyWeightChange(
          userId,
          planId,
          planExercise,
          versionId,
          decision,
          'WEIGHT_INCREASE',
        );

      case 'DECREASE_WEIGHT':
        return this.applyWeightChange(
          userId,
          planId,
          planExercise,
          versionId,
          decision,
          'WEIGHT_DECREASE',
        );

      case 'DELOAD':
        return this.applyDeload(userId, planId, planExercise, versionId, decision);

      case 'CHANGE_EXERCISE':
        return this.applyExerciseSwap(userId, planId, planExercise, versionId, decision);

      case 'INCREASE_REPS':
        return this.applyRepsChange(userId, planId, planExercise, versionId, decision, 1);

      case 'DECREASE_WEIGHT':
        return this.applyWeightChange(userId, planId, planExercise, versionId, decision, 'WEIGHT_DECREASE');

      case 'INCREASE_SETS': {
        const newSets = Math.min(planExercise.sets + 1, MAX_SETS);
        if (newSets === planExercise.sets) return [];
        await this.prisma.workoutExercise.update({
          where: { id: planExercise.id },
          data: { sets: newSets },
        });
        return [
          await this.createAdjustment(userId, planId, planExercise.id, versionId, decision.id, {
            type: 'SETS_INCREASE',
            field: 'sets',
            oldValue: { value: planExercise.sets },
            newValue: { value: newSets },
            rationale: decision.reasoning,
          }),
        ];
      }

      case 'MAINTAIN':
      default:
        return [];
    }
  }

  private async applyWeightChange(
    userId: string,
    planId: string,
    planExercise: any,
    versionId: string,
    decision: any,
    type: AdjustmentType,
  ): Promise<any[]> {
    if (decision.newWeight == null) return [];

    await this.prisma.workoutExercise.update({
      where: { id: planExercise.id },
      data: { recommendedWeightKg: decision.newWeight },
    });

    return [
      await this.createAdjustment(userId, planId, planExercise.id, versionId, decision.id, {
        type,
        field: 'recommendedWeightKg',
        oldValue: { value: planExercise.recommendedWeightKg ?? decision.oldWeight ?? null },
        newValue: { value: decision.newWeight },
        rationale: decision.reasoning,
      }),
    ];
  }

  private async applyDeload(
    userId: string,
    planId: string,
    planExercise: any,
    versionId: string,
    decision: any,
  ): Promise<any[]> {
    if (planExercise.deloadActive) return []; // already deloading

    const newSets = Math.max(1, Math.ceil(planExercise.sets * DELOAD_SET_RATIO));
    const newRpe = Math.max(5, (planExercise.rpeTarget ?? 8) - DELOAD_RPE_REDUCTION);
    const revertDate = new Date();
    revertDate.setDate(revertDate.getDate() + DELOAD_DAYS);

    await this.prisma.workoutExercise.update({
      where: { id: planExercise.id },
      data: { sets: newSets, rpeTarget: newRpe, deloadActive: true },
    });

    const adjustments = await Promise.all([
      this.createAdjustment(userId, planId, planExercise.id, versionId, decision.id, {
        type: 'SETS_DECREASE' as AdjustmentType,
        field: 'sets',
        oldValue: { value: planExercise.sets },
        newValue: { value: newSets },
        rationale: decision.reasoning,
        revertAfterDate: revertDate,
      }),
      this.createAdjustment(userId, planId, planExercise.id, versionId, decision.id, {
        type: 'DELOAD' as AdjustmentType,
        field: 'rpeTarget',
        oldValue: { value: planExercise.rpeTarget ?? 8 },
        newValue: { value: newRpe },
        rationale: decision.reasoning,
        revertAfterDate: revertDate,
      }),
    ]);

    return adjustments;
  }

  private async applyExerciseSwap(
    userId: string,
    planId: string,
    planExercise: any,
    versionId: string,
    decision: any,
  ): Promise<any[]> {
    const substitute = await this.findExerciseSubstitute(decision.exercise);
    if (!substitute) {
      this.logger.warn(
        `No substitute found for exercise ${decision.exercise?.name}. Skipping swap.`,
      );
      return [];
    }

    const oldExerciseId = planExercise.exerciseId;
    await this.prisma.workoutExercise.update({
      where: { id: planExercise.id },
      data: { exerciseId: substitute.id },
    });

    return [
      await this.createAdjustment(userId, planId, planExercise.id, versionId, decision.id, {
        type: 'EXERCISE_SWAP' as AdjustmentType,
        field: 'exerciseId',
        oldValue: { exerciseId: oldExerciseId, name: decision.exercise?.name },
        newValue: { exerciseId: substitute.id, name: substitute.name },
        rationale: `${decision.reasoning} Sostituzione con: ${substitute.nameIt || substitute.name}.`,
      }),
    ];
  }

  private async applyRepsChange(
    userId: string,
    planId: string,
    planExercise: any,
    versionId: string,
    decision: any,
    delta: number,
  ): Promise<any[]> {
    const oldMin = planExercise.repsMin;
    const oldMax = planExercise.repsMax;
    await this.prisma.workoutExercise.update({
      where: { id: planExercise.id },
      data: { repsMin: oldMin + delta, repsMax: oldMax + delta },
    });

    return [
      await this.createAdjustment(userId, planId, planExercise.id, versionId, decision.id, {
        type: (delta > 0 ? 'REPS_INCREASE' : 'REPS_DECREASE') as AdjustmentType,
        field: 'repsRange',
        oldValue: { repsMin: oldMin, repsMax: oldMax },
        newValue: { repsMin: oldMin + delta, repsMax: oldMax + delta },
        rationale: decision.reasoning,
      }),
    ];
  }

  private async findExerciseSubstitute(exercise: any): Promise<any | null> {
    if (!exercise?.alternatives?.length) return null;
    return this.prisma.exercise.findFirst({
      where: {
        isActive: true,
        name: { in: exercise.alternatives },
        NOT: { id: exercise.id },
      },
    });
  }

  private async createAdjustment(
    userId: string,
    planId: string,
    planExerciseId: string | null,
    versionId: string,
    decisionId: string | null,
    data: {
      type: AdjustmentType;
      field: string;
      oldValue: object;
      newValue: object;
      rationale: string;
      revertAfterDate?: Date;
    },
  ) {
    return this.prisma.programAdjustment.create({
      data: {
        userId,
        planId,
        planExerciseId: planExerciseId ?? undefined,
        versionId,
        decisionId: decisionId ?? undefined,
        ...data,
      },
    });
  }

  // ─── Deload expiry ─────────────────────────────────────────────────────────

  async processExpiredDeloads(): Promise<{ processed: number }> {
    const expired = await this.prisma.programAdjustment.findMany({
      where: {
        isReverted: false,
        revertAfterDate: { lte: new Date() },
        type: { in: ['DELOAD', 'SETS_DECREASE'] },
      },
    });

    let processed = 0;
    for (const adj of expired) {
      try {
        if (adj.planExerciseId) {
          const oldV = adj.oldValue as any;
          const updateData: Record<string, any> = {};
          if (adj.field === 'sets') {
            updateData.sets = oldV.value;
            updateData.deloadActive = false;
          } else if (adj.field === 'rpeTarget') {
            updateData.rpeTarget = oldV.value;
          }
          if (Object.keys(updateData).length) {
            await this.prisma.workoutExercise.update({
              where: { id: adj.planExerciseId },
              data: updateData,
            });
          }
        }
        await this.prisma.programAdjustment.update({
          where: { id: adj.id },
          data: { isReverted: true, revertedAt: new Date() },
        });
        processed++;
      } catch (e) {
        this.logger.error(`Deload revert failed for adjustment ${adj.id}: ${(e as Error).message}`);
      }
    }

    return { processed };
  }

  // ─── Revert / Restore ──────────────────────────────────────────────────────

  async revertAdjustment(userId: string, adjustmentId: string): Promise<{ reverted: true }> {
    const adj = await this.prisma.programAdjustment.findUnique({ where: { id: adjustmentId } });
    if (!adj) throw new NotFoundException('Adjustment not found');
    if (adj.userId !== userId) throw new ForbiddenException();
    if (adj.isReverted) throw new BadRequestException('Adjustment already reverted');

    if (adj.planExerciseId) {
      const old = adj.oldValue as any;
      const updateData: Record<string, any> = {};

      if (adj.field === 'recommendedWeightKg') updateData.recommendedWeightKg = old.value;
      else if (adj.field === 'sets') { updateData.sets = old.value; updateData.deloadActive = false; }
      else if (adj.field === 'rpeTarget') updateData.rpeTarget = old.value;
      else if (adj.field === 'repsRange') { updateData.repsMin = old.repsMin; updateData.repsMax = old.repsMax; }
      else if (adj.field === 'exerciseId') updateData.exerciseId = old.exerciseId;

      if (Object.keys(updateData).length) {
        await this.prisma.workoutExercise.update({
          where: { id: adj.planExerciseId },
          data: updateData,
        });
      }
    }

    await this.prisma.programAdjustment.update({
      where: { id: adjustmentId },
      data: { isReverted: true, revertedAt: new Date() },
    });

    return { reverted: true };
  }

  async restoreVersion(userId: string, versionId: string): Promise<{ restored: number }> {
    const version = await this.prisma.programVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new NotFoundException('Version not found');
    if (version.userId !== userId) throw new ForbiddenException();

    const snapshot = version.snapshot as any;
    let restored = 0;

    for (const day of snapshot.days ?? []) {
      for (const ex of day.exercises ?? []) {
        await this.prisma.workoutExercise.update({
          where: { id: ex.id },
          data: {
            exerciseId: ex.exerciseId,
            sets: ex.sets,
            repsMin: ex.repsMin,
            repsMax: ex.repsMax,
            rpeTarget: ex.rpeTarget,
            rirTarget: ex.rirTarget,
            restSeconds: ex.restSeconds,
            recommendedWeightKg: ex.recommendedWeightKg,
            deloadActive: ex.deloadActive ?? false,
          },
        });
        restored++;
      }
    }

    await this.prisma.programAdjustment.updateMany({
      where: {
        planId: version.planId,
        appliedAt: { gte: version.createdAt },
        isReverted: false,
      },
      data: { isReverted: true, revertedAt: new Date() },
    });

    return { restored };
  }

  // ─── Read ──────────────────────────────────────────────────────────────────

  async getAdjustmentHistory(userId: string, planId: string) {
    return this.prisma.programAdjustment.findMany({
      where: { userId, planId },
      include: {
        version: { select: { versionNumber: true, createdAt: true, triggerReason: true } },
        planExercise: {
          include: { exercise: { select: { name: true, nameIt: true } } },
        },
      },
      orderBy: { appliedAt: 'desc' },
      take: 100,
    });
  }

  async getPlanVersions(userId: string, planId: string) {
    return this.prisma.programVersion.findMany({
      where: { userId, planId },
      include: { _count: { select: { adjustments: true } } },
      orderBy: { versionNumber: 'desc' },
      take: 30,
    });
  }
}
