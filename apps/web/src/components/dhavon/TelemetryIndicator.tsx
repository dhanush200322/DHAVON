'use client';

import React from 'react';
import type { OrbState } from '@dhavon/types';

interface TelemetryIndicatorProps {
  state: OrbState;
  isConnected?: boolean;
  activeTaskStatus?: string | null;
}

export const TelemetryIndicator: React.FC<TelemetryIndicatorProps> = ({
  state,
  isConnected = true,
  activeTaskStatus,
}) => {
  const isListening = state === 'LISTENING';
  const isThinking = state === 'THINKING';
  const isActing = state === 'ACTING';
  const isError = state === 'ERROR';

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`System telemetry: state ${state}, ${isConnected ? 'online' : 'connecting'}`}
      className="absolute left-4 sm:left-6 lg:left-12 bottom-3 sm:bottom-6 z-20 flex items-center gap-2.5 sm:gap-3.5 select-none pointer-events-none"
    >
      {/* Miniature Glowing Energy Orb */}
      <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-900/60 to-purple-700/60 border border-purple-400/40 shadow-[0_0_12px_rgba(139,92,246,0.5)]">
        <div
          className={`w-2.5 h-2.5 rounded-full animate-pulse ${
            isError
              ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
              : isActing
              ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
              : isThinking
              ? 'bg-purple-400 shadow-[0_0_8px_#c084fc]'
              : isListening
              ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8]'
              : isConnected
              ? 'bg-gradient-to-r from-sky-400 to-purple-300 shadow-[0_0_6px_#38BDF8]'
              : 'bg-amber-500 shadow-[0_0_6px_#f59e0b]'
          }`}
        />
      </div>

      {/* Stacked 3-Phase State Text + Optional Active Task */}
      <div className="flex flex-col text-[9px] lg:text-[10px] font-mono tracking-[0.25em] leading-tight space-y-0.5">
        <span
          className={`transition-colors duration-300 ${
            isListening ? 'text-sky-300 font-semibold drop-shadow-[0_0_8px_rgba(56,189,248,0.7)]' : 'text-white/30'
          }`}
        >
          LISTENING
        </span>
        <span
          className={`transition-colors duration-300 ${
            isThinking ? 'text-purple-300 font-semibold drop-shadow-[0_0_8px_rgba(192,132,252,0.7)]' : 'text-white/30'
          }`}
        >
          THINKING
        </span>
        <span
          className={`transition-colors duration-300 ${
            isActing ? 'text-amber-300 font-semibold drop-shadow-[0_0_8px_rgba(252,211,77,0.7)]' : 'text-white/30'
          }`}
        >
          ACTING
        </span>
        {activeTaskStatus && (
          <span className="text-[8px] text-cyan-300/80 font-mono tracking-wider truncate max-w-[140px] sm:max-w-[200px]">
            {activeTaskStatus}
          </span>
        )}
      </div>
    </div>
  );
};
