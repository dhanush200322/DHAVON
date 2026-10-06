import { ActiveMode } from './conversation.js';

export type OrbState = 'CALM' | 'LISTENING' | 'THINKING' | 'ACTING' | 'ERROR';

export type SystemPhase = 'LISTENING' | 'THINKING' | 'ACTING';

export interface DHAVONState {
  orbState: OrbState;
  activePhase: SystemPhase;
  activeMode: ActiveMode;
  isOnline: boolean;
  voiceActive: boolean;
  activeGoalId?: string;
  activeTaskId?: string;
  sessionToken?: string;
}

export interface OrbStateTransitionPayload {
  state: OrbState;
  details?: string;
  timestamp: string;
}
