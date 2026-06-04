import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrainerClientStatus } from '@prisma/client';

@Injectable()
export class TrainerService {
  constructor(private prisma: PrismaService) {}

  async addClient(trainerId: string, clientEmail: string) {
    const client = await this.prisma.user.findUnique({ where: { email: clientEmail } });
    if (!client) throw new NotFoundException('Client not found');

    return this.prisma.trainerClient.create({
      data: { trainerId, clientId: client.id, status: TrainerClientStatus.PENDING },
      include: { client: { include: { profile: true } } },
    });
  }

  async getClients(trainerId: string) {
    const clients = await this.prisma.trainerClient.findMany({
      where: { trainerId },
      include: {
        client: {
          include: {
            profile: true,
            subscription: true,
          },
        },
      },
    });

    // Enrich with recent activity
    const enriched = await Promise.all(
      clients.map(async (tc) => {
        const [lastSession, recovery, activePlan] = await Promise.all([
          this.prisma.workoutSession.findFirst({ where: { userId: tc.clientId, completedAt: { not: null } }, orderBy: { startedAt: 'desc' } }),
          this.prisma.recoveryLog.findFirst({ where: { userId: tc.clientId }, orderBy: { date: 'desc' } }),
          this.prisma.workoutPlan.findFirst({ where: { userId: tc.clientId, isActive: true } }),
        ]);

        return {
          ...tc,
          activity: {
            lastSessionDate: lastSession?.startedAt,
            recoveryScore: recovery?.overallScore,
            activePlanName: activePlan?.name,
          },
        };
      }),
    );

    return enriched;
  }

  async getClientDetail(trainerId: string, clientId: string) {
    const relation = await this.prisma.trainerClient.findFirst({ where: { trainerId, clientId } });
    if (!relation) throw new ForbiddenException('Not your client');

    const [profile, sessions, measurements, activePlan, nutrition] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { userId: clientId } }),
      this.prisma.workoutSession.findMany({ where: { userId: clientId, completedAt: { not: null } }, orderBy: { startedAt: 'desc' }, take: 10, include: { sets: true } }),
      this.prisma.bodyMeasurement.findMany({ where: { userId: clientId }, orderBy: { date: 'desc' }, take: 20 }),
      this.prisma.workoutPlan.findFirst({ where: { userId: clientId, isActive: true }, include: { days: { include: { exercises: { include: { exercise: true } } } } } }),
      this.prisma.nutritionPlan.findFirst({ where: { userId: clientId, isActive: true } }),
    ]);

    return { profile, sessions, measurements, activePlan, nutrition };
  }

  async updateClientStatus(trainerId: string, clientId: string, status: TrainerClientStatus) {
    const relation = await this.prisma.trainerClient.findFirst({ where: { trainerId, clientId } });
    if (!relation) throw new ForbiddenException('Not your client');

    return this.prisma.trainerClient.update({ where: { id: relation.id }, data: { status } });
  }

  async getDashboardStats(trainerId: string) {
    const clients = await this.prisma.trainerClient.findMany({ where: { trainerId } });
    const clientIds = clients.map((c) => c.clientId);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const activeThisWeek = await this.prisma.workoutSession.groupBy({
      by: ['userId'],
      where: { userId: { in: clientIds }, startedAt: { gte: weekAgo }, completedAt: { not: null } },
    });

    return {
      totalClients: clients.length,
      activeClients: clients.filter((c) => c.status === 'ACTIVE').length,
      pendingClients: clients.filter((c) => c.status === 'PENDING').length,
      activeThisWeek: activeThisWeek.length,
    };
  }
}
