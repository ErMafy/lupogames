// 🐺 LUPO GAMES - Pusher Auth Endpoint
// Senza questo, niente presenza channel. È tipo il buttafuori del club.

import { NextRequest, NextResponse } from 'next/server';
import { pusherServer } from '@/lib/pusher-server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Pusher invia questi dati nel body
    const formData = await request.formData();
    const socketId = formData.get('socket_id') as string;
    const channelName = formData.get('channel_name') as string;

    // I nostri dati custom dal client
    const playerId = formData.get('playerId') as string;
    const playerName = formData.get('playerName') as string;
    const isHost = formData.get('isHost') === 'true';

    if (!socketId || !channelName) {
      return NextResponse.json(
        { error: 'Missing socket_id or channel_name. Pusher è confuso.' },
        { status: 400 }
      );
    }

    // ============================================
    // 🔐 CANALI PRESENCE (presence-room-XXXX)
    // ============================================

    if (channelName.startsWith('presence-room-')) {
      const roomCode = channelName.replace('presence-room-', '');

      // Verifica che la stanza esista
      const room = await prisma.room.findUnique({
        where: { code: roomCode },
        include: { players: true },
      });

      if (!room) {
        return NextResponse.json(
          { error: `Stanza ${roomCode} non trovata. Sicuro di aver scritto bene?` },
          { status: 404 }
        );
      }

      // Verifica che il giocatore sia nella stanza
      const player = room.players.find((p: { id: string }) => p.id === playerId);
      if (!player && playerId) {
        // Se non esiste ma ha un playerId, probabilmente è una riconnessione
        // Lo cerchiamo nel DB
        const existingPlayer = await prisma.player.findFirst({
          where: { id: playerId, roomId: room.id },
        });

        if (!existingPlayer) {
          return NextResponse.json(
            { error: 'Non sei in questa stanza. Prova a rientrare.' },
            { status: 403 }
          );
        }
      }

      // Aggiorna il socketId del player per tracciare la connessione
      if (playerId) {
        await prisma.player.update({
          where: { id: playerId },
          data: { 
            pusherSocketId: socketId,
            isConnected: true,
            lastSeen: new Date(),
          },
        });
      }

      // Dati presenti nel membro (visibili a tutti gli altri)
      const presenceData = {
        user_id: playerId || `guest-${socketId}`,
        user_info: {
          name: playerName || 'Anonimo',
          avatar: player?.avatar || null,
          avatarColor: player?.avatarColor || null,
          isHost: isHost || player?.isHost || false,
        },
      };

      // Genera la risposta di autenticazione per Pusher
      const authResponse = pusherServer.authorizeChannel(
        socketId,
        channelName,
        presenceData
      );

      return NextResponse.json(authResponse);
    }

    // ============================================
    // 🔐 CANALI PRIVATI (private-player-XXXX)
    // ============================================

    if (channelName.startsWith('private-player-')) {
      const targetPlayerId = channelName.replace('private-player-', '');

      // Solo il giocatore stesso può iscriversi al proprio canale privato
      if (playerId !== targetPlayerId) {
        return NextResponse.json(
          { error: 'Non puoi spiare gli altri giocatori, furbetto!' },
          { status: 403 }
        );
      }

      const authResponse = pusherServer.authorizeChannel(socketId, channelName);
      return NextResponse.json(authResponse);
    }

    // ============================================
    // ❌ CANALI NON RICONOSCIUTI
    // ============================================

    return NextResponse.json(
      { error: `Canale ${channelName} non riconosciuto. Che stai combinando?` },
      { status: 400 }
    );

  } catch (error) {
    console.error('🐺 Errore auth Pusher:', error);
    return NextResponse.json(
      { error: 'Errore interno del server. Abbiamo fatto casino noi.' },
      { status: 500 }
    );
  }
}
