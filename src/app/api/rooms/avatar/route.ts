// 🐺 LUPO GAMES - API Avatar Selection
// Scegli la tua pedina prima che te la fregano!

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';
import { DEFAULT_AVATARS } from '@/lib/utils';

// POST /api/rooms/avatar - Seleziona un avatar
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { roomCode, playerId, avatar, avatarColor } = body;

    if (!roomCode || !playerId || !avatar) {
      return NextResponse.json(
        { success: false, error: 'Dati mancanti per la selezione avatar' },
        { status: 400 }
      );
    }

    // Verifica che l'avatar esista nella lista
    const avatarExists = DEFAULT_AVATARS.some((a: { name: string }) => a.name === avatar);
    if (!avatarExists) {
      return NextResponse.json(
        { success: false, error: 'Avatar non valido. Non inventarti animali!' },
        { status: 400 }
      );
    }

    // Trova la stanza
    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: {
        players: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Stanza non trovata' },
        { status: 404 }
      );
    }

    // Verifica che il giocatore sia nella stanza
    const player = room.players.find((p: { id: string }) => p.id === playerId);
    if (!player) {
      return NextResponse.json(
        { success: false, error: 'Non sei in questa stanza' },
        { status: 403 }
      );
    }

    // Verifica che l'avatar non sia già preso da un altro
    const avatarTaken = room.players.find(
      (p: { id: string; avatar: string | null }) => p.avatar === avatar && p.id !== playerId
    );
    if (avatarTaken) {
      return NextResponse.json(
        { 
          success: false, 
          error: `${avatar} è già stato preso da ${avatarTaken.name}. Troppo lento!` 
        },
        { status: 400 }
      );
    }

    // Se il giocatore aveva già un avatar, lo "liberiamo"
    const previousAvatar = player.avatar;

    // Aggiorna l'avatar del giocatore
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: {
        avatar,
        avatarColor: avatarColor || '#FFFFFF',
      },
    });

    // Se aveva un avatar precedente, notifica che è stato liberato
    if (previousAvatar && previousAvatar !== avatar) {
      await sendToRoom(roomCode, 'avatar-deselected', {
        playerId,
        playerName: player.name,
        avatar: previousAvatar,
      });
    }

    // Notifica tutti della nuova selezione
    await sendToRoom(roomCode, 'avatar-selected', {
      playerId,
      playerName: player.name,
      avatar,
      avatarColor: avatarColor || '#FFFFFF',
    });

    console.log(`🐺 ${player.name} ha scelto ${avatar} nella stanza ${roomCode}`);

    return NextResponse.json({
      success: true,
      data: {
        playerId: updatedPlayer.id,
        avatar: updatedPlayer.avatar,
        avatarColor: updatedPlayer.avatarColor,
      },
    });

  } catch (error) {
    console.error('🐺 Errore selezione avatar:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nella selezione avatar' },
      { status: 500 }
    );
  }
}

// GET /api/rooms/avatar?code=XXXX - Ottieni avatar disponibili
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
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json(
        { success: false, error: 'Stanza non trovata' },
        { status: 404 }
      );
    }

    // Crea la lista degli avatar con stato
    const takenAvatars = new Map(
      room.players
        .filter((p: { avatar: string | null }) => p.avatar)
        .map((p: { id: string; name: string; avatar: string | null }) => [p.avatar!, { playerId: p.id, playerName: p.name }])
    );

    const avatarsWithStatus = DEFAULT_AVATARS.map((avatar: { name: string; emoji: string }) => ({
      name: avatar.name,
      emoji: avatar.emoji,
      isAvailable: !takenAvatars.has(avatar.name),
      selectedBy: takenAvatars.get(avatar.name) || null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        avatars: avatarsWithStatus,
        totalPlayers: room.players.length,
      },
    });

  } catch (error) {
    console.error('🐺 Errore recupero avatar:', error);
    return NextResponse.json(
      { success: false, error: 'Errore nel recupero degli avatar' },
      { status: 500 }
    );
  }
}
