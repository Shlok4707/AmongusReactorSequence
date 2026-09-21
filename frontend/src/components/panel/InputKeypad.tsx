import { GAME_STATES, type GameState } from '../../types/protocol';
import type { CellFeedback } from '../../types/viewState';

interface InputKeypadProps {
  gameState: GameState | null;
  cellFeedback: CellFeedback[];
  onPress: (index: number) => void;
}

const FEEDBACK_RING: Record<CellFeedback, string> = {
  none: '',
  correct: 'glow-green ring-2 ring-neon-green',
  incorrect: 'glow-red ring-2 ring-alert-red',
};

export function InputKeypad({ gameState, cellFeedback, onPress }: InputKeypadProps) {
  const inputEnabled = gameState === GAME_STATES.WAITING_INPUT;

  return (
    <div
      className="grid aspect-square w-full grid-cols-3 gap-4 rounded-lg border border-black/60 p-5"
      style={{
        background: 'linear-gradient(180deg, #202226 0%, #101113 100%)',
        boxShadow: 'inset 0 0 24px rgba(0,0,0,0.75), inset 0 4px 10px rgba(0,0,0,0.6)',
      }}
    >
      {cellFeedback.map((feedback, i) => (
        <button
          key={i}
          type="button"
          disabled={!inputEnabled}
          onClick={() => onPress(i)}
          aria-label={`Keypad square ${i + 1}`}
          className={`metal-button rounded-md transition-all duration-100 active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70 ${FEEDBACK_RING[feedback]}`}
        />
      ))}
    </div>
  );
}
