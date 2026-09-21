import type { ReactNode } from 'react';
import type { StageIndicator } from '../../types/protocol';
import { CornerBolts } from '../shared/CornerBolts';
import { ProgressLEDs } from './ProgressLEDs';

interface GamePanelProps {
  indicators: StageIndicator[];
  children: ReactNode;
}

export function GamePanel({ indicators, children }: GamePanelProps) {
  return (
    <div className="metal-bevel brushed relative w-[420px] rounded-xl p-5">
      <CornerBolts inset={10} />
      <ProgressLEDs indicators={indicators} />

      {/* Inner screen/keypad bezel - a distinct nested frame with its own bolts,
          matching the reference image's "frame within a frame" construction. */}
      <div
        className="relative mt-3 rounded-lg border border-black/70 p-2"
        style={{
          background: 'linear-gradient(180deg, #45484d 0%, #1c1e21 55%, #101113 100%)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.6), inset 0 -1px 0 rgba(255,255,255,0.08)',
        }}
      >
        <CornerBolts inset={4} />
        {children}
      </div>
    </div>
  );
}
