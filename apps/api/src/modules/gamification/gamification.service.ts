import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GamificationService {
  constructor(private prisma: PrismaService) {}

  async checkAndAwardAchievements(userId: string): Promise<string[]> {
    const awarded: string[] = [];

    const [sessionCount, prCount, streaks, achievements, userAchievements] = await Promise.all([
      this.prisma.workoutSession.count({ where: { userId, completedAt: { not: null } } }),
      this.prisma.exercise1RM.count({ where: { userId } }),
      this.prisma.streak.findMany({ where: { userId } }),
      this.prisma.achievement.findMany(),
      this.prisma.userAchievement.findMany({ where: { userId } }),
    ]);

    const earnedIds = new Set(userAchievements.map((ua) => ua.achievementId));
    const workoutStreak = streaks.find((s) => s.type === 'WORKOUT');

    for (const ach of achievements) {
      if (earnedIds.has(ach.id)) continue;

      const criteria = ach.criteria as any;
      let earned = false;

      switch (criteria.type) {
        case 'session_count':
          earned = sessionCount >= criteria.value;
          break;
        case 'pr_count':
          earned = prCount >= criteria.value;
          break;
        case 'streak':
          earned = (workoutStreak?.currentCount || 0) >= criteria.value;
          break;
      }

      if (earned) {
        await this.prisma.userAchievement.create({
          data: { userId, achievementId: ach.id, progress: 100 },
        });
        awarded.push(ach.nameIt);
      }
    }

    return awarded;
  }

  async getUserAchievements(userId: string) {
    const [all, earned, streaks] = await Promise.all([
      this.prisma.achievement.findMany(),
      this.prisma.userAchievement.findMany({ where: { userId }, include: { achievement: true } }),
      this.prisma.streak.findMany({ where: { userId } }),
    ]);

    const earnedIds = new Set(earned.map((e) => e.achievementId));
    const totalPoints = earned.reduce((acc, e) => acc + (e.achievement?.points || 0), 0);

    return {
      totalPoints,
      earnedCount: earned.length,
      totalCount: all.length,
      streaks,
      achievements: all.map((a) => ({
        ...a,
        earned: earnedIds.has(a.id),
        earnedAt: earned.find((e) => e.achievementId === a.id)?.earnedAt,
      })),
    };
  }

  async getStreaks(userId: string) {
    return this.prisma.streak.findMany({ where: { userId } });
  }
}
