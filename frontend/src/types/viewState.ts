import type { GameState, StageIndicator } from './protocol';
import { GRID_SIZE, TOTAL_STAGES } from './protocol';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export type CellVisual = 'dark' | 'lit';

export type CellFeedback = 'none' | 'correct' | 'incorrect';

/**
 * Everything a component needs to render a frame, derived purely from
 * events already received from the server. Nothing in here is computed
 * from a client-side timer — only from the latest event payloads.
 */
export interface GameViewState {
  connection: ConnectionStatus;
  sessionId: string | null;
  gameState: GameState | null;
  /** 0-8, current lit/dark visual for each cell (pattern playback). */
  cells: CellVisual[];
  /** 0-8, transient correct/incorrect flash per cell from input:result. */
  cellFeedback: CellFeedback[];
  /** Squares correctly entered so far in the CURRENT stage (progress:update). */
  filledCount: number;
  /** 1-indexed number of the most recently completed stage (0 = none yet). */
  lastCompletedStage: number;
  /** Derived per-dot indicator for the 5-stage progress row (GDD 6.8). */
  stageIndicators: StageIndicator[];
  taskFailedReason: string | null;
  taskCompleted: boolean;
}

export function createInitialViewState(): GameViewState {
  return {
    connection: 'connecting',
    sessionId: null,
    gameState: null,
    cells: Array.from({ length: GRID_SIZE }, () => 'dark'),
    cellFeedback: Array.from({ length: GRID_SIZE }, () => 'none'),
    filledCount: 0,
    lastCompletedStage: 0,
    stageIndicators: Array.from({ length: TOTAL_STAGES }, () => 'OFF'),
    taskFailedReason: null,
    taskCompleted: false,
  };
}
