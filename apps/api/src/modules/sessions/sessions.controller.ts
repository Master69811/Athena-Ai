import { Controller, Post, Get, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a workout session' })
  async start(@CurrentUser('id') userId: string, @Body() data: any) {
    return this.sessionsService.startSession(userId, data);
  }

  @Post(':id/sets')
  @ApiOperation({ summary: 'Log a set in the active session' })
  async logSet(@CurrentUser('id') userId: string, @Param('id') sessionId: string, @Body() data: any) {
    return this.sessionsService.logSet(userId, sessionId, data);
  }

  @Put(':id/complete')
  @ApiOperation({ summary: 'Complete a workout session' })
  async complete(@CurrentUser('id') userId: string, @Param('id') sessionId: string, @Body() data: any) {
    return this.sessionsService.completeSession(userId, sessionId, data);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active (uncompleted) session' })
  async getActive(@CurrentUser('id') userId: string) {
    return this.sessionsService.getActiveSession(userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get session history' })
  async getAll(@CurrentUser('id') userId: string, @Query('limit') limit?: number, @Query('offset') offset?: number) {
    return this.sessionsService.getSessions(userId, limit, offset);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get specific session' })
  async getOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.sessionsService.getSession(userId, id);
  }
}
