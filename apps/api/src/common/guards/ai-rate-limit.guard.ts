import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../modules/prisma/prisma.service';

export const AI_TYPE_KEY = 'ai_type';

export type AiType = 'workout' | 'chat';

const FREE_LIMITS: Record<AiType, number> = {
  workout: 3,
  chat: 10,
};

@Injectable()
export class AiRateLimitGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private reflector: Reflector,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const disabled = this.configService?.get('DISABLE_AI_RATE_LIMIT') === 'true';
    if (disabled) return true;

    const type = this.reflector.get<AiType>(AI_TYPE_KEY, context.getHandler());
    if (!type) return true;

    const user = context.switchToHttp().getRequest().user;
    if (!user) return true;

    if (user.subscriptionTier !== 'FREE') return true;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const limit = FREE_LIMITS[type];

    if (type === 'workout') {
      const count = await this.prisma.workoutPlan.count({
        where: { userId: user.id, isAIGenerated: true, createdAt: { gte: startOfMonth } },
      });
      if (count >= limit) {
        throw new ForbiddenException(
          'Piano Free: limite di ' + limit + ' generazioni AI/mese raggiunto.',
        );
      }
    } else if (type === 'chat') {
      const count = await this.prisma.aIMessage.count({
        where: { conversation: { userId: user.id }, role: 'USER', createdAt: { gte: startOfMonth } },
      });
      if (count >= limit) {
        throw new ForbiddenException(
          'Piano Free: limite di ' + limit + ' messaggi AI/mese raggiunto.',
        );
      }
    }

    return true;
  }
}
