import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { FatigueLevel, RecoveryTrend, OverreachingRisk, EngineAction } from '@prisma/client';

const WINDOW_DAYS = 7;
const MIN_LOGS_FOR_DATA = 3;
const BATCH_SIZE = 200;

export interface RecoveryEngineContext {
  hasEnoughData: boolean;
  avgScore7d: number;
  minScore7d: number;
  consecutiveLowDays: number;
  trendDirection: RecoveryTrend;
  overreachingRisk: OverreachingRisk;
  engineAction: EngineAction;
  summary: string;
}

@Injectable()
export class RecoveryService {
  private readonly logger = new Logger(RecoveryService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Scheduled jobs ────────────────────────────────────────────────────────

  @Cron('0 5 * * *')
  async scheduledSnapshotCompute() {
    this.logger.log('Recovery Engine: computing daily snapshots...');
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
        await this.computeAndSaveSnapshot(user.id).catch((e) => {
          this.logger.error(`Snapshot failed for ${user.id}: ${(e as Error).message}`);
        });
        total++;
      }

      offset += BATCH_SIZE;
      if (users.length < BATCH_SIZE) break;
    }

    this.logger.log(`Recovery Engine: computed ${total} snapshots.`);
  }

  // ─── Pure engine function ──────────────────────────────────────────────────

  computeRecoveryContext(logs: { overallScore: number; date: Date }[]): RecoveryEngineContext {
    const sorted = [...logs].sort((a, b) => b.date.getTime() - a.date.getTime());

    if (sorted.length < MIN_LOGS_FOR_DATA) {
      return {
        hasEnoughData: false,
        avgScore7d: 0,
        minScore7d: 0,
        consecutiveLowDays: 0,
        trendDirection: RecoveryTrend.INSUFFICIENT_DATA,
        overreachingRisk: OverreachingRisk.NONE,
        engineAction: EngineAction.PROCEED,
        summary: 'Dati insufficienti per valutare il recupero (minimo 3 giorni richiesti).',
      };
    }

    const scores = sorted.map((l) => l.overallScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const minScore = Math.min(...scores);

    let consecutiveLowDays = 0;
    for (const log of sorted) {
      if (log.overallScore < 50) consecutiveLowDays++;
      else break;
    }

    const mid = Math.floor(sorted.length / 2);
    const newerHalf = sorted.slice(0, mid);
    const olderHalf = sorted.slice(mid);
    const newerAvg = newerHalf.length
      ? newerHalf.reduce((sum, l) => sum + l.overallScore, 0) / newerHalf.length
      : avgScore;
    const olderAvg = olderHalf.length
      ? olderHalf.reduce((sum, l) => sum + l.overallScore, 0) / olderHalf.length
      : avgScore;
    const diff = newerAvg - olderAvg;
    let trendDirection: RecoveryTrend;
    if (diff > 5) trendDirection = RecoveryTrend.IMPROVING;
    else if (diff < -5) trendDirection = RecoveryTrend.DECLINING;
    else trendDirection = RecoveryTrend.STABLE;

    let overreachingRisk: OverreachingRisk;
    if (avgScore < 35 || consecutiveLowDays >= 5) overreachingRisk = OverreachingRisk.HIGH;
    else if (avgScore < 50 || consecutiveLowDays >= 3) overreachingRisk = OverreachingRisk.MEDIUM;
    else if (avgScore < 65 || consecutiveLowDays >= 1) overreachingRisk = OverreachingRisk.LOW;
    else overreachingRisk = OverreachingRisk.NONE;

    let engineAction: EngineAction;
    if (avgScore < 35 || consecutiveLowDays >= 5) engineAction = EngineAction.DELOAD;
    else if (avgScore < 50 || consecutiveLowDays >= 3) engineAction = EngineAction.HOLD;
    else if (avgScore < 65) engineAction = EngineAction.CAUTION;
    else engineAction = EngineAction.PROCEED;

    const summary = this.buildSummary(engineAction, Math.round(avgScore), consecutiveLowDays, trendDirection);

    return {
      hasEnoughData: true,
      avgScore7d: Math.round(avgScore),
      minScore7d: minScore,
      consecutiveLowDays,
      trendDirection,
      overreachingRisk,
      engineAction,
      summary,
    };
  }

  private buildSummary(
    action: EngineAction,
    avgScore: number,
    consecutiveLowDays: number,
    trend: RecoveryTrend,
  ): string {
    const trendText =
      trend === RecoveryTrend.IMPROVING
        ? 'in miglioramento'
        : trend === RecoveryTrend.DECLINING
        ? 'in peggioramento'
        : 'stabile';

    switch (action) {
      case EngineAction.DELOAD:
        return `Recovery Score medio ${avgScore}/100 negli ultimi 7 giorni (trend ${trendText}, ${consecutiveLowDays} giorni consecutivi sotto soglia). Deload attivato per prevenire sovrallenamento.`;
      case EngineAction.HOLD:
        return `Recovery Score medio ${avgScore}/100 negli ultimi 7 giorni (trend ${trendText}). Progressione sospesa: recupero insufficiente per aumentare il carico.`;
      case EngineAction.CAUTION:
        return `Recovery Score medio ${avgScore}/100 negli ultimi 7 giorni (trend ${trendText}). Progressione applicata con cautela.`;
      case EngineAction.PROCEED:
      default:
        return `Recovery Score medio ${avgScore}/100 negli ultimi 7 giorni (trend ${trendText}). Recupero ottimale: progressione applicata normalmente.`;
    }
  }

  // ─── Engine integration ────────────────────────────────────────────────────

  async getRecoveryContextForEngine(userId: string): Promise<RecoveryEngineContext> {
    const since = new Date();
    since.setDate(since.getDate() - WINDOW_DAYS);

    const logs = await this.prisma.recoveryLog.findMany({
      where: { userId, date: { gte: since } },
      select: { overallScore: true, date: true },
      orderBy: { date: 'desc' },
    });

    return this.computeRecoveryContext(logs);
  }

  async computeAndSaveSnapshot(userId: string): Promise<any> {
    const since = new Date();
    since.setDate(since.getDate() - WINDOW_DAYS);

    const logs = await this.prisma.recoveryLog.findMany({
      where: { userId, date: { gte: since } },
      select: { overallScore: true, date: true },
    });

    const ctx = this.computeRecoveryContext(logs);
    const scores = logs.map((l) => l.overallScore);
    const maxScore = scores.length ? Math.max(...scores) : 0;

    return this.prisma.recoverySnapshot.create({
      data: {
        userId,
        windowDays: WINDOW_DAYS,
        avgScore: ctx.avgScore7d,
        minScore: ctx.minScore7d,
        maxScore,
        logCount: logs.length,
        consecutiveLowDays: ctx.consecutiveLowDays,
        trendDirection: ctx.trendDirection,
        overreachingRisk: ctx.overreachingRisk,
        engineAction: ctx.engineAction,
      },
    });
  }

  async getLatestSnapshot(userId: string) {
    return this.prisma.recoverySnapshot.findFirst({
      where: { userId },
      orderBy: { computedAt: 'desc' },
    });
  }

  // ─── Existing methods ──────────────────────────────────────────────────────

  calculateRecoveryScore(data: {
    sleepHours: number;
    sleepQuality: number;
    stressLevel: number;
    steps: number;
    hrv?: number;
    restingHR?: number;
    energyLevel: number;
  }): { score: number; level: FatigueLevel; recommendation: string } {
    const { sleepHours, sleepQuality, stressLevel, steps, hrv, energyLevel } = data;

    let score = 0;
    const sleepScore = Math.min(100, (sleepHours / 8) * 60 + (sleepQuality / 10) * 40);
    score += sleepScore * 0.40;
    score += (100 - (stressLevel / 10) * 100) * 0.20;
    score += ((energyLevel / 10) * 100) * 0.20;
    score += Math.min(100, (steps / 10000) * 100) * 0.10;
    if (hrv) {
      score += Math.min(100, (hrv / 80) * 100) * 0.10;
    } else {
      score += 60 * 0.10;
    }

    const finalScore = Math.round(Math.min(100, Math.max(0, score)));

    let level: FatigueLevel;
    let recommendation: string;

    if (finalScore >= 80) {
      level = FatigueLevel.FRESH;
      recommendation = 'Excellent recovery! Perfect day for a high-intensity session or testing new PRs.';
    } else if (finalScore >= 60) {
      level = FatigueLevel.NORMAL;
      recommendation = 'Good recovery. Train as planned, but listen to your body if fatigue accumulates mid-session.';
    } else if (finalScore >= 40) {
      level = FatigueLevel.FATIGUED;
      recommendation = 'Suboptimal recovery. Consider reducing volume by 20% and staying at the lower end of your RPE targets.';
    } else {
      level = FatigueLevel.OVERTRAINED;
      recommendation = 'Severely under-recovered. Rest or do light active recovery (walk, stretch). Training hard today risks injury and worsens adaptation.';
    }

    return { score: finalScore, level, recommendation };
  }

  async logRecovery(
    userId: string,
    data: {
      date: string;
      sleepHours: number;
      sleepQuality: number;
      stressLevel: number;
      steps?: number;
      hrv?: number;
      restingHR?: number;
      energyLevel: number;
      notes?: string;
    },
  ) {
    const { score, level, recommendation } = this.calculateRecoveryScore({
      sleepHours: data.sleepHours,
      sleepQuality: data.sleepQuality,
      stressLevel: data.stressLevel,
      steps: data.steps || 0,
      hrv: data.hrv,
      restingHR: data.restingHR,
      energyLevel: data.energyLevel,
    });

    const log = await this.prisma.recoveryLog.upsert({
      where: { userId_date: { userId, date: new Date(data.date) } },
      update: { ...data, date: new Date(data.date), steps: data.steps || 0, overallScore: score, fatigueLevel: level },
      create: { userId, ...data, date: new Date(data.date), steps: data.steps || 0, overallScore: score, fatigueLevel: level },
    });

    this.computeAndSaveSnapshot(userId).catch((e) => {
      this.logger.warn(`Background snapshot recompute failed for ${userId}: ${(e as Error).message}`);
    });

    return { log, recommendation, score, level };
  }

  async getLatestRecovery(userId: string) {
    const log = await this.prisma.recoveryLog.findFirst({
      where: { userId },
      orderBy: { date: 'desc' },
    });

    if (!log) {
      return {
        score: 75,
        level: FatigueLevel.NORMAL,
        recommendation: 'No recovery data yet. Log your sleep and stress daily for personalized recovery insights.',
        log: null,
      };
    }

    return {
      log,
      score: log.overallScore,
      level: log.fatigueLevel,
      recommendation: this.getRecommendationForLevel(log.fatigueLevel),
    };
  }

  async getRecoveryHistory(userId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.prisma.recoveryLog.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: 'asc' },
    });
  }

  private getRecommendationForLevel(level: FatigueLevel): string {
    const map: Record<FatigueLevel, string> = {
      FRESH: 'You are well-recovered. Go hard today!',
      NORMAL: 'Good to train. Stick to your plan.',
      FATIGUED: 'Consider a lighter session today.',
      OVERTRAINED: 'Rest day recommended. Prioritize sleep and nutrition.',
    };
    return map[level];
  }
}
