import Stage from '../components/Stage'
import NeonButton from '../components/NeonButton'

// Page 4 — "final bg": shows successfully completed rounds + Back to Home.
export default function FinalPage({ roundsCompleted, onHome }) {
  return (
    <Stage name="final bg">
      {/* Sits inside the painted "ROUNDS PLAYED" panel */}
      <div
        className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center animate-[fade-in_0.6s_ease-out]"
        style={{ left: '71.4%', top: '63.8%' }}
        aria-label={`Rounds Completed: ${roundsCompleted}`}
      >
        <div
          className="font-display text-[8cqw] font-black leading-none text-white
            [text-shadow:0_0_1.2cqw_rgba(96,165,250,1),0_0_3cqw_rgba(59,130,246,0.8)]"
        >
          {roundsCompleted}
        </div>
        <div className="mt-[0.4cqw] font-ui text-[1.35cqw] font-bold uppercase tracking-[0.25em] text-blue-200/90">
          Rounds Completed
        </div>
      </div>

      <NeonButton onClick={onHome} style={{ left: '50%', top: '93%' }} className="text-[1.6cqw] py-[0.8cqw]">
        Back to Home
      </NeonButton>
    </Stage>
  )
}
