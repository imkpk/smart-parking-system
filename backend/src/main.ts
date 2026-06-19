import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import * as YAML from 'yamljs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') ?? 3000;
  const corsOriginsConfig =
    configService.get<string>('CORS_ALLOWED_ORIGINS') ??
    configService.get<string>('CORS_ORIGINS');
  const corsOrigins = corsOriginsConfig
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? ['http://localhost:5173', 'http://127.0.0.1:5173'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerDocument = YAML.load(join(process.cwd(), 'docs', 'openapi.yaml'));
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  await app.listen(port);
}

bootstrap();
