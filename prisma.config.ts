// 🐺 LUPO GAMES - Prisma Config
// Configurazione per Prisma 7+

import path from 'node:path';
import type { PrismaConfig } from 'prisma';
import * as dotenv from 'dotenv';

// Carica le variabili d'ambiente
dotenv.config({ path: '.env.local' });

const config: PrismaConfig = {
  schema: path.join(__dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
};

export default config;
