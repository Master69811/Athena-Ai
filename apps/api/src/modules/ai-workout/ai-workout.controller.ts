import { Controller, Post, Body, UseGuards, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiWorkoutService } from './ai-workout.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiRateLimitGuard, AI_TYPE_KEY } from '../../common/guards/ai-rate-limit.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('ai-workout')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai-workout')
export class AiWorkoutController {
  constructor(private readonly aiWorkoutService: AiWorkoutService) {}

  @Post('generate')
  @SetMetadata(AI_TYPE_KEY, 'workout')
  @UseGuards(AiRateLimitGuard)
  @ApiOperation({ summary: 'Generate AI workout plan' })
  async generate(@CurrentUser('id') userId: string) {
    return this.aiWorkoutService.generateWorkoutPlan(userId);
  }

  @Post('set-recommendation')
  @ApiOperation({ summary: 'Get real-time set recommendation during workout' })
  async setRecommendation(@CurrentUser('id') userId: string, @Body() body: any) {
    return this.aiWorkoutService.getRealtimeSetRecommendation({ userId, ...body });
  }
}
