// 🐺 LUPO GAMES - Server-only utilities
// Funzioni che possono essere usate solo server-side (API routes)

import { prisma } from '@/lib/prisma';

// ============================================
// 🚀 AUTO-ADVANCE LOGIC
// ============================================

// Verifica se tutti i giocatori hanno completato un'azione
export async function checkAllPlayersCompleted(
  roomCode: string,
  gameType: 'TRIVIA' | 'PROMPT' | 'SECRET',
  currentRoundId: string,
  actionType: 'answer' | 'write' | 'vote' | 'submit'
): Promise<boolean> {
  try {
    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: { players: true },
    });

    if (!room) return false;

    const totalPlayers = room.players.length;
    let completedCount = 0;

    switch (gameType) {
      case 'TRIVIA': {
        const round = await prisma.triviaRound.findUnique({
          where: { id: currentRoundId },
          include: { answers: true },
        });
        completedCount = round?.answers.length || 0;
        break;
      }
      case 'PROMPT': {
        if (actionType === 'write') {
          const round = await prisma.promptRound.findUnique({
            where: { id: currentRoundId },
            include: { responses: true },
          });
          completedCount = round?.responses.length || 0;
        } else if (actionType === 'vote') {
          const round = await prisma.promptRound.findUnique({
            where: { id: currentRoundId },
            include: { votes: true },
          });
          // Conta giocatori unici che hanno votato
          const uniqueVoters = new Set(round?.votes.map(v => v.playerId) || []);
          completedCount = uniqueVoters.size;
        }
        break;
      }
      case 'SECRET': {
        if (actionType === 'submit') {
          // Per la fase COLLECTING, conta i segreti di tutti i player della room
          const secrets = await prisma.secret.count({
            where: { player: { roomId: room.id } }
          });
          completedCount = secrets;
        } else if (actionType === 'vote') {
          const round = await prisma.secretRound.findUnique({
            where: { id: currentRoundId },
            include: { votes: true },
          });
          const uniqueVoters = new Set(round?.votes.map(v => v.playerId) || []);
          completedCount = uniqueVoters.size;
        }
        break;
      }
    }

    return completedCount >= totalPlayers;
  } catch (error) {
    console.error('🐺 Errore check all players completed:', error);
    return false;
  }
}
