// 🐺 LUPO GAMES - Database Seed
// Popola il DB con domande trivia da domande.json e frasi da stupide.json
// Esegui con: npx prisma db seed

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';

const { Pool } = pg;

// Carica le variabili d'ambiente con path assoluto
const envPath = resolve(process.cwd(), '.env.local');

// Leggi direttamente dal file .env.local
let connectionString: string | undefined;
try {
  const envContent = readFileSync(envPath, 'utf-8');
  const match = envContent.match(/DATABASE_URL="([^"]+)"/);
  if (match) {
    connectionString = match[1];
  }
} catch (e) {
  // Fallback a env var
  connectionString = process.env.DATABASE_URL;
}

console.log('🔍 Cercando DATABASE_URL in:', envPath);
console.log('🔗 Connection string:', connectionString ? connectionString.substring(0, 50) + '...' : '❌ Non trovata');

if (!connectionString) {
  throw new Error('❌ DATABASE_URL non trovata! Crea un file .env.local con la connection string di Neon.');
}

// Usa pg standard per il seed (più compatibile con Node.js)
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool) as any;
const prisma = new PrismaClient({ adapter });

// Interfacce per i JSON
interface DomandaJSON {
  domanda: string;
  risposta_corretta: string;
  risposte_sbagliate: string[];
  difficolta: 'facile' | 'media' | 'difficile';
  categoria: string;
}

interface FraseJSON {
  frase: string;
}

// Mappa difficoltà da stringa a numero
const difficultyMap: Record<string, number> = {
  'facile': 1,
  'media': 2,
  'difficile': 3,
};

// Funzione per mescolare un array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function main() {
  console.log('🐺 Iniziando il seed del database LUPO GAMES...\n');

  // ============================================
  // 🎨 AVATAR
  // ============================================
  console.log('🎨 Creando avatar...');
  
  const avatars = [
    { name: 'Lupo', emoji: '🐺', defaultColor: '#6B7280', sortOrder: 1 },
    { name: 'Pecora', emoji: '🐑', defaultColor: '#F3F4F6', sortOrder: 2 },
    { name: 'Maiale', emoji: '🐷', defaultColor: '#FCA5A5', sortOrder: 3 },
    { name: 'Volpe', emoji: '🦊', defaultColor: '#F97316', sortOrder: 4 },
    { name: 'Orso', emoji: '🐻', defaultColor: '#92400E', sortOrder: 5 },
    { name: 'Leone', emoji: '🦁', defaultColor: '#FCD34D', sortOrder: 6 },
    { name: 'Tigre', emoji: '🐯', defaultColor: '#F59E0B', sortOrder: 7 },
    { name: 'Panda', emoji: '🐼', defaultColor: '#1F2937', sortOrder: 8 },
    { name: 'Coniglio', emoji: '🐰', defaultColor: '#FDF2F8', sortOrder: 9 },
    { name: 'Gatto', emoji: '🐱', defaultColor: '#FEF3C7', sortOrder: 10 },
    { name: 'Cane', emoji: '🐶', defaultColor: '#D4A574', sortOrder: 11 },
    { name: 'Unicorno', emoji: '🦄', defaultColor: '#E879F9', sortOrder: 12 },
    { name: 'Drago', emoji: '🐲', defaultColor: '#22C55E', sortOrder: 13 },
    { name: 'Gufo', emoji: '🦉', defaultColor: '#78350F', sortOrder: 14 },
    { name: 'Pinguino', emoji: '🐧', defaultColor: '#0F172A', sortOrder: 15 },
  ];

  for (const avatar of avatars) {
    await prisma.avatar.upsert({
      where: { name: avatar.name },
      update: avatar,
      create: avatar,
    });
  }
  console.log(`   ✓ ${avatars.length} avatar creati\n`);

  // ============================================
  // 🧠 DOMANDE TRIVIA da domande.json
  // ============================================
  console.log('🧠 Caricando domande trivia da domande.json...');
  
  // Leggi il file JSON
  const domandeRaw = readFileSync(join(process.cwd(), 'domande.json'), 'utf-8');
  const domande: DomandaJSON[] = JSON.parse(domandeRaw);
  
  console.log(`   📁 Trovate ${domande.length} domande nel file`);

  // Prima elimina le domande esistenti (per evitare duplicati durante lo sviluppo)
  await prisma.triviaQuestion.deleteMany({});
  console.log('   🗑️  Domande esistenti eliminate');

  // Crea le nuove domande
  let createdQuestions = 0;
  const categories = new Set<string>();

  for (const d of domande) {
    // Mescola le risposte e assegna alle opzioni A, B, C, D
    const allAnswers = [d.risposta_corretta, ...d.risposte_sbagliate];
    const shuffledAnswers = shuffleArray(allAnswers);
    
    // Trova quale lettera ha la risposta corretta
    const correctIndex = shuffledAnswers.indexOf(d.risposta_corretta);
    const correctLetter = ['A', 'B', 'C', 'D'][correctIndex];

    await prisma.triviaQuestion.create({
      data: {
        question: d.domanda,
        optionA: shuffledAnswers[0],
        optionB: shuffledAnswers[1],
        optionC: shuffledAnswers[2],
        optionD: shuffledAnswers[3],
        correctAnswer: correctLetter,
        category: d.categoria,
        difficulty: difficultyMap[d.difficolta] || 2,
        timesUsed: 0,
      },
    });

    categories.add(d.categoria);
    createdQuestions++;
  }

  console.log(`   ✓ ${createdQuestions} domande trivia create`);
  console.log(`   📊 Categorie: ${Array.from(categories).join(', ')}\n`);

  // ============================================
  // 💬 FRASI DA COMPLETARE da stupide.json
  // ============================================
  console.log('💬 Caricando frasi da completare da stupide.json...');
  
  // Leggi il file JSON
  const frasiRaw = readFileSync(join(process.cwd(), 'stupide.json'), 'utf-8');
  const frasi: FraseJSON[] = JSON.parse(frasiRaw);
  
  console.log(`   📁 Trovate ${frasi.length} frasi nel file`);

  // Prima elimina le frasi esistenti
  await prisma.promptPhrase.deleteMany({});
  console.log('   🗑️  Frasi esistenti eliminate');

  // Categorie basate sul contenuto della frase (analisi euristica)
  function detectCategory(frase: string): string {
    const lower = frase.toLowerCase();
    
    if (lower.includes('imbarazzant') || lower.includes('vergogn') || lower.includes('stupida')) {
      return 'imbarazzante';
    }
    if (lower.includes('peggio') || lower.includes('peggior')) {
      return 'peggiore';
    }
    if (lower.includes('segreto') || lower.includes('nascost') || lower.includes('confessar')) {
      return 'confessione';
    }
    if (lower.includes('amore') || lower.includes('appuntamento') || lower.includes('relazion') || lower.includes('lascia')) {
      return 'relazioni';
    }
    if (lower.includes('lavoro') || lower.includes('capo') || lower.includes('collega') || lower.includes('ufficio')) {
      return 'lavoro';
    }
    if (lower.includes('famiglia') || lower.includes('genitori') || lower.includes('madre') || lower.includes('padre') || lower.includes('nonna') || lower.includes('nonno')) {
      return 'famiglia';
    }
    if (lower.includes('cibo') || lower.includes('mangia') || lower.includes('cucina') || lower.includes('gusto') || lower.includes('pizza')) {
      return 'cibo';
    }
    if (lower.includes('superpotere') || lower.includes('se fossi') || lower.includes('se potessi')) {
      return 'fantasia';
    }
    if (lower.includes('morte') || lower.includes('funerale') || lower.includes('lapide')) {
      return 'dark';
    }
    
    return 'generale';
  }

  // Crea le frasi
  let createdPhrases = 0;
  const phraseCategories = new Set<string>();

  for (const f of frasi) {
    const category = detectCategory(f.frase);
    
    await prisma.promptPhrase.create({
      data: {
        phrase: f.frase,
        category: category,
        timesUsed: 0,
      },
    });

    phraseCategories.add(category);
    createdPhrases++;
  }

  console.log(`   ✓ ${createdPhrases} frasi create`);
  console.log(`   📊 Categorie rilevate: ${Array.from(phraseCategories).join(', ')}\n`);

  // ============================================
  // 🎲 CONTENUTI NUOVI GIOCHI (8 minigiochi)
  // ============================================
  console.log('🎲 Caricando contenuti per i nuovi minigiochi...');

  const gameFiles: Array<{ file: string; gameType: string; key: string }> = [
    { file: 'swipe_trash.json', gameType: 'SWIPE_TRASH', key: 'concetto' },
    { file: 'tribunale.json', gameType: 'TRIBUNAL', key: 'accusa' },
    { file: 'la_bomba.json', gameType: 'BOMB', key: 'categoria' },
    { file: 'termometro.json', gameType: 'THERMOMETER', key: 'concetto' },
    { file: 'gregge.json', gameType: 'HERD_MIND', key: 'domanda' },
    { file: 'camaleonte.json', gameType: 'CHAMELEON', key: 'parola_segreta' },
    { file: 'spacca_stanza.json', gameType: 'SPLIT_ROOM', key: 'dilemma' },
    { file: 'colloquio.json', gameType: 'INTERVIEW', key: 'domanda' },
  ];

  let totalNewContent = 0;
  for (const gf of gameFiles) {
    try {
      const raw = readFileSync(join(process.cwd(), gf.file), 'utf-8');
      const items: Record<string, string>[] = JSON.parse(raw);
      let created = 0;
      for (const item of items) {
        const content = item[gf.key];
        if (!content) continue;
        const existing = await prisma.gameContent.findFirst({
          where: { gameType: gf.gameType as any, content },
        });
        if (!existing) {
          await prisma.gameContent.create({
            data: { gameType: gf.gameType as any, content },
          });
          created++;
        }
      }
      totalNewContent += created;
      console.log(`   ✓ ${gf.gameType}: ${created} nuovi / ${items.length} totali`);
    } catch (e) {
      console.log(`   ⚠️  ${gf.file} non trovato o errore, skip`);
    }
  }
  console.log(`   📦 Totale nuovi contenuti: ${totalNewContent}\n`);

  // ============================================
  // 📊 RIEPILOGO FINALE
  // ============================================
  console.log('═'.repeat(50));
  console.log('🐺 SEED COMPLETATO CON SUCCESSO!');
  console.log('═'.repeat(50));
  console.log(`   🎨 Avatar:   ${avatars.length}`);
  console.log(`   🧠 Domande:  ${createdQuestions}`);
  console.log(`   💬 Frasi:    ${createdPhrases}`);
  console.log(`   🎲 Nuovi contenuti: ${totalNewContent}`);
  console.log('═'.repeat(50));
  
  // Statistiche domande per categoria
  console.log('\n📊 Domande per categoria:');
  const questionStats = await prisma.triviaQuestion.groupBy({
    by: ['category'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });
  for (const stat of questionStats) {
    console.log(`   ${stat.category}: ${stat._count.id}`);
  }

  // Statistiche domande per difficoltà
  console.log('\n🎯 Domande per difficoltà:');
  const diffStats = await prisma.triviaQuestion.groupBy({
    by: ['difficulty'],
    _count: { id: true },
    orderBy: { difficulty: 'asc' },
  });
  const diffLabels = ['', '🟢 Facile', '🟡 Media', '🔴 Difficile'];
  for (const stat of diffStats) {
    console.log(`   ${diffLabels[stat.difficulty]}: ${stat._count.id}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Errore durante il seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
