import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Stage, { artY } from '../components/Stage'
import { SequenceGrid, Keypad } from '../components/Panel'
import KillAnimation from '../components/KillAnimation'
import { initAudio, playButtonSound, playSequenceSound } from '../audio/AudioManager'
import {
  GAME_DURATION_MS,
  KILL_ANIMATION_MS,
  LIGHT_GAP_MS,
  LIGHT_ON_MS,
  PRE_SEQUENCE_DELAY_MS,
  ROUND_CLEAR_PAUSE_MS,
  lengthForRound,
  randomSequence,
} from '../game/constants'

/**
 * Page 3 — "main game bg"
 * phase: 'showing' (left grid playing) | 'input' (player's turn) | 'clear' (round done) | 'kill'
 */
export default function MainGamePage({ onFinish }) {
  const [round, setRound] = useState(1)
  const [attempt, setAttempt] = useState(0) // bumps on retry -> new random sequence
  const [phase, setPhase] = useState('showing')
  const [sequence, setSequence] = useState([])
  const [litCell, setLitCell] = useState(null)
  const [shown, setShown] = useState(0)
  const [entered, setEntered] = useState(0)
  const [flash, setFlash] = useState(null)
  const [timeLeftMs, setTimeLeftMs] = useState(GAME_DURATION_MS)

  const completedRef = useRef(0) // successfully completed rounds
  const enteredRef = useRef(0)
  const phaseRef = useRef('showing')
  const sequenceRef = useRef([])
  const overRef = useRef(false)
  const timeouts = useRef(new Set())
  const flashTimeout = useRef(null)

  const schedule = useCallback((fn, ms) => {
    const id = setTimeout(() => {
      timeouts.current.delete(id)
      if (!overRef.current) fn()
    }, ms)
    timeouts.current.add(id)
  }, [])

  const clearScheduled = useCallback(() => {
    timeouts.current.forEach(clearTimeout)
    timeouts.current.clear()
  }, [])

  const setPhaseBoth = (p) => {
    phaseRef.current = p
    setPhase(p)
  }

  // ---------- 90-second main timer: starts the moment this page appears ----------
  useEffect(() => {
    overRef.current = false
    const endAt = performance.now() + GAME_DURATION_MS
    const tick = setInterval(() => {
      const rem = Math.max(0, endAt - performance.now())
      setTimeLeftMs(rem)
      if (rem <= 0) {
        // Highest-priority constraint: stop everything and leave.
        overRef.current = true
        clearInterval(tick)
        clearScheduled()
        onFinish(completedRef.current)
      }
    }, 50)
    return () => {
      clearInterval(tick)
      clearScheduled()
      clearTimeout(flashTimeout.current)
    }
  }, [onFinish, clearScheduled])

  // ---------- Start (or retry) a round: new random sequence, play it on the left ----------
  useEffect(() => {
    if (overRef.current) return
    const len = lengthForRound(round)
    const seq = randomSequence(len)
    sequenceRef.current = seq
    enteredRef.current = 0
    setSequence(seq)
    setShown(0)
    setEntered(0)
    setLitCell(null)
    setFlash(null)
    setPhaseBoth('showing')

    const step = LIGHT_ON_MS + LIGHT_GAP_MS
    seq.forEach((cell, i) => {
      const t = PRE_SEQUENCE_DELAY_MS + i * step
      schedule(() => {
        setLitCell(cell)
        setShown(i + 1)
        playSequenceSound() // tile lights up -> reactor pulse
      }, t)
      schedule(() => setLitCell(null), t + LIGHT_ON_MS)
    })
    schedule(() => setPhaseBoth('input'), PRE_SEQUENCE_DELAY_MS + len * step)

    return clearScheduled
  }, [round, attempt, schedule, clearScheduled])

  const showFlash = (cell, ok) => {
    clearTimeout(flashTimeout.current)
    setFlash({ cell, ok })
    if (ok) flashTimeout.current = setTimeout(() => setFlash(null), 170)
  }

  // ---------- Player input on the right keypad ----------
  const handlePress = (cell) => {
    if (overRef.current || phaseRef.current !== 'input') return
    initAudio() // no-op once unlocked
    playButtonSound() // every tap on the keypad -> console button sound
    const seq = sequenceRef.current
    const idx = enteredRef.current

    if (cell === seq[idx]) {
      const n = idx + 1
      enteredRef.current = n
      setEntered(n)
      showFlash(cell, true)
      if (n === seq.length) {
        // Round completed
        completedRef.current += 1
        setPhaseBoth('clear')
        schedule(() => setRound((r) => r + 1), ROUND_CLEAR_PAUSE_MS)
      }
    } else {
      // Wrong square: halt round immediately -> 2s kill animation -> retry same round
      showFlash(cell, false)
      setPhaseBoth('kill')
      schedule(() => {
        // Leave 'kill' in the same render as the retry starts, so the overlay (and its sound)
        // never re-mounts for a frame
        setPhaseBoth('showing')
        setAttempt((a) => a + 1)
      }, KILL_ANIMATION_MS)
    }
  }

  const total = sequence.length || lengthForRound(round)
  const seconds = Math.ceil(timeLeftMs / 1000)
  const urgent = seconds <= 10
  const indicatorState = phase === 'kill' ? 'fail' : phase === 'clear' ? 'clear' : null

  const status =
    phase === 'showing'
      ? 'Watch the sequence…'
      : phase === 'input'
        ? 'Your turn — repeat it on the keypad'
        : phase === 'clear'
          ? 'Round cleared!'
          : 'Wrong square!'

  return (
    <>
      <Stage
        name="main game bg"
        overlay={
          <GameOverlay
            seconds={seconds}
            round={round}
            urgent={urgent}
            status={status}
            phase={phase}
            panels={(stacked) => (
              <div
                className={`flex ${stacked ? 'flex-col' : 'flex-row'} items-center`}
                style={{ gap: '3.6cqw' }}
              >
                <SequenceGrid total={total} shown={shown} litCell={litCell} indicatorState={indicatorState} />
                <Keypad
                  total={total}
                  entered={entered}
                  indicatorState={indicatorState}
                  disabled={phase !== 'input'}
                  flash={flash}
                  onPress={handlePress}
                />
              </div>
            )}
          />
        }
      />

      {phase === 'kill' && <KillAnimation key={attempt} />}
    </>
  )
}

// ---------- screen-pinned layout (vw / vh only) ----------

const PORTRAIT = '(max-aspect-ratio: 9/10)'
const subscribe = (cb) => {
  const mq = window.matchMedia(PORTRAIT)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
const usePortrait = () => useSyncExternalStore(subscribe, () => window.matchMedia(PORTRAIT).matches)

const BG = 'main game bg'
// Painted parts of "main game bg" (fractions of the artwork):
//   "REACTOR SEQUENCE" sign  x 18%–82%, y 7%–24.5%   |   red floor lights y 84.3%–85%
// Everything is centred horizontally. The panels are centred in the space between the sign and
// the status line; the status line sits at 79% (above the floor lights) and is clamped on screen.
function GameOverlay({ seconds, round, urgent, status, phase, panels }) {
  const portrait = usePortrait()
  const u = portrait ? 'min(2vw, 1.15vh)' : 'min(0.85vw, 1.5vh)' // UI unit
  const U = (n) => `calc(${u} * ${n})`

  const statusY = artY(BG, 0.79, { max: '95vh' })
  const panelsTop = portrait ? '33vh' : artY(BG, 0.265, { min: '2vh' })
  const panelsBottom = `calc(${statusY} - ${U(2.4)})`

  const statusColor = phase === 'input' ? 'text-emerald-300' : phase === 'kill' ? 'text-red-400' : 'text-sky-200'

  return (
    <>
      {/* Phones held upright only show the middle of the painted sign, so draw the full name there */}
      {portrait && (
        <div
          className="absolute flex -translate-x-1/2 items-center justify-center rounded-[2vw] border-2 border-cyan-300/80 bg-[#050d1a]"
          style={{ left: '50vw', top: '6.5vh', width: '94vw', height: '18.5vh', boxShadow: '0 0 3vw rgba(34,211,238,0.45)' }}
        >
          <h1
            className="m-0 whitespace-nowrap font-grotesk font-bold uppercase leading-none text-cyan-50"
            style={{ fontSize: '6.4vw', letterSpacing: '0.05em', textShadow: '0 0 0.25em rgba(34,211,238,0.95), 0 0 0.7em rgba(34,211,238,0.55)' }}
          >
            Reactor Sequence
          </h1>
        </div>
      )}

      {/* Red timer + round number */}
      <div
        className={`absolute flex flex-col items-center border-red-500/60 bg-black/70 backdrop-blur-sm ${portrait ? '-translate-x-1/2' : ''}`}
        style={{
          ...(portrait ? { left: '50vw', top: '27vh' } : { right: '1.5vw', top: '2.5vh' }),
          minWidth: U(10),
          padding: `${U(0.7)} ${U(1.4)}`,
          borderWidth: U(0.2),
          borderRadius: U(1),
          boxShadow: `0 0 ${U(2)} rgba(239,68,68,0.45)`,
          ...(portrait ? { flexDirection: 'row', gap: U(2) } : {}),
        }}
        data-testid="hud"
      >
        <div
          className={`font-display font-black leading-none tabular-nums text-red-500 ${urgent ? 'animate-[timer-urgent_1s_ease-in-out_infinite]' : ''}`}
          style={{ fontSize: U(4.4), textShadow: `0 0 ${U(1.2)} rgba(239,68,68,0.9)` }}
          data-testid="timer"
          aria-label={`${seconds} seconds left`}
        >
          {seconds}
        </div>
        <div
          className="font-ui font-bold uppercase text-white"
          style={{ fontSize: U(1.6), letterSpacing: '0.18em', marginTop: portrait ? 0 : U(0.3) }}
          data-testid="round"
        >
          Round {round}
        </div>
      </div>

      {/* Both panels, scaled to fit the space between the title and the status line */}
      <div
        className="absolute left-0 flex items-center justify-center"
        style={{ top: panelsTop, width: '100vw', height: `calc(${panelsBottom} - ${panelsTop})`, containerType: 'size' }}
      >
        <div
          className="pointer-events-auto flex justify-center"
          style={{
            // panels are 64 x 33.4 (side by side) or 30.2 x 70.4 (stacked) in their own cqw units
            width: portrait ? 'min(314cqw, 135cqh)' : 'min(148cqw, 284cqh, 100vw)',
            flexShrink: 0, // may be wider than the screen; only the centred panels inside are visible
            containerType: 'inline-size',
          }}
        >
          {panels(portrait)}
        </div>
      </div>

      {/* Status line */}
      <div
        className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-black/70 font-ui font-bold uppercase ${statusColor}`}
        style={{ left: '50vw', top: statusY, fontSize: U(1.5), padding: `${U(0.35)} ${U(1.6)}`, letterSpacing: '0.15em' }}
        aria-live="polite"
        data-testid="status"
      >
        {status}
      </div>
    </>
  )
}
