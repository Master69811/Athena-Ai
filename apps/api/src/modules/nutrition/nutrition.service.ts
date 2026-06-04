import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoalType, WorkType } from '@prisma/client';

@Injectable()
export class NutritionService {
  constructor(private prisma: PrismaService) {}

  // Mifflin-St Jeor + Activity multiplier
  calculateTDEE(params: {
    weightKg: number;
    heightCm: number;
    age: number;
    gender: string;
    workType: WorkType;
  }): number {
    const { weightKg, heightCm, age, gender, workType } = params;

    let bmr: number;
    if (gender === 'MALE') {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
    } else {
      bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
    }

    const multipliers: Record<WorkType, number> = {
      SEDENTARY: 1.2,
      LIGHT: 1.375,
      MODERATE: 1.55,
      ACTIVE: 1.725,
      VERY_ACTIVE: 1.9,
    };

    return Math.round(bmr * multipliers[workType]);
  }

  calculateMacros(calories: number, goalType: GoalType, weightKg: number) {
    const splits: Record<GoalType, { protein: number; carbs: number; fat: number }> = {
      WEIGHT_LOSS: { protein: 0.35, carbs: 0.35, fat: 0.30 },
      BODY_RECOMPOSITION: { protein: 0.35, carbs: 0.40, fat: 0.25 },
      HYPERTROPHY: { protein: 0.30, carbs: 0.50, fat: 0.20 },
      STRENGTH: { protein: 0.30, carbs: 0.45, fat: 0.25 },
      POWERBUILDING: { protein: 0.30, carbs: 0.45, fat: 0.25 },
      ATHLETIC_PERFORMANCE: { protein: 0.25, carbs: 0.55, fat: 0.20 },
      LONGEVITY: { protein: 0.25, carbs: 0.45, fat: 0.30 },
      GENERAL_HEALTH: { protein: 0.25, carbs: 0.45, fat: 0.30 },
    };

    const split = splits[goalType];
    const proteinG = Math.round((calories * split.protein) / 4);
    const carbsG = Math.round((calories * split.carbs) / 4);
    const fatG = Math.round((calories * split.fat) / 9);

    const minProtein = Math.round(weightKg * 1.8);
    const finalProtein = Math.max(proteinG, minProtein);
    const proteinCalories = finalProtein * 4;
    const remainingCalories = calories - proteinCalories - (fatG * 9);
    const finalCarbs = Math.max(0, Math.round(remainingCalories / 4));

    return { proteinG: finalProtein, carbsG: finalCarbs, fatG };
  }

  async generateNutritionPlan(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found. Complete onboarding first.');

    const tdee = this.calculateTDEE({
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
      age: profile.age,
      gender: profile.gender,
      workType: profile.workType,
    });

    const goalAdjustments: Record<GoalType, number> = {
      WEIGHT_LOSS: -500,
      BODY_RECOMPOSITION: -200,
      HYPERTROPHY: 300,
      STRENGTH: 200,
      POWERBUILDING: 250,
      ATHLETIC_PERFORMANCE: 200,
      LONGEVITY: 0,
      GENERAL_HEALTH: 0,
    };

    const targetCalories = tdee + (goalAdjustments[profile.goalType] || 0);
    const macros = this.calculateMacros(targetCalories, profile.goalType, profile.weightKg);

    await this.prisma.nutritionPlan.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    const plan = await this.prisma.nutritionPlan.create({
      data: {
        userId,
        goalType: profile.goalType,
        dailyCalories: targetCalories,
        ...macros,
        isActive: true,
        aiReasoning: `TDEE: ${tdee} kcal. ${profile.goalType === 'WEIGHT_LOSS' ? 'Created a 500 kcal deficit for ~0.5kg/week loss.' : profile.goalType === 'HYPERTROPHY' ? 'Added 300 kcal surplus to support muscle growth.' : 'Maintenance calories adjusted for your goal.'} Protein set at ${macros.proteinG}g (${Math.round(macros.proteinG / profile.weightKg * 10) / 10}g/kg) to maximize muscle retention.`,
      },
    });

    return plan;
  }

  async getActivePlan(userId: string) {
    const plan = await this.prisma.nutritionPlan.findFirst({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!plan) return this.generateNutritionPlan(userId);
    return plan;
  }

  async logMeal(userId: string, data: {
    date: Date;
    mealType: string;
    foodItemId: string;
    servings: number;
    notes?: string;
  }) {
    return this.prisma.mealLog.create({
      data: { userId, ...data, mealType: data.mealType as any, date: new Date(data.date) },
      include: { foodItem: true },
    });
  }

  async getDailyLog(userId: string, date: string) {
    const targetDate = new Date(date);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const [logs, plan] = await Promise.all([
      this.prisma.mealLog.findMany({
        where: { userId, date: { gte: targetDate, lt: nextDay } },
        include: { foodItem: true },
        orderBy: { loggedAt: 'asc' },
      }),
      this.getActivePlan(userId),
    ]);

    const totals = logs.reduce(
      (acc, log) => {
        const multiplier = log.servings;
        return {
          calories: acc.calories + log.foodItem.calories * multiplier,
          proteinG: acc.proteinG + log.foodItem.proteinG * multiplier,
          carbsG: acc.carbsG + log.foodItem.carbsG * multiplier,
          fatG: acc.fatG + log.foodItem.fatG * multiplier,
        };
      },
      { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    );

    return {
      date,
      logs,
      totals: {
        calories: { consumed: Math.round(totals.calories), target: plan.dailyCalories },
        protein: { consumed: Math.round(totals.proteinG), target: plan.proteinG },
        carbs: { consumed: Math.round(totals.carbsG), target: plan.carbsG },
        fat: { consumed: Math.round(totals.fatG), target: plan.fatG },
      },
    };
  }

  async weeklyCheck(userId: string) {
    const plan = await this.getActivePlan(userId);
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [recentWeight, prevWeight] = await Promise.all([
      this.prisma.bodyMeasurement.findFirst({
        where: { userId, date: { gte: weekAgo } },
        orderBy: { date: 'desc' },
      }),
      this.prisma.bodyMeasurement.findFirst({
        where: { userId, date: { gte: twoWeeksAgo, lt: weekAgo } },
        orderBy: { date: 'desc' },
      }),
    ]);

    if (!recentWeight || !prevWeight) {
      return { message: 'Not enough data yet. Log your weight daily for accurate weekly check-ins.' };
    }

    const weightChange = recentWeight.weightKg - prevWeight.weightKg;
    let newCalories = plan.dailyCalories;
    let actionTaken = 'No adjustment needed';
    let aiNotes = '';

    if (profile.goalType === 'WEIGHT_LOSS') {
      if (weightChange > -0.2) {
        newCalories = plan.dailyCalories - 150;
        actionTaken = `Reduced calories by 150 kcal (${plan.dailyCalories} → ${newCalories})`;
        aiNotes = `You lost only ${Math.abs(weightChange).toFixed(2)}kg this week (target: 0.5kg). I've reduced your calories by 150 kcal to get back on track.`;
      } else if (weightChange < -0.8) {
        newCalories = plan.dailyCalories + 100;
        actionTaken = `Increased calories by 100 kcal (${plan.dailyCalories} → ${newCalories})`;
        aiNotes = `You lost ${Math.abs(weightChange).toFixed(2)}kg this week — faster than optimal. I've increased calories slightly to protect muscle mass.`;
      } else {
        aiNotes = `You lost ${Math.abs(weightChange).toFixed(2)}kg this week. Perfect progress — keep it up!`;
      }
    } else if (profile.goalType === 'HYPERTROPHY') {
      if (weightChange < 0.1) {
        newCalories = plan.dailyCalories + 150;
        actionTaken = `Increased calories by 150 kcal (${plan.dailyCalories} → ${newCalories})`;
        aiNotes = `Weight gain of ${weightChange.toFixed(2)}kg is below target. Added 150 kcal to better support muscle growth.`;
      } else {
        aiNotes = `Gained ${weightChange.toFixed(2)}kg this week. Consistent growth phase — monitor body composition monthly.`;
      }
    }

    if (newCalories !== plan.dailyCalories) {
      const newMacros = this.calculateMacros(newCalories, plan.goalType, profile.weightKg);
      await this.prisma.nutritionPlan.update({
        where: { id: plan.id },
        data: { dailyCalories: newCalories, ...newMacros },
      });
    }

    const check = await this.prisma.weeklyNutritionCheck.create({
      data: {
        userId,
        planId: plan.id,
        weekStart: weekAgo,
        avgDailyCalories: plan.dailyCalories,
        weightChange,
        actionTaken,
        newCalories: newCalories !== plan.dailyCalories ? newCalories : undefined,
        aiNotes,
      },
    });

    return { check, aiNotes, actionTaken, newCalories };
  }

  async searchFoodItems(query: string, limit = 20) {
    return this.prisma.foodItem.findMany({
      where: { name: { contains: query, mode: 'insensitive' } },
      take: limit,
    });
  }
}
