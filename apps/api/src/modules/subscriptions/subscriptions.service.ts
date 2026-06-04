import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionTier } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  private stripe: Stripe;
  private readonly logger = new Logger(SubscriptionsService.name);

  private readonly PLANS = {
    PRO: { price: 14.99, priceIdEnv: 'STRIPE_PRO_PRICE_ID' },
    PREMIUM: { price: 29.99, priceIdEnv: 'STRIPE_PREMIUM_PRICE_ID' },
    COACH: { price: 79.99, priceIdEnv: 'STRIPE_COACH_PRICE_ID' },
  };

  constructor(private prisma: PrismaService, private config: ConfigService) {
    const key = this.config.get('STRIPE_SECRET_KEY');
    if (key) this.stripe = new Stripe(key, { apiVersion: '2024-04-10' as any });
  }

  async createCheckoutSession(userId: string, tier: 'PRO' | 'PREMIUM' | 'COACH') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const plan = this.PLANS[tier];
    const priceId = this.config.get(plan.priceIdEnv);
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/settings?success=true`,
      cancel_url: `${frontendUrl}/settings?canceled=true`,
      metadata: { userId, tier },
    });

    return { url: session.url, sessionId: session.id };
  }

  async handleWebhook(signature: string, payload: Buffer) {
    const webhookSecret = this.config.get('STRIPE_WEBHOOK_SECRET');
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new Error('Invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.activateSubscription(session.metadata.userId, session.metadata.tier as SubscriptionTier, session.subscription as string);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.cancelSubscription(sub.id);
        break;
      }
    }

    return { received: true };
  }

  private async activateSubscription(userId: string, tier: SubscriptionTier, stripeSubscriptionId: string) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { subscriptionTier: tier } }),
      this.prisma.subscription.upsert({
        where: { userId },
        update: { tier, stripeSubscriptionId, status: 'ACTIVE', currentPeriodStart: now, currentPeriodEnd: periodEnd },
        create: { userId, tier, stripeSubscriptionId, status: 'ACTIVE', currentPeriodStart: now, currentPeriodEnd: periodEnd },
      }),
    ]);

    this.logger.log(`Activated ${tier} subscription for user ${userId}`);
  }

  private async cancelSubscription(stripeSubscriptionId: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { stripeSubscriptionId } });
    if (!sub) return;

    await this.prisma.$transaction([
      this.prisma.subscription.update({ where: { id: sub.id }, data: { status: 'CANCELED', cancelAtPeriodEnd: true } }),
      this.prisma.user.update({ where: { id: sub.userId }, data: { subscriptionTier: 'FREE' } }),
    ]);
  }

  async getSubscription(userId: string) {
    return this.prisma.subscription.findUnique({ where: { userId } });
  }
}
