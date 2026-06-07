import { Controller, Get, Post, Put, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NutritionEngineService } from './nutrition-engine.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('nutrition-engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('nutrition-engine')
export class NutritionEngineController {
  constructor(private readonly nutritionEngine: NutritionEngineService) {}

  @Post('run')
  @ApiOperation({ summary: 'Trigger nutrition engine analysis for current user' })
  async run(@CurrentUser('id') userId: string) {
    const decision = await this.nutritionEngine.generateAndSaveDecision(userId);
    return { generated: !!decision, decision };
  }

  @Get('decisions')
  @ApiOperation({ summary: 'List nutrition decisions' })
  async getDecisions(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.nutritionEngine.getDecisions(userId, {
      limit: limit ? +limit : undefined,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('decisions/unread-count')
  @ApiOperation({ summary: 'Get unread nutrition decision count' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    return this.nutritionEngine.getUnreadCount(userId);
  }

  @Put('decisions/:id/apply')
  @ApiOperation({ summary: 'Apply a nutrition decision to the active plan' })
  async applyDecision(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.nutritionEngine.applyDecision(userId, id);
  }

  @Put('decisions/:id/read')
  @ApiOperation({ summary: 'Mark a nutrition decision as read' })
  async markRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    await this.nutritionEngine.markRead(userId, id);
    return { ok: true };
  }

  @Put('decisions/read-all')
  @ApiOperation({ summary: 'Mark all nutrition decisions as read' })
  async markAllRead(@CurrentUser('id') userId: string) {
    await this.nutritionEngine.markAllRead(userId);
    return { ok: true };
  }

  @Get('compliance')
  @ApiOperation({ summary: 'Get weekly calorie compliance' })
  async getCompliance(@CurrentUser('id') userId: string) {
    return this.nutritionEngine.computeWeeklyCompliance(userId);
  }
}
