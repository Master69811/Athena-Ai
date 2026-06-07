import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';
import { TrainingMethodology, GoalType, ExperienceLevel } from '@prisma/client';

@Injectable()
export class AiWorkoutService {
  private genAI: GoogleGenerativeAI;

  constructor(private prisma: PrismaService, private configService: ConfigService) {
    this.genAI = new GoogleGenerativeAI(this.configService.get('GEMINI_API_KEY', ''));
  }

  private getModel() {
    return this.genAI.getGenerativeModel({
      model: this.configService.get('GEMINI_MODEL', 'gemini-2.0-flash'),
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
      ],
    });
  }

  async generateWorkoutPlan(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found. Complete onboarding first.');

    const exercises = await this.prisma.exercise.findMany({
      where: { isActive: true },
      take: 100,
    });

    const systemInstruction = `You are Athena, the world's best AI personal trainer and strength coach. You combine the knowledge of the top coaches including Renaissance Periodization, Project Invictus, Jim Wendler, and elite sports science researchers.

You generate COMPLETE, DETAILED, PERSONALIZED workout programs that are:
- Scientifically evidence-based
- Perfectly calibrated to the user's profile
- Immediately executable
- Include precise sets, reps, RPE targets, rest periods
- Include AI reasoning for every decision

Always respond with VALID JSON only, no markdown, no explanations outside the JSON.`;

    const userPrompt = `Generate a complete ${profile.trainingDaysPerWeek}-day workout program for this athlete:

PROFILE:
- Name: ${profile.name}
- Age: ${profile.age}, Gender: ${profile.gender}
- Weight: ${profile.weightKg}kg, Height: ${profile.heightCm}cm
- Body Fat: ${profile.bodyFatPercentage || 'Unknown'}%
- Goal: ${profile.goalType}
- Experience: ${profile.experienceLevel}
- Training Days/Week: ${profile.trainingDaysPerWeek}
- Session Duration: ${profile.sessionDurationMinutes} minutes
- Has Gym: ${profile.hasGym}
- Equipment: ${profile.equipment.join(', ')}
- Injuries/Limitations: ${profile.injuries.length > 0 ? profile.injuries.join(', ') : 'None'}
- Methodology: ${profile.methodology}
- Sleep: ${profile.sleepHoursAvg}h avg, Stress Level: ${profile.stressLevel}/10

AVAILABLE EXERCISES (use IDs from this list):
${exercises.slice(0, 50).map(e => `- ID: ${e.id}, Name: ${e.name}, Category: ${e.category}, Muscles: ${e.muscleGroups.join(', ')}`).join('\n')}

Generate a complete ${profile.trainingDaysPerWeek}-day program. Return ONLY this JSON structure:

{
  "planName": "string",
  "description": "string",
  "splitType": "PUSH_PULL_LEGS|UPPER_LOWER|FULL_BODY|BROSPLIT|CUSTOM",
  "durationWeeks": 12,
  "aiReasoning": "Detailed explanation of every major programming decision (3-5 sentences)",
  "days": [
    {
      "dayIndex": 0,
      "name": "Day name (e.g. Push - Chest/Shoulders/Triceps)",
      "muscleGroups": ["CHEST", "SHOULDERS"],
      "notes": "Day-specific coaching notes",
      "exercises": [
        {
          "exerciseId": "use real exercise ID from list above or null for generic",
          "exerciseName": "Exercise name",
          "order": 1,
          "sets": 4,
          "repsMin": 6,
          "repsMax": 10,
          "rpeTarget": 8,
          "rirTarget": 2,
          "restSeconds": 180,
          "notes": "Coaching cue for this exercise",
          "supersetGroup": null
        }
      ]
    }
  ]
}`;

    const model = this.getModel();
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction,
      generationConfig: { maxOutputTokens: 8192, temperature: 0.7 },
    });

    const content = result.response.text();

    let planData: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in response');
      planData = JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error('Failed to parse AI workout plan. Please try again.');
    }

    await this.prisma.workoutPlan.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    const plan = await this.prisma.workoutPlan.create({
      data: {
        userId,
        name: planData.planName,
        description: planData.description,
        methodology: profile.methodology,
        splitType: planData.splitType || 'CUSTOM',
        goal: profile.goalType,
        daysPerWeek: profile.trainingDaysPerWeek,
        durationWeeks: planData.durationWeeks || 12,
        isActive: true,
        isAIGenerated: true,
        aiReasoning: planData.aiReasoning,
        days: {
          create: planData.days.map((day: any) => ({
            dayIndex: day.dayIndex,
            name: day.name,
            muscleGroups: day.muscleGroups || [],
            notes: day.notes,
            exercises: {
              create: day.exercises.map((ex: any, idx: number) => ({
                exerciseId: exercises.find(e => e.id === ex.exerciseId)?.id || exercises[idx % exercises.length].id,
                order: ex.order || idx + 1,
                sets: ex.sets || 3,
                repsMin: ex.repsMin || 8,
                repsMax: ex.repsMax || 12,
                rpeTarget: ex.rpeTarget,
                rirTarget: ex.rirTarget,
                restSeconds: ex.restSeconds || 90,
                notes: ex.notes,
                supersetGroup: ex.supersetGroup,
              })),
            },
          })),
        },
      },
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

    return plan;
  }

  async getRealtimeSetRecommendation(params: {
    userId: string;
    exerciseId: string;
    previousSets: Array<{ weightKg: number; reps: number; rpe: number }>;
    targetSets: number;
    targetRepsMin: number;
    targetRepsMax: number;
    targetRpe: number;
  }) {
    const { previousSets, targetRpe, targetRepsMin, targetRepsMax } = params;

    if (previousSets.length === 0) {
      return { recommendation: 'Start with your planned weight', adjustedWeight: null, adjustedReps: null };
    }

    const lastSet = previousSets[previousSets.length - 1];
    const rpeDiff = lastSet.rpe - targetRpe;

    let weightAdjustment = 0;
    let recommendation = '';

    if (rpeDiff >= 2) {
      weightAdjustment = -2.5;
      recommendation = `Ultima serie a RPE ${lastSet.rpe} (target: ${targetRpe}). Riduci il carico di 2.5kg per restare nella zona giusta.`;
    } else if (rpeDiff <= -1 && lastSet.reps >= targetRepsMax) {
      weightAdjustment = 2.5;
      recommendation = `Ottimo! RPE ${lastSet.rpe} con ${lastSet.reps} rip. Aumenta il carico di 2.5kg.`;
    } else if (lastSet.reps < targetRepsMin) {
      weightAdjustment = -2.5;
      recommendation = `Hai fatto ${lastSet.reps} rip (target: ${targetRepsMin}-${targetRepsMax}). Riduci il carico leggermente.`;
    } else {
      recommendation = `Ottima esecuzione a RPE ${lastSet.rpe} con ${lastSet.reps} rip. Mantieni il carico attuale.`;
    }

    const suggestedWeight = Math.max(0, lastSet.weightKg + weightAdjustment);

    return {
      recommendation,
      adjustedWeight: weightAdjustment !== 0 ? suggestedWeight : null,
      adjustedReps: null,
      reasoning: `Basato sulle ultime ${previousSets.length} serie e target RPE ${targetRpe}.`,
    };
  }
}
