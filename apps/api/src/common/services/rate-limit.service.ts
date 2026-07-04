import { Injectable, Logger } from '@nestjs/common';

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

interface RateLimitEntry {
  count: number;
  expiresAt: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private store = new Map<string, RateLimitEntry>();

  async checkLoginAttempt(identifier: string): Promise<{ allowed: boolean; remaining: number }> {
    const key = `ratelimit:login:${identifier}`;
    const now = Date.now();
    let entry = this.store.get(key);

    if (!entry || entry.expiresAt < now) {
      entry = { count: 0, expiresAt: now + RATE_LIMIT_WINDOW_MS };
      this.store.set(key, entry);
    }

    if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
      return { allowed: false, remaining: 0 };
    }

    entry.count++;
    const remaining = RATE_LIMIT_MAX_ATTEMPTS - entry.count;
    return { allowed: true, remaining };
  }

  async resetLoginAttempts(identifier: string): Promise<void> {
    const key = `ratelimit:login:${identifier}`;
    this.store.delete(key);
  }

  onModuleInit() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.expiresAt < now) {
          this.store.delete(key);
        }
      }
    }, 60000);
  }
}
