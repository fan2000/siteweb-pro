import { Controller, Get, Module } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.module.js';

@Controller('offers')
class CatalogController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() list() { return this.prisma.offer.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } }); }
}

@Module({ controllers: [CatalogController] })
export class CatalogModule {}
