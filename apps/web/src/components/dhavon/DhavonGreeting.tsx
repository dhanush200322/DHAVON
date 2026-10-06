'use client';

import React from 'react';
import { motion } from 'framer-motion';

export const DhavonGreeting: React.FC = () => {
  const [salutation, setSalutation] = React.useState('GOOD EVENING');

  React.useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setSalutation('GOOD MORNING');
    } else if (hour >= 12 && hour < 17) {
      setSalutation('GOOD AFTERNOON');
    } else if (hour >= 17 && hour < 22) {
      setSalutation('GOOD EVENING');
    } else {
      setSalutation('GOOD NIGHT');
    }
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      className="flex flex-col items-center justify-center text-center z-20 pointer-events-none select-none my-1 px-4"
    >
      {/* Dynamic sub-heading greeting */}
      <span className="font-display font-light text-[11px] sm:text-xs lg:text-sm tracking-[0.3em] sm:tracking-[0.35em] text-white/70 uppercase mb-0.5">
        {salutation}
      </span>

      {/* Primary Luminous Name with cool-to-warm subtle shift */}
      <h1 className="font-display font-light text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] tracking-[0.22em] sm:tracking-[0.3em] bg-gradient-to-r from-blue-100 via-slate-100 to-amber-200 bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(255,255,255,0.12)] my-0.5">
        D H A N U S H
      </h1>

      {/* Atmospheric subtext */}
      <p className="text-[9px] sm:text-[10px] lg:text-[11px] tracking-[0.2em] sm:tracking-[0.28em] text-white/50 uppercase font-medium mt-0.5 sm:mt-1">
        YOUR PERSONAL AI, ALWAYS WITH YOU
      </p>
    </motion.div>
  );
};
