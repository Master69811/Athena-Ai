import { Module } from '@nestjs/common';
import { BodyWeightEngineController } from './body-weight-engine.controller';
import { BodyWeightEngineService } from './body-weight-engine.service';

@Module({
  controllers: [BodyWeightEngineController],
  providers: [BodyWeightEngineService],
  exports: [BodyWeightEngineService],
})
export class BodyWeightEngineModule {}
