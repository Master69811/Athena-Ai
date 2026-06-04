import { Module } from '@nestjs/common';
import { TrainerService } from './trainer.service';

@Module({
  providers: [TrainerService],
  exports: [TrainerService],
})
export class TrainerModule {}
