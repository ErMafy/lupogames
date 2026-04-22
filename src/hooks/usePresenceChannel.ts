// 🐺 LUPO GAMES - Hook per Pusher Presence Channel
// Il cuore del real-time: chi c'è nella stanza, chi va, chi viene

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Channel, PresenceChannel } from 'pusher-js';
import { getPusherClient, disconnectPusher, setAuthParams } from '@/lib/pusher-client';
import type { PusherMember, AvatarSelectedEvent } from '@/types';

interface UsePresenceChannelOptions {
  roomCode: string;
  playerId: string;
  playerName: string;
  isHost?: boolean;
  onMemberAdded?: (member: PusherMember) => void;
  onMemberRemoved?: (member: PusherMember) => void;
  onAvatarSelected?: (event: AvatarSelectedEvent) => void;
  onGameEvent?: (eventName: string, data: unknown) => void;
  /** Dopo subscription (e dopo ogni riconnessione Pusher): allinea stato da GET /api/game/sync */
  onPresenceReady?: () => void;
}

interface PresenceChannelState {
  isConnected: boolean;
  members: Map<string, PusherMember['info']>;
  memberCount: number;
  myId: string | null;
  error: string | null;
}

export function usePresenceChannel({
  roomCode,
  playerId,
  playerName,
  isHost = false,
  onMemberAdded,
  onMemberRemoved,
  onAvatarSelected,
  onGameEvent,
  onPresenceReady,
}: UsePresenceChannelOptions) {
  // ⚠️ CRITICO: usiamo SEMPRE i ref per i callback nell'useEffect di
  // sottoscrizione. Senza questo, ogni volta che il parent ricrea
  // `customGameEventHandler` (succede ad ogni `allPlayers` update, ovvero
  // ad ogni `player-advanced`/score change), l'effect si rieseguiva,
  // chiamava `unbind_all`+`unsubscribe`, e nella micro-finestra fra cleanup
  // e re-subscribe gli eventi Pusher arrivati venivano PERSI.
  // In particolare il `round-started` del round successivo poteva svanire,
  // lasciando il client incollato al round precedente con `hasSubmitted=true`
  // → l'utente vedeva "Voto inviato!" e non riusciva piu` a rispondere.
  const onPresenceReadyRef = useRef(onPresenceReady);
  onPresenceReadyRef.current = onPresenceReady;
  const onMemberAddedRef = useRef(onMemberAdded);
  onMemberAddedRef.current = onMemberAdded;
  const onMemberRemovedRef = useRef(onMemberRemoved);
  onMemberRemovedRef.current = onMemberRemoved;
  const onAvatarSelectedRef = useRef(onAvatarSelected);
  onAvatarSelectedRef.current = onAvatarSelected;
  const onGameEventRef = useRef(onGameEvent);
  onGameEventRef.current = onGameEvent;

  const [state, setState] = useState<PresenceChannelState>({
    isConnected: false,
    members: new Map(),
    memberCount: 0,
    myId: null,
    error: null,
  });

  const channelRef = useRef<PresenceChannel | null>(null);
  const pusherRef = useRef<ReturnType<typeof getPusherClient> | null>(null);

  // Sottoscrizione al canale presence
  useEffect(() => {
    if (!roomCode || !playerId) return;

    // Imposta i parametri di autenticazione
    setAuthParams({
      playerId,
      playerName,
      isHost: isHost.toString(),
    });

    const pusher = getPusherClient();
    pusherRef.current = pusher;

    const channelName = `presence-room-${roomCode}`;
    const channel = pusher.subscribe(channelName) as PresenceChannel;
    channelRef.current = channel;

    // ============================================
    // 📡 EVENTI DI CONNESSIONE
    // ============================================

    channel.bind('pusher:subscription_succeeded', (data: { members: Record<string, PusherMember['info']>; me: { id: string } }) => {
      console.log('🐺 Connesso alla stanza!', data);
      
      const membersMap = new Map(Object.entries(data.members));
      setState(prev => ({
        ...prev,
        isConnected: true,
        members: membersMap,
        memberCount: membersMap.size,
        myId: data.me.id,
        error: null,
      }));

      try {
        onPresenceReadyRef.current?.();
      } catch (e) {
        console.error('onPresenceReady:', e);
      }
    });

    channel.bind('pusher:subscription_error', (error: { type: string; error: string }) => {
      console.error('🐺 Errore connessione:', error);
      setState(prev => ({
        ...prev,
        isConnected: false,
        error: `Errore di connessione: ${error.error || 'sconosciuto'}`,
      }));
    });

    // ============================================
    // 👥 MEMBRI CHE ENTRANO/ESCONO
    // ============================================

    channel.bind('pusher:member_added', (member: PusherMember) => {
      console.log('🐺 Nuovo giocatore:', member.info.name);
      
      setState(prev => {
        const newMembers = new Map(prev.members);
        newMembers.set(member.id, member.info);
        return {
          ...prev,
          members: newMembers,
          memberCount: newMembers.size,
        };
      });

      onMemberAddedRef.current?.(member);
    });

    channel.bind('pusher:member_removed', (member: PusherMember) => {
      console.log('🐺 Giocatore uscito:', member.info.name);
      
      setState(prev => {
        const newMembers = new Map(prev.members);
        newMembers.delete(member.id);
        return {
          ...prev,
          members: newMembers,
          memberCount: newMembers.size,
        };
      });

      onMemberRemovedRef.current?.(member);
    });

    // ============================================
    // 🎨 SELEZIONE AVATAR
    // ============================================

    channel.bind('avatar-selected', (data: AvatarSelectedEvent) => {
      console.log('🐺 Avatar selezionato:', data.avatar, 'da', data.playerName);
      onAvatarSelectedRef.current?.(data);
    });

    // ============================================
    // 🎮 EVENTI DI GIOCO
    // ============================================

    const gameEvents = [
      'game-started',
      'game-ended',
      'round-started',
      'round-ended',
      'phase-changed',
      'round-results',
      'answer-received',
      'player-advanced',
      'vote-received',
      'timer-tick',
      'show-results',
      'player-kicked',
      'host-changed',
      'player-joined',
      'player-responded',
      'player-submitted-secret',
      'all-players-completed',
      'prompt-responses',
      'prompt-results',
      'secret-reveal',
      'bomb-passed',
      'chameleon-hint',
      'lobby-chat',
    ];

    gameEvents.forEach(eventName => {
      channel.bind(eventName, (data: unknown) => {
        console.log(`🐺 Evento ${eventName}:`, data);
        onGameEventRef.current?.(eventName, data);
      });
    });

    // Cleanup quando il componente si smonta
    return () => {
      console.log('🐺 Disconnessione dalla stanza...');
      if (channelRef.current) {
        channelRef.current.unbind_all();
        pusher.unsubscribe(channelName);
      }
      channelRef.current = null;
    };
    // ⚠️ NON aggiungere i callback (`onGameEvent`, ecc.) alle deps:
    // sono gia` letti via ref, e aggiungerli farebbe ri-sottoscrivere il
    // canale ad ogni render, perdendo eventi Pusher (incluso `round-started`).
  }, [roomCode, playerId, playerName, isHost]);

  // ============================================
  // 🎨 TRIGGER SELEZIONE AVATAR
  // ============================================

  const selectAvatar = useCallback(async (avatar: string, avatarColor: string) => {
    if (!channelRef.current || !playerId) return;

    try {
      // Chiama l'API per salvare e propagare la selezione
      const response = await fetch('/api/rooms/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode,
          playerId,
          avatar,
          avatarColor,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Errore selezione avatar');
      }

      return true;
    } catch (error) {
      console.error('🐺 Errore selezione avatar:', error);
      return false;
    }
  }, [roomCode, playerId]);

  // ============================================
  // 🔌 DISCONNESSIONE MANUALE
  // ============================================

  const disconnect = useCallback(() => {
    if (channelRef.current && pusherRef.current) {
      pusherRef.current.unsubscribe(`presence-room-${roomCode}`);
      channelRef.current = null;
    }
    disconnectPusher();
  }, [roomCode]);

  // ============================================
  // 📊 HELPERS
  // ============================================

  const getMembersList = useCallback(() => {
    return Array.from(state.members.entries()).map(([id, info]) => ({
      id,
      ...info,
    }));
  }, [state.members]);

  const isMemberConnected = useCallback((memberId: string) => {
    return state.members.has(memberId);
  }, [state.members]);

  return {
    ...state,
    selectAvatar,
    disconnect,
    getMembersList,
    isMemberConnected,
    channel: channelRef.current,
  };
}

export default usePresenceChannel;
