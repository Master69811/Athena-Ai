import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto, CompleteOnboardingDto } from './dto/update-profile.dto';

/** Truncate to local midnight so repeated same-day submissions collide on the (userId, date) unique constraint instead of creating duplicate rows. */
function startOfDay(input?: Date | string): Date {
  const d = input ? new Date(input) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        subscription: true,
        streaks: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const { passwordHash, refreshToken, ...safe } = user as any;
    return safe;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: dto,
      create: {
        userId,
        name: dto.name || '',
        age: dto.age || 25,
        gender: dto.gender || 'MALE',
        heightCm: dto.heightCm || 175,
        weightKg: dto.weightKg || 75,
        goalType: dto.goalType || 'HYPERTROPHY',
        experienceLevel: dto.experienceLevel || 'BEGINNER',
        ...dto,
      },
    });
    return profile;
  }

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    // Idempotency guard: a client-side bug (since fixed) could resubmit this
    // repeatedly for an already-onboarded user, silently overwriting real
    // profile data with stale wizard state on every retry. Once onboarding
    // is complete, this endpoint is a no-op — edits belong in PUT /users/profile.
    const existing = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (existing?.onboardingCompleted) {
      return { profile: existing, message: 'Onboarding was already completed.' };
    }

    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: { ...dto, onboardingCompleted: true },
      create: { userId, ...dto, onboardingCompleted: true },
    });

    const today = startOfDay();
    await this.prisma.bodyMeasurement.upsert({
      where: { userId_date: { userId, date: today } },
      update: { weightKg: dto.weightKg, bodyFatPct: dto.bodyFatPercentage },
      create: { userId, date: today, weightKg: dto.weightKg, bodyFatPct: dto.bodyFatPercentage },
    });

    await this.prisma.streak.createMany({
      data: [
        { userId, type: 'WORKOUT' },
        { userId, type: 'NUTRITION' },
        { userId, type: 'RECOVERY' },
      ],
      skipDuplicates: true,
    });

    return { profile, message: 'Onboarding complete! Your AI coach is ready.' };
  }

  async addBodyMeasurement(userId: string, data: any) {
    const date = startOfDay(data.date);
    return this.prisma.bodyMeasurement.upsert({
      where: { userId_date: { userId, date } },
      update: { ...data, date },
      create: { userId, ...data, date },
    });
  }

  async getBodyMeasurements(userId: string, limit = 30) {
    return this.prisma.bodyMeasurement.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: limit,
    });
  }

  async getDashboardStats(userId: string) {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [sessionsThisWeek, totalSets, recovery, streaks, recentMeasurements] = await Promise.all([
      this.prisma.workoutSession.findMany({
        where: { userId, startedAt: { gte: weekStart }, completedAt: { not: null } },
        include: { sets: true },
      }),
      this.prisma.workoutSet.count({ where: { session: { userId, startedAt: { gte: weekStart } } } }),
      this.prisma.recoveryLog.findFirst({ where: { userId }, orderBy: { date: 'desc' } }),
      this.prisma.streak.findMany({ where: { userId } }),
      this.prisma.bodyMeasurement.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: 14 }),
    ]);

    const weeklyVolume = sessionsThisWeek.reduce((acc, s) => {
      return acc + s.sets.reduce((setAcc, set) => setAcc + (set.weightKg * set.reps), 0);
    }, 0);

    const workoutStreak = streaks.find(s => s.type === 'WORKOUT');

    const weightTrend = recentMeasurements.map(m => ({
      date: m.date.toISOString().split('T')[0],
      weight: m.weightKg,
    })).reverse();

    return {
      workoutsThisWeek: sessionsThisWeek.length,
      totalVolumeThisWeek: Math.round(weeklyVolume),
      currentStreak: workoutStreak?.currentCount || 0,
      recoveryScore: recovery?.overallScore || 75,
      weightTrend,
      aiInsightOfTheDay: await this.generateDailyInsight(userId, sessionsThisWeek.length, recovery),
    };
  }

  private async generateDailyInsight(userId: string, sessionsThisWeek: number, recovery: any): Promise<string> {
    if (!recovery || recovery.overallScore >= 80) {
      return `You're well-recovered and ready to train hard today. Focus on progressive overload and hitting your target RPE on every set.`;
    }
    if (recovery.overallScore < 50) {
      return `Your recovery score is low today. Consider a lighter session or active recovery to maximize long-term progress.`;
    }
    return `Good energy levels today. Stay consistent with your nutrition and aim to beat last week's performance by 5%.`;
  }
}
