import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GamificationService } from './gamification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('gamification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('gamification')
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('achievements')
  @ApiOperation({ summary: 'Get user achievements and progress' })
  async getAchievements(@CurrentUser('id') userId: string) {
    return this.gamificationService.getUserAchievements(userId);
  }

  @Get('streaks')
  @ApiOperation({ summary: 'Get user streaks' })
  async getStreaks(@CurrentUser('id') userId: string) {
    return this.gamificationService.getStreaks(userId);
  }

  @Post('check')
  @ApiOperation({ summary: 'Check and award new achievements' })
  async check(@CurrentUser('id') userId: string) {
    const awarded = await this.gamificationService.checkAndAwardAchievements(userId);
    return { awarded };
  }
}
