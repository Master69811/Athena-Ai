import { Module } from '@nestjs/common';
import { AiWorkoutController } from './ai-workout.controller';
import { AiWorkoutService } from './ai-workout.service';

@Module({
  controllers: [AiWorkoutController],
  providers: [AiWorkoutService],
  exports: [AiWorkoutService],
})
export class AiWorkoutModule {}
