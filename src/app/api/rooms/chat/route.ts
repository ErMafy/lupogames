// POST /api/rooms/chat — messaggi lobby in tempo reale (Pusher)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendToRoom } from '@/lib/pusher-server';

const MAX_LEN = 280;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const roomCode = typeof body.roomCode === 'string' ? body.roomCode.trim().toUpperCase() : '';
    const playerId = typeof body.playerId === 'string' ? body.playerId.trim() : '';
    const raw = typeof body.message === 'string' ? body.message : '';

    if (!roomCode || !playerId) {
      return NextResponse.json({ success: false, error: 'Dati mancanti' }, { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { code: roomCode },
    });

    if (!room || room.status !== 'LOBBY') {
      return NextResponse.json(
        { success: false, error: 'La chat è disponibile solo in lobby, prima che inizi il gioco.' },
        { status: 400 },
      );
    }

    const player = await prisma.player.findFirst({
      where: { id: playerId, roomId: room.id },
    });

    if (!player) {
      return NextResponse.json({ success: false, error: 'Non sei in questa stanza.' }, { status: 403 });
    }

    const message = raw
      .replace(/[\u0000-\u001F\u007F]/g, '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, MAX_LEN);

    if (message.length < 1) {
      return NextResponse.json({ success: false, error: 'Scrivi qualcosa!' }, { status: 400 });
    }

    const payload = {
      id: crypto.randomUUID(),
      playerId: player.id,
      playerName: player.name,
      message,
      createdAt: new Date().toISOString(),
    };

    await sendToRoom(room.code, 'lobby-chat', payload);

    return NextResponse.json({ success: true, data: payload });
  } catch (e) {
    console.error('rooms/chat:', e);
    return NextResponse.json({ success: false, error: 'Errore invio messaggio' }, { status: 500 });
  }
}
