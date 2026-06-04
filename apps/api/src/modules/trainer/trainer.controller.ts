import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TrainerService } from './trainer.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('trainer')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('trainer')
export class TrainerController {
  constructor(private readonly trainerService: TrainerService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get trainer dashboard stats' })
  async dashboard(@CurrentUser('id') trainerId: string) {
    return this.trainerService.getDashboardStats(trainerId);
  }

  @Get('clients')
  @ApiOperation({ summary: 'Get all clients' })
  async clients(@CurrentUser('id') trainerId: string) {
    return this.trainerService.getClients(trainerId);
  }

  @Get('clients/:clientId')
  @ApiOperation({ summary: 'Get client detail' })
  async clientDetail(@CurrentUser('id') trainerId: string, @Param('clientId') clientId: string) {
    return this.trainerService.getClientDetail(trainerId, clientId);
  }

  @Post('clients')
  @ApiOperation({ summary: 'Add a client by email' })
  async addClient(@CurrentUser('id') trainerId: string, @Body() body: { email: string }) {
    return this.trainerService.addClient(trainerId, body.email);
  }

  @Put('clients/:clientId/status')
  @ApiOperation({ summary: 'Update client status' })
  async updateStatus(@CurrentUser('id') trainerId: string, @Param('clientId') clientId: string, @Body() body: { status: any }) {
    return this.trainerService.updateClientStatus(trainerId, clientId, body.status);
  }
}
