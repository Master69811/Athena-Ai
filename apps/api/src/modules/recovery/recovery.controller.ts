import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecoveryService } from './recovery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SyncHealthKitDto } from './dto/sync-healthkit.dto';

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

  @Post('sync/healthkit')
  @ApiOperation({ summary: 'Sync recovery data from Apple Health / Apple Watch (native iOS app)' })
  async syncHealthKit(@CurrentUser('id') userId: string, @Body() data: SyncHealthKitDto) {
    return this.recoveryService.syncFromHealthKit(userId, data);
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

  @Get('snapshot')
  @ApiOperation({ summary: 'Get latest recovery engine snapshot (7-day context)' })
  async getSnapshot(@CurrentUser('id') userId: string) {
    return this.recoveryService.getLatestSnapshot(userId);
  }

  @Get('readiness')
  @ApiOperation({ summary: "Get today's training readiness and recovery-based workout adaptation" })
  async getReadiness(@CurrentUser('id') userId: string) {
    return this.recoveryService.getTrainingReadiness(userId);
  }
}
