import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MuscleGroup, Equipment, ExerciseCategory, ExerciseDifficulty } from '@prisma/client';

@Injectable()
export class ExercisesService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    search?: string;
    muscleGroup?: MuscleGroup;
    equipment?: Equipment;
    category?: ExerciseCategory;
    difficulty?: ExerciseDifficulty;
    limit?: number;
    offset?: number;
  }) {
    const { search, muscleGroup, equipment, category, difficulty, limit = 20, offset = 0 } = filters;

    const where: any = { isActive: true };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (muscleGroup) where.muscleGroups = { has: muscleGroup };
    if (equipment) where.equipment = { has: equipment };
    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;

    const [exercises, total] = await Promise.all([
      this.prisma.exercise.findMany({ where, take: limit, skip: offset, orderBy: { name: 'asc' } }),
      this.prisma.exercise.count({ where }),
    ]);

    return { exercises, total, limit, offset };
  }

  async findById(id: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } });
    if (!exercise) throw new NotFoundException('Exercise not found');
    return exercise;
  }

  async getUserHistory(userId: string, exerciseId: string) {
    const sets = await this.prisma.workoutSet.findMany({
      where: { exerciseId, session: { userId, completedAt: { not: null } } },
      orderBy: { completedAt: 'desc' },
      take: 50,
      include: { session: { select: { startedAt: true } } },
    });

    const pr = await this.prisma.exercise1RM.findFirst({
      where: { userId, exerciseId },
      orderBy: { estimated1RM: 'desc' },
    });

    return { sets, personalRecord: pr };
  }
}
