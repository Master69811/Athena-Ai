import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NutritionService } from './nutrition.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('nutrition')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('nutrition')
export class NutritionController {
  constructor(private readonly nutritionService: NutritionService) {}

  @Get('plan')
  @ApiOperation({ summary: 'Get active nutrition plan' })
  async getPlan(@CurrentUser('id') userId: string) {
    return this.nutritionService.getActivePlan(userId);
  }

  @Post('plan/generate')
  @ApiOperation({ summary: 'Generate AI nutrition plan' })
  async generatePlan(@CurrentUser('id') userId: string) {
    return this.nutritionService.generateNutritionPlan(userId);
  }

  @Post('log')
  @ApiOperation({ summary: 'Log a meal' })
  async logMeal(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.nutritionService.logMeal(userId, data);
  }

  @Get('log/daily')
  @ApiOperation({ summary: 'Get daily nutrition log' })
  async getDailyLog(@CurrentUser('id') userId: string, @Query('date') date: string) {
    return this.nutritionService.getDailyLog(userId, date || new Date().toISOString().split('T')[0]);
  }

  @Post('weekly-check')
  @ApiOperation({ summary: 'Run weekly nutrition check-in' })
  async weeklyCheck(@CurrentUser('id') userId: string) {
    return this.nutritionService.weeklyCheck(userId);
  }

  @Get('food/search')
  @ApiOperation({ summary: 'Search food items' })
  async searchFood(@Query('q') query: string, @Query('limit') limit?: number) {
    return this.nutritionService.searchFoodItems(query, limit);
  }
}
