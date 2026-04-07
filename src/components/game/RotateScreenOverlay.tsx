// 🐺 LUPO GAMES - Overlay Rotazione Schermo
// "GIRA STO TELEFONO, CAMPIONE!" - In modo elegante

'use client';

import { useScreenOrientation } from '@/hooks/useScreenOrientation';
import type { OrientationType } from '@/types';

interface RotateScreenOverlayProps {
  required: OrientationType;
  children: React.ReactNode;
}

export function RotateScreenOverlay({ required, children }: RotateScreenOverlayProps) {
  const { isCorrect, current } = useScreenOrientation({ required });

  // Se l'orientamento è corretto, mostra il contenuto normalmente
  if (isCorrect) {
    return <>{children}</>;
  }

  // Altrimenti, mostra l'overlay
  return (
    <>
      {/* Contenuto sfocato dietro */}
      <div className="blur-sm pointer-events-none opacity-30">
        {children}
      </div>

      {/* Overlay per ruotare */}
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex flex-col items-center justify-center p-8">
        {/* Icona telefono che ruota */}
        <div className="relative mb-8">
          <div 
            className={`
              text-8xl transition-transform duration-500
              ${required === 'landscape' ? 'animate-rotate-to-landscape' : 'animate-rotate-to-portrait'}
            `}
          >
            📱
          </div>
          
          {/* Freccia di rotazione */}
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 text-4xl animate-bounce">
            {required === 'landscape' ? '↪️' : '↩️'}
          </div>
        </div>

        {/* Messaggio */}
        <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
          {required === 'landscape' 
            ? '🎮 Gira il telefono!' 
            : '📱 Rimetti il telefono dritto!'}
        </h2>
        
        <p className="text-lg text-purple-200 text-center max-w-xs">
          {required === 'landscape'
            ? 'Per giocare al Trivia, metti lo smartphone in orizzontale come un vero gamepad!'
            : 'Per questa sezione, tieni il telefono in verticale.'}
        </p>

        {/* Indicatore orientamento corrente */}
        <div className="mt-8 px-4 py-2 bg-white/10 rounded-full text-purple-200 text-sm">
          Ora sei in: <span className="font-bold text-white">
            {current === 'portrait' ? 'Verticale 📱' : 'Orizzontale 📺'}
          </span>
        </div>

        {/* Hint per chi non può ruotare */}
        <p className="mt-6 text-xs text-purple-300/60 text-center">
          Se hai il blocco rotazione attivo, disabilitalo nelle impostazioni rapide
        </p>
      </div>
    </>
  );
}

// Versione semplice solo avviso (non blocca)
export function RotateScreenHint({ required }: { required: OrientationType }) {
  const { isCorrect } = useScreenOrientation({ required });

  if (isCorrect) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-yellow-500 text-yellow-900 py-2 px-4 text-center text-sm font-medium animate-pulse">
      {required === 'landscape' 
        ? '📱 ➡️ 📺 Ruota il telefono per giocare meglio!' 
        : '📺 ➡️ 📱 Rimetti il telefono in verticale!'}
    </div>
  );
}

export default RotateScreenOverlay;
