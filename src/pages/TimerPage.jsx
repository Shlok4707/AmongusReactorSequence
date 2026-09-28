import { useEffect, useRef, useState } from 'react'
import Stage from '../components/Stage'
import { COUNTDOWN_FROM } from '../game/constants'
import { playCountdownBeep, playCountdownGo } from '../audio/AudioManager'

// Page 2 — "timer bg": 3 → 2 → 1 (a beep on each), then "go" as the main game appears.
// The 90-second game timer is NOT running here.
export default function TimerPage({ onDone }) {
  const [count, setCount] = useState(COUNTDOWN_FROM)
  const beeped = useRef(null) // guards against double beeps (React StrictMode in dev)

  // Beep the moment each number appears
  useEffect(() => {
    if (beeped.current === count) return
    beeped.current = count
    playCountdownBeep()
  }, [count])

  useEffect(() => {
    const id = setTimeout(() => {
      if (count > 1) setCount(count - 1)
      else {
        playCountdownGo()
        onDone()
      }
    }, 1000)
    return () => clearTimeout(id)
  }, [count, onDone])

  return (
    <Stage name="timer bg">
      <div
        key={count}
        className="absolute font-display text-[17cqw] font-black leading-none text-white
          [text-shadow:0_0_2cqw_rgba(34,211,238,1),0_0_5cqw_rgba(34,211,238,0.7)]
          animate-[count-pop_1s_ease-out_forwards]"
        style={{ left: '52.4%', top: '52%' }}
        aria-live="assertive"
      >
        {count}
      </div>
    </Stage>
  )
}
