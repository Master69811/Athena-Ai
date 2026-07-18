import { Injectable, UnauthorizedException, BadRequestException, ConflictException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RateLimitService } from '../../common/services/rate-limit.service';
import { TokenBlacklistService } from '../../common/services/token-blacklist.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private rateLimitService: RateLimitService,
    private tokenBlacklistService: TokenBlacklistService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        profile: dto.name
          ? { create: { name: dto.name, age: 25, gender: 'MALE', heightCm: 175, weightKg: 75, goalType: 'HYPERTROPHY', experienceLevel: 'BEGINNER' } }
          : undefined,
      },
      include: { profile: true },
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const identifier = dto.email;
    const { allowed } = await this.rateLimitService.checkLoginAttempt(identifier);

    if (!allowed) {
      this.logger.warn(`Login rate limit exceeded for ${identifier}`);
      throw new HttpException('Too many failed login attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { profile: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) throw new UnauthorizedException('Account is deactivated');

    await this.rateLimitService.resetLoginAttempts(identifier);
    const tokens = await this.generateTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refreshTokens(userId: string, refreshToken: string) {
    // Cryptographically verify the token FIRST: signature + expiry. Without
    // this, an expired or forged token could still reach the bcrypt
    // comparison below and (due to a separate bug fixed alongside this one)
    // be accepted as valid.
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
      if (payload.sub !== userId) throw new UnauthorizedException('Invalid refresh token');
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.refreshToken) throw new UnauthorizedException();

    // bcrypt truncates its input at 72 bytes. A raw JWT's header+sub+email
    // prefix is >=72 bytes and identical across every token minted for the
    // same user, so comparing the raw token let ANY previously-issued
    // refresh token pass forever, defeating rotation entirely. Hash a
    // fixed-length SHA-256 digest of the token instead, so the full token
    // (including its unique iat/exp) is actually covered by bcrypt.
    const tokenMatch = await bcrypt.compare(this.hashTokenForBcrypt(refreshToken), user.refreshToken);
    if (!tokenMatch) throw new UnauthorizedException('Invalid refresh token');

    const tokens = await this.generateTokens(user.id, user.email);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string, token?: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
    if (token) {
      await this.tokenBlacklistService.blacklistToken(token);
    }
    return { message: 'Logged out successfully' };
  }

  async validateGoogleUser(profile: { id: string; emails: Array<{ value: string }>; displayName: string }) {
    const email = profile.emails[0].value;
    let user = await this.prisma.user.findUnique({ where: { email }, include: { profile: true } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          googleId: profile.id,
          emailVerified: true,
          profile: {
            create: {
              name: profile.displayName,
              age: 25,
              gender: 'MALE',
              heightCm: 175,
              weightKg: 75,
              goalType: 'HYPERTROPHY',
              experienceLevel: 'BEGINNER',
            },
          },
        },
        include: { profile: true },
      });
    }

    return user;
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string) {
    const hashedToken = await bcrypt.hash(this.hashTokenForBcrypt(refreshToken), 10);
    await this.prisma.user.update({ where: { id: userId }, data: { refreshToken: hashedToken } });
  }

  /** Fixed-length (64 hex chars) digest so bcrypt's 72-byte input limit never truncates a full-length JWT. */
  private hashTokenForBcrypt(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private sanitizeUser(user: any) {
    const { passwordHash, refreshToken, resetToken, ...safe } = user;
    return safe;
  }
}
