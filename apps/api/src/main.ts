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
  const PLACEHOLDERS = [
    'your-super-secret-jwt-key-change-this-in-production',
    'your-refresh-secret-key-change-this-in-production',
    'CHANGE_ME',
    '',
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

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());

  const allowedOrigins = [frontendUrl, 'http://localhost:3000'];
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Swagger)
      if (!origin) return callback(null, true);
      const allowed =
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(origin) ||
        /\.onrender\.com$/.test(origin) ||
        /\.railway\.app$/.test(origin);
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

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);
  console.log(`🚀 Athena AI API running on: http://localhost:${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/docs`);
}

bootstrap();
