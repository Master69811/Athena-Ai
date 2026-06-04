import { Controller, Get, Put, Delete, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkoutPlansService } from './workout-plans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('workout-plans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workout-plans')
export class WorkoutPlansController {
  constructor(private readonly workoutPlansService: WorkoutPlansService) {}

  @Get()
  async getAll(@CurrentUser('id') userId: string) {
    return this.workoutPlansService.getAll(userId);
  }

  @Get('active')
  async getActive(@CurrentUser('id') userId: string) {
    return this.workoutPlansService.getActivePlan(userId);
  }

  @Get(':id')
  async getOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.workoutPlansService.getById(userId, id);
  }

  @Put(':id/activate')
  async activate(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.workoutPlansService.activate(userId, id);
  }

  @Delete(':id')
  async delete(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.workoutPlansService.delete(userId, id);
  }
}
