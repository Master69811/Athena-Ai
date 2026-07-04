import { Module, OnModuleInit } from '@nestjs/common';
import { RateLimitService } from './services/rate-limit.service';
import { TokenBlacklistService } from './services/token-blacklist.service';

@Module({
  providers: [RateLimitService, TokenBlacklistService],
  exports: [RateLimitService, TokenBlacklistService],
})
export class CommonModule implements OnModuleInit {
  constructor(
    private rateLimitService: RateLimitService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {}

  onModuleInit() {
    this.rateLimitService.onModuleInit();
    this.tokenBlacklistService.onModuleInit();
  }
}
