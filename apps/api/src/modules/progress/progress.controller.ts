import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get progress overview' })
  async overview(@CurrentUser('id') userId: string) {
    return this.progressService.getOverview(userId);
  }

  @Get('predictions')
  @ApiOperation({ summary: 'Get AI weight predictions (4/12/24 weeks)' })
  async predictions(@CurrentUser('id') userId: string) {
    return this.progressService.getPredictions(userId);
  }

  @Get('photos')
  @ApiOperation({ summary: 'Get progress photos' })
  async photos(@CurrentUser('id') userId: string) {
    return this.progressService.getProgressPhotos(userId);
  }

  @Post('photos')
  @ApiOperation({ summary: 'Add progress photo' })
  async addPhoto(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.progressService.addProgressPhoto(userId, data);
  }
}
