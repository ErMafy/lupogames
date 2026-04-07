// 🐺 LUPO GAMES - API Creazione Stanza
// Dove nasce la magia (e il caos del sabato sera)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createRoomCode, DEFAULT_AVATARS, AVATAR_COLORS } from '@/lib/utils';

// POST /api/rooms - Crea una nuova stanza
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hostName } = body;

    if (!hostName || hostName.trim().length < 2) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Il nome host deve avere almeno 2 caratteri. Anche "Io" va bene!' 
        },
        { status: 400 }
      );
    }

    // Genera un codice stanza univoco
    let roomCode = createRoomCode();
    let attempts = 0;
    const maxAttempts = 10;

    // Assicuriamoci che il codice sia univoco
    while (attempts < maxAttempts) {
      const existing = await prisma.room.findUnique({
        where: { code: roomCode },
      });

      if (!existing) break;
      
      roomCode = createRoomCode();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Non riesco a generare un codice univoco. Il server ha bevuto troppo.' 
        },
        { status: 500 }
      );
    }

    // Crea la stanza e l'host in una transazione
    const result = await prisma.$transaction(async (tx) => {
      // Crea la stanza
      const room = await tx.room.create({
        data: {
          code: roomCode,
          status: 'LOBBY',
          maxPlayers: 15,
        },
      });

      // Crea il giocatore host
      const hostPlayer = await tx.player.create({
        data: {
          name: hostName.trim(),
          roomId: room.id,
          isHost: true,
          // L'host prende il primo avatar e colore disponibile
          avatar: DEFAULT_AVATARS[0].name,
          avatarColor: AVATAR_COLORS[0],
        },
      });

      // Aggiorna la stanza con l'hostId
      await tx.room.update({
        where: { id: room.id },
        data: { hostId: hostPlayer.id },
      });

      // Crea lo stato di gioco iniziale
      await tx.gameState.create({
        data: {
          roomId: room.id,
          state: {},
        },
      });

      return { room, hostPlayer };
    });

    console.log(`🐺 Stanza ${roomCode} creata da ${hostName}`);

    return NextResponse.json({
      success: true,
      data: {
        room: {
          id: result.room.id,
          code: roomCode,
          status: result.room.status,
        },
        hostPlayer: {
          id: result.hostPlayer.id,
          name: result.hostPlayer.name,
          isHost: true,
          avatar: result.hostPlayer.avatar,
          avatarColor: result.hostPlayer.avatarColor,
        },
      },
    });

  } catch (error) {
    console.error('🐺 Errore creazione stanza:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Errore nella creazione della stanza. Riprova!' 
      },
      { status: 500 }
    );
  }
}

// GET /api/rooms?code=XXXX - Ottieni info stanza
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.toUpperCase();

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Codice stanza mancante' },
        { status: 400 }
      );
    }

    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        players: {
          select: {
            id: true,
            name: true,
            avatar: true,
            avatarColor: true,
            isHost: true,
            isConnected: true,
            score: true,
          },
        },
        gameState: true,
      },
    });

    if (!room) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Stanza ${code} non trovata. Hai scritto bene il codice?` 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        room: {
          id: room.id,
          code: room.code,
          status: room.status,
          currentGame: room.currentGame,
          playerCount: room.players.length,
          maxPlayers: room.maxPlayers,
        },
        players: room.players,
      },
    });

  } catch (error) {
    console.error('🐺 Errore recupero stanza:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero della stanza' },
      { status: 500 }
    );
  }
}
