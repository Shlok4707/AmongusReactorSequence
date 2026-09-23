import { useCallback, useEffect, useRef, useState } from 'react'
import Stage from '../components/Stage'
import { SequenceGrid, Keypad } from '../components/Panel'
import KillAnimation from '../components/KillAnimation'
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

  // ---------- 120-second main timer: starts the moment this page appears ----------
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
      schedule(() => setAttempt((a) => a + 1), KILL_ANIMATION_MS)
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
      <Stage name="main game bg">
        {/* Top-right: red 120s timer + round number */}
        <div
          className="absolute right-[2%] top-[3%] flex min-w-[10cqw] flex-col items-center rounded-[1cqw]
            border-[0.2cqw] border-red-500/60 bg-black/70 px-[1.4cqw] py-[0.7cqw]
            shadow-[0_0_2cqw_rgba(239,68,68,0.45)] backdrop-blur-sm"
          data-testid="hud"
        >
          <div
            className={`font-display text-[4.4cqw] font-black leading-none tabular-nums text-red-500
              [text-shadow:0_0_1.2cqw_rgba(239,68,68,0.9)] ${urgent ? 'animate-[timer-urgent_1s_ease-in-out_infinite]' : ''}`}
            data-testid="timer"
            aria-label={`${seconds} seconds left`}
          >
            {seconds}
          </div>
          <div className="mt-[0.3cqw] font-ui text-[1.6cqw] font-bold uppercase tracking-[0.18em] text-white" data-testid="round">
            Round {round}
          </div>
        </div>

        {/* Two panels occupying the centre of the page */}
        <div className="absolute left-1/2 top-[25.5%] flex -translate-x-1/2 items-start gap-[3.6cqw]">
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

        <div
          className={`absolute left-1/2 top-[83.2%] -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-[1.6cqw] py-[0.35cqw]
            font-ui text-[1.5cqw] font-bold uppercase tracking-[0.15em] ${
              phase === 'input' ? 'text-emerald-300' : phase === 'kill' ? 'text-red-400' : 'text-sky-200'
            }`}
          aria-live="polite"
          data-testid="status"
        >
          {status}
        </div>
      </Stage>

      {phase === 'kill' && <KillAnimation key={attempt} />}
    </>
  )
}
