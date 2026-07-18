import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getVolumeByMuscleGroup(userId: string, weeks = 4) {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    const sets = await this.prisma.workoutSet.findMany({
      where: { session: { userId, startedAt: { gte: since }, completedAt: { not: null } }, isWarmup: false },
      include: { exercise: { select: { muscleGroups: true } } },
    });

    const volumeByMuscle: Record<string, number> = {};
    for (const set of sets) {
      const volume = set.weightKg * set.reps;
      for (const muscle of set.exercise.muscleGroups) {
        volumeByMuscle[muscle] = (volumeByMuscle[muscle] || 0) + volume;
      }
    }

    return Object.entries(volumeByMuscle)
      .map(([muscle, volume]) => ({ muscle, volume: Math.round(volume) }))
      .sort((a, b) => b.volume - a.volume);
  }

  async getWeeklyVolumeTrend(userId: string, weeks = 12) {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    const sessions = await this.prisma.workoutSession.findMany({
      where: { userId, startedAt: { gte: since }, completedAt: { not: null } },
      select: { startedAt: true, totalVolume: true },
      orderBy: { startedAt: 'asc' },
    });

    const weekMap: Record<string, number> = {};
    for (const s of sessions) {
      const d = new Date(s.startedAt);
      d.setDate(d.getDate() - d.getDay());
      const key = d.toISOString().split('T')[0];
      weekMap[key] = (weekMap[key] || 0) + (s.totalVolume || 0);
    }

    return Object.entries(weekMap).map(([week, volume]) => ({ week, volume: Math.round(volume) }));
  }

  async getStrengthProgress(userId: string, exerciseId: string) {
    const records = await this.prisma.exercise1RM.findMany({
      where: { userId, exerciseId },
      orderBy: { date: 'asc' },
    });

    if (records.length < 2) return { history: records, progressPercent: 0 };

    const first = records[0].estimated1RM;
    const last = records[records.length - 1].estimated1RM;
    const progressPercent = Math.round(((last - first) / first) * 1000) / 10;

    return {
      history: records.map((r) => ({ date: r.date, estimated1RM: r.estimated1RM })),
      progressPercent,
      current: last,
      starting: first,
    };
  }

  /**
   * Strength Score — a single headline metric (0–100) with push/pull/legs
   * subscores, computed from the user's best estimated 1RMs relative to
   * bodyweight and benchmarked against strength standards. Inspired by
   * Gravl's Strength Score; needs no peer dataset to be meaningful.
   */
  async getStrengthScore(userId: string) {
    // Best estimated 1RM per exercise + the exercise's muscle groups.
    const oneRms = await this.prisma.exercise1RM.findMany({
      where: { userId },
      include: { exercise: { select: { name: true, nameIt: true, muscleGroups: true } } },
      orderBy: { estimated1RM: 'desc' },
    });

    // Bodyweight: latest measurement, else profile weight, else 75kg.
    const [measurement, profile] = await Promise.all([
      this.prisma.bodyMeasurement.findFirst({ where: { userId }, orderBy: { date: 'desc' } }),
      this.prisma.userProfile.findUnique({ where: { userId }, select: { weightKg: true } }),
    ]);
    const bodyweight = measurement?.weightKg ?? profile?.weightKg ?? 75;

    // Movement pattern by primary muscle, and the bodyweight-multiple that
    // scores 100 (advanced strength standards).
    const PATTERNS: Record<string, { muscles: string[]; target: number; labelIt: string }> = {
      push: { muscles: ['CHEST', 'SHOULDERS', 'TRICEPS'], target: 1.5, labelIt: 'Spinta' },
      pull: { muscles: ['BACK', 'BICEPS', 'FOREARMS'], target: 2.0, labelIt: 'Tirata' },
      legs: { muscles: ['QUADS', 'HAMSTRINGS', 'GLUTES', 'CALVES'], target: 2.0, labelIt: 'Gambe' },
    };

    // Best bodyweight-relative ratio per pattern + which lift produced it.
    const bestByPattern: Record<string, { ratio: number; lift: string; oneRm: number }> = {};
    for (const rec of oneRms) {
      const muscles = rec.exercise?.muscleGroups ?? [];
      const ratio = rec.estimated1RM / bodyweight;
      for (const key of Object.keys(PATTERNS)) {
        if (muscles.some((m) => PATTERNS[key].muscles.includes(m))) {
          if (!bestByPattern[key] || ratio > bestByPattern[key].ratio) {
            bestByPattern[key] = { ratio, lift: rec.exercise?.nameIt || rec.exercise?.name || '', oneRm: rec.estimated1RM };
          }
        }
      }
    }

    const subscores = Object.entries(PATTERNS).map(([key, cfg]) => {
      const best = bestByPattern[key];
      const score = best ? Math.min(100, Math.round((best.ratio / cfg.target) * 100)) : 0;
      return {
        key,
        label: cfg.labelIt,
        score,
        bestLift: best?.lift ?? null,
        best1RM: best ? Math.round(best.oneRm) : null,
      };
    });

    const scored = subscores.filter((s) => s.score > 0);
    const overall = scored.length > 0 ? Math.round(scored.reduce((a, s) => a + s.score, 0) / scored.length) : 0;

    const level =
      overall >= 85 ? 'Elite' :
      overall >= 65 ? 'Avanzato' :
      overall >= 45 ? 'Intermedio' :
      overall >= 20 ? 'Principiante' : 'Iniziale';

    return {
      hasData: scored.length > 0,
      overall,
      level,
      subscores,
      bodyweightKg: Math.round(bodyweight),
      liftsTracked: oneRms.length,
    };
  }

  async getTrainingFrequency(userId: string, weeks = 8) {
    const since = new Date();
    since.setDate(since.getDate() - weeks * 7);

    const sessions = await this.prisma.workoutSession.findMany({
      where: { userId, startedAt: { gte: since }, completedAt: { not: null } },
      select: { startedAt: true },
    });

    const dayCount: Record<number, number> = {};
    for (const s of sessions) {
      const day = new Date(s.startedAt).getDay();
      dayCount[day] = (dayCount[day] || 0) + 1;
    }

    const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    return days.map((label, i) => ({ day: label, sessions: dayCount[i] || 0 }));
  }
}
