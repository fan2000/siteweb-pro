import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './database/prisma.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';

@Module({ imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }), ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]), PrismaModule, AuthModule, CatalogModule], providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }] })
export class AppModule {}
