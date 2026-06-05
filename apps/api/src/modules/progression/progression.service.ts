import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProgressionAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface EvidenceData {
  avgRpe: number;
  avgReps: number;
  avgWeight: number;
  setCount: number;
  weeksAnalyzed: number;
  weeklyVolumes: number[];
}

interface ProgressionDecision {
  action: ProgressionAction;
  oldWeight?: number;
  newWeight?: number;
  reasoning: string;
  evidenceData: EvidenceData;
}

@Injectable()
export class ProgressionService {
  private readonly logger = new Logger(ProgressionService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_WEEK)
  async runWeeklyProgression() {
    this.logger.log('Running weekly auto-progression for all users...');
    const users = await this.prisma.user.findMany({
      where: { isActive: true, profile: { is: { onboardingCompleted: true } } },
    });
    for (const user of users) {
      await this.analyzeAndProgress(user.id).catch((e) =>
        this.logger.error(`Progression failed for ${user.id}: ${e.message}`),
      );
    }
    this.logger.log(`Progression complete for ${users.length} users.`);
  }

  async analyzeAndProgress(userId: string): Promise<void> {
    const activePlan = await this.prisma.workoutPlan.findFirst({
      where: { userId, isActive: true },
      include: { days: { include: { exercises: true } } },
    });
    if (!activePlan) return;

    const threeWeeksAgo = new Date();
    threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);

    for (const day of activePlan.days) {
      for (const planExercise of day.exercises) {
        const recentSets = await this.prisma.workoutSet.findMany({
          where: {
            exerciseId: planExercise.exerciseId,
            session: { userId, startedAt: { gte: threeWeeksAgo }, completedAt: { not: null } },
            isWarmup: false,
          },
          orderBy: { completedAt: 'desc' },
          take: 30,
        });

        if (recentSets.length < 3) continue;

        const decision = this.makeProgressionDecision(recentSets, planExercise);

        await this.prisma.aIProgressionDecision.create({
          data: {
            userId,
            exerciseId: planExercise.exerciseId,
            action: decision.action,
            oldWeight: decision.oldWeight,
            newWeight: decision.newWeight,
            reasoning: decision.reasoning,
            isRead: false,
            evidenceData: decision.evidenceData as any,
          },
        });
      }
    }

    await this.prisma.workoutPlan.update({
      where: { id: activePlan.id },
      data: { currentWeek: { increment: 1 } },
    });
  }

  private makeProgressionDecision(recentSets: any[], planExercise: any): ProgressionDecision {
    const avgRpe = recentSets.reduce((a, s) => a + (s.rpe || 7), 0) / recentSets.length;
    const avgReps = recentSets.reduce((a, s) => a + s.reps, 0) / recentSets.length;
    const avgWeight = recentSets.reduce((a, s) => a + s.weightKg, 0) / recentSets.length;
    const targetRpe = planExercise.rpeTarget || 8;
    const targetRepsMax = planExercise.repsMax;

    const isUpperBody = true;
    const weightIncrement = isUpperBody ? 2.5 : 5.0;

    const weeklyVolumes = this.getWeeklyVolumes(recentSets);
    const weeksAnalyzed = weeklyVolumes.length;

    const evidenceData: EvidenceData = {
      avgRpe: +avgRpe.toFixed(1),
      avgReps: +avgReps.toFixed(1),
      avgWeight: +avgWeight.toFixed(1),
      setCount: recentSets.length,
      weeksAnalyzed,
      weeklyVolumes,
    };

    if (avgRpe < targetRpe - 0.5 && avgReps >= targetRepsMax) {
      return {
        action: 'INCREASE_WEIGHT',
        oldWeight: avgWeight,
        newWeight: avgWeight + weightIncrement,
        reasoning: `RPE medio ${avgRpe.toFixed(1)} sotto il target ${targetRpe} con ${avgReps.toFixed(1)} rip al massimo del range. Aumento carico di ${weightIncrement}kg.`,
        evidenceData,
      };
    }

    if (avgRpe > targetRpe + 1) {
      return {
        action: 'DECREASE_WEIGHT',
        oldWeight: avgWeight,
        newWeight: Math.max(0, avgWeight - weightIncrement),
        reasoning: `RPE medio ${avgRpe.toFixed(1)} supera il target ${targetRpe}. Riduco il carico di ${weightIncrement}kg per riportare l'intensità nella zona corretta.`,
        evidenceData,
      };
    }

    if (weeksAnalyzed >= 3 && this.isStagnating(weeklyVolumes)) {
      return {
        action: 'CHANGE_EXERCISE',
        oldWeight: avgWeight,
        newWeight: undefined,
        reasoning: `Rilevato plateau volumetrico per 3+ settimane consecutive (varianza < 3%). Raccomando una variazione dell'esercizio per rompere la stagnazione.`,
        evidenceData,
      };
    }

    return {
      action: 'MAINTAIN',
      oldWeight: avgWeight,
      newWeight: avgWeight,
      reasoning: `Progressione regolare: RPE medio ${avgRpe.toFixed(1)}, ${avgReps.toFixed(1)} rip. Mantengo il carico attuale.`,
      evidenceData,
    };
  }

  private getWeeklyVolumes(sets: any[]): number[] {
    const weeks: Record<string, number> = {};
    sets.forEach((s) => {
      const week = this.getWeekKey(new Date(s.completedAt));
      weeks[week] = (weeks[week] || 0) + s.weightKg * s.reps;
    });
    return Object.values(weeks);
  }

  private isStagnating(weeklyVolumes: number[]): boolean {
    if (weeklyVolumes.length < 3) return false;
    const recent = weeklyVolumes.slice(-3);
    const variance = Math.max(...recent) - Math.min(...recent);
    return variance < recent[0] * 0.03;
  }

  private getWeekKey(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  }

  // ─── Insights ────────────────────────────────────────────────────────────────

  async getInsights(userId: string, limit = 20, unreadOnly = false) {
    return this.prisma.aIProgressionDecision.findMany({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      include: {
        exercise: {
          select: { id: true, name: true, nameIt: true, category: true, muscleGroups: true },
        },
      },
      orderBy: { appliedAt: 'desc' },
      take: limit,
    });
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.aIProgressionDecision.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markRead(userId: string, id: string) {
    const decision = await this.prisma.aIProgressionDecision.findUnique({ where: { id } });
    if (!decision) throw new NotFoundException('Insight not found');
    if (decision.userId !== userId) throw new ForbiddenException();

    return this.prisma.aIProgressionDecision.update({
      where: { id },
      data: { isRead: true },
      select: { id: true, isRead: true },
    });
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.aIProgressionDecision.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { updated: result.count };
  }

  // ─── Legacy ──────────────────────────────────────────────────────────────────

  async getProgressionHistory(userId: string, limit = 20) {
    return this.prisma.aIProgressionDecision.findMany({
      where: { userId },
      orderBy: { appliedAt: 'desc' },
      take: limit,
    });
  }

  async triggerManualProgression(userId: string) {
    await this.analyzeAndProgress(userId);
    return { message: 'Progression analysis complete', timestamp: new Date() };
  }
}
