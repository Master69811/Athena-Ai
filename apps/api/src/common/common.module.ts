import { Module } from '@nestjs/common';
import { RateLimitService } from './services/rate-limit.service';
import { TokenBlacklistService } from './services/token-blacklist.service';

// Nest invokes onModuleInit on providers automatically — do NOT call the
// hooks manually here, or each service ends up with two sweep intervals.
@Module({
  providers: [RateLimitService, TokenBlacklistService],
  exports: [RateLimitService, TokenBlacklistService],
})
export class CommonModule {}
