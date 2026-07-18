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

  /**
   * XP + Level — a Gravl-style progression layer on top of the existing
   * points. XP accrues from real activity so it can't be gamed by idle time.
   */
  async getLevel(userId: string) {
    const [sessionCount, prCount, streaks, earned] = await Promise.all([
      this.prisma.workoutSession.count({ where: { userId, completedAt: { not: null } } }),
      this.prisma.exercise1RM.count({ where: { userId } }),
      this.prisma.streak.findMany({ where: { userId } }),
      this.prisma.userAchievement.findMany({ where: { userId }, include: { achievement: true } }),
    ]);

    const achievementPoints = earned.reduce((acc, e) => acc + (e.achievement?.points || 0), 0);
    const workoutStreak = streaks.find((s) => s.type === 'WORKOUT')?.currentCount || 0;

    const xp = sessionCount * 100 + prCount * 25 + achievementPoints + workoutStreak * 10;

    // Level curve: advancing to level L+1 costs L*500 XP (500, 1000, 1500…).
    let level = 1;
    let acc = 0;
    let need = 500;
    while (xp >= acc + need) {
      acc += need;
      level += 1;
      need = level * 500;
    }
    const xpIntoLevel = xp - acc;

    const title =
      level >= 20 ? 'Leggenda' :
      level >= 12 ? 'Veterano' :
      level >= 6 ? 'Guerriero' :
      level >= 3 ? 'Atleta' : 'Novizio';

    return {
      xp,
      level,
      title,
      xpIntoLevel,
      xpForNextLevel: need,
      progressPct: Math.round((xpIntoLevel / need) * 100),
      breakdown: { sessions: sessionCount, personalRecords: prCount, achievementPoints, workoutStreak },
    };
  }
}
