import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FatigueLevel } from '@prisma/client';

@Injectable()
export class RecoveryService {
  constructor(private prisma: PrismaService) {}

  calculateRecoveryScore(data: {
    sleepHours: number;
    sleepQuality: number;
    stressLevel: number;
    steps: number;
    hrv?: number;
    restingHR?: number;
    energyLevel: number;
  }): { score: number; level: FatigueLevel; recommendation: string } {
    const {
      sleepHours, sleepQuality, stressLevel, steps, hrv, restingHR, energyLevel,
    } = data;

    let score = 0;

    // Sleep (40% weight)
    const sleepScore = Math.min(100, (sleepHours / 8) * 60 + (sleepQuality / 10) * 40);
    score += sleepScore * 0.40;

    // Stress (20% weight) — inverse
    const stressScore = 100 - (stressLevel / 10) * 100;
    score += stressScore * 0.20;

    // Energy (20% weight)
    const energyScore = (energyLevel / 10) * 100;
    score += energyScore * 0.20;

    // Steps (10% weight)
    const stepsScore = Math.min(100, (steps / 10000) * 100);
    score += stepsScore * 0.10;

    // HRV (10% weight if available)
    if (hrv) {
      const hrvScore = Math.min(100, (hrv / 80) * 100);
      score += hrvScore * 0.10;
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

  async logRecovery(userId: string, data: {
    date: string;
    sleepHours: number;
    sleepQuality: number;
    stressLevel: number;
    steps?: number;
    hrv?: number;
    restingHR?: number;
    energyLevel: number;
    notes?: string;
  }) {
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

    return { log, score: log.overallScore, level: log.fatigueLevel, recommendation: this.getRecommendationForLevel(log.fatigueLevel) };
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
