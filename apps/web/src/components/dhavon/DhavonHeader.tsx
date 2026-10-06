'use client';

import React from 'react';
import { Settings } from 'lucide-react';

interface DhavonHeaderProps {
  onOpenSettings?: () => void;
  isConnected?: boolean;
}

export const DhavonHeader: React.FC<DhavonHeaderProps> = ({
  onOpenSettings,
  isConnected = true,
}) => {
  return (
    <header className="w-full flex items-center justify-between px-4 sm:px-6 lg:px-12 py-3.5 sm:py-5 z-30 select-none">
      {/* Top Left: DHAVON Identity */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 group cursor-default">
        {/* Stylized Luminous 'D' Mark */}
        <div className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-white/10 to-white/5 border border-white/15 shadow-[0_0_15px_rgba(56,189,248,0.25)]">
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-500 group-hover:scale-105"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 4h6.5a7.5 7.5 0 0 1 7.5 7.5v1a7.5 7.5 0 0 1-7.5 7.5H6V4z"
              fill="url(#d_logo_gradient)"
            />
            <path
              d="M10 8h2.5a3.5 3.5 0 0 1 3.5 3.5v1a3.5 3.5 0 0 1-3.5 3.5H10V8z"
              fill="#07090E"
            />
            <defs>
              <linearGradient id="d_logo_gradient" x1="6" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                <stop stopColor="#60A5FA" />
                <stop offset="0.5" stopColor="#C084FC" />
                <stop offset="1" stopColor="#FCD34D" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <div className="flex flex-col">
          <span className="font-display font-semibold text-xs sm:text-sm lg:text-base tracking-[0.35em] text-white leading-tight">
            DHAVON
          </span>
          <span className="text-[8px] sm:text-[9px] lg:text-[10px] tracking-[0.25em] text-white/50 uppercase font-mono mt-0.5">
            PERSONAL AI OS
          </span>
        </div>
      </div>

      {/* Top Center: Minimal Philosophy Text */}
      <div className="hidden md:flex items-center gap-3 text-[11px] lg:text-xs tracking-[0.25em] text-white/60 font-medium">
        <span>THINK</span>
        <span className="text-white/30">•</span>
        <span>PLAN</span>
        <span className="text-white/30">•</span>
        <span>BUILD</span>
        <span className="text-white/30">•</span>
        <span>GROW</span>
      </div>

      {/* Top Right: Status Pill & Settings */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Real Status & Profile Pill */}
        <div
          aria-label={`System connection status: ${isConnected ? 'Online' : 'Reconnecting'}`}
          className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-[#0D1017]/70 border border-white/10 backdrop-blur-xl shadow-lg"
        >
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                isConnected
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
              }`}
            />
          </span>
          <span className="hidden sm:inline text-xs text-white/80 font-normal">
            {isConnected ? 'Online' : 'Connecting'}
          </span>
          <span className="hidden sm:inline text-white/20 text-xs">|</span>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500/40 to-purple-600/40 border border-purple-400/40 flex items-center justify-center text-[10px] font-semibold text-purple-200">
              D
            </div>
            <span className="hidden sm:inline text-xs text-white/90 font-medium">Dhanush</span>
          </div>
        </div>

        {/* Minimal Settings Trigger */}
        <button
          onClick={onOpenSettings}
          aria-label="Settings and System Preferences"
          className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0D1017]/70 border border-white/10 hover:border-white/25 hover:bg-white/10 transition-all duration-300 text-white/70 hover:text-white backdrop-blur-xl shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60"
        >
          <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-500 hover:rotate-45" />
        </button>
      </div>
    </header>
  );
};
