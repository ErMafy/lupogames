'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface LobbyChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  createdAt: string;
}

const MAX_STORED = 120;

type Props = {
  roomCode: string;
  playerId: string;
  playerName: string;
  onIncomingMessage?: (msg: LobbyChatMessage) => void;
};

export function LobbyChat({ roomCode, playerId, playerName, onIncomingMessage }: Props) {
  const [messages, setMessages] = useState<LobbyChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const appendMessage = useCallback(
    (msg: LobbyChatMessage) => {
      setMessages((prev) => {
        if (prev.some((x) => x.id === msg.id)) return prev;
        const next = [...prev, msg];
        if (next.length > MAX_STORED) next.splice(0, next.length - MAX_STORED);
        return next;
      });
      onIncomingMessage?.(msg);
    },
    [onIncomingMessage],
  );

  useEffect(() => {
    const handler = (ev: Event) => {
      const ce = ev as CustomEvent<LobbyChatMessage>;
      if (!ce.detail?.id) return;
      appendMessage(ce.detail);
    };
    window.addEventListener(`lupo-lobby-chat-${roomCode}`, handler as EventListener);
    return () => window.removeEventListener(`lupo-lobby-chat-${roomCode}`, handler as EventListener);
  }, [roomCode, appendMessage]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/rooms/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode, playerId, message: text }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(typeof json.error === 'string' ? json.error : 'Non inviato');
        return;
      }
      setDraft('');
      if (json.data) appendMessage(json.data as LobbyChatMessage);
    } catch {
      setError('Connessione persa, riprova.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="glass-card overflow-hidden border border-white/10 flex flex-col min-h-0 max-h-[min(42vh,22rem)] sm:max-h-[26rem] w-full">
      <div className="shrink-0 px-3 py-2 border-b border-white/10 flex items-center justify-between bg-black/20">
        <span className="text-white font-black text-sm flex items-center gap-2">
          <span aria-hidden>💬</span> Chat lobby
        </span>
        <span className="text-[10px] text-white/40 font-medium hidden sm:inline">Solo in attesa</span>
      </div>

      <div
        ref={listRef}
        className="flex-1 min-h-[8rem] overflow-y-auto overscroll-contain px-2 py-2 space-y-2"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="text-center text-white/40 text-xs py-6 px-4">
            Saluta il gruppo o coordina gli avatar — i messaggi arrivano a tutti in tempo reale.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.playerId === playerId;
            return (
              <div
                key={m.id}
                className={`flex flex-col gap-0.5 ${mine ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-snug ${
                    mine
                      ? 'bg-purple-600/90 text-white rounded-br-md'
                      : 'bg-white/[0.08] text-white/95 rounded-bl-md border border-white/10'
                  }`}
                >
                  {!mine && (
                    <span className="block text-[10px] font-bold text-amber-300/90 mb-1 truncate">
                      {m.playerName}
                    </span>
                  )}
                  <span className="whitespace-pre-wrap break-words">{m.message}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {error && (
        <div className="shrink-0 px-3 py-1.5 text-xs text-red-300 bg-red-950/40 border-t border-red-500/20">
          {error}
        </div>
      )}

      <form
        className="shrink-0 flex gap-2 p-2 pt-1 border-t border-white/10 bg-black/25 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <label htmlFor="lobby-chat-input" className="sr-only">
          Messaggio a {playerName}
        </label>
        <input
          id="lobby-chat-input"
          type="text"
          enterKeyHint="send"
          autoComplete="off"
          maxLength={280}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Scrivi un messaggio…"
          className="flex-1 min-w-0 rounded-xl bg-black/35 border border-white/15 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="shrink-0 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
        >
          {sending ? '…' : 'Invia'}
        </button>
      </form>
    </div>
  );
}

/** Da chiamare dal listener Pusher: notifica la chat della lobby senza prop drilling. */
export function dispatchLobbyChatFromPusher(roomCode: string, msg: LobbyChatMessage) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(`lupo-lobby-chat-${roomCode}`, { detail: msg }));
}
