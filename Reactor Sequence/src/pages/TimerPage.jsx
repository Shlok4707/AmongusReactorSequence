import { useEffect, useState } from 'react'
import Stage from '../components/Stage'
import { COUNTDOWN_FROM } from '../game/constants'

// Page 2 — "timer bg": 3 → 2 → 1, then hand over to the main game.
// The 120-second game timer is NOT running here.
export default function TimerPage({ onDone }) {
  const [count, setCount] = useState(COUNTDOWN_FROM)

  useEffect(() => {
    const id = setTimeout(() => {
      if (count > 1) setCount(count - 1)
      else onDone()
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
