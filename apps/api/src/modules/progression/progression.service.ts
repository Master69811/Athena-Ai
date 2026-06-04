import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProgressionService {
  private readonly logger = new Logger(ProgressionService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_WEEK)
  async runWeeklyProgression() {
    this.logger.log('Running weekly auto-progression for all users...');
    const users = await this.prisma.user.findMany({ where: { isActive: true, profile: { is: { onboardingCompleted: true } } } });
    for (const user of users) {
      await this.analyzeAndProgress(user.id).catch(e => this.logger.error(`Progression failed for ${user.id}: ${e.message}`));
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
          },
        });
      }
    }

    await this.prisma.workoutPlan.update({
      where: { id: activePlan.id },
      data: { currentWeek: { increment: 1 } },
    });
  }

  private makeProgressionDecision(recentSets: any[], planExercise: any) {
    const avgRpe = recentSets.reduce((a, s) => a + (s.rpe || 7), 0) / recentSets.length;
    const avgReps = recentSets.reduce((a, s) => a + s.reps, 0) / recentSets.length;
    const avgWeight = recentSets.reduce((a, s) => a + s.weightKg, 0) / recentSets.length;
    const targetRpe = planExercise.rpeTarget || 8;
    const targetRepsMin = planExercise.repsMin;
    const targetRepsMax = planExercise.repsMax;

    const isUpperBody = true; // simplified; in production check muscle groups
    const weightIncrement = isUpperBody ? 2.5 : 5.0;

    if (avgRpe < targetRpe - 0.5 && avgReps >= targetRepsMax) {
      return {
        action: 'INCREASE_WEIGHT',
        oldWeight: avgWeight,
        newWeight: avgWeight + weightIncrement,
        reasoning: `Avg RPE ${avgRpe.toFixed(1)} below target ${targetRpe} with ${avgReps.toFixed(1)} reps at max target. Increasing weight by ${weightIncrement}kg.`,
      };
    }

    if (avgRpe > targetRpe + 1) {
      return {
        action: 'DECREASE_WEIGHT',
        oldWeight: avgWeight,
        newWeight: Math.max(0, avgWeight - weightIncrement),
        reasoning: `Avg RPE ${avgRpe.toFixed(1)} exceeds target ${targetRpe}. Reducing weight by ${weightIncrement}kg to restore proper training zone.`,
      };
    }

    const weeklyVolumes = this.getWeeklyVolumes(recentSets);
    if (weeklyVolumes.length >= 3 && this.isStagnating(weeklyVolumes)) {
      return {
        action: 'CHANGE_EXERCISE',
        oldWeight: avgWeight,
        newWeight: undefined,
        reasoning: `3+ weeks of no volume progress detected. Recommending exercise variation to break through plateau.`,
      };
    }

    return {
      action: 'MAINTAIN',
      oldWeight: avgWeight,
      newWeight: avgWeight,
      reasoning: `Progressing well at avg RPE ${avgRpe.toFixed(1)} with ${avgReps.toFixed(1)} reps. Maintain current load.`,
    };
  }

  private getWeeklyVolumes(sets: any[]): number[] {
    const weeks: Record<string, number> = {};
    sets.forEach(s => {
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
