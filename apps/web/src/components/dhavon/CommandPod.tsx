'use client';

import React, { useState } from 'react';
import { Mic, MicOff, ArrowUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ActiveMode } from '@dhavon/types';

interface CommandPodProps {
  isListening: boolean;
  onToggleListening: () => void;
  onSubmitText?: (text: string) => void;
  audioLevel?: number;
  activeMode?: ActiveMode;
}

export const CommandPod: React.FC<CommandPodProps> = ({
  isListening,
  onToggleListening,
  onSubmitText,
  audioLevel = 0,
  activeMode = 'ask',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = () => {
    if (inputValue.trim()) {
      if (onSubmitText) {
        onSubmitText(inputValue.trim());
      }
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const getPlaceholder = () => {
    if (isListening) return 'Listening to your voice...';
    switch (activeMode) {
      case 'plan':
        return 'Describe a goal to plan...';
      case 'create':
        return 'Tell DHAVON what to create...';
      case 'analyze':
        return 'Specify what you want to analyze...';
      case 'ask':
      default:
        return 'Talk or type to DHAVON...';
    }
  };

  return (
    <div
      role="search"
      aria-label="DHAVON Command Pod"
      className="relative w-full max-w-[620px] px-4 z-20 select-none"
    >
      {/* Outer Pod Glow when active or focused */}
      <div
        className={`absolute inset-0 rounded-full transition-opacity duration-700 pointer-events-none ${
          isListening
            ? 'opacity-100 bg-[radial-gradient(ellipse_at_center,rgba(168,85,247,0.35)_0%,rgba(56,189,248,0.2)_50%,transparent_75%)] blur-xl'
            : isFocused
            ? 'opacity-80 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.2)_0%,transparent_70%)] blur-lg'
            : 'opacity-0'
        }`}
      />

      {/* Main Glassmorphic Capsule */}
      <div
        className={`relative flex items-center justify-between w-full h-14 sm:h-16 px-4 sm:px-6 rounded-full bg-[#0B0E15]/85 border transition-all duration-300 backdrop-blur-2xl shadow-[0_12px_40px_-10px_rgba(0,0,0,0.8)] ${
          isListening
            ? 'border-purple-400/50 shadow-[0_0_30px_rgba(168,85,247,0.3)]'
            : isFocused
            ? 'border-sky-400/40 shadow-[0_0_25px_rgba(56,189,248,0.2)]'
            : 'border-white/10 hover:border-white/20'
        }`}
      >
        {/* Left Side: Audio Waveform Bars with acoustic audioLevel reaction */}
        <div
          aria-hidden="true"
          className="flex items-center gap-[3px] sm:gap-[3.5px] h-6 mr-2 sm:mr-3 text-white/60 shrink-0"
        >
          {[40, 75, 100, 60, 90, 45, 30].map((heightPct, idx) => {
            const dynamicScale = isListening
              ? Math.max(0.25, Math.min(1.0, 0.35 + audioLevel * 0.9 + (idx % 2 === 0 ? 0.1 : -0.05)))
              : 0.5;

            return (
              <motion.span
                key={idx}
                animate={{
                  height: isListening
                    ? [`${heightPct * dynamicScale * 0.5}%`, `${heightPct * dynamicScale}%`, `${heightPct * dynamicScale * 0.4}%`]
                    : [`${heightPct * 0.4}%`, `${heightPct * 0.65}%`, `${heightPct * 0.4}%`],
                  opacity: isListening ? 1 : 0.65,
                }}
                transition={{
                  duration: isListening ? 0.35 + idx * 0.05 : 1.8 + idx * 0.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className={`w-[2.5px] rounded-full transition-colors ${
                  isListening
                    ? 'bg-gradient-to-t from-sky-400 to-purple-400'
                    : 'bg-white/50'
                }`}
                style={{ height: `${heightPct * 0.5}%` }}
              />
            );
          })}
        </div>

        {/* Center: Command Input */}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          aria-label="Command input"
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/45 text-xs sm:text-sm md:text-base font-light tracking-wide focus:ring-0 px-1 sm:px-2 min-w-0"
        />

        {/* Action Controls Right: Clear button & Send Button & Mic Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Clear button when input has text */}
          <AnimatePresence>
            {inputValue.trim().length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setInputValue('')}
                aria-label="Clear input text"
                className="w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Send Arrow Button when input has text */}
          <AnimatePresence>
            {inputValue.trim().length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleSubmit}
                aria-label="Submit command"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-sky-500/20 border border-sky-400/50 hover:bg-sky-500/30 text-sky-300 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400"
              >
                <ArrowUp className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Radiant Glowing Microphone Action Button */}
          <div className="relative flex items-center justify-center">
            {/* Pulsing Radiance Wave in Listening State */}
            <AnimatePresence>
              {isListening && (
                <>
                  <motion.div
                    initial={{ scale: 1, opacity: 0.8 }}
                    animate={{ scale: 1.8, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-purple-400/80 pointer-events-none"
                  />
                  <motion.div
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ scale: 2.3, opacity: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.4, delay: 0.4, repeat: Infinity, ease: 'easeOut' }}
                    className="absolute w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-cyan-400/60 pointer-events-none"
                  />
                </>
              )}
            </AnimatePresence>

            <button
              onClick={onToggleListening}
              aria-label={isListening ? 'Stop voice recording' : 'Start voice interaction'}
              className={`relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 ${
                isListening
                  ? 'bg-gradient-to-tr from-purple-600 via-indigo-500 to-sky-400 shadow-[0_0_25px_rgba(168,85,247,0.85)] scale-105'
                  : 'bg-gradient-to-br from-[#1E2536] to-[#0E131E] border border-white/20 hover:border-purple-400/60 hover:shadow-[0_0_20px_rgba(168,85,247,0.4)]'
              }`}
            >
              {/* Luminous Inner Ring */}
              <div className="absolute inset-[2px] rounded-full border border-white/30 pointer-events-none" />

              {isListening ? (
                <MicOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              ) : (
                <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-white/90 group-hover:text-white transition-colors" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
