import { Module } from '@nestjs/common';
import { AiWorkoutController } from './ai-workout.controller';
import { AiWorkoutService } from './ai-workout.service';
import { AiRateLimitGuard } from '../../common/guards/ai-rate-limit.guard';

@Module({
  controllers: [AiWorkoutController],
  providers: [AiWorkoutService, AiRateLimitGuard],
  exports: [AiWorkoutService],
})
export class AiWorkoutModule {}
