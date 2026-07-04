import { Injectable, UnauthorizedException, BadRequestException, ConflictException, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
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
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.refreshToken) throw new UnauthorizedException();

    const tokenMatch = await bcrypt.compare(refreshToken, user.refreshToken);
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
    const hashedToken = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { refreshToken: hashedToken } });
  }

  private sanitizeUser(user: any) {
    const { passwordHash, refreshToken, resetToken, ...safe } = user;
    return safe;
  }
}
