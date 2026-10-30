import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import offers from '../../../data/offers.json' with { type: 'json' };

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL must be set');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const kind = { affiliate: 'AFFILIATE', dropship: 'DROPSHIP', service: 'SERVICE' } as const;

try {
  for (const offer of offers) {
    await prisma.offer.upsert({ where: { id: offer.id }, update: {}, create: {
      id: offer.id, name: offer.name, category: offer.category,
      kind: kind[offer.kind as keyof typeof kind], priceCents: Math.round(offer.price * 100),
      currency: offer.currency, description: offer.description, image: `/${offer.image}`,
      demo: true, active: true,
    } });
  }
} finally { await prisma.$disconnect(); }
