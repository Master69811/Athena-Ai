import { Module } from '@nestjs/common';
import { ProgramEngineController } from './program-engine.controller';
import { ProgramAdjustmentService } from './program-engine.service';
import { RecoveryModule } from '../recovery/recovery.module';

@Module({
  imports: [RecoveryModule],
  controllers: [ProgramEngineController],
  providers: [ProgramAdjustmentService],
  exports: [ProgramAdjustmentService],
})
export class ProgramEngineModule {}
