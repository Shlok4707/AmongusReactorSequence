import type { StageIndicator } from '../../types/protocol';

interface ProgressLEDsProps {
  indicators: StageIndicator[];
}

const LIT_STYLES: Record<'BLUE' | 'GREEN', string> = {
  BLUE: 'bg-neon-blue border-neon-blue glow-blue animate-pulse',
  GREEN: 'bg-neon-green border-neon-green glow-green',
};

export function ProgressLEDs({ indicators }: ProgressLEDsProps) {
  return (
    // Fixed bounding box for the indicator row: dots are centered both axes
    // within it and evenly spaced via justify-evenly rather than a manual gap.
    <div className="flex h-9 w-full items-center justify-evenly px-2">
      {indicators.map((indicator, i) => (
        <span
          key={i}
          className={`h-5 w-5 shrink-0 rounded-full border transition-all duration-300 ${
            indicator === 'OFF' ? 'dome-off border-black/70' : LIT_STYLES[indicator]
          }`}
          aria-label={`Stage ${i + 1}: ${indicator.toLowerCase()}`}
        />
      ))}
    </div>
  );
}
