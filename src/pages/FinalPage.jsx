import Stage, { artY } from '../components/Stage'
import NeonButton from '../components/NeonButton'
import { pointsForRounds } from '../game/constants'

const valueClass =
  'absolute -translate-x-1/2 -translate-y-1/2 font-display font-black leading-none tabular-nums animate-[fade-in_0.6s_ease-out]'

// Page 4 — "final bg": rounds completed + points won, and Back to Home.
export default function FinalPage({ roundsCompleted, onHome }) {
  const points = pointsForRounds(roundsCompleted)

  // Centred horizontally; sits on the floor (90% of the artwork) but never lower than 95.5vh.
  const backButton = (
    <div
      className="pointer-events-auto absolute"
      style={{ left: '50vw', top: artY('final bg', 0.9, { max: '95.5vh' }), width: 'min(100vw, 130vh)', height: 0, containerType: 'inline-size' }}
    >
      <NeonButton onClick={onHome} style={{ left: 0, top: 0 }} size="sm">
        Back to Home
      </NeonButton>
    </div>
  )

  return (
    <Stage name="final bg" overlay={backButton}>
      {/* Inside the empty field under the painted "ROUNDS PLAYED" label */}
      <div
        className={`${valueClass} text-[3cqw] text-white [text-shadow:0_0_1cqw_rgba(96,165,250,1),0_0_2.4cqw_rgba(59,130,246,0.8)]`}
        style={{ left: '71.3%', top: '57.8%' }}
        aria-label={`Rounds Completed: ${roundsCompleted}`}
        data-testid="rounds-completed"
      >
        {roundsCompleted}
      </div>

      {/* Inside the empty field under the painted "POINTS WON" label */}
      <div
        className={`${valueClass} text-[2.5cqw] text-amber-100 [text-shadow:0_0_1cqw_rgba(251,191,36,0.95),0_0_2.4cqw_rgba(245,158,11,0.7)]`}
        style={{ left: '71.4%', top: '72.1%' }}
        aria-label={`Points Won: ${points}`}
        data-testid="points-won"
      >
        {points.toLocaleString('en-US')}
      </div>
    </Stage>
  )
}
