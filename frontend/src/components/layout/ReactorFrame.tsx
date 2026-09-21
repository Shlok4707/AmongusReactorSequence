import type { ReactNode } from 'react';
import { GAME_STATES, type GameState } from '../../types/protocol';
import { HeaderBanner } from './HeaderBanner';
import { AlertLamp } from './AlertLamp';
import { DangerTogglePanel } from './DangerTogglePanel';
import { Placard } from './Placard';
import { Vent } from './Vent';
import { PipeRouting } from './PipeRouting';
import { StageBezel } from './StageBezel';

interface ReactorFrameProps {
  gameState: GameState | null;
  children: ReactNode;
}

/**
 * Full stage at its fixed design resolution (1600px wide, via StageBezel).
 * This component does NOT handle viewport fitting - it's rendered inside
 * <ScaleToFit> (see App.tsx), which measures this natural size and scales
 * the whole thing to fit any viewport with zero scrolling.
 */
export function ReactorFrame({ gameState, children }: ReactorFrameProps) {
  const alarmActive = gameState === GAME_STATES.ERROR;

  return (
    <StageBezel>
      <div className="relative flex flex-col gap-8 px-12 py-10">
        <PipeRouting />

        <div className="flex items-center justify-between gap-8">
          <AlertLamp active={alarmActive} />
          <div className="flex-1">
            <HeaderBanner />
          </div>
          <DangerTogglePanel active={alarmActive} />
        </div>

        <div className="flex items-start justify-between gap-8">
          <div className="flex flex-col items-center gap-8">
            <Placard title="Caution" showIcon />
            <Vent />
          </div>

          <div className="flex flex-1 justify-center">{children}</div>

          <div className="flex flex-col items-center gap-8">
            <Placard title="Authorized" subtitle="Crewmates Only" />
            <Vent />
          </div>
        </div>
      </div>
    </StageBezel>
  );
}
