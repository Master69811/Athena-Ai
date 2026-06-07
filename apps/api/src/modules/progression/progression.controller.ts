import { Controller, Get, Post, Put, Query, Param, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Get AI progression decisions history (legacy)' })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.progressionService.getProgressionHistory(userId, limit);
  }

  @Post('run')
  @ApiOperation({ summary: 'Manually trigger progression analysis' })
  async runProgression(@CurrentUser('id') userId: string) {
    return this.progressionService.triggerManualProgression(userId);
  }

  // ─── Insights ──────────────────────────────────────────────────────────────

  @Get('insights/unread-count')
  @ApiOperation({ summary: 'Get count of unread progression insights' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    return this.progressionService.getUnreadCount(userId);
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get AI progression insights with exercise detail' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async getInsights(
    @CurrentUser('id') userId: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.progressionService.getInsights(userId, limit, unreadOnly === 'true');
  }

  @Put('insights/:id/read')
  @ApiOperation({ summary: 'Mark a single insight as read' })
  async markRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.progressionService.markRead(userId, id);
  }

  @Put('insights/read-all')
  @ApiOperation({ summary: 'Mark all insights as read' })
  async markAllRead(@CurrentUser('id') userId: string) {
    return this.progressionService.markAllRead(userId);
  }
}
