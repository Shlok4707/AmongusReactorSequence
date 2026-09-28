import { useLayoutEffect } from 'react'
import { SPRITES } from '../assets'
import { playKillSound } from '../audio/AudioManager'
import { KILL_ANIMATION_MS } from '../game/constants'

const D = `${KILL_ANIMATION_MS}ms`
const FIRE_TILES = 5 // track is 5 tiles wide, loop shifts by exactly one tile (20%)

/**
 * 2-second kill animation.
 * Fire flows continuously right → left across the screen; the loser sits in the
 * middle of the fire while the killer stabs it.
 * Rendered as a full-viewport overlay; parent unmounts it after KILL_ANIMATION_MS.
 */
export default function KillAnimation() {
  // Sound starts in the same frame the animation mounts; stops if the page unmounts early.
  useLayoutEffect(() => playKillSound(), [])

  // Sizes scale with viewport. Loser width = L; killer is anchored so its knife tip
  // (98.5% / 39% of the killer image) lands on the loser's upper body.
  const L = 'min(19vw, 30vh)'
  const K = `calc(${L} * 1.2)`

  return (
    <div
      className="fixed left-0 top-0 z-50 overflow-hidden"
      style={{ width: '100vw', height: '100vh' }}
      data-testid="kill-animation"
      role="alert"
      aria-label="Wrong square! You were killed."
    >
      {/* dim — covers the whole screen and never moves */}
      <div
        className="absolute left-0 top-0 bg-[radial-gradient(ellipse_at_center,rgba(40,0,0,0.75),rgba(0,0,0,0.92))]"
        style={{ width: '100vw', height: '100vh', animation: `kill-dim ${D} ease-out forwards` }}
      />

      {/* only the fire + characters shake */}
      <div
        className="motion-safe-shake absolute left-0 top-0"
        style={{ width: '100vw', height: '100vh', animation: `screen-shake ${D} linear forwards` }}
      >

      {/* fire band: reveals from the right, then flows right → left for the whole 2s */}
      <div
        className="absolute top-1/2 -translate-y-1/2 overflow-hidden"
        style={{ left: '-5vw', width: '110vw', height: 'min(50vh, 34vw)', animation: `fire-reveal ${D} ease-out forwards` }}
      >
        <div
          className="flex h-full w-max"
          style={{ animation: 'fire-flow 0.5s linear infinite' }}
        >
          {Array.from({ length: FIRE_TILES }, (_, i) => (
            <img key={i} src={SPRITES.fire} alt="" draggable="false" className="block h-full w-auto max-w-none" />
          ))}
        </div>
      </div>

      {/* killer + loser, centred in the fire */}
      <div className="absolute left-1/2 top-1/2">
        <img
          src={SPRITES.lost}
          alt="Crewmate"
          draggable="false"
          className="absolute left-0 top-0 max-w-none drop-shadow-[0_0_1.5vw_rgba(0,0,0,0.8)]"
          style={{ width: L, animation: `loser-hit ${D} ease-out forwards` }}
        />
        <img
          src={SPRITES.killer}
          alt="Impostor"
          draggable="false"
          className="absolute max-w-none drop-shadow-[0_0_1.5vw_rgba(0,0,0,0.8)]"
          style={{
            width: K,
            // knife tip target = (-0.02L, -0.12L) from centre
            left: `calc(${L} * -0.02 - ${K} * 0.985)`,
            top: `calc(${L} * -0.12 - ${K} * 0.255)`,
            transformOrigin: '98.5% 39%',
            animation: `killer-stab ${D} cubic-bezier(.2,.7,.3,1) forwards`,
          }}
        />
        {/* impact burst on each stab */}
        <div
          className="absolute"
          style={{
            left: `calc(${L} * -0.02)`,
            top: `calc(${L} * -0.12)`,
            width: `calc(${L} * 0.55)`,
            height: `calc(${L} * 0.55)`,
            animation: `impact ${D} linear forwards`,
            background:
              'conic-gradient(from 0deg, transparent 0 8%, #fff 9% 11%, transparent 12% 20%, #fecaca 21% 23%, transparent 24% 33%, #fff 34% 36%, transparent 37% 45%, #fecaca 46% 48%, transparent 49% 58%, #fff 59% 61%, transparent 62% 70%, #fecaca 71% 73%, transparent 74% 83%, #fff 84% 86%, transparent 87%)',
            WebkitMaskImage: 'radial-gradient(circle, #000 20%, transparent 70%)',
            maskImage: 'radial-gradient(circle, #000 20%, transparent 70%)',
          }}
        />
      </div>

      </div>

      {/* red hit flash — covers the whole screen and never moves */}
      <div
        className="pointer-events-none absolute left-0 top-0 bg-red-600 mix-blend-screen"
        style={{ width: '100vw', height: '100vh', animation: `red-flash ${D} linear forwards` }}
      />
    </div>
  )
}
