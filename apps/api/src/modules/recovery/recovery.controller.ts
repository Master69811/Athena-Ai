import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecoveryService } from './recovery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('recovery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('recovery')
export class RecoveryController {
  constructor(private readonly recoveryService: RecoveryService) {}

  @Post('log')
  @ApiOperation({ summary: 'Log daily recovery data' })
  async log(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.recoveryService.logRecovery(userId, data);
  }

  @Get('latest')
  @ApiOperation({ summary: 'Get latest recovery score' })
  async getLatest(@CurrentUser('id') userId: string) {
    return this.recoveryService.getLatestRecovery(userId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get recovery history' })
  async getHistory(@CurrentUser('id') userId: string, @Query('days') days?: number) {
    return this.recoveryService.getRecoveryHistory(userId, days);
  }
}
