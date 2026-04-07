// 🐺 LUPO GAMES - Pusher Server Instance
// Il cuore pulsante del real-time, quello che fa la magia

import Pusher from 'pusher';

// Singleton per il server Pusher (non vogliamo creare 1000 istanze)
const globalForPusher = globalThis as unknown as {
  pusherServer: Pusher | undefined;
};

export const pusherServer =
  globalForPusher.pusherServer ??
  new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPusher.pusherServer = pusherServer;
}

// Helper per inviare eventi a una stanza
export async function sendToRoom(
  roomCode: string,
  eventName: string,
  data: unknown
) {
  const channelName = `presence-room-${roomCode}`;
  await pusherServer.trigger(channelName, eventName, data);
}

// Helper per inviare eventi a un singolo giocatore
export async function sendToPlayer(
  roomCode: string,
  playerId: string,
  eventName: string,
  data: unknown
) {
  // Usiamo un canale privato per messaggi diretti
  const channelName = `private-player-${playerId}`;
  await pusherServer.trigger(channelName, eventName, data);
}

// Helper per inviare a tutti tranne uno (utile per "tutti gli altri vedono...")
export async function sendToOthers(
  roomCode: string,
  excludeSocketId: string,
  eventName: string,
  data: unknown
) {
  const channelName = `presence-room-${roomCode}`;
  await pusherServer.trigger(channelName, eventName, data, {
    socket_id: excludeSocketId,
  });
}

export default pusherServer;
