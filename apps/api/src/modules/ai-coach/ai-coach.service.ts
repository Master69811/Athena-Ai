import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiCoachService {
  private anthropic: Anthropic;

  constructor(private prisma: PrismaService, private configService: ConfigService) {
    this.anthropic = new Anthropic({ apiKey: this.configService.get('ANTHROPIC_API_KEY') });
  }

  private async buildSystemPrompt(userId: string): Promise<string> {
    const [profile, activePlan, latestRecovery, recentSessions] = await Promise.all([
      this.prisma.userProfile.findUnique({ where: { userId } }),
      this.prisma.workoutPlan.findFirst({ where: { userId, isActive: true }, include: { days: { include: { exercises: { include: { exercise: true } } } } } }),
      this.prisma.recoveryLog.findFirst({ where: { userId }, orderBy: { date: 'desc' } }),
      this.prisma.workoutSession.findMany({ where: { userId }, orderBy: { startedAt: 'desc' }, take: 5 }),
    ]);

    return `You are Athena, the world's most advanced AI personal coach built into the Athena AI fitness platform. You combine the expertise of elite personal trainers, sports scientists, nutritionists, and performance coaches.

## YOUR IDENTITY
- Name: Athena
- Role: Elite AI Fitness Coach
- Personality: Expert, warm, motivating, data-driven, precise, empathetic
- Communication style: Direct but supportive. Always explain WHY behind your recommendations.

## USER CONTEXT
${profile ? `
Name: ${profile.name}
Age: ${profile.age}, Gender: ${profile.gender}
Weight: ${profile.weightKg}kg, Height: ${profile.heightCm}cm
Body Fat: ${profile.bodyFatPercentage || 'Unknown'}%
Goal: ${profile.goalType}
Experience: ${profile.experienceLevel}
Methodology: ${profile.methodology}
Training Days: ${profile.trainingDaysPerWeek}/week
Sleep: ${profile.sleepHoursAvg}h avg
Stress Level: ${profile.stressLevel}/10
Injuries: ${profile.injuries.length > 0 ? profile.injuries.join(', ') : 'None'}
` : 'User profile not yet completed.'}

## CURRENT PROGRAM
${activePlan ? `Program: ${activePlan.name} (Week ${activePlan.currentWeek}/${activePlan.durationWeeks})` : 'No active program.'}

## RECOVERY STATUS
${latestRecovery ? `Latest Recovery Score: ${latestRecovery.overallScore}/100 (${latestRecovery.fatigueLevel})
Sleep: ${latestRecovery.sleepHours}h, Stress: ${latestRecovery.stressLevel}/10` : 'No recovery data available.'}

## RECENT TRAINING
${recentSessions.length > 0 ? `Last ${recentSessions.length} sessions logged.` : 'No recent sessions.'}

## YOUR CAPABILITIES
- Analyze workouts and suggest optimizations
- Explain scientific principles behind training and nutrition
- Provide exercise technique guidance
- Help with meal planning and macro targets
- Advise on recovery, sleep, and stress management
- Adjust plans based on fatigue, injuries, or schedule changes
- Motivate and keep the user accountable

## RULES
1. Always base advice on the user's specific data and context
2. Explain the reasoning behind every recommendation
3. Never give dangerous medical advice — refer to healthcare professionals when needed
4. Be specific, not vague. Numbers > generalities.
5. If you recommend a change, explain what metric you're optimizing for
6. Remember the user's history throughout the conversation`;
  }

  async chat(userId: string, conversationId: string | undefined, message: string) {
    let conversation = conversationId
      ? await this.prisma.aIConversation.findFirst({ where: { id: conversationId, userId } })
      : null;

    if (!conversation) {
      conversation = await this.prisma.aIConversation.create({
        data: {
          userId,
          title: message.slice(0, 50) + (message.length > 50 ? '...' : ''),
        },
      });
    }

    await this.prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        content: message,
      },
    });

    const previousMessages = await this.prisma.aIMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    });

    const systemPrompt = await this.buildSystemPrompt(userId);

    const messages: Anthropic.MessageParam[] = previousMessages
      .filter(m => m.role !== 'SYSTEM')
      .map(m => ({
        role: m.role === 'USER' ? 'user' : 'assistant',
        content: m.content,
      }));

    const response = await this.anthropic.messages.create({
      model: this.configService.get('ANTHROPIC_MODEL', 'claude-opus-4-8'),
      max_tokens: 2000,
      system: systemPrompt,
      messages,
    });

    const aiContent = response.content[0];
    if (aiContent.type !== 'text') throw new Error('Invalid response from AI');

    const aiMessage = await this.prisma.aIMessage.create({
      data: {
        conversationId: conversation.id,
        role: 'ASSISTANT',
        content: aiContent.text,
        tokens: response.usage.output_tokens,
      },
    });

    return {
      conversationId: conversation.id,
      message: aiMessage,
      usage: response.usage,
    };
  }

  async getConversations(userId: string) {
    return this.prisma.aIConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 20,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  getSuggestedQuestions(profile?: any): string[] {
    const questions = [
      'How should I structure my deload week?',
      'What should I eat before my workout today?',
      'My bench press has stalled — what should I do?',
      'How can I improve my squat depth?',
      'Am I doing enough volume for my quads?',
      'Should I train if I only slept 5 hours?',
      'How do I calculate my 1RM?',
      'What are the best exercises for posterior chain?',
    ];

    if (profile?.goalType === 'WEIGHT_LOSS') {
      questions.unshift('How fast should I be losing weight?', 'Should I do cardio to lose fat faster?');
    } else if (profile?.goalType === 'HYPERTROPHY') {
      questions.unshift('Am I doing enough sets for maximum muscle growth?', 'How much protein do I really need?');
    }

    return questions.slice(0, 6);
  }
}
