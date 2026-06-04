import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExercisesService } from './exercises.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('exercises')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('exercises')
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  @ApiOperation({ summary: 'Get exercises with filters' })
  async findAll(@Query() query: any) {
    return this.exercisesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get exercise by ID' })
  async findOne(@Param('id') id: string) {
    return this.exercisesService.findById(id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get user history for an exercise' })
  async getHistory(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.exercisesService.getUserHistory(userId, id);
  }
}
