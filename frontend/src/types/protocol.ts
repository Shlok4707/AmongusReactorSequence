/**
 * Wire protocol types — mirrors the Start Reactor backend exactly.
 *
 * Source of truth: backend/README.md ("How a game actually happens" section)
 * and backend/src/engine/states.js (STATES, STAGE_INDICATOR).
 *
 * This is the ONLY file that should ever need editing if the backend's
 * actual src/ws/socketEvents.js or src/engine/events.js differ from what's
 * documented here. Every other file imports types from here — nothing else
 * should hardcode an event name or payload shape.
 */

// ---------------------------------------------------------------------------
// FSM states — verbatim from backend/src/engine/states.js (GDD 4.2, 7 states)
// ---------------------------------------------------------------------------

export const GAME_STATES = {
  INIT: 'STATE_INIT',
  SHOWING_PATTERN: 'STATE_SHOWING_PATTERN',
  WAITING_INPUT: 'STATE_WAITING_INPUT',
  EVALUATING: 'STATE_EVALUATING',
  ERROR: 'STATE_ERROR',
  VICTORY: 'STATE_VICTORY',
  ABORTED: 'STATE_ABORTED',
} as const;

export type GameState = (typeof GAME_STATES)[keyof typeof GAME_STATES];

/** Type guard so an unrecognized string from the backend never crashes the UI. */
export function isKnownGameState(value: string): value is GameState {
  return (Object.values(GAME_STATES) as string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Stage indicator — verbatim from backend/src/engine/states.js (GDD 6.8)
// Note: this is a 3-value enum, NOT a simple lit/unlit boolean.
// ---------------------------------------------------------------------------

export const STAGE_INDICATOR = {
  OFF: 'OFF', // stage not yet reached
  BLUE: 'BLUE', // current active stage, flashing
  GREEN: 'GREEN', // successfully completed stage
} as const;

export type StageIndicator = (typeof STAGE_INDICATOR)[keyof typeof STAGE_INDICATOR];

export const TOTAL_STAGES = 5;
export const GRID_SIZE = 9; // 3x3, row-major indices 0-8

// ---------------------------------------------------------------------------
// Server -> Client events (documented in backend/README.md)
// ---------------------------------------------------------------------------

export interface SessionReadyPayload {
  sessionId: string;
}

export interface StateChangedPayload {
  state: string; // validated against GAME_STATES at the boundary, see useGameSocket
}

export interface SquareLitPayload {
  index: number; // 0-8
  durationMs: number; // documented as 400ms
}

export interface SquareDarkPayload {
  index: number; // 0-8
}

export interface InputResultPayload {
  index: number;
  correct: boolean;
  playerStep: number;
}

export interface ProgressUpdatePayload {
  filledCount: number; // correctly-entered squares within the CURRENT stage
}

export interface StageCompletePayload {
  stage: number; // 1-indexed stage number that was just completed
}

export type TaskCompletedPayload = Record<string, never>;

export interface TaskFailedPayload {
  reason: string;
}

/** Every event the server can push, and its payload shape. */
export interface ServerToClientEvents {
  'session:ready': (payload: SessionReadyPayload) => void;
  'state:changed': (payload: StateChangedPayload) => void;
  'square:lit': (payload: SquareLitPayload) => void;
  'square:dark': (payload: SquareDarkPayload) => void;
  'input:result': (payload: InputResultPayload) => void;
  'progress:update': (payload: ProgressUpdatePayload) => void;
  'stage:complete': (payload: StageCompletePayload) => void;
  'task:completed': (payload: TaskCompletedPayload) => void;
  'task:failed': (payload: TaskFailedPayload) => void;
}

// ---------------------------------------------------------------------------
// Client -> Server events (documented in backend/README.md)
// ---------------------------------------------------------------------------

export interface InputSubmitPayload {
  index: number;
  pressDownTs: number;
}

export interface InputSubmitAck {
  accepted: boolean;
}

export interface SessionAbortPayload {
  reason: string;
}

/** Every event the client can emit, and its payload/ack shape. */
export interface ClientToServerEvents {
  'session:create': () => void;
  'input:submit': (payload: InputSubmitPayload, ack: (response: InputSubmitAck) => void) => void;
  'session:abort': (payload: SessionAbortPayload) => void;
}
