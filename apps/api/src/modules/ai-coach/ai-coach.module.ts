import { Module } from '@nestjs/common';
import { AiCoachController } from './ai-coach.controller';
import { AiCoachService } from './ai-coach.service';
import { AiRateLimitGuard } from '../../common/guards/ai-rate-limit.guard';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [RagModule],
  controllers: [AiCoachController],
  providers: [AiCoachService, AiRateLimitGuard],
  exports: [AiCoachService],
})
export class AiCoachModule {}
