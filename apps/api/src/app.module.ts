import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ExercisesModule } from './modules/exercises/exercises.module';
import { WorkoutPlansModule } from './modules/workout-plans/workout-plans.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { NutritionModule } from './modules/nutrition/nutrition.module';
import { RecoveryModule } from './modules/recovery/recovery.module';
import { AiCoachModule } from './modules/ai-coach/ai-coach.module';
import { AiWorkoutModule } from './modules/ai-workout/ai-workout.module';
import { ProgressModule } from './modules/progress/progress.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { TrainerModule } from './modules/trainer/trainer.module';
import { ProgressionModule } from './modules/progression/progression.module';
import { ProgramEngineModule } from './modules/program-engine/program-engine.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { BodyWeightEngineModule } from './modules/body-weight-engine/body-weight-engine.module';
import { NutritionEngineModule } from './modules/nutrition-engine/nutrition-engine.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { RagModule } from './modules/rag/rag.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    RagModule,
    AuthModule,
    UsersModule,
    ExercisesModule,
    WorkoutPlansModule,
    SessionsModule,
    NutritionModule,
    RecoveryModule,
    AiCoachModule,
    AiWorkoutModule,
    ProgressModule,
    GamificationModule,
    SubscriptionsModule,
    TrainerModule,
    ProgressionModule,
    ProgramEngineModule,
    AnalyticsModule,
    BodyWeightEngineModule,
    NutritionEngineModule,
  ],
})
export class AppModule {}
