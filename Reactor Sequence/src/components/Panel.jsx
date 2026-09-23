import { GRID_SIZE } from '../game/constants'

const CELLS = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i)

/** Row of indicator lights at the top of a panel. */
function Indicators({ total, lit, state }) {
  return (
    <div className="flex h-[2.2cqw] items-center justify-center gap-[0.75cqw]" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        const on = i < lit
        let cls = 'bg-[#16202c] shadow-[inset_0_0.15cqw_0.3cqw_rgba(0,0,0,0.8)] border-[#2c3a4b]'
        if (state === 'fail') cls = 'bg-red-500 border-red-300 shadow-[0_0_0.9cqw_rgba(239,68,68,0.95)]'
        else if (state === 'clear') cls = 'bg-sky-200 border-white shadow-[0_0_1.2cqw_rgba(125,211,252,1)]'
        else if (on) cls = 'bg-[#2f8bff] border-[#b9dcff] shadow-[0_0_0.9cqw_rgba(47,139,255,0.95)]'
        return (
          <span
            key={i}
            className={`size-[1.55cqw] rounded-full border-[0.14cqw] transition-[background-color,box-shadow] duration-100 ${cls}`}
          />
        )
      })}
    </div>
  )
}

function Frame({ label, children }) {
  return (
    <div
      className="flex flex-col gap-[1cqw] rounded-[1.2cqw] border-[0.25cqw] border-[#3a4b60]
        bg-gradient-to-b from-[#1b2533]/95 to-[#0c121b]/95 p-[1.1cqw]
        shadow-[0_0_2.5cqw_rgba(0,0,0,0.8),inset_0_0.2cqw_0_rgba(255,255,255,0.08)]"
      aria-label={label}
    >
      {children}
    </div>
  )
}

/** LEFT — read-only 5x5 grid that plays the sequence. */
export function SequenceGrid({ total, shown, litCell, indicatorState }) {
  return (
    <Frame label="Sequence display">
      <Indicators total={total} lit={shown} state={indicatorState} />
      <div
        className="pointer-events-none grid size-[28.5cqw] grid-cols-5 gap-[0.55cqw] rounded-[0.6cqw] bg-black/70 p-[0.7cqw]"
        data-testid="sequence-grid"
      >
        {CELLS.map((i) => {
          const lit = litCell === i
          return (
            <div
              key={i}
              data-lit={lit || undefined}
              className={`rounded-[0.35cqw] border-[0.12cqw] transition-[background-color,box-shadow] duration-75 ${
                lit
                  ? 'border-sky-100 bg-sky-400 shadow-[0_0_1.6cqw_rgba(56,189,248,1),inset_0_0_0.8cqw_rgba(255,255,255,0.7)]'
                  : 'border-[#1e3148] bg-[#0b1624] shadow-[inset_0_0_0.6cqw_rgba(0,0,0,0.9)]'
              }`}
            />
          )
        })}
      </div>
    </Frame>
  )
}

/** RIGHT — interactive 5x5 keypad. */
export function Keypad({ total, entered, indicatorState, disabled, flash, onPress }) {
  return (
    <Frame label="Keypad">
      <Indicators total={total} lit={entered} state={indicatorState} />
      <div
        className={`grid size-[28.5cqw] grid-cols-5 gap-[0.55cqw] rounded-[0.6cqw] bg-black/70 p-[0.7cqw] ${
          disabled ? 'cursor-not-allowed' : ''
        }`}
        data-testid="keypad"
      >
        {CELLS.map((i) => {
          const f = flash && flash.cell === i ? flash.ok : null
          let cls =
            'border-[#dfe7ee] bg-gradient-to-b from-[#cfd8e1] to-[#9aa7b4] shadow-[inset_0_-0.3cqw_0_rgba(0,0,0,0.35),0_0.15cqw_0.3cqw_rgba(0,0,0,0.6)]'
          if (f === true)
            cls = 'border-sky-100 bg-sky-400 shadow-[0_0_1.4cqw_rgba(56,189,248,1)] translate-y-[0.15cqw]'
          else if (f === false)
            cls = 'border-red-200 bg-red-500 shadow-[0_0_1.6cqw_rgba(239,68,68,1)] translate-y-[0.15cqw]'
          return (
            <button
              key={i}
              type="button"
              aria-label={`Key ${Math.floor(i / 5) + 1}-${(i % 5) + 1}`}
              disabled={disabled}
              onPointerDown={(e) => {
                e.preventDefault()
                onPress(i)
              }}
              className={`rounded-[0.35cqw] border-[0.12cqw] transition-[transform,background-color,box-shadow] duration-75 ${cls} ${
                disabled ? 'opacity-55' : 'cursor-pointer hover:brightness-110 active:translate-y-[0.15cqw]'
              }`}
            />
          )
        })}
      </div>
    </Frame>
  )
}
