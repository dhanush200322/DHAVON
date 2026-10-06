'use client';

import React from 'react';

export const ObservatoryScene: React.FC = () => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
      {/* 1. Deep Cosmic Sky Base */}
      <div className="absolute inset-0 bg-[#040508]" />

      {/* 2. Stars Canvas/Layer */}
      <svg className="absolute inset-0 w-full h-full opacity-80" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="star-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="60%" stopColor="#93c5fd" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Constellations and twinkling stars */}
        <circle cx="8%" cy="14%" r="1" fill="#fff" opacity="0.5" />
        <circle cx="15%" cy="9%" r="1.8" fill="url(#star-glow)" opacity="0.9" />
        <circle cx="22%" cy="20%" r="0.9" fill="#fff" opacity="0.6" />
        <circle cx="31%" cy="6%" r="1.4" fill="#fff" opacity="0.75" />
        <circle cx="64%" cy="12%" r="1.2" fill="#fff" opacity="0.6" />
        <circle cx="72%" cy="18%" r="2.2" fill="url(#star-glow)" opacity="0.95" />
        <circle cx="79%" cy="8%" r="0.9" fill="#fff" opacity="0.5" />
        <circle cx="86%" cy="14%" r="1.7" fill="url(#star-glow)" opacity="0.9" />
        <circle cx="92%" cy="22%" r="1.1" fill="#fff" opacity="0.6" />
        <circle cx="58%" cy="25%" r="1" fill="#fff" opacity="0.45" />
        <circle cx="42%" cy="11%" r="1.3" fill="#fff" opacity="0.7" />
        <circle cx="50%" cy="5%" r="0.8" fill="#fff" opacity="0.4" />
      </svg>

      {/* 3. Left Horizon: Warm Sunset Mountains & Planetary Crescent */}
      <div className="absolute top-0 left-0 w-[55%] h-[72%]">
        {/* Solar Golden Atmosphere Backlight */}
        <div className="absolute bottom-[10%] left-[-15%] w-[130%] h-[85%] bg-[radial-gradient(ellipse_at_30%_70%,rgba(245,158,11,0.45)_0%,rgba(217,119,6,0.25)_30%,rgba(180,83,9,0.1)_55%,transparent_80%)]" />

        {/* Crescent Planet / Moon in Twilight */}
        <div className="absolute top-[20%] left-[36%] w-28 h-28 rounded-full pointer-events-none">
          <div className="w-full h-full rounded-full border-r-[4px] border-t-[2.5px] border-white/70 rotate-[-22deg] shadow-[-12px_0_25px_rgba(255,255,255,0.2)]" />
          <div className="absolute inset-0 rounded-full bg-slate-900/40" />
        </div>

        {/* Mountain Silhouettes Left (SVG) */}
        <svg
          viewBox="0 0 1000 600"
          className="absolute bottom-0 left-0 w-full h-[70%] object-cover opacity-95"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="sunset-far-ridge" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#78350f" stopOpacity="0.75" />
              <stop offset="45%" stopColor="#312e81" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#07090e" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="sunset-mid-ridge" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#451a03" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#05070b" stopOpacity="1" />
            </linearGradient>
            <radialGradient id="sun-core-flare" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FEF08A" stopOpacity="0.95" />
              <stop offset="25%" stopColor="#FCD34D" stopOpacity="0.7" />
              <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Golden Sun Flare on Horizon */}
          <circle cx="160" cy="360" r="160" fill="url(#sun-core-flare)" />

          {/* Distant Mountain Ridge Layer */}
          <path
            d="M0,380 L100,320 L240,360 L380,290 L520,370 L680,310 L840,350 L1000,330 L1000,600 L0,600 Z"
            fill="url(#sunset-far-ridge)"
          />

          {/* Mid Ridge Layer with Golden Rim Catching Light */}
          <path
            d="M0,440 L80,380 L190,430 L320,355 L460,445 L620,395 L780,470 L1000,430 L1000,600 L0,600 Z"
            fill="url(#sunset-mid-ridge)"
            stroke="#FCD34D"
            strokeWidth="0.8"
            strokeOpacity="0.4"
          />

          {/* Foreground Deep Silhouette */}
          <path
            d="M0,510 L120,460 L280,520 L420,470 L580,530 L740,490 L900,540 L1000,510 L1000,600 L0,600 Z"
            fill="#05070B"
          />
        </svg>
      </div>

      {/* 4. Right Horizon: Snowy Starlit Alpine Peaks */}
      <div className="absolute top-0 right-0 w-[55%] h-[72%]">
        {/* Cold Twilight Indigo Atmosphere */}
        <div className="absolute bottom-[10%] right-[-15%] w-[130%] h-[85%] bg-[radial-gradient(ellipse_at_70%_65%,rgba(99,102,241,0.22)_0%,rgba(30,27,75,0.3)_35%,transparent_75%)]" />

        {/* Snowy Majestic Peaks (SVG) */}
        <svg
          viewBox="0 0 1000 600"
          className="absolute bottom-0 right-0 w-full h-[80%] object-cover opacity-95"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="snow-facet-lit" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#94a3b8" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#1e293b" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="snow-facet-shadow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="60%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#05070B" />
            </linearGradient>
          </defs>

          {/* Far Alpine Ridge */}
          <path
            d="M0,450 L180,380 L340,430 L520,320 L720,240 L880,310 L1000,280 L1000,600 L0,600 Z"
            fill="#0F172A"
            opacity="0.8"
          />

          {/* Main Giant Alpine Mountain (Sunlit Snow Face) */}
          <path
            d="M260,600 L680,120 L730,170 L790,135 L880,220 L1000,310 L1000,600 Z"
            fill="url(#snow-facet-lit)"
          />

          {/* Shadowed Mountain Ridge Facet */}
          <path
            d="M680,120 L700,310 L760,440 L800,600 L1000,600 L1000,310 L880,220 L790,135 L730,170 Z"
            fill="url(#snow-facet-shadow)"
          />

          {/* Cloud Mist hugging mountain base */}
          <ellipse cx="650" cy="540" rx="380" ry="70" fill="#1e293b" opacity="0.45" filter="blur(30px)" />
        </svg>
      </div>

      {/* 5. Architectural Glass Panorama Frame & Curved Columns */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {/* Left Curved Structural Arch / Window Mullion */}
        <div className="hidden sm:block absolute top-0 left-[18%] w-[2.5px] h-[64%] bg-gradient-to-b from-white/15 via-white/8 to-transparent shadow-[0_0_20px_rgba(255,255,255,0.08)]" />
        <div className="hidden sm:block absolute top-0 left-[18.2%] w-14 h-[64%] bg-gradient-to-r from-black/50 to-transparent" />

        {/* Right Curved Structural Arch / Window Mullion */}
        <div className="hidden sm:block absolute top-0 right-[22%] w-[2.5px] h-[64%] bg-gradient-to-b from-white/15 via-white/8 to-transparent shadow-[0_0_20px_rgba(255,255,255,0.08)]" />
        <div className="hidden sm:block absolute top-0 right-[22.2%] w-14 h-[64%] bg-gradient-to-l from-black/50 to-transparent" />

        {/* Outer Architectural Pillars */}
        <div className="hidden xl:block absolute top-0 left-0 w-28 h-full bg-gradient-to-r from-black via-[#0B0D13]/85 to-transparent" />
        <div className="hidden xl:block absolute top-0 right-0 w-28 h-full bg-gradient-to-l from-black via-[#0B0D13]/85 to-transparent" />

        {/* Horizontal Curved Sill / Rim Beam */}
        <div className="absolute top-[62%] left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-amber-400/35 via-sky-400/30 to-transparent shadow-[0_0_15px_rgba(245,158,11,0.3)]" />
      </div>

      {/* 6. Polished Obsidian Floor & Mirror Horizon Reflections */}
      <div className="absolute bottom-0 left-0 w-full h-[38%] bg-gradient-to-b from-[#090C13] via-[#05070B] to-[#040508] border-t border-white/[0.06]">
        {/* Mirror Reflection of Sunset Gold on Left Floor */}
        <div className="absolute top-0 left-[6%] w-[42%] h-full bg-[radial-gradient(ellipse_at_30%_0%,rgba(245,158,11,0.28)_0%,rgba(217,119,6,0.1)_50%,transparent_80%)] blur-md" />

        {/* Mirror Reflection of Starlit Peak Blue on Right Floor */}
        <div className="absolute top-0 right-[8%] w-[38%] h-full bg-[radial-gradient(ellipse_at_70%_0%,rgba(99,102,241,0.18)_0%,rgba(56,189,248,0.06)_50%,transparent_80%)] blur-md" />

        {/* Central Pedestal Radiant Golden Amber Reflection Pool */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[520px] h-[90%] bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,158,11,0.55)_0%,rgba(252,211,77,0.3)_25%,rgba(139,92,246,0.15)_55%,transparent_80%)] blur-sm" />

        {/* Mirror Sheen Specular Line */}
        <div className="absolute top-0 left-[12%] right-[12%] h-[1.5px] bg-gradient-to-r from-transparent via-amber-300/50 via-white/40 to-transparent shadow-[0_0_15px_rgba(252,211,77,0.7)]" />

        {/* Subtle Floor Depth Mask */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#040508] via-transparent to-transparent opacity-75" />
      </div>
    </div>
  );
};
