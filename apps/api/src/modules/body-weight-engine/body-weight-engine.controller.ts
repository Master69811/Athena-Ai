import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BodyWeightEngineService } from './body-weight-engine.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('body-weight')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('body-weight')
export class BodyWeightEngineController {
  constructor(private readonly bodyWeightEngine: BodyWeightEngineService) {}

  @Post('log')
  @ApiOperation({ summary: 'Log daily body weight' })
  async log(
    @CurrentUser('id') userId: string,
    @Body() data: { date: string; weightKg: number; notes?: string },
  ) {
    return this.bodyWeightEngine.logWeight(userId, data);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get weight history' })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('days') days?: number,
  ) {
    return this.bodyWeightEngine.getWeightHistory(userId, days ? +days : 30);
  }

  @Get('snapshot')
  @ApiOperation({ summary: 'Get latest weight engine snapshot (MA, rate, predictions)' })
  async getSnapshot(@CurrentUser('id') userId: string) {
    return this.bodyWeightEngine.getLatestSnapshot(userId);
  }
}
