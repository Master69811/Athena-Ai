import { Module } from '@nestjs/common';
import { ProgramEngineController } from './program-engine.controller';
import { ProgramAdjustmentService } from './program-engine.service';

@Module({
  controllers: [ProgramEngineController],
  providers: [ProgramAdjustmentService],
  exports: [ProgramAdjustmentService],
})
export class ProgramEngineModule {}
