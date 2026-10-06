'use client';

import React from 'react';
import type { ActiveMode } from '@dhavon/types';

interface MindsetBadgeProps {
  activeMode?: ActiveMode;
  isExecuting?: boolean;
}

export const MindsetBadge: React.FC<MindsetBadgeProps> = ({
  activeMode = 'ask',
  isExecuting = false,
}) => {
  const getMindsetText = () => {
    if (isExecuting) return 'Supervised Execution';
    switch (activeMode) {
      case 'plan':
        return 'Strategic Planning';
      case 'create':
        return 'Generative Synthesis';
      case 'analyze':
        return 'Deep Analysis';
      case 'ask':
      default:
        return 'Powered by Your Mindset';
    }
  };

  return (
    <div className="hidden sm:block absolute right-4 sm:right-6 lg:right-12 bottom-3 sm:bottom-6 z-20 select-none">
      <div
        title={`Cognitive Mode: ${getMindsetText()}`}
        className="flex items-center gap-2.5 px-3 sm:px-4 py-1.5 rounded-full bg-[#0D1017]/75 border border-white/[0.08] backdrop-blur-xl shadow-lg transition-all duration-300 hover:border-white/20"
      >
        <span className="text-sm font-light text-sky-400">∞</span>
        <span className="text-white/20 text-xs font-light">|</span>
        <span className="text-xs text-white/70 font-light tracking-wide">
          {getMindsetText()}
        </span>
      </div>
    </div>
  );
};
