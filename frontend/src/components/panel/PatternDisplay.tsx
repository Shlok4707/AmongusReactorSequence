import type { CellVisual } from '../../types/viewState';

interface PatternDisplayProps {
  cells: CellVisual[];
}

export function PatternDisplay({ cells }: PatternDisplayProps) {
  return (
    <div
      className="grid aspect-square w-full grid-cols-3 gap-4 rounded-lg border border-black/60 p-5"
      style={{
        background: 'radial-gradient(120% 120% at 50% 0%, #0a120b 0%, var(--color-screen-bg) 60%, #010301 100%)',
        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.9), inset 0 4px 10px rgba(0,0,0,0.8)',
      }}
    >
      {cells.map((cell, i) => (
        <div
          key={i}
          className={`rounded-md transition-all duration-150 ${cell === 'lit' ? 'bg-neon-green glow-green' : 'border'}`}
          style={
            cell === 'dark'
              ? { borderColor: 'var(--color-screen-grid)', boxShadow: 'inset 0 0 6px rgba(57,255,20,0.05)' }
              : { boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.35), 0 0 6px 2px rgba(57,255,20,0.85), 0 0 18px 7px rgba(57,255,20,0.4)' }
          }
        />
      ))}
    </div>
  );
}
