import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

function validateSecrets(configService: ConfigService): void {
  // NOTE: no empty string here — `value.includes('')` is true for EVERY
  // string, which would make validation reject all secrets. Empty/missing
  // values are already caught by the `!value` check below.
  const PLACEHOLDERS = [
    'your-super-secret-jwt-key-change-this-in-production',
    'your-refresh-secret-key-change-this-in-production',
    'CHANGE_ME',
  ];
  const MIN_LENGTH = 32;

  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = configService.get<string>(key);
    if (!value || value.length < MIN_LENGTH || PLACEHOLDERS.some((p) => value.includes(p))) {
      throw new Error(
        `[STARTUP] ${key} is missing, too short, or uses a placeholder value. ` +
          `Generate a secure value with: openssl rand -base64 64`,
      );
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3001);
  const frontendUrl = configService.get<string>('FRONTEND_URL', 'http://localhost:3000');

  if (configService.get<string>('NODE_ENV') === 'production') {
    validateSecrets(configService);
  }

  // AI features (coach chat, workout generation, RAG embeddings) need Gemini.
  // Boot proceeds without it, but surface the misconfiguration loudly in logs.
  if (!configService.get<string>('GEMINI_API_KEY')) {
    console.warn(
      '[STARTUP] GEMINI_API_KEY is not set — all AI endpoints (coach, workout generation, RAG) will fail until it is configured.',
    );
  }

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());

  const isProduction = configService.get<string>('NODE_ENV') === 'production';

  // Exact-match origins: the deployed frontend, local dev, plus any extras
  // from CORS_ORIGINS (comma-separated) — e.g. Vercel preview URLs.
  const allowedOrigins = new Set(
    [
      frontendUrl,
      'http://localhost:3000',
      ...(configService.get<string>('CORS_ORIGINS', '').split(',') ?? []),
    ]
      .map((o) => o.trim().replace(/\/$/, ''))
      .filter(Boolean),
  );

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Swagger)
      if (!origin) return callback(null, true);
      // SECURITY: credentialed CORS must not trust entire shared-hosting
      // platforms (*.vercel.app / *.onrender.com) in production — anyone can
      // deploy there. Wildcards are only honored outside production.
      const allowed =
        allowedOrigins.has(origin) ||
        (!isProduction &&
          (/\.vercel\.app$/.test(origin) || /\.onrender\.com$/.test(origin) || /\.railway\.app$/.test(origin)));
      if (!allowed) {
        console.warn(`[CORS] Blocked origin: ${origin}. Add it to FRONTEND_URL or CORS_ORIGINS if legitimate.`);
      }
      callback(allowed ? null : new Error('Not allowed by CORS'), allowed);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger is exposed only outside production (or with SWAGGER_ENABLED=true)
  // to avoid advertising the full API surface publicly.
  const swaggerEnabled = !isProduction || configService.get<string>('SWAGGER_ENABLED') === 'true';

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Athena AI — Fitness Platform API')
    .setDescription('The ultimate AI-powered fitness coaching platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User profile management')
    .addTag('exercises', 'Exercise database')
    .addTag('workout-plans', 'Workout plan management')
    .addTag('sessions', 'Live workout sessions')
    .addTag('nutrition', 'Nutrition planning')
    .addTag('recovery', 'Recovery tracking')
    .addTag('ai-coach', 'AI coaching chat')
    .addTag('progress', 'Progress tracking')
    .addTag('gamification', 'Achievements and streaks')
    .addTag('subscriptions', 'Subscription management')
    .addTag('trainer', 'Personal trainer features')
    .build();

  if (swaggerEnabled) {
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  await app.listen(port);
  console.log(`🚀 Athena AI API running on: http://localhost:${port}`);
  if (swaggerEnabled) console.log(`📚 Swagger docs: http://localhost:${port}/docs`);
}

bootstrap().catch((err) => {
  console.error('[STARTUP] Fatal error during bootstrap:', err);
  process.exit(1);
});
