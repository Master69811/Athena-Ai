import { Controller, Post, Get, Body, Param, UseGuards, Query, SetMetadata, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AiCoachService } from './ai-coach.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiRateLimitGuard, AI_TYPE_KEY } from '../../common/guards/ai-rate-limit.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('ai-coach')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai-coach')
export class AiCoachController {
  constructor(private readonly aiCoachService: AiCoachService) {}

  @Post('chat')
  @SetMetadata(AI_TYPE_KEY, 'chat')
  @UseGuards(AiRateLimitGuard)
  @ApiOperation({ summary: 'Send message to AI coach (non-streaming)' })
  async chat(
    @CurrentUser('id') userId: string,
    @Body() body: { message: string; conversationId?: string },
  ) {
    return this.aiCoachService.chat(userId, body.conversationId, body.message);
  }

  @Post('chat/stream')
  @SetMetadata(AI_TYPE_KEY, 'chat')
  @UseGuards(AiRateLimitGuard)
  @ApiOperation({ summary: 'Send message to AI coach (streaming SSE)' })
  async chatStream(
    @CurrentUser('id') userId: string,
    @Body() body: { message: string; conversationId?: string },
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    try {
      const stream = this.aiCoachService.chatStream(userId, body.conversationId, body.message);
      for await (const chunk of stream) {
        res.write('data: ' + JSON.stringify(chunk) + '\n\n');
      }
    } catch (err) {
      res.write('data: ' + JSON.stringify({ error: 'Stream error', done: true }) + '\n\n');
    } finally {
      res.end();
    }
  }

  @Get('conversations')
  @ApiOperation({ summary: 'Get conversation history' })
  async getConversations(@CurrentUser('id') userId: string) {
    return this.aiCoachService.getConversations(userId);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get single conversation' })
  async getConversation(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.aiCoachService.getConversation(userId, id);
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get suggested questions' })
  async getSuggestions(@CurrentUser() user: any) {
    return this.aiCoachService.getSuggestedQuestions(user.profile);
  }
}
