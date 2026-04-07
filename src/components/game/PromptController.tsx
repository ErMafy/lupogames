// 🐺 LUPO GAMES - Prompt Controller
// Controller per "Continua la Frase" - dove la creatività vola libera

'use client';

import { useState } from 'react';
import type { PromptRoundData } from '@/types';

interface PromptControllerProps {
  roundData: PromptRoundData;
  phase: 'WRITING' | 'VOTING';
  onSubmitResponse: (response: string) => Promise<void>;
  onVote: (responseId: string) => Promise<void>;
  hasSubmitted: boolean;
  responses?: { id: string; response: string }[];
}

export function PromptController({
  roundData,
  phase,
  onSubmitResponse,
  onVote,
  hasSubmitted,
  responses = [],
}: PromptControllerProps) {
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVote, setSelectedVote] = useState<string | null>(null);

  const handleSubmitResponse = async () => {
    if (!response.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSubmitResponse(response.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (responseId: string) => {
    if (isSubmitting || selectedVote) return;
    
    setSelectedVote(responseId);
    setIsSubmitting(true);
    try {
      await onVote(responseId);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fase di scrittura
  if (phase === 'WRITING') {
    return (
      <div className="flex flex-col min-h-[70vh]">
        {/* Frase da completare */}
        <div className="glass-card p-6 mb-6">
          <p className="text-purple-300 text-sm mb-2">Completa la frase:</p>
          <h2 className="text-2xl font-bold text-white leading-relaxed">
            "{roundData.phrase}"
          </h2>
        </div>

        {hasSubmitted ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Risposta Inviata!
            </h3>
            <p className="text-purple-200">
              Aspetta che tutti finiscano di scrivere...
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {/* Input risposta */}
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Scrivi la tua risposta creativa..."
              maxLength={200}
              className="flex-1 min-h-[120px] input-lupo text-lg resize-none mb-4"
              autoFocus
            />
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-purple-300 text-sm">
                {response.length}/200 caratteri
              </span>
              <span className="text-purple-300 text-sm">
                ⏱️ {roundData.timeLimit}s
              </span>
            </div>

            {/* Bottone invio */}
            <button
              onClick={handleSubmitResponse}
              disabled={!response.trim() || isSubmitting}
              className="btn-lupo text-xl py-4 disabled:opacity-50"
            >
              {isSubmitting ? '⏳ Invio...' : '📤 Invia Risposta'}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Fase di voto
  return (
    <div className="flex flex-col min-h-[70vh]">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">
          🗳️ Vota la Migliore!
        </h2>
        <p className="text-purple-200">
          "{roundData.phrase}"
        </p>
      </div>

      {hasSubmitted || selectedVote ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="text-6xl mb-4">🗳️</div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Voto Registrato!
          </h3>
          <p className="text-purple-200">
            Aspetta i risultati...
          </p>
        </div>
      ) : (
        <div className="flex-1 space-y-3">
          {responses.map((r, index) => (
            <button
              key={r.id}
              onClick={() => handleVote(r.id)}
              disabled={isSubmitting}
              className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-xl text-left transition-colors disabled:opacity-50"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl font-bold text-purple-400">
                  {index + 1}.
                </span>
                <p className="text-white text-lg flex-1">
                  {r.response}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default PromptController;
