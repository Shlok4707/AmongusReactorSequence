// Number of lights per round. After round 10 the array loops (round 11 -> 5, ...).
export const ROUND_LENGTHS = [5, 7, 3, 4, 5, 8, 7, 6, 9, 10]

export const GRID_SIZE = 5 // 5 x 5
export const GAME_DURATION_MS = 120_000 // 120-second game timer
export const COUNTDOWN_FROM = 3

// Sequence playback: a new light every 0.5s (LIGHT_ON_MS + LIGHT_GAP_MS = 500ms)
export const PRE_SEQUENCE_DELAY_MS = 550 // pause before first light of a round
export const LIGHT_ON_MS = 350 // how long each square stays lit
export const LIGHT_GAP_MS = 150 // dark gap between lights

export const ROUND_CLEAR_PAUSE_MS = 450 // brief "cleared" flash before next round
export const KILL_ANIMATION_MS = 2000 // exactly 2 seconds

export const lengthForRound = (round) =>
  ROUND_LENGTHS[(round - 1) % ROUND_LENGTHS.length]

// Random, non-repeating squares in random order.
export function randomSequence(length) {
  const cells = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => i)
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
  }
  return cells.slice(0, length)
}
