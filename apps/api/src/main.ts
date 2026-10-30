import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { getAllowedWebOrigins } from './config/web-origin.js';

type CorsOrigin = boolean | string | RegExp | Array<string | RegExp>;
type CorsOriginCallback = (error: Error | null, allow?: CorsOrigin) => void;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const webOrigin = process.env.WEB_ORIGIN;
  if (!webOrigin) throw new Error('WEB_ORIGIN must be set');
  const allowedOrigins = getAllowedWebOrigins();
  app.enableCors({
    origin: (origin: string | undefined, callback: CorsOriginCallback) => callback(null, origin === undefined || allowedOrigins.includes(origin)),
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  });
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');
  await app.listen(Number(process.env.API_PORT ?? 4000), '0.0.0.0');
}
void bootstrap();
