// 🐺 LUPO GAMES - Pusher Client Instance
// La connessione real-time lato browser

import PusherClient from 'pusher-js';

// Singleton per il client Pusher
let pusherClientInstance: PusherClient | null = null;

// Parametri di autenticazione dinamici
let authParams: Record<string, string> = {};

export function setAuthParams(params: Record<string, string>) {
  authParams = params;
}

export function getPusherClient(): PusherClient {
  if (pusherClientInstance) {
    return pusherClientInstance;
  }

  pusherClientInstance = new PusherClient(
    process.env.NEXT_PUBLIC_PUSHER_KEY!,
    {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      // L'endpoint per l'autenticazione dei canali presence e private
      authEndpoint: '/api/pusher/auth',
      // Passa dati extra per l'autenticazione
      channelAuthorization: {
        endpoint: '/api/pusher/auth',
        transport: 'ajax',
        params: authParams,
        paramsProvider: () => authParams,
      },
    }
  );

  // Debug in development
  if (process.env.NODE_ENV === 'development') {
    PusherClient.logToConsole = true;
  }

  return pusherClientInstance;
}

// Per quando il giocatore esce (cleanup)
export function disconnectPusher() {
  if (pusherClientInstance) {
    pusherClientInstance.disconnect();
    pusherClientInstance = null;
  }
}

export default getPusherClient;
