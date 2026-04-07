// 🐺 LUPO GAMES - API Join Room
// Entra nella stanza e preparati a divertirti (o a perdere miseramente)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';
import { validatePlayerName, validateRoomCode } from '@/lib/utils';

// POST /api/rooms/join - Unisciti a una stanza
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomCode, playerName } = body;

    // Validazione input
    const codeValidation = validateRoomCode(roomCode);
    if (!codeValidation.valid) {
      return NextResponse.json(
        { success: false, error: codeValidation.error },
        { status: 400 }
      );
    }

    const nameValidation = validatePlayerName(playerName);
    if (!nameValidation.valid) {
      return NextResponse.json(
        { success: false, error: nameValidation.error },
        { status: 400 }
      );
    }

    const code = roomCode.trim().toUpperCase();
    const name = playerName.trim();

    // Trova la stanza
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
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Stanza ${code} non trovata. Il codice è giusto?` 
        },
        { status: 404 }
      );
    }

    // Check stato stanza
    if (room.status !== 'LOBBY') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'La partita è già iniziata! Aspetta la prossima.' 
        },
        { status: 400 }
      );
    }

    // Check numero massimo giocatori
    if (room.players.length >= room.maxPlayers) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Stanza piena! Max ${room.maxPlayers} giocatori.` 
        },
        { status: 400 }
      );
    }

    // Check nome duplicato
    const nameTaken = room.players.some(
      p => p.name.toLowerCase() === name.toLowerCase()
    );
    if (nameTaken) {
      return NextResponse.json(
        { 
          success: false, 
          error: `C'è già un "${name}" nella stanza. Sii originale!` 
        },
        { status: 400 }
      );
    }

    // Crea il nuovo giocatore
    const newPlayer = await prisma.player.create({
      data: {
        name,
        roomId: room.id,
        isHost: false,
      },
    });

    // Notifica tutti nella stanza del nuovo arrivato via Pusher
    await sendToRoom(code, 'player-joined', {
      playerId: newPlayer.id,
      playerName: newPlayer.name,
      playerCount: room.players.length + 1,
    });

    console.log(`🐺 ${name} è entrato nella stanza ${code}`);

    return NextResponse.json({
      success: true,
      data: {
        room: {
          id: room.id,
          code: room.code,
          status: room.status,
        },
        player: {
          id: newPlayer.id,
          name: newPlayer.name,
          isHost: false,
        },
        existingPlayers: room.players,
      },
    });

  } catch (error) {
    console.error('🐺 Errore join stanza:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nell\'entrare nella stanza. Riprova!' },
      { status: 500 }
    );
  }
}
