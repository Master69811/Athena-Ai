import { Module } from '@nestjs/common';
import { NutritionEngineController } from './nutrition-engine.controller';
import { NutritionEngineService } from './nutrition-engine.service';
import { RecoveryModule } from '../recovery/recovery.module';
import { BodyWeightEngineModule } from '../body-weight-engine/body-weight-engine.module';
import { NutritionModule } from '../nutrition/nutrition.module';

@Module({
  imports: [RecoveryModule, BodyWeightEngineModule, NutritionModule],
  controllers: [NutritionEngineController],
  providers: [NutritionEngineService],
  exports: [NutritionEngineService],
})
export class NutritionEngineModule {}
