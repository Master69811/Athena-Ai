import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async startSession(userId: string, data: { planId?: string; dayId?: string; energyLevel?: number; notes?: string }) {
    return this.prisma.workoutSession.create({
      data: { userId, ...data, startedAt: new Date() },
      include: {
        day: {
          include: {
            exercises: {
              include: { exercise: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
  }

  async logSet(userId: string, sessionId: string, data: {
    exerciseId: string;
    setNumber: number;
    weightKg: number;
    reps: number;
    rpe?: number;
    rir?: number;
    isWarmup?: boolean;
    isDropset?: boolean;
    notes?: string;
  }) {
    const session = await this.prisma.workoutSession.findFirst({ where: { id: sessionId, userId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.completedAt) throw new BadRequestException('Session already completed');

    const set = await this.prisma.workoutSet.create({
      data: { sessionId, ...data, completedAt: new Date() },
      include: { exercise: true },
    });

    await this.update1RM(userId, data.exerciseId, data.weightKg, data.reps);

    return set;
  }

  private async update1RM(userId: string, exerciseId: string, weightKg: number, reps: number) {
    if (reps > 10) return;
    const estimated1RM = Math.round(weightKg * (1 + reps / 30) * 10) / 10;

    const existing = await this.prisma.exercise1RM.findFirst({
      where: { userId, exerciseId },
      orderBy: { date: 'desc' },
    });

    if (!existing || estimated1RM > existing.estimated1RM) {
      await this.prisma.exercise1RM.create({
        data: { userId, exerciseId, estimated1RM, method: 'EPLEY' },
      });
    }
  }

  async completeSession(userId: string, sessionId: string, data: { rpe?: number; notes?: string; aiAnalysis?: string }) {
    const session = await this.prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
      include: { sets: true },
    });
    if (!session) throw new NotFoundException('Session not found');

    const completedAt = new Date();
    const durationMinutes = Math.round((completedAt.getTime() - session.startedAt.getTime()) / 60000);
    const totalVolume = session.sets.reduce((acc, s) => acc + s.weightKg * s.reps, 0);

    const updated = await this.prisma.workoutSession.update({
      where: { id: sessionId },
      data: { completedAt, durationMinutes, totalVolume, ...data },
      include: { sets: { include: { exercise: true } } },
    });

    await this.updateWorkoutStreak(userId);

    return updated;
  }

  private async updateWorkoutStreak(userId: string) {
    const streak = await this.prisma.streak.findFirst({ where: { userId, type: 'WORKOUT' } });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (!streak) {
      await this.prisma.streak.create({
        data: { userId, type: 'WORKOUT', currentCount: 1, longestCount: 1, lastActivityDate: new Date(), startDate: new Date() },
      });
      return;
    }

    const lastDate = streak.lastActivityDate ? new Date(streak.lastActivityDate) : null;
    if (lastDate) lastDate.setHours(0, 0, 0, 0);

    let newCount = streak.currentCount;
    if (!lastDate || lastDate < yesterday) {
      newCount = 1;
    } else if (lastDate.getTime() === yesterday.getTime()) {
      newCount = streak.currentCount + 1;
    }

    await this.prisma.streak.update({
      where: { id: streak.id },
      data: {
        currentCount: newCount,
        longestCount: Math.max(newCount, streak.longestCount),
        lastActivityDate: new Date(),
      },
    });
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.prisma.workoutSession.findFirst({
      where: { id: sessionId, userId },
      include: { sets: { include: { exercise: true }, orderBy: { completedAt: 'asc' } }, day: { include: { exercises: { include: { exercise: true } } } } },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async getSessions(userId: string, limit = 20, offset = 0) {
    const [sessions, total] = await Promise.all([
      this.prisma.workoutSession.findMany({
        where: { userId, completedAt: { not: null } },
        orderBy: { startedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          sets: true,
          day: { select: { name: true } },
        },
      }),
      this.prisma.workoutSession.count({ where: { userId, completedAt: { not: null } } }),
    ]);

    return { sessions, total, limit, offset };
  }

  async getActiveSession(userId: string) {
    return this.prisma.workoutSession.findFirst({
      where: { userId, completedAt: null },
      include: {
        sets: { include: { exercise: true }, orderBy: { completedAt: 'asc' } },
        day: { include: { exercises: { include: { exercise: true }, orderBy: { order: 'asc' } } } },
      },
    });
  }
}
