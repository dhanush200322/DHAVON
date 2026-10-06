'use client';

import React, { useEffect } from 'react';
import { X, Sparkles, Sliders, Volume2, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
          />

          {/* Dialog Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-dialog-title"
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#0C1019]/95 p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)] backdrop-blur-2xl text-white select-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-4 h-4 text-sky-400" />
                <h3
                  id="settings-dialog-title"
                  className="font-display font-medium text-sm tracking-[0.2em] uppercase text-white"
                >
                  Observatory Settings
                </h3>
              </div>
              <button
                onClick={onClose}
                aria-label="Close settings dialog"
                className="w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Options List */}
            <div className="space-y-3.5 text-xs">
              {/* Active AI Provider */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <div>
                    <p className="font-medium text-white/90">Cognitive AI Engine</p>
                    <p className="text-[10px] text-white/40">Gemini 2.5 Pro / Flash & Groq Llama</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-400/30 text-sky-300 font-mono text-[11px]">
                  Online
                </span>
              </div>

              {/* Voice Subsystem */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-purple-400" />
                  <div>
                    <p className="font-medium text-white/90">Voice Intelligence</p>
                    <p className="text-[10px] text-white/40">Groq Whisper STT & Web Audio TTS</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-400/30 text-purple-300 font-mono text-[11px]">
                  Barge-In Ready
                </span>
              </div>

              {/* MCP Tool Registry */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="font-medium text-white/90">MCP Gateway Registry</p>
                    <p className="text-[10px] text-white/40">5 Servers / 142 Discovered Tools</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-400/30 text-emerald-300 font-mono text-[11px]">
                  Guarded
                </span>
              </div>

              {/* Permission & Security */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <div>
                    <p className="font-medium text-white/90">Permission Engine</p>
                    <p className="text-[10px] text-white/40">4-Tier Risk Gating with Ephemeral Approvals</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-mono text-[11px]">
                  Grade A+
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between text-[11px] text-white/40 font-mono">
              <span>DHAVON v1.0 — Phase 8</span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sky-400"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
