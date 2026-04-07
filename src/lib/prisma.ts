// 🐺 LUPO GAMES - Prisma Client Singleton
// Perché creare 1000 connessioni al DB è da pazzi (e Neon ti manda le fatture)

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL non configurata! Controlla il file .env.local');
  }
  
  // Usa pg standard - funziona sia in dev che in produzione su Vercel
  const pool = new Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  const adapter = new PrismaPg(pool) as any;
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' 
      ? ['error', 'warn'] 
      : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
