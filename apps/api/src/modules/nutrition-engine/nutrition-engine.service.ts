import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { GoalType, NutritionDecisionType, EngineAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RecoveryService } from '../recovery/recovery.service';
import { BodyWeightEngineService } from '../body-weight-engine/body-weight-engine.service';
import { NutritionService } from '../nutrition/nutrition.service';

const BATCH_SIZE = 200;
const MIN_DECISION_INTERVAL_DAYS = 7;
const MIN_LOG_COUNT = 7;
const MIN_COMPLIANCE_LOGGED_DAYS = 5;

@Injectable()
export class NutritionEngineService {
  private readonly logger = new Logger(NutritionEngineService.name);

  constructor(
    private prisma: PrismaService,
    private recoveryService: RecoveryService,
    private bodyWeightEngine: BodyWeightEngineService,
    private nutritionService: NutritionService,
  ) {}

  // ─── Scheduled job ────────────────────────────────────────────────────────

  @Cron('0 7 * * 1')
  async scheduledWeeklyAnalysis() {
    this.logger.log('Nutrition Engine: starting weekly analysis...');
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
        const decision = await this.generateAndSaveDecision(user.id).catch((e) => {
          this.logger.error(`Nutrition analysis failed for ${user.id}: ${(e as Error).message}`);
          return null;
        });
        if (decision) total++;
      }

      offset += BATCH_SIZE;
      if (users.length < BATCH_SIZE) break;
    }

    this.logger.log(`Nutrition Engine: generated ${total} decisions.`);
  }

  // ─── Core decision algorithm ──────────────────────────────────────────────

  async generateAndSaveDecision(userId: string): Promise<any | null> {
    // 1. Check weight snapshot has enough data
    const snapshot = await this.bodyWeightEngine.getLatestSnapshot(userId);
    if (!snapshot || snapshot.logCount < MIN_LOG_COUNT) return null;

    // 2. Debounce: skip if a decision was made less than MIN_DECISION_INTERVAL_DAYS ago
    const recent = await this.prisma.nutritionDecision.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (recent) {
      const daysSince = Math.floor((Date.now() - recent.createdAt.getTime()) / 86_400_000);
      if (daysSince < MIN_DECISION_INTERVAL_DAYS) return null;
    }

    // 3. Get active plan
    const plan = await this.prisma.nutritionPlan.findFirst({
      where: { userId, isActive: true },
    });
    if (!plan) return null;

    // 4. Compliance data
    const compliance = await this.computeWeeklyCompliance(userId);
    const isFollowingPlan = compliance.loggedDays >= MIN_COMPLIANCE_LOGGED_DAYS;

    // 5. Recovery context (integration gate)
    const recoveryCtx = await this.recoveryService.getRecoveryContextForEngine(userId);
    const recoveryBlocked =
      recoveryCtx.hasEnoughData &&
      (recoveryCtx.engineAction === EngineAction.HOLD || recoveryCtx.engineAction === EngineAction.DELOAD);

    const { weeklyRateKg, ma7d, ma14d, logCount } = snapshot;
    const goalType = plan.goalType;

    let deltaCalories = 0;
    let type: NutritionDecisionType | null = null;
    let rationale = '';

    // ─── Decision rules per goal type ─────────────────────────────────────

    if (goalType === GoalType.WEIGHT_LOSS) {
      if (weeklyRateKg < -0.8 && isFollowingPlan) {
        deltaCalories = 100;
        type = NutritionDecisionType.CALORIE_INCREASE;
        rationale = `Perdita di ${Math.abs(weeklyRateKg).toFixed(2)}kg/settimana eccessiva (obiettivo: 0.2-0.8kg). Aumento di 100 kcal per proteggere la massa muscolare.`;
      } else if (weeklyRateKg > -0.2 && isFollowingPlan && logCount >= 14) {
        if (recoveryBlocked) {
          deltaCalories = 0;
          type = NutritionDecisionType.MAINTAIN;
          rationale = `Plateau rilevato (${weeklyRateKg.toFixed(2)}kg/settimana da ${logCount}+ giorni), ma Recovery Score ${recoveryCtx.avgScore7d}/100 sconsiglia riduzioni. Target calorico mantenuto fino a recupero ottimale.`;
        } else {
          deltaCalories = -125;
          type = NutritionDecisionType.CALORIE_DECREASE;
          rationale = `Plateau: peso stabile da ${logCount}+ giorni (media 7g: ${ma7d}kg, 14g: ${ma14d}kg, tasso: ${weeklyRateKg.toFixed(2)}kg/settimana). Riduzione di 125 kcal per riattivare il dimagrimento.`;
        }
      }
    } else if (goalType === GoalType.HYPERTROPHY) {
      if (weeklyRateKg < 0.1 && isFollowingPlan && logCount >= 7) {
        deltaCalories = 150;
        type = NutritionDecisionType.CALORIE_INCREASE;
        rationale = `Crescita insufficiente (${weeklyRateKg.toFixed(2)}kg/settimana, obiettivo: 0.1-0.5kg). Aumento di 150 kcal per supportare l'ipertrofia.`;
      } else if (weeklyRateKg > 0.5 && logCount >= 7) {
        deltaCalories = -100;
        type = NutritionDecisionType.CALORIE_DECREASE;
        rationale = `Surplus eccessivo (${weeklyRateKg.toFixed(2)}kg/settimana). Riduzione di 100 kcal per limitare accumulo di grasso in fase di massa.`;
      }
    } else if (goalType === GoalType.STRENGTH || goalType === GoalType.POWERBUILDING) {
      if (weeklyRateKg < 0 && isFollowingPlan && logCount >= 14) {
        deltaCalories = 100;
        type = NutritionDecisionType.CALORIE_INCREASE;
        rationale = `Perdita di peso in fase di forza (${weeklyRateKg.toFixed(2)}kg/settimana). Aumento di 100 kcal per supportare le performance.`;
      } else if (weeklyRateKg > 0.3 && logCount >= 7) {
        if (!recoveryBlocked) {
          deltaCalories = -100;
          type = NutritionDecisionType.CALORIE_DECREASE;
          rationale = `Surplus eccessivo in fase forza (${weeklyRateKg.toFixed(2)}kg/settimana). Riduzione di 100 kcal.`;
        }
      }
    } else if (goalType === GoalType.BODY_RECOMPOSITION) {
      if (Math.abs(weeklyRateKg) < 0.1 && isFollowingPlan && logCount >= 21) {
        deltaCalories = 75;
        type = NutritionDecisionType.CALORIE_INCREASE;
        rationale = `Recomposizione troppo lenta: peso stabile da ${logCount}+ giorni senza variazione significativa. Aumento leggero di 75 kcal per accelerare la composizione.`;
      }
    } else if (goalType === GoalType.LONGEVITY || goalType === GoalType.GENERAL_HEALTH) {
      if (weeklyRateKg < -0.3 && isFollowingPlan && logCount >= 14) {
        deltaCalories = 100;
        type = NutritionDecisionType.CALORIE_INCREASE;
        rationale = `Perdita di peso non desiderata in fase mantenimento (${weeklyRateKg.toFixed(2)}kg/settimana). Aumento di 100 kcal.`;
      } else if (weeklyRateKg > 0.3 && logCount >= 14) {
        if (!recoveryBlocked) {
          deltaCalories = -100;
          type = NutritionDecisionType.CALORIE_DECREASE;
          rationale = `Aumento di peso in fase mantenimento (${weeklyRateKg.toFixed(2)}kg/settimana). Riduzione di 100 kcal.`;
        }
      }
    }

    if (type === null) return null;

    // Append recovery context to rationale if relevant
    if (recoveryCtx.hasEnoughData && recoveryCtx.engineAction !== EngineAction.PROCEED) {
      rationale += ` (${recoveryCtx.summary})`;
    }

    return this.prisma.nutritionDecision.create({
      data: {
        userId,
        planId: plan.id,
        type,
        deltaCalories,
        rationale,
        evidenceData: {
          weeklyRateKg,
          ma7d,
          ma14d,
          logCount,
          complianceScore: compliance.complianceScore,
          loggedDays: compliance.loggedDays,
          avgCalories: compliance.avgCalories,
          targetCalories: compliance.targetCalories,
          goalType,
          recoveryAction: recoveryCtx.engineAction,
          recoveryScore: recoveryCtx.hasEnoughData ? recoveryCtx.avgScore7d : null,
        },
      },
    });
  }

  async applyDecision(userId: string, decisionId: string): Promise<{ applied: true; newCalories: number }> {
    const decision = await this.prisma.nutritionDecision.findUnique({ where: { id: decisionId } });
    if (!decision) throw new NotFoundException('Decision not found');
    if (decision.userId !== userId) throw new ForbiddenException();
    if (decision.isApplied) return { applied: true, newCalories: 0 };

    if (decision.deltaCalories !== 0) {
      const plan = decision.planId
        ? await this.prisma.nutritionPlan.findUnique({ where: { id: decision.planId } })
        : await this.prisma.nutritionPlan.findFirst({ where: { userId, isActive: true } });

      if (plan) {
        const newCalories = Math.max(1000, plan.dailyCalories + decision.deltaCalories);
        const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
        const newMacros = profile
          ? this.nutritionService.calculateMacros(newCalories, plan.goalType, profile.weightKg)
          : {};

        await this.prisma.nutritionPlan.update({
          where: { id: plan.id },
          data: { dailyCalories: newCalories, ...newMacros },
        });

        await this.prisma.nutritionDecision.update({
          where: { id: decisionId },
          data: { isApplied: true, isRead: true, appliedAt: new Date() },
        });

        return { applied: true, newCalories };
      }
    }

    await this.prisma.nutritionDecision.update({
      where: { id: decisionId },
      data: { isApplied: true, isRead: true, appliedAt: new Date() },
    });

    return { applied: true, newCalories: 0 };
  }

  // ─── Compliance ────────────────────────────────────────────────────────────

  async computeWeeklyCompliance(userId: string): Promise<{
    avgCalories: number;
    targetCalories: number;
    complianceScore: number;
    loggedDays: number;
  }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const plan = await this.prisma.nutritionPlan.findFirst({
      where: { userId, isActive: true },
      select: { dailyCalories: true },
    });

    if (!plan) return { avgCalories: 0, targetCalories: 0, complianceScore: 0, loggedDays: 0 };

    const mealLogs = await this.prisma.mealLog.findMany({
      where: { userId, date: { gte: sevenDaysAgo } },
      include: { foodItem: { select: { calories: true } } },
    });

    const dayCalories = new Map<string, number>();
    for (const log of mealLogs) {
      const key = log.date.toISOString().split('T')[0];
      dayCalories.set(key, (dayCalories.get(key) ?? 0) + log.foodItem.calories * log.servings);
    }

    const loggedDays = dayCalories.size;
    if (loggedDays === 0) {
      return { avgCalories: 0, targetCalories: plan.dailyCalories, complianceScore: 0, loggedDays: 0 };
    }

    const totalCalories = Array.from(dayCalories.values()).reduce((a, b) => a + b, 0);
    const avgCalories = Math.round(totalCalories / loggedDays);
    const complianceScore = Math.round((avgCalories / plan.dailyCalories) * 100);

    return { avgCalories, targetCalories: plan.dailyCalories, complianceScore, loggedDays };
  }

  // ─── Read queries ──────────────────────────────────────────────────────────

  async getDecisions(userId: string, params?: { limit?: number; unreadOnly?: boolean }) {
    return this.prisma.nutritionDecision.findMany({
      where: {
        userId,
        ...(params?.unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: params?.limit ?? 20,
    });
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.nutritionDecision.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markRead(userId: string, decisionId: string): Promise<void> {
    await this.prisma.nutritionDecision.updateMany({
      where: { id: decisionId, userId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.nutritionDecision.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
