import { Controller, Post, Get, Body, Req, Headers, UseGuards, RawBodyRequest } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Stripe checkout session' })
  async checkout(@CurrentUser('id') userId: string, @Body() body: { tier: 'PRO' | 'PREMIUM' | 'COACH' }) {
    return this.subscriptionsService.createCheckoutSession(userId, body.tier);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook handler' })
  async webhook(@Headers('stripe-signature') signature: string, @Req() req: RawBodyRequest<Request>) {
    return this.subscriptionsService.handleWebhook(signature, req.rawBody);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current subscription' })
  async getSubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getSubscription(userId);
  }
}
