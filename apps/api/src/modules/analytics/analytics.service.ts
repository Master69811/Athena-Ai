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
