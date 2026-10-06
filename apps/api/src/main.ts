import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('DHAVON-Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Logging Interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // CORS configuration
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : ['http://localhost:3000', 'http://127.0.0.1:3000'];

  app.enableCors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Enable graceful shutdown lifecycle
  app.enableShutdownHooks();

  const port = process.env.PORT || process.env.API_PORT || 4000;
  await app.listen(port);

  logger.log(`=======================================================`);
  logger.log(`  DHAVON Personal Intelligence Operating System API`);
  logger.log(`  Health Check: http://localhost:${port}/health`);
  logger.log(`  WebSocket Gateway: ws://localhost:${port}`);
  logger.log(`  Port: ${port}`);
  logger.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`=======================================================`);
}

bootstrap();
