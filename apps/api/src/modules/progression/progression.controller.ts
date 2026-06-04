import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProgressionService } from './progression.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('progression')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('progression')
export class ProgressionController {
  constructor(private readonly progressionService: ProgressionService) {}

  @Get('history')
  @ApiOperation({ summary: 'Get AI progression decisions history' })
  async getHistory(@CurrentUser('id') userId: string, @Query('limit') limit?: number) {
    return this.progressionService.getProgressionHistory(userId, limit);
  }

  @Post('run')
  @ApiOperation({ summary: 'Manually trigger progression analysis' })
  async runProgression(@CurrentUser('id') userId: string) {
    return this.progressionService.triggerManualProgression(userId);
  }
}
