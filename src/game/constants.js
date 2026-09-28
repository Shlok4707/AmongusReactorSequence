// Number of lights per round. After round 10 the array loops (round 11 -> 3, ...).
export const ROUND_LENGTHS = [3, 4, 5, 5, 6, 6, 7, 7, 8, 9]

export const GRID_SIZE = 3 // 3 x 3
export const GAME_DURATION_MS = 90_000 // 90-second game timer
export const COUNTDOWN_FROM = 3

// Sequence playback: a new light every 0.8s (LIGHT_ON_MS + LIGHT_GAP_MS = 800ms)
export const PRE_SEQUENCE_DELAY_MS = 550 // pause before first light of a round
export const LIGHT_ON_MS = 550 // how long each square stays lit
export const LIGHT_GAP_MS = 250 // dark gap between lights

export const ROUND_CLEAR_PAUSE_MS = 450 // brief "cleared" flash before next round
export const KILL_ANIMATION_MS = 2000 // exactly 2 seconds

export const lengthForRound = (round) =>
  ROUND_LENGTHS[(round - 1) % ROUND_LENGTHS.length]

// Random sequence. A square may appear more than once in a sequence (the 3x3 grid
// only has 9 squares), but never twice in a row, so every light is clearly visible.
export function randomSequence(length) {
  const cells = GRID_SIZE * GRID_SIZE
  const seq = []
  while (seq.length < length) {
    const c = Math.floor(Math.random() * cells)
    if (c !== seq[seq.length - 1]) seq.push(c)
  }
  return seq
}

// Points for the number of rounds successfully completed before the timer ends:
// 1–5 rounds -> 0, 6 rounds -> 2000, then +500 for every extra round (7 -> 2500, 8 -> 3000, ...).
export const POINTS_START_ROUND = 6
export const POINTS_AT_START = 2000
export const POINTS_PER_EXTRA_ROUND = 500

export const pointsForRounds = (rounds) =>
  rounds < POINTS_START_ROUND ? 0 : POINTS_AT_START + (rounds - POINTS_START_ROUND) * POINTS_PER_EXTRA_ROUND
