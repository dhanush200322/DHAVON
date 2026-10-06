import { Injectable, Logger } from '@nestjs/common';
import { OrbState, SystemPhase, ActiveMode, DHAVONState } from '@dhavon/types';
import { Subject, Observable } from 'rxjs';

export interface StateChangeEvent {
  previousState: OrbState;
  currentState: OrbState;
  phase: SystemPhase;
  details?: string;
  timestamp: string;
}

@Injectable()
export class StateService {
  private readonly logger = new Logger(StateService.name);

  private currentState: DHAVONState = {
    orbState: 'CALM',
    activePhase: 'LISTENING',
    activeMode: 'ask',
    isOnline: true,
    voiceActive: false,
  };

  private readonly stateSubject = new Subject<StateChangeEvent>();

  getState(): DHAVONState {
    return { ...this.currentState };
  }

  getStateObservable(): Observable<StateChangeEvent> {
    return this.stateSubject.asObservable();
  }

  transitionTo(
    nextState: OrbState,
    details?: string,
    phaseOverride?: SystemPhase,
  ): StateChangeEvent {
    const previousState = this.currentState.orbState;

    let phase: SystemPhase = this.currentState.activePhase;
    if (phaseOverride) {
      phase = phaseOverride;
    } else if (nextState === 'LISTENING') {
      phase = 'LISTENING';
    } else if (nextState === 'THINKING') {
      phase = 'THINKING';
    } else if (nextState === 'ACTING') {
      phase = 'ACTING';
    }

    this.currentState = {
      ...this.currentState,
      orbState: nextState,
      activePhase: phase,
    };

    const event: StateChangeEvent = {
      previousState,
      currentState: nextState,
      phase,
      details,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(
      `[STATE] ${previousState} -> ${nextState} (phase: ${phase})${details ? ` | ${details}` : ''}`,
    );

    this.stateSubject.next(event);
    return event;
  }

  setActiveMode(mode: ActiveMode): void {
    this.currentState.activeMode = mode;
  }
}
