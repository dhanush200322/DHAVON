'use client';

import { useState, useCallback } from 'react';
import type { OrbState, ActiveMode, SystemPhase } from '@dhavon/types';

export interface UseOrbStateReturn {
  orbState: OrbState;
  activePhase: SystemPhase;
  activeMode: ActiveMode;
  isListening: boolean;
  isHovered: boolean;
  setOrbState: (state: OrbState) => void;
  setActiveMode: (mode: ActiveMode) => void;
  toggleListening: () => void;
  setIsHovered: (hovered: boolean) => void;
  triggerAction: (mode: ActiveMode) => void;
}

export function useOrbState(initialState: OrbState = 'CALM'): UseOrbStateReturn {
  const [orbState, setOrbStateInternal] = useState<OrbState>(initialState);
  const [activeMode, setActiveMode] = useState<ActiveMode>('ask');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const activePhase: SystemPhase =
    orbState === 'LISTENING'
      ? 'LISTENING'
      : orbState === 'THINKING'
      ? 'THINKING'
      : orbState === 'ACTING'
      ? 'ACTING'
      : 'LISTENING';

  const setOrbState = useCallback((newState: OrbState) => {
    setOrbStateInternal(newState);
    if (newState === 'LISTENING') {
      setIsListening(true);
    } else {
      setIsListening(false);
    }
  }, []);

  const toggleListening = useCallback(() => {
    setIsListening((prev) => {
      const next = !prev;
      setOrbStateInternal(next ? 'LISTENING' : 'CALM');
      return next;
    });
  }, []);

  const triggerAction = useCallback((mode: ActiveMode) => {
    setActiveMode(mode);
    setOrbStateInternal('THINKING');
    // Transition back to calm after demonstrating the thinking state
    setTimeout(() => {
      setOrbStateInternal('CALM');
    }, 2800);
  }, []);

  return {
    orbState,
    activePhase,
    activeMode,
    isListening,
    isHovered,
    setOrbState,
    setActiveMode,
    toggleListening,
    setIsHovered,
    triggerAction,
  };
}
