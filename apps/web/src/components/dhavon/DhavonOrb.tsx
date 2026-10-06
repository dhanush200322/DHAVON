'use client';

import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { OrbState } from '@dhavon/types';

interface DhavonOrbProps {
  state: OrbState;
  isHovered: boolean;
  onHoverChange: (hovered: boolean) => void;
  onClick?: () => void;
}

export const DhavonOrb: React.FC<DhavonOrbProps> = ({
  state,
  isHovered,
  onHoverChange,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Soft atmospheric volumetric intelligence core simulation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let t = 0;

    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const baseSize = 500;
    canvas.width = baseSize * dpr;
    canvas.height = baseSize * dpr;

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // State parameters: restrained, intelligent, non-chaotic
    const getStateParams = () => {
      const motionScale = prefersReduced ? 0.2 : 1.0;
      switch (state) {
        case 'LISTENING':
          return { speed: 0.007 * motionScale, cyanInt: 0.32, violetInt: 0.22, amberInt: 0.18, redInt: 0, pulse: 1.1 };
        case 'THINKING':
          return { speed: 0.012 * motionScale, cyanInt: 0.26, violetInt: 0.36, amberInt: 0.22, redInt: 0, pulse: 1.2 };
        case 'ACTING':
          return { speed: 0.007 * motionScale, cyanInt: 0.14, violetInt: 0.18, amberInt: 0.48, redInt: 0, pulse: 1.12 };
        case 'ERROR':
          return { speed: 0.003 * motionScale, cyanInt: 0.08, violetInt: 0.14, amberInt: 0.10, redInt: 0.42, pulse: 0.95 };
        case 'CALM':
        default:
          return { speed: 0.0045 * motionScale, cyanInt: 0.22, violetInt: 0.22, amberInt: 0.18, redInt: 0, pulse: 1.0 };
      }
    };

    const render = () => {
      const p = getStateParams();
      t += p.speed;

      ctx.save();
      ctx.scale(dpr, dpr);

      const w = baseSize;
      const h = baseSize;
      const cx = w / 2;
      const cy = h / 2;
      const radius = w * 0.44;

      ctx.clearRect(0, 0, w, h);

      // Clip strictly within spherical volume
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      // 1. Transparent Deep Dark Background (Atmospheric container)
      const bgGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      bgGrad.addColorStop(0, 'rgba(8, 11, 20, 0.72)');
      bgGrad.addColorStop(0.65, 'rgba(5, 7, 14, 0.82)');
      bgGrad.addColorStop(1, 'rgba(3, 4, 8, 0.90)');
      ctx.fillStyle = bgGrad;
      ctx.fill();

      // 2. Soft Internal Volumetric Energy Clouds (Nebula-like atmospheric fields)
      ctx.globalCompositeOperation = 'screen';

      if (p.redInt > 0) {
        // Controlled Warning / Error Stabilizer Nebula
        const ge = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.75);
        ge.addColorStop(0, `rgba(239, 68, 68, ${p.redInt * 0.9})`);
        ge.addColorStop(0.5, `rgba(185, 28, 28, ${p.redInt * 0.45})`);
        ge.addColorStop(1, 'transparent');
        ctx.fillStyle = ge;
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cloud 1: Deep Blue / Azure Electromagnetic Volume (Slow harmonic drift)
      const x1 = cx + Math.cos(t * 0.8) * (radius * 0.25);
      const y1 = cy + Math.sin(t * 0.7) * (radius * 0.2);
      const g1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, radius * 0.65);
      g1.addColorStop(0, `rgba(37, 99, 235, ${p.cyanInt * 1.1})`);
      g1.addColorStop(0.5, `rgba(30, 58, 138, ${p.cyanInt * 0.45})`);
      g1.addColorStop(1, 'transparent');
      ctx.fillStyle = g1;
      ctx.beginPath();
      ctx.arc(x1, y1, radius * 0.65, 0, Math.PI * 2);
      ctx.fill();

      // Cloud 2: Ethereal Violet / Indigo Cloud
      const x2 = cx + Math.cos(-t * 0.9 + 2.0) * (radius * 0.22);
      const y2 = cy + Math.sin(t * 0.85 + 1.0) * (radius * 0.24);
      const g2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, radius * 0.6);
      g2.addColorStop(0, `rgba(139, 92, 246, ${p.violetInt * 1.05})`);
      g2.addColorStop(0.5, `rgba(79, 70, 229, ${p.violetInt * 0.4})`);
      g2.addColorStop(1, 'transparent');
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(x2, y2, radius * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Cloud 3: Subtle Electric Cyan Focus
      const x3 = cx + Math.cos(t * 1.1 + 4.0) * (radius * 0.15);
      const y3 = cy + Math.sin(-t * 1.0 + 3.0) * (radius * 0.18);
      const g3 = ctx.createRadialGradient(x3, y3, 0, x3, y3, radius * 0.5);
      g3.addColorStop(0, `rgba(56, 189, 248, ${p.cyanInt * 0.85})`);
      g3.addColorStop(0.6, 'transparent');
      ctx.fillStyle = g3;
      ctx.beginPath();
      ctx.arc(x3, y3, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Cloud 4: Muted Warm Amber Glow in Lower Region
      const ya = cy + radius * 0.55 + Math.sin(t * 0.5) * (radius * 0.06);
      const ga = ctx.createRadialGradient(cx, ya, 0, cx, ya, radius * 0.55);
      ga.addColorStop(0, `rgba(245, 158, 11, ${p.amberInt * 0.9})`);
      ga.addColorStop(0.5, `rgba(217, 119, 6, ${p.amberInt * 0.35})`);
      ga.addColorStop(1, 'transparent');
      ctx.fillStyle = ga;
      ctx.beginPath();
      ctx.arc(cx, ya, radius * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // 3. Dark Inner Central Core behind the D Symbol
      ctx.globalCompositeOperation = 'source-over';
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.35);
      coreGrad.addColorStop(0, 'rgba(4, 6, 12, 0.78)');
      coreGrad.addColorStop(0.65, 'rgba(5, 8, 16, 0.45)');
      coreGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // 4. Subtle Vertical Energy Scanning Axis Lines
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.14)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - radius);
      ctx.lineTo(cx, cy + radius);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.beginPath();
      ctx.moveTo(cx - 24, cy - radius * 0.95);
      ctx.lineTo(cx - 24, cy + radius * 0.95);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(253, 230, 138, 0.08)';
      ctx.beginPath();
      ctx.moveTo(cx + 24, cy - radius * 0.95);
      ctx.lineTo(cx + 24, cy + radius * 0.95);
      ctx.stroke();

      ctx.restore();

      // 5. Very Thin, Luminous Outer Rim with Dual-Tone Gradient
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 0.75, 0, Math.PI * 2);
      ctx.lineWidth = 1.4;

      const rimGrad = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
      if (state === 'ERROR') {
        rimGrad.addColorStop(0, 'rgba(239, 68, 68, 0.55)');
        rimGrad.addColorStop(0.5, 'rgba(244, 63, 94, 0.40)');
        rimGrad.addColorStop(1, 'rgba(185, 28, 28, 0.60)');
      } else {
        rimGrad.addColorStop(0, 'rgba(147, 197, 253, 0.45)');
        rimGrad.addColorStop(0.4, 'rgba(168, 85, 247, 0.35)');
        rimGrad.addColorStop(0.75, 'rgba(252, 211, 77, 0.38)');
        rimGrad.addColorStop(1, 'rgba(245, 158, 11, 0.45)');
      }

      ctx.strokeStyle = rimGrad;
      ctx.stroke();

      // Delicate upper-left specular glass arc
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 1.5, Math.PI * 1.15, Math.PI * 1.4);
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.stroke();

      ctx.restore();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [state]);

  return (
    <div className="relative flex flex-col items-center justify-center my-auto z-20 select-none">
      {/* Outer Soft Atmospheric Glow (Restrained) */}
      <div
        className={`absolute w-[260px] h-[260px] sm:w-[320px] sm:h-[320px] lg:w-[380px] lg:h-[380px] rounded-full transition-all duration-1000 pointer-events-none ${
          state === 'LISTENING'
            ? 'bg-[radial-gradient(circle,rgba(56,189,248,0.22)_0%,rgba(139,92,246,0.12)_45%,transparent_70%)] scale-105'
            : state === 'THINKING'
            ? 'bg-[radial-gradient(circle,rgba(168,85,247,0.25)_0%,rgba(56,189,248,0.12)_45%,transparent_70%)] scale-108'
            : state === 'ACTING'
            ? 'bg-[radial-gradient(circle,rgba(245,158,11,0.22)_0%,rgba(252,211,77,0.14)_40%,transparent_70%)] scale-106'
            : state === 'ERROR'
            ? 'bg-[radial-gradient(circle,rgba(239,68,68,0.20)_0%,rgba(185,28,28,0.10)_45%,transparent_70%)] scale-102'
            : 'bg-[radial-gradient(circle,rgba(56,189,248,0.12)_0%,rgba(139,92,246,0.08)_45%,rgba(245,158,11,0.04)_65%,transparent_70%)]'
        }`}
      />

      {/* Main Transparent Intelligence Core */}
      <motion.div
        role="button"
        tabIndex={0}
        aria-label={`DHAVON Intelligence Core, State: ${state}. Click to toggle voice listening.`}
        animate={{
          scale: isHovered ? 1.025 : [1, 1.018, 1],
          y: isHovered ? -3 : 0,
        }}
        transition={{
          scale: { duration: 7, ease: 'easeInOut', repeat: Infinity },
          y: { duration: 0.35, ease: 'easeOut' },
        }}
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        className="relative w-[210px] h-[210px] sm:w-[260px] sm:h-[260px] lg:w-[310px] lg:h-[310px] rounded-full cursor-pointer flex items-center justify-center shadow-[0_0_40px_rgba(56,189,248,0.12),0_0_60px_rgba(139,92,246,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70"
      >
        {/* Layer 1: Soft Volumetric Energy Canvas (High DPI crisp rendering) */}
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-full"
        />

        {/* Layer 2: Ultra-Thin Mathematical Orbital Trajectories (SVG) */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Orbit 1: Equatorial Trajectory (25° inclination) */}
          <div className="absolute inset-[-10%] animate-[spin_40s_linear_infinite]">
            <svg viewBox="0 0 400 400" className="w-full h-full">
              <ellipse
                cx="200"
                cy="200"
                rx="185"
                ry="58"
                fill="none"
                stroke="url(#orbit1-soft-grad)"
                strokeWidth="0.8"
                transform="rotate(25 200 200)"
                opacity="0.5"
              />
              {/* Particle 1: Warm Gold micro-point */}
              <circle cx="370" cy="225" r="2.5" fill="#FDE047" filter="drop-shadow(0 0 4px #F59E0B)" />
              <defs>
                <linearGradient id="orbit1-soft-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.6" />
                  <stop offset="50%" stopColor="#FCD34D" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#818CF8" stopOpacity="0.2" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Orbit 2: Polar Trajectory (-35° inclination) */}
          <div className="absolute inset-[-12%] animate-[spin_32s_linear_infinite_reverse]">
            <svg viewBox="0 0 400 400" className="w-full h-full">
              <ellipse
                cx="200"
                cy="200"
                rx="190"
                ry="52"
                fill="none"
                stroke="url(#orbit2-soft-grad)"
                strokeWidth="0.8"
                transform="rotate(-35 200 200)"
                opacity="0.45"
              />
              {/* Particle 2: Electric Cyan micro-point */}
              <circle cx="340" cy="110" r="2.2" fill="#38BDF8" filter="drop-shadow(0 0 4px #38BDF8)" />
              <defs>
                <linearGradient id="orbit2-soft-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#C084FC" stopOpacity="0.6" />
                  <stop offset="60%" stopColor="#38BDF8" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#818CF8" stopOpacity="0.15" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Orbit 3: High Angle Inclined Orbit (65° inclination) */}
          <div className="absolute inset-[-6%] animate-[spin_52s_linear_infinite]">
            <svg viewBox="0 0 400 400" className="w-full h-full">
              <ellipse
                cx="200"
                cy="200"
                rx="175"
                ry="44"
                fill="none"
                stroke="#60A5FA"
                strokeWidth="0.75"
                transform="rotate(65 200 200)"
                opacity="0.32"
              />
              {/* Particle 3: Starlit Pearl micro-point */}
              <circle cx="200" cy="28" r="2" fill="#FFFFFF" opacity="0.85" filter="drop-shadow(0 0 3px #FFFFFF)" />
            </svg>
          </div>
        </div>

        {/* Layer 3: Central Simple Geometric Gold 'D' Identity Mark (Situated inside the core) */}
        <div className="absolute z-30 pointer-events-none drop-shadow-[0_0_15px_rgba(252,211,77,0.55)]">
          <svg
            viewBox="0 0 32 32"
            className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Geometric Gold D Body */}
            <path
              d="M7 5h9a9 9 0 0 1 9 9v2a9 9 0 0 1-9 9H7V5z"
              fill="url(#simple_gold_d_gradient)"
            />
            {/* Clean Dark Inner Cutout */}
            <path
              d="M12 9.5h4a4.5 4.5 0 0 1 4.5 4.5v1a4.5 4.5 0 0 1-4.5 4.5h-4V9.5z"
              fill="#060810"
            />
            <defs>
              <linearGradient id="simple_gold_d_gradient" x1="7" y1="5" x2="25" y2="25" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FFFBEB" />
                <stop offset="0.35" stopColor="#FDE68A" />
                <stop offset="0.75" stopColor="#F59E0B" />
                <stop offset="1" stopColor="#D97706" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </motion.div>

      {/* Layer 4: Redesigned Floating Circular Energy Stabilizer Platform */}
      <div className="relative -mt-6 sm:-mt-8 flex flex-col items-center justify-center pointer-events-none z-10">
        {/* Floating Circular Platform (Perspective Ellipse) */}
        <div className="relative w-[280px] sm:w-[330px] lg:w-[360px] h-[44px]">
          {/* Base Dark Platform Surface with Thin Gold Outer Rim */}
          <div className="absolute inset-0 rounded-[100%] border border-amber-400/40 shadow-[0_0_14px_rgba(245,158,11,0.25),inset_0_0_8px_rgba(252,211,77,0.18)] bg-gradient-to-b from-[#111622] to-[#06080F]" />

          {/* Inner Gold Elliptical Track */}
          <div className="absolute inset-[16%] rounded-[100%] border border-amber-300/30" />

          {/* Small Warm Central Energy Light Point */}
          <div className="absolute inset-x-0 top-[38%] mx-auto w-12 h-2.5 rounded-full bg-amber-300/40 blur-[2.5px] opacity-80" />
        </div>

        {/* Soft Warm Floor Reflection Beneath Platform (Subtle, blurred, low opacity) */}
        <div className="w-[340px] sm:w-[380px] h-[30px] -mt-1 rounded-[100%] bg-[radial-gradient(ellipse_at_50%_0%,rgba(245,158,11,0.25)_0%,rgba(217,119,6,0.08)_45%,transparent_75%)] blur-md" />
      </div>
    </div>
  );
};
