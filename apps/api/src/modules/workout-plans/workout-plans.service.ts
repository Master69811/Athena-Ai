import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkoutPlansService {
  constructor(private prisma: PrismaService) {}

  async getActivePlan(userId: string) {
    return this.prisma.workoutPlan.findFirst({
      where: { userId, isActive: true },
      include: {
        days: {
          include: {
            exercises: {
              include: { exercise: true },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { dayIndex: 'asc' },
        },
      },
    });
  }

  async getAll(userId: string) {
    return this.prisma.workoutPlan.findMany({
      where: { userId },
      include: { days: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(userId: string, planId: string) {
    const plan = await this.prisma.workoutPlan.findFirst({
      where: { id: planId, userId },
      include: {
        days: {
          include: {
            exercises: {
              include: { exercise: true },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { dayIndex: 'asc' },
        },
      },
    });
    if (!plan) throw new NotFoundException('Plan not found');
    return plan;
  }

  async activate(userId: string, planId: string) {
    await this.prisma.workoutPlan.updateMany({ where: { userId, isActive: true }, data: { isActive: false } });
    return this.prisma.workoutPlan.update({ where: { id: planId }, data: { isActive: true } });
  }

  async delete(userId: string, planId: string) {
    const plan = await this.prisma.workoutPlan.findFirst({ where: { id: planId, userId } });
    if (!plan) throw new NotFoundException('Plan not found');
    await this.prisma.workoutPlan.delete({ where: { id: planId } });
    return { message: 'Plan deleted' };
  }
}
