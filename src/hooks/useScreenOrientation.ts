// 🐺 LUPO GAMES - Hook per Screen Orientation
// Perché giocare a trivia in portrait è da masochisti

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { OrientationType } from '@/types';

interface UseScreenOrientationOptions {
  // Orientamento richiesto per questo gioco/fase
  required?: OrientationType;
  // Callback quando l'orientamento cambia
  onChange?: (orientation: OrientationType) => void;
  // Tenta di bloccare l'orientamento (funziona solo in fullscreen su alcuni browser)
  lockOrientation?: boolean;
}

interface ScreenOrientationState {
  // Orientamento corrente
  current: OrientationType;
  // Se l'orientamento è quello richiesto
  isCorrect: boolean;
  // Se il browser supporta l'API Screen Orientation
  isSupported: boolean;
  // Se il lock è attivo
  isLocked: boolean;
  // Angolo di rotazione
  angle: number;
}

export function useScreenOrientation({
  required,
  onChange,
  lockOrientation = false,
}: UseScreenOrientationOptions = {}) {
  const [state, setState] = useState<ScreenOrientationState>({
    current: 'portrait',
    isCorrect: true,
    isSupported: false,
    isLocked: false,
    angle: 0,
  });

  // Determina l'orientamento corrente
  const getOrientation = useCallback((): OrientationType => {
    if (typeof window === 'undefined') return 'portrait';
    
    // Prima prova con l'API Screen Orientation
    if (screen.orientation) {
      const type = screen.orientation.type;
      return type.includes('landscape') ? 'landscape' : 'portrait';
    }
    
    // Fallback: confronta larghezza e altezza
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }, []);

  // Aggiorna lo stato
  const updateOrientation = useCallback(() => {
    const current = getOrientation();
    const angle = screen.orientation?.angle ?? 0;
    const isCorrect = required ? current === required : true;

    setState(prev => ({
      ...prev,
      current,
      angle,
      isCorrect,
    }));

    onChange?.(current);
  }, [getOrientation, required, onChange]);

  // Tenta di bloccare l'orientamento
  const lockToOrientation = useCallback(async (orientation: OrientationType) => {
    if (typeof window === 'undefined') return false;

    type LockType = 'any' | 'natural' | 'landscape' | 'portrait' | 
                    'portrait-primary' | 'portrait-secondary' | 
                    'landscape-primary' | 'landscape-secondary';

    const orientationAPI = screen.orientation as ScreenOrientation & {
      lock?: (orientation: LockType) => Promise<void>;
    };

    if (!orientationAPI?.lock) {
      console.warn('🐺 Screen Orientation Lock non supportato');
      return false;
    }

    try {
      // Il lock funziona solo in fullscreen su molti browser
      if (document.fullscreenElement === null) {
        await document.documentElement.requestFullscreen?.();
      }

      const lockType: LockType = orientation === 'landscape' 
        ? 'landscape-primary' 
        : 'portrait-primary';

      await orientationAPI.lock(lockType);
      setState(prev => ({ ...prev, isLocked: true }));
      console.log(`🐺 Orientamento bloccato in ${orientation}`);
      return true;
    } catch (error) {
      console.warn('🐺 Impossibile bloccare orientamento:', error);
      return false;
    }
  }, []);

  // Sblocca l'orientamento
  const unlockOrientation = useCallback(() => {
    if (typeof window === 'undefined') return;

    const orientationAPI = screen.orientation as ScreenOrientation & {
      unlock?: () => void;
    };

    orientationAPI?.unlock?.();
    setState(prev => ({ ...prev, isLocked: false }));
    console.log('🐺 Orientamento sbloccato');
  }, []);

  // Setup listeners
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check supporto API
    const isSupported = 'orientation' in screen;
    setState(prev => ({ ...prev, isSupported }));

    // Initial check
    updateOrientation();

    // Listener per cambi orientamento
    const handleOrientationChange = () => {
      updateOrientation();
    };

    // Usa l'evento dell'API se disponibile, altrimenti resize
    if (screen.orientation) {
      screen.orientation.addEventListener('change', handleOrientationChange);
    }
    window.addEventListener('resize', handleOrientationChange);

    // Auto-lock se richiesto
    if (lockOrientation && required) {
      lockToOrientation(required);
    }

    return () => {
      if (screen.orientation) {
        screen.orientation.removeEventListener('change', handleOrientationChange);
      }
      window.removeEventListener('resize', handleOrientationChange);
      
      // Sblocca al cleanup
      if (state.isLocked) {
        unlockOrientation();
      }
    };
  }, [updateOrientation, lockOrientation, required, lockToOrientation, unlockOrientation, state.isLocked]);

  return {
    ...state,
    lockToOrientation,
    unlockOrientation,
    requestLandscape: () => lockToOrientation('landscape'),
    requestPortrait: () => lockToOrientation('portrait'),
  };
}

export default useScreenOrientation;
