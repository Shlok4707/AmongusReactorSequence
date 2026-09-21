import { GAME_STATES, type GameState } from '../../types/protocol';

interface StatusOverlayProps {
  gameState: GameState | null;
  taskCompleted: boolean;
  taskFailedReason: string | null;
  connection: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
}

export function StatusOverlay({ gameState, taskCompleted, taskFailedReason, connection }: StatusOverlayProps) {
  if (connection !== 'connected') {
    return (
      <div className="rounded-md border border-black/60 bg-panel-face-dark px-6 py-2 text-center text-sm uppercase tracking-[0.15em] text-[#f5a623]">
        {connection === 'connecting' && 'Connecting to reactor…'}
        {connection === 'reconnecting' && 'Reconnecting…'}
        {connection === 'disconnected' && 'Disconnected from reactor'}
      </div>
    );
  }

  if (taskCompleted || gameState === GAME_STATES.VICTORY) {
    return (
      <div className="glow-green rounded-md border border-neon-green bg-panel-face-dark px-6 py-2 text-center text-sm font-semibold uppercase tracking-[0.15em] text-neon-green">
        Reactor stabilized
      </div>
    );
  }

  if (gameState === GAME_STATES.ERROR) {
    return (
      <div className="glow-red rounded-md border border-alert-red bg-panel-face-dark px-6 py-2 text-center text-sm font-semibold uppercase tracking-[0.15em] text-alert-red">
        Incorrect sequence — resetting{taskFailedReason ? ` (${taskFailedReason})` : ''}
      </div>
    );
  }

  if (gameState === GAME_STATES.ABORTED) {
    return (
      <div className="rounded-md border border-black/60 bg-panel-face-dark px-6 py-2 text-center text-sm uppercase tracking-[0.15em] text-[#999]">
        Session aborted
      </div>
    );
  }

  return null;
}
