import { Controller, Get, Put, Post, Body, UseGuards, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto, CompleteOnboardingDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard stats' })
  async getDashboard(@CurrentUser('id') userId: string) {
    return this.usersService.getDashboardStats(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@CurrentUser('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Post('onboarding')
  @ApiOperation({ summary: 'Complete onboarding' })
  async completeOnboarding(@CurrentUser('id') userId: string, @Body() dto: CompleteOnboardingDto) {
    return this.usersService.completeOnboarding(userId, dto);
  }

  @Post('measurements')
  @ApiOperation({ summary: 'Add body measurement' })
  async addMeasurement(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.usersService.addBodyMeasurement(userId, data);
  }

  @Get('measurements')
  @ApiOperation({ summary: 'Get body measurements history' })
  async getMeasurements(@CurrentUser('id') userId: string, @Query('limit') limit?: number) {
    return this.usersService.getBodyMeasurements(userId, limit);
  }
}
