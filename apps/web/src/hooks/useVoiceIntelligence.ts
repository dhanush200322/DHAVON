'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { VoiceState, OrbState } from '@dhavon/types';
import { dhavonClient } from '@/lib/dhavon-client';

export interface UseVoiceIntelligenceOptions {
  onTranscript?: (transcript: string) => void;
  onResponse?: (response: string) => void;
  onOrbStateChange?: (state: OrbState) => void;
}

export interface UseVoiceIntelligenceReturn {
  voiceState: VoiceState;
  isListening: boolean;
  isSpeaking: boolean;
  activeTranscript: string;
  audioLevel: number;
  voiceError: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  toggleListening: () => void;
  interruptPlayback: () => void;
}

export function useVoiceIntelligence(
  options: UseVoiceIntelligenceOptions = {},
): UseVoiceIntelligenceReturn {
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [activeTranscript, setActiveTranscript] = useState<string>('');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const sessionIdRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Map VoiceState to OrbState
  const mapToOrbState = useCallback((state: VoiceState): OrbState => {
    switch (state) {
      case 'LISTENING':
        return 'LISTENING';
      case 'TRANSCRIBING':
      case 'THINKING':
        return 'THINKING';
      case 'SPEAKING':
        return 'ACTING';
      case 'INTERRUPTED':
        return 'LISTENING';
      case 'ERROR':
        return 'ERROR';
      case 'IDLE':
      default:
        return 'CALM';
    }
  }, []);

  const updateVoiceState = useCallback(
    (newState: VoiceState) => {
      setVoiceState(newState);
      if (options.onOrbStateChange) {
        options.onOrbStateChange(mapToOrbState(newState));
      }
    },
    [mapToOrbState, options],
  );

  // Play synthesized speech using browser-native SpeechSynthesis
  const speakText = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      window.speechSynthesis.cancel(); // Stop any pending utterances
      updateVoiceState('SPEAKING');

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Select high quality English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel')) &&
          v.lang.startsWith('en'),
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => {
        updateVoiceState('IDLE');
      };

      utterance.onerror = (e) => {
        console.warn('[Voice TTS] SpeechSynthesis error:', e);
        updateVoiceState('IDLE');
      };

      window.speechSynthesis.speak(utterance);
    },
    [updateVoiceState],
  );

  // Interruption / Barge-in
  const interruptPlayback = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    dhavonClient.interruptVoice(sessionIdRef.current || undefined);
    updateVoiceState('INTERRUPTED');
  }, [updateVoiceState]);

  // Stop recording and send audio to STT
  const stopListening = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);

    if (mediaRecorderRef.current && isRecordingRef.current) {
      isRecordingRef.current = false;
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('[Voice STT] Error stopping MediaRecorder:', err);
      }
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Start recording
  const startListening = useCallback(async () => {
    setVoiceError(null);

    // If currently speaking, barge-in / interrupt first!
    if (voiceState === 'SPEAKING' || (typeof window !== 'undefined' && window.speechSynthesis?.speaking)) {
      interruptPlayback();
    }

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setVoiceError('Browser does not support audio recording');
      updateVoiceState('ERROR');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      // Initialize Web Audio analyser for real-time acoustic reactive waveform
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          audioContextRef.current = audioCtx;
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const sampleAudioLevel = () => {
            if (isRecordingRef.current && analyserRef.current) {
              analyserRef.current.getByteFrequencyData(dataArray);
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const avg = sum / dataArray.length;
              setAudioLevel(Math.min(1, avg / 128));
              animFrameRef.current = requestAnimationFrame(sampleAudioLevel);
            }
          };
          animFrameRef.current = requestAnimationFrame(sampleAudioLevel);
        }
      } catch (audioErr) {
        console.warn('[Voice WebAudio] Could not start audio level analyser:', audioErr);
      }

      // Determine supported mime type
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        if (audioBlob.size === 0) {
          updateVoiceState('IDLE');
          return;
        }

        updateVoiceState('TRANSCRIBING');

        // Convert audio Blob to Base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = (reader.result as string).split(',')[1];
          if (sessionIdRef.current && base64Data) {
            dhavonClient.sendVoiceAudio(
              sessionIdRef.current,
              base64Data,
              recorder.mimeType || 'audio/webm',
            );
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      recorder.start(250); // Slice data every 250ms
      isRecordingRef.current = true;

      // Start session on backend
      const newSessionId = `voice-${Date.now()}`;
      sessionIdRef.current = newSessionId;
      dhavonClient.startVoiceSession('system-user', newSessionId);

      updateVoiceState('LISTENING');
    } catch (err: unknown) {
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone permission denied by user'
          : err instanceof Error
          ? err.message
          : 'Could not access microphone';

      setVoiceError(msg);
      updateVoiceState('ERROR');
      setTimeout(() => updateVoiceState('IDLE'), 3500);
    }
  }, [interruptPlayback, updateVoiceState, voiceState]);

  const toggleListening = useCallback(() => {
    if (voiceState === 'LISTENING') {
      stopListening();
    } else {
      startListening();
    }
  }, [voiceState, startListening, stopListening]);

  // Subscribe to backend voice WebSocket events
  useEffect(() => {
    const unsubStarted = dhavonClient.onVoiceStarted((payload) => {
      sessionIdRef.current = payload.sessionId;
    });

    const unsubListening = dhavonClient.onVoiceListening(() => {
      setVoiceState('LISTENING');
    });

    const unsubTranscript = dhavonClient.onVoiceTranscript((payload) => {
      setActiveTranscript(payload.transcript);
      if (options.onTranscript) {
        options.onTranscript(payload.transcript);
      }
    });

    const unsubThinking = dhavonClient.onVoiceThinking(() => {
      updateVoiceState('THINKING');
    });

    const unsubSpeaking = dhavonClient.onVoiceSpeaking((payload) => {
      speakText(payload.text);
    });

    const unsubCompleted = dhavonClient.onVoiceCompleted((payload) => {
      if (options.onResponse) {
        options.onResponse(payload.response);
      }
      // Audio playback will naturally transition to IDLE when done
    });

    const unsubInterrupted = dhavonClient.onVoiceInterrupted(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      updateVoiceState('LISTENING');
    });

    const unsubError = dhavonClient.onVoiceError((payload) => {
      setVoiceError(payload.message);
      updateVoiceState('ERROR');
      setTimeout(() => updateVoiceState('IDLE'), 4000);
    });

    return () => {
      unsubStarted();
      unsubListening();
      unsubTranscript();
      unsubThinking();
      unsubSpeaking();
      unsubCompleted();
      unsubInterrupted();
      unsubError();

      // Clean up audio streams, web audio, and speech on unmount
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [options, speakText, updateVoiceState]);

  return {
    voiceState,
    isListening: voiceState === 'LISTENING',
    isSpeaking: voiceState === 'SPEAKING',
    activeTranscript,
    audioLevel,
    voiceError,
    startListening,
    stopListening,
    toggleListening,
    interruptPlayback,
  };
}
