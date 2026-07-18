import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WeightTrend } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const BATCH_SIZE = 200;
const SNAPSHOT_WINDOW_DAYS = 30;

export interface WeightContext {
  hasEnoughData: boolean;
  ma7d: number;
  ma14d: number;
  weeklyRateKg: number;
  trendDirection: WeightTrend;
  logCount: number;
  pred4wKg: number | null;
  pred12wKg: number | null;
  confidenceScore: number | null;
}

@Injectable()
export class BodyWeightEngineService {
  private readonly logger = new Logger(BodyWeightEngineService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Scheduled job ────────────────────────────────────────────────────────

  @Cron('0 6 * * *')
  async scheduledSnapshotCompute() {
    this.logger.log('Body Weight Engine: computing daily snapshots...');
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
          this.logger.error(`Weight snapshot failed for ${user.id}: ${(e as Error).message}`);
        });
        total++;
      }

      offset += BATCH_SIZE;
      if (users.length < BATCH_SIZE) break;
    }

    this.logger.log(`Body Weight Engine: computed ${total} snapshots.`);
  }

  // ─── Pure computation functions ────────────────────────────────────────────

  computeMovingAverage(weights: number[], window: number): number | null {
    if (weights.length < window) return null;
    const slice = weights.slice(-window);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  }

  linearRegression(points: { x: number; y: number }[]): { slope: number; r2: number } | null {
    const n = points.length;
    if (n < 2) return null;

    const sumX = points.reduce((a, p) => a + p.x, 0);
    const sumY = points.reduce((a, p) => a + p.y, 0);
    const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
    const sumX2 = points.reduce((a, p) => a + p.x * p.x, 0);

    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return null;

    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    const meanY = sumY / n;
    const ssTot = points.reduce((a, p) => a + (p.y - meanY) ** 2, 0);
    const ssRes = points.reduce((a, p) => a + (p.y - (slope * p.x + intercept)) ** 2, 0);
    const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

    return { slope, r2 };
  }

  detectTrend(weeklyRateKg: number): WeightTrend {
    if (weeklyRateKg < -0.8) return WeightTrend.LOSING_FAST;
    if (weeklyRateKg < -0.2) return WeightTrend.LOSING_ON_TRACK;
    if (weeklyRateKg > 0.5) return WeightTrend.GAINING_FAST;
    if (weeklyRateKg > 0.1) return WeightTrend.GAINING_ON_TRACK;
    return WeightTrend.STABLE;
  }

  computeWeightContext(entries: { weightKg: number; date: Date }[]): WeightContext {
    const sorted = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
    const weights = sorted.map((e) => e.weightKg);
    const n = sorted.length;

    if (n < 3) {
      return {
        hasEnoughData: false,
        ma7d: 0,
        ma14d: 0,
        weeklyRateKg: 0,
        trendDirection: WeightTrend.INSUFFICIENT_DATA,
        logCount: n,
        pred4wKg: null,
        pred12wKg: null,
        confidenceScore: null,
      };
    }

    const ma7d = this.computeMovingAverage(weights, Math.min(7, n)) ?? weights[weights.length - 1];
    const ma14d = this.computeMovingAverage(weights, Math.min(14, n)) ?? ma7d;

    const baseTime = sorted[0].date.getTime();
    const points = sorted.map((e) => ({
      x: (e.date.getTime() - baseTime) / (1000 * 60 * 60 * 24),
      y: e.weightKg,
    }));

    const reg = this.linearRegression(points);
    const weeklyRateKg = reg ? Math.round(reg.slope * 7 * 100) / 100 : 0;
    const trendDirection = reg ? this.detectTrend(weeklyRateKg) : WeightTrend.INSUFFICIENT_DATA;
    const confidenceScore = reg ? Math.round(Math.max(0, reg.r2) * 100) : null;

    const currentX = points[points.length - 1].x;
    const currentY = weights[weights.length - 1];
    const predict = (days: number) =>
      reg
        ? Math.round((currentY + reg.slope * days) * 10) / 10
        : null;

    return {
      hasEnoughData: true,
      ma7d: Math.round(ma7d * 100) / 100,
      ma14d: Math.round(ma14d * 100) / 100,
      weeklyRateKg,
      trendDirection,
      logCount: n,
      pred4wKg: predict(28),
      pred12wKg: predict(84),
      confidenceScore,
    };
  }

  // ─── Async methods ─────────────────────────────────────────────────────────

  async logWeight(userId: string, data: { date: string; weightKg: number; notes?: string }) {
    const entry = await this.prisma.bodyWeightEntry.upsert({
      where: { userId_date: { userId, date: new Date(data.date) } },
      update: { weightKg: data.weightKg, notes: data.notes },
      create: { userId, date: new Date(data.date), weightKg: data.weightKg, notes: data.notes },
    });

    this.computeAndSaveSnapshot(userId).catch((e) => {
      this.logger.warn(`Background weight snapshot failed for ${userId}: ${(e as Error).message}`);
    });

    return entry;
  }

  async getWeightHistory(userId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    return this.prisma.bodyWeightEntry.findMany({
      where: { userId, date: { gte: since } },
      orderBy: { date: 'asc' },
    });
  }

  async computeAndSaveSnapshot(userId: string) {
    const since = new Date();
    since.setDate(since.getDate() - SNAPSHOT_WINDOW_DAYS);

    const entries = await this.prisma.bodyWeightEntry.findMany({
      where: { userId, date: { gte: since } },
      select: { weightKg: true, date: true },
      orderBy: { date: 'asc' },
    });

    const ctx = this.computeWeightContext(entries);

    return this.prisma.bodyWeightSnapshot.create({
      data: {
        userId,
        ma7d: ctx.ma7d,
        ma14d: ctx.ma14d,
        weeklyRateKg: ctx.weeklyRateKg,
        trendDirection: ctx.trendDirection,
        logCount: ctx.logCount,
        pred4wKg: ctx.pred4wKg,
        pred12wKg: ctx.pred12wKg,
        confidenceScore: ctx.confidenceScore,
      },
    });
  }

  async getLatestSnapshot(userId: string) {
    return this.prisma.bodyWeightSnapshot.findFirst({
      where: { userId },
      orderBy: { computedAt: 'desc' },
    });
  }
}
