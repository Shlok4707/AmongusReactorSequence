import { GRID_SIZE, MAX_STAGES } from '../config/constants.js';

/**
 * Generates the full, cumulative target sequence for one task run.
 *
 * GDD 2.2 (Pre-Generation Algorithm): the entire MAX_STAGES-length sequence
 * is generated in one shot, the moment the game initializes or resets from
 * a failure - never incrementally per stage. This avoids the sync/reset
 * bugs the doc calls out.
 *
 * GDD 2.3 (Duplicate Logic): consecutive duplicates are explicitly valid
 * and must NOT be filtered out (e.g. [4,4,4,4,4] is a legal sequence). This
 * function performs no dedup/retry logic of any kind - it is intentionally
 * "dumb."
 *
 * @param {() => number} rng - source of randomness in [0, 1). Injectable so
 *   tests can assert exact output deterministically rather than trying to
 *   test "randomness."
 * @param {number} length - sequence length, defaults to MAX_STAGES (5).
 * @param {number} gridSize - number of possible indices, defaults to 9.
 * @returns {number[]} an array of `length` integers in [0, gridSize).
 */
export function generateSequence(rng = Math.random, length = MAX_STAGES, gridSize = GRID_SIZE) {
  const sequence = [];
  for (let i = 0; i < length; i++) {
    sequence.push(Math.floor(rng() * gridSize));
  }
  return sequence;
}
