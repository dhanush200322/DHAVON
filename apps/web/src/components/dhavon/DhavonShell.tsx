'use client';

import React, { useState, useEffect } from 'react';
import { ObservatoryScene } from './ObservatoryScene';
import { DhavonHeader } from './DhavonHeader';
import { DhavonGreeting } from './DhavonGreeting';
import { DhavonOrb } from './DhavonOrb';
import { CommandPod } from './CommandPod';
import { ActionControls } from './ActionControls';
import { AmbientText } from './AmbientText';
import { TelemetryIndicator } from './TelemetryIndicator';
import { MindsetBadge } from './MindsetBadge';
import { SettingsModal } from './SettingsModal';
import { useOrbState } from '@/hooks/useOrbState';
import { useVoiceIntelligence } from '@/hooks/useVoiceIntelligence';
import { dhavonClient, ToolConfirmationPayload } from '@/lib/dhavon-client';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, ShieldAlert, Check } from 'lucide-react';

export const DhavonShell: React.FC = () => {
  const {
    orbState,
    activeMode,
    isHovered,
    setIsHovered,
    triggerAction,
    setOrbState,
    setActiveMode,
  } = useOrbState();

  const {
    isListening,
    isSpeaking,
    activeTranscript,
    audioLevel,
    voiceError,
    toggleListening,
    interruptPlayback,
  } = useVoiceIntelligence({
    onTranscript: (transcript) => {
      setActivePrompt(transcript);
    },
    onResponse: (response) => {
      setStreamedText(response);
      setIsStreaming(false);
    },
    onOrbStateChange: (state) => {
      setOrbState(state);
    },
  });

  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [streamedText, setStreamedText] = useState<string>('');
  const [activePrompt, setActivePrompt] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<ToolConfirmationPayload | null>(null);
  const [activeTaskStatus, setActiveTaskStatus] = useState<string | null>(null);
  const [goalProgress, setGoalProgress] = useState<number | null>(null);

  // Connect to DHAVON WebSocket Gateway on mount
  useEffect(() => {
    dhavonClient.connect();

    // Listen for connection state changes
    const unsubscribeConn = dhavonClient.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    // Listen for backend orb state transitions
    const unsubscribeState = dhavonClient.onState((payload) => {
      if (payload.state) {
        setOrbState(payload.state);
      }
    });

    // Listen for streaming AI token chunks
    const unsubscribeChunk = dhavonClient.onChunk((payload) => {
      setIsStreaming(true);
      setOrbState('ACTING');
      setStreamedText((prev) => prev + payload.delta);
    });

    // Listen for completion
    const unsubscribeComplete = dhavonClient.onComplete((payload) => {
      setIsStreaming(false);
      setOrbState('CALM');
      setStreamedText(payload.content);
    });

    // Listen for goal and task orchestration events
    const unsubscribeGoal = dhavonClient.onGoalProgress((payload) => {
      setGoalProgress(payload.progress);
      setActiveTaskStatus(`Goal Progress: ${payload.progress}% (${payload.status})`);
      if (payload.status === 'COMPLETED') {
        setOrbState('CALM');
        setTimeout(() => setActiveTaskStatus(null), 3500);
      }
    });

    const unsubscribeTaskStart = dhavonClient.onTaskStarted((payload) => {
      setOrbState('ACTING');
      setActiveTaskStatus(`Executing: ${payload.toolName || payload.taskId}`);
    });

    const unsubscribeTaskDone = dhavonClient.onTaskCompleted(() => {
      setOrbState('THINKING');
      setTimeout(() => setActiveTaskStatus(null), 3000);
    });

    const unsubscribePaused = dhavonClient.onOrchestrationPaused((payload) => {
      setOrbState('THINKING');
      setActiveTaskStatus(`Paused: ${payload.reason}`);
    });

    // Listen for confirmation requests
    const unsubscribeConfirm = dhavonClient.onConfirmationRequired((payload) => {
      setOrbState('THINKING');
      setPendingConfirmation(payload);
    });

    // Listen for errors
    const unsubscribeError = dhavonClient.onError((payload) => {
      setIsStreaming(false);
      setOrbState('ERROR');
      setStreamedText(`[System Notice: ${payload.message}]`);
      setTimeout(() => setOrbState('CALM'), 4000);
    });

    return () => {
      unsubscribeConn();
      unsubscribeState();
      unsubscribeChunk();
      unsubscribeComplete();
      unsubscribeConfirm();
      unsubscribeError();
      unsubscribeGoal();
      unsubscribeTaskStart();
      unsubscribeTaskDone();
      unsubscribePaused();
      dhavonClient.disconnect();
    };
  }, [setOrbState]);

  const handleSubmitText = (text: string) => {
    setActivePrompt(text);
    setStreamedText('');
    setIsStreaming(true);
    setOrbState('THINKING');

    // Send real message over WebSocket to DHAVON CORE
    dhavonClient.sendMessage(text, activeMode);
  };

  const handleModeSelect = (mode: typeof activeMode) => {
    triggerAction(mode);
    setActiveMode(mode);
  };

  const handleApproveTool = () => {
    if (pendingConfirmation) {
      setOrbState('ACTING');
      dhavonClient.confirmTool(pendingConfirmation.executionId);
      setPendingConfirmation(null);
    }
  };

  const handleRejectTool = () => {
    setPendingConfirmation(null);
    setOrbState('CALM');
  };

  return (
    <div className="relative w-screen h-[100dvh] min-h-[100dvh] overflow-hidden bg-[#040508] text-white flex flex-col justify-between select-none">
      {/* Layers 1-4: The Atmospheric Observatory Environment */}
      <ObservatoryScene />

      {/* Layer 10: Ambient Vertical Side Typography */}
      <AmbientText />

      {/* Layer 6: Top Identity & Navigation Header */}
      <DhavonHeader
        isConnected={isConnected}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Center Zone: Greeting & Living Intelligence Orb */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-20 -mt-2">
        {/* Layer 7: Greeting Area */}
        <DhavonGreeting />

        {/* Layer 5: The Living DHAVON Intelligence Orb */}
        <DhavonOrb
          state={orbState}
          isHovered={isHovered}
          onHoverChange={setIsHovered}
          onClick={toggleListening}
        />
      </div>

      {/* Lower Zone: Voice Command Pod, Streamed Output & Action Controls */}
      <div className="w-full flex flex-col items-center pb-16 sm:pb-12 lg:pb-14 z-20">
        {/* Tool Confirmation Required Banner */}
        <AnimatePresence>
          {pendingConfirmation && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-[620px] px-4 mb-3"
            >
              <div className="bg-[#111624]/95 border border-amber-500/40 rounded-2xl p-4 backdrop-blur-2xl shadow-[0_0_30px_rgba(245,158,11,0.2)]">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
                    <div>
                      <div className="text-xs font-mono font-medium text-amber-300 tracking-wide uppercase">
                        Action Requires Authorization
                      </div>
                      <div className="text-xs text-white/80 mt-0.5">
                        {pendingConfirmation.summary}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleApproveTool}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={handleRejectTool}
                      className="px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 text-xs transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Real AI Stream Capsule */}
        <AnimatePresence>
          {(isStreaming || streamedText) && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="w-full max-w-[620px] px-4 mb-3"
            >
              <div className="relative bg-[#0B0E15]/90 border border-white/15 rounded-2xl p-4 sm:p-5 backdrop-blur-2xl shadow-[0_16px_40px_-10px_rgba(0,0,0,0.85)] text-left">
                {/* Header row with prompt snippet and dismiss button */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    <span className="text-[11px] font-mono tracking-wider text-white/60 uppercase">
                      DHAVON INTELLIGENCE
                    </span>
                    {activePrompt && (
                      <span className="text-[11px] text-white/40 truncate max-w-[160px] sm:max-w-[240px]">
                        — &ldquo;{activePrompt}&rdquo;
                      </span>
                    )}
                    {activeTaskStatus && (
                      <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/15 px-1.5 py-0.5 rounded border border-cyan-500/30 truncate max-w-[180px]">
                        {activeTaskStatus}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setStreamedText('');
                      setIsStreaming(false);
                    }}
                    className="text-white/40 hover:text-white/80 transition-colors p-1"
                    aria-label="Close response"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Streamed Body Content */}
                <div className="max-h-48 overflow-y-auto pr-1 text-xs sm:text-sm text-slate-200 font-light leading-relaxed whitespace-pre-wrap select-text selection:bg-purple-500/30">
                  {streamedText}
                  {isStreaming && (
                    <span className="inline-block w-1.5 h-3.5 ml-1 bg-amber-400 animate-pulse align-middle" />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Voice Error Notice */}
        <AnimatePresence>
          {voiceError && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              className="w-full max-w-[620px] px-4 mb-2"
            >
              <div className="bg-rose-950/85 border border-rose-500/40 rounded-xl px-4 py-2 backdrop-blur-xl text-xs text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                {voiceError}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layer 8: Voice Command Pod */}
        <CommandPod
          isListening={isListening}
          onToggleListening={toggleListening}
          onSubmitText={handleSubmitText}
          audioLevel={audioLevel}
          activeMode={activeMode}
        />

        {/* Layer 9: Secondary Action Controls */}
        <ActionControls
          activeMode={activeMode}
          onSelectAction={handleModeSelect}
        />
      </div>

      {/* Layer 10: Bottom Telemetry & Mindset Badges */}
      <TelemetryIndicator
        state={orbState}
        isConnected={isConnected}
        activeTaskStatus={activeTaskStatus}
      />
      <MindsetBadge
        activeMode={activeMode}
        isExecuting={Boolean(activeTaskStatus)}
      />

      {/* Settings Modal Dialog */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};
