import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProgramAdjustmentService } from './program-engine.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('program-engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('program-engine')
export class ProgramEngineController {
  constructor(private readonly engine: ProgramAdjustmentService) {}

  @Post('apply')
  @ApiOperation({ summary: 'Apply all pending progression decisions to active plan' })
  async apply(@CurrentUser('id') userId: string, @Query('planId') planId?: string) {
    return this.engine.applyPendingDecisions(userId, planId);
  }

  @Get('history/:planId')
  @ApiOperation({ summary: 'Get full adjustment audit log for a plan' })
  async getHistory(@CurrentUser('id') userId: string, @Param('planId') planId: string) {
    return this.engine.getAdjustmentHistory(userId, planId);
  }

  @Get('versions/:planId')
  @ApiOperation({ summary: 'List all saved program versions for a plan' })
  async getVersions(@CurrentUser('id') userId: string, @Param('planId') planId: string) {
    return this.engine.getPlanVersions(userId, planId);
  }

  @Post('revert/:adjustmentId')
  @ApiOperation({ summary: 'Revert a single adjustment atomically' })
  async revert(@CurrentUser('id') userId: string, @Param('adjustmentId') adjustmentId: string) {
    return this.engine.revertAdjustment(userId, adjustmentId);
  }

  @Post('restore/:versionId')
  @ApiOperation({ summary: 'Restore plan to a previous version (full rollback)' })
  async restore(@CurrentUser('id') userId: string, @Param('versionId') versionId: string) {
    return this.engine.restoreVersion(userId, versionId);
  }
}
