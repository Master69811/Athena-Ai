import { Injectable, Logger } from '@nestjs/common';

interface BlacklistedToken {
  expiresAt: number;
}

@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private store = new Map<string, BlacklistedToken>();

  private decodeJwt(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1];
      const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
      return decoded;
    } catch {
      return null;
    }
  }

  async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = this.decodeJwt(token);
      if (!decoded || !decoded.exp) {
        this.logger.warn('Cannot blacklist token: invalid or missing exp claim');
        return;
      }

      const expiresAt = decoded.exp * 1000;
      this.store.set(token, { expiresAt });
      this.logger.debug(`Token blacklisted, expires at ${new Date(expiresAt).toISOString()}`);
    } catch (err) {
      this.logger.error(`Failed to blacklist token: ${(err as Error).message}`);
    }
  }

  async isTokenBlacklisted(token: string): Promise<boolean> {
    const entry = this.store.get(token);
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(token);
      return false;
    }
    return true;
  }

  onModuleInit() {
    setInterval(() => {
      const now = Date.now();
      for (const [token, entry] of this.store.entries()) {
        if (entry.expiresAt < now) {
          this.store.delete(token);
        }
      }
    }, 60000);
  }
}
