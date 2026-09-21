import { ReactorFrame } from './components/layout/ReactorFrame';
import { ScaleToFit } from './components/layout/ScaleToFit';
import { GamePanel } from './components/panel/GamePanel';
import { PatternDisplay } from './components/panel/PatternDisplay';
import { InputKeypad } from './components/panel/InputKeypad';
import { StatusOverlay } from './components/feedback/StatusOverlay';
import { useGameSocket } from './state/useGameSocket';

function App() {
  const { view, submitInput } = useGameSocket();

  return (
    <ScaleToFit>
      <ReactorFrame gameState={view.gameState}>
        <div className="flex flex-col items-center gap-8">
          <div className="flex flex-row gap-10">
            <GamePanel indicators={view.stageIndicators}>
              <PatternDisplay cells={view.cells} />
            </GamePanel>
            <GamePanel indicators={view.stageIndicators}>
              <InputKeypad gameState={view.gameState} cellFeedback={view.cellFeedback} onPress={submitInput} />
            </GamePanel>
          </div>
          <StatusOverlay
            gameState={view.gameState}
            taskCompleted={view.taskCompleted}
            taskFailedReason={view.taskFailedReason}
            connection={view.connection}
          />
        </div>
      </ReactorFrame>
    </ScaleToFit>
  );
}

export default App;
