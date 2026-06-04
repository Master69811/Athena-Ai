import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('volume/muscle-groups')
  @ApiOperation({ summary: 'Volume distribution by muscle group' })
  async volumeByMuscle(@CurrentUser('id') userId: string, @Query('weeks') weeks?: number) {
    return this.analyticsService.getVolumeByMuscleGroup(userId, weeks);
  }

  @Get('volume/trend')
  @ApiOperation({ summary: 'Weekly volume trend' })
  async volumeTrend(@CurrentUser('id') userId: string, @Query('weeks') weeks?: number) {
    return this.analyticsService.getWeeklyVolumeTrend(userId, weeks);
  }

  @Get('strength/:exerciseId')
  @ApiOperation({ summary: 'Strength progression for an exercise' })
  async strength(@CurrentUser('id') userId: string, @Param('exerciseId') exerciseId: string) {
    return this.analyticsService.getStrengthProgress(userId, exerciseId);
  }

  @Get('frequency')
  @ApiOperation({ summary: 'Training frequency by day of week' })
  async frequency(@CurrentUser('id') userId: string, @Query('weeks') weeks?: number) {
    return this.analyticsService.getTrainingFrequency(userId, weeks);
  }
}
