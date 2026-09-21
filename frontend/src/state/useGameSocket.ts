import { useCallback, useEffect, useReducer, useRef } from 'react';
import { getSocket } from '../network/SocketClient';
import {
  GAME_STATES,
  GRID_SIZE,
  TOTAL_STAGES,
  isKnownGameState,
  type InputResultPayload,
  type ProgressUpdatePayload,
  type SquareDarkPayload,
  type SquareLitPayload,
  type StageCompletePayload,
  type StateChangedPayload,
  type TaskFailedPayload,
} from '../types/protocol';
import { createInitialViewState, type GameViewState } from '../types/viewState';

type Action =
  | { type: 'CONNECTION_CHANGED'; status: GameViewState['connection'] }
  | { type: 'SESSION_READY'; sessionId: string }
  | { type: 'STATE_CHANGED'; payload: StateChangedPayload }
  | { type: 'SQUARE_LIT'; payload: SquareLitPayload }
  | { type: 'SQUARE_DARK'; payload: SquareDarkPayload }
  | { type: 'INPUT_RESULT'; payload: InputResultPayload }
  | { type: 'PROGRESS_UPDATE'; payload: ProgressUpdatePayload }
  | { type: 'STAGE_COMPLETE'; payload: StageCompletePayload }
  | { type: 'TASK_COMPLETED' }
  | { type: 'TASK_FAILED'; payload: TaskFailedPayload }
  | { type: 'RESET_FOR_NEW_SESSION' };

/**
 * Derives the 5-dot stage indicator row (GDD 6.8: OFF/BLUE/GREEN) purely
 * from `lastCompletedStage` and whether the game is currently active.
 * This is presentation-only derivation, not game logic: the backend is
 * still the sole authority on WHEN a stage actually completes.
 */
function deriveStageIndicators(
  lastCompletedStage: number,
  gameState: GameViewState['gameState'],
): GameViewState['stageIndicators'] {
  const isActivelyPlaying =
    gameState === GAME_STATES.SHOWING_PATTERN ||
    gameState === GAME_STATES.WAITING_INPUT ||
    gameState === GAME_STATES.EVALUATING;

  return Array.from({ length: TOTAL_STAGES }, (_, i) => {
    const stageNumber = i + 1;
    if (stageNumber <= lastCompletedStage) return 'GREEN';
    if (stageNumber === lastCompletedStage + 1 && isActivelyPlaying) return 'BLUE';
    return 'OFF';
  });
}

function reducer(state: GameViewState, action: Action): GameViewState {
  switch (action.type) {
    case 'CONNECTION_CHANGED':
      return { ...state, connection: action.status };

    case 'SESSION_READY':
      return { ...createInitialViewState(), connection: state.connection, sessionId: action.sessionId };

    case 'STATE_CHANGED': {
      const rawState = action.payload.state;
      const nextGameState = isKnownGameState(rawState) ? rawState : null;

      // Failure resets progress back to stage 1 (GDD: failure-reset skips
      // the observation delay but does return to STATE_ERROR then stage 1).
      const enteringError = nextGameState === GAME_STATES.ERROR;
      const nextLastCompletedStage = enteringError ? 0 : state.lastCompletedStage;

      // A fresh pattern reveal starts a clean slate for this stage's cells.
      const enteringShowingPattern = nextGameState === GAME_STATES.SHOWING_PATTERN;

      return {
        ...state,
        gameState: nextGameState,
        lastCompletedStage: nextLastCompletedStage,
        cells: enteringShowingPattern
          ? Array.from({ length: GRID_SIZE }, () => 'dark')
          : state.cells,
        cellFeedback: enteringShowingPattern
          ? Array.from({ length: GRID_SIZE }, () => 'none')
          : state.cellFeedback,
        filledCount: enteringShowingPattern ? 0 : state.filledCount,
        stageIndicators: deriveStageIndicators(nextLastCompletedStage, nextGameState),
      };
    }

    case 'SQUARE_LIT': {
      const cells = [...state.cells];
      cells[action.payload.index] = 'lit';
      return { ...state, cells };
    }

    case 'SQUARE_DARK': {
      const cells = [...state.cells];
      cells[action.payload.index] = 'dark';
      return { ...state, cells };
    }

    case 'INPUT_RESULT': {
      const cellFeedback = [...state.cellFeedback];
      cellFeedback[action.payload.index] = action.payload.correct ? 'correct' : 'incorrect';
      return { ...state, cellFeedback };
    }

    case 'PROGRESS_UPDATE':
      return { ...state, filledCount: action.payload.filledCount };

    case 'STAGE_COMPLETE': {
      const lastCompletedStage = action.payload.stage;
      return {
        ...state,
        lastCompletedStage,
        stageIndicators: deriveStageIndicators(lastCompletedStage, state.gameState),
      };
    }

    case 'TASK_COMPLETED':
      return {
        ...state,
        taskCompleted: true,
        stageIndicators: deriveStageIndicators(TOTAL_STAGES, state.gameState),
      };

    case 'TASK_FAILED':
      return { ...state, taskFailedReason: action.payload.reason };

    case 'RESET_FOR_NEW_SESSION':
      return { ...createInitialViewState(), connection: state.connection };

    default:
      return state;
  }
}

export interface UseGameSocketResult {
  view: GameViewState;
  submitInput: (index: number) => void;
}

/**
 * Owns the socket connection lifecycle and exposes a plain, reduced
 * GameViewState plus a single `submitInput` action. Components never touch
 * the socket directly.
 */
export function useGameSocket(): UseGameSocketResult {
  const [view, dispatch] = useReducer(reducer, undefined, createInitialViewState);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    const handleConnect = () => {
      dispatch({ type: 'CONNECTION_CHANGED', status: 'connected' });
      dispatch({ type: 'RESET_FOR_NEW_SESSION' });
      socket.emit('session:create');
    };
    const handleDisconnect = () => dispatch({ type: 'CONNECTION_CHANGED', status: 'disconnected' });
    const handleReconnectAttempt = () => dispatch({ type: 'CONNECTION_CHANGED', status: 'reconnecting' });

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);

    socket.on('session:ready', (payload) => dispatch({ type: 'SESSION_READY', sessionId: payload.sessionId }));
    socket.on('state:changed', (payload) => dispatch({ type: 'STATE_CHANGED', payload }));
    socket.on('square:lit', (payload) => dispatch({ type: 'SQUARE_LIT', payload }));
    socket.on('square:dark', (payload) => dispatch({ type: 'SQUARE_DARK', payload }));
    socket.on('input:result', (payload) => dispatch({ type: 'INPUT_RESULT', payload }));
    socket.on('progress:update', (payload) => dispatch({ type: 'PROGRESS_UPDATE', payload }));
    socket.on('stage:complete', (payload) => dispatch({ type: 'STAGE_COMPLETE', payload }));
    socket.on('task:completed', () => dispatch({ type: 'TASK_COMPLETED' }));
    socket.on('task:failed', (payload) => dispatch({ type: 'TASK_FAILED', payload }));

    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
      socket.off('session:ready');
      socket.off('state:changed');
      socket.off('square:lit');
      socket.off('square:dark');
      socket.off('input:result');
      socket.off('progress:update');
      socket.off('stage:complete');
      socket.off('task:completed');
      socket.off('task:failed');
      // Intentionally NOT calling socket.disconnect() here: React 18/19
      // StrictMode mounts effects twice in dev, and tearing the real
      // connection down between those mounts would create visible
      // reconnect flicker. The singleton persists for the app's lifetime.
    };
  }, []);

  const submitInput = useCallback((index: number) => {
    const socket = socketRef.current;
    if (view.gameState !== GAME_STATES.WAITING_INPUT) return; // UI-level guard only; backend remains authoritative
    socket.emit('input:submit', { index, pressDownTs: Date.now() }, (_ack) => {
      // Ack currently unused for rendering — reserved for future
      // "unresponsive server" affordance (see edge cases in the plan).
    });
  }, [view.gameState]);

  return { view, submitInput };
}
