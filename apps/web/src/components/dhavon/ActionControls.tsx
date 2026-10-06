'use client';

import React from 'react';
import { Search, ClipboardList, Sparkles, BarChart2 } from 'lucide-react';
import type { ActiveMode } from '@dhavon/types';

interface ActionControlsProps {
  activeMode: ActiveMode;
  onSelectAction: (mode: ActiveMode) => void;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  activeMode,
  onSelectAction,
}) => {
  const actions: { id: ActiveMode; label: string; icon: React.ReactNode }[] = [
    { id: 'ask', label: 'Ask', icon: <Search className="w-3.5 h-3.5" /> },
    { id: 'plan', label: 'Plan', icon: <ClipboardList className="w-3.5 h-3.5" /> },
    { id: 'create', label: 'Create', icon: <Sparkles className="w-3.5 h-3.5 text-amber-300" /> },
    { id: 'analyze', label: 'Analyze', icon: <BarChart2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div
      role="group"
      aria-label="Cognitive Operating Modes"
      className="flex items-center justify-center gap-1.5 sm:gap-3 mt-3 sm:mt-3.5 z-20 select-none px-2 max-w-full overflow-x-auto"
    >
      {actions.map((act) => {
        const isActive = activeMode === act.id;
        return (
          <button
            key={act.id}
            onClick={() => onSelectAction(act.id)}
            role="button"
            aria-pressed={isActive}
            aria-label={`Select ${act.label} mode`}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-5 sm:py-2 rounded-full text-[11px] sm:text-xs font-medium transition-all duration-300 backdrop-blur-xl shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/80 ${
              isActive
                ? 'bg-[#1E2536]/90 border border-sky-400/50 text-white shadow-[0_0_15px_rgba(56,189,248,0.25)] scale-105'
                : 'bg-[#0E121B]/70 border border-white/[0.08] text-white/70 hover:text-white hover:border-white/20 hover:bg-[#161B28]/80'
            }`}
          >
            <span className={isActive ? 'text-sky-400' : 'text-white/60'}>{act.icon}</span>
            <span className="tracking-wider">{act.label}</span>
          </button>
        );
      })}
    </div>
  );
};
