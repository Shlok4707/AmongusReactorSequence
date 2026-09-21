import { TIMING } from '../config/constants.js';

/**
 * InputValidator
 * --------------
 * Enforces the two GDD input-hygiene rules that are about physical
 * timing rather than game-sequence correctness, so they don't belong in
 * StartReactorFSM (which only judges "is this the right index"):
 *
 *  - GDD 6.5 (debounce): a rigid 50ms window per button to reject switch
 *    bounce / macro-fired duplicate clicks.
 *  - GDD 6.7 (fresh-press requirement): a button physically held down
 *    during STATE_SHOWING_PATTERN must not auto-register the instant
 *    STATE_WAITING_INPUT begins. A valid input requires a press-down that
 *    started AFTER the input phase opened.
 *
 * This is still pure/deterministic logic (no setTimeout, no side effects)
 * - it just operates on wall-clock timestamps supplied by the caller
 * rather than on game state, which is why it's a sibling of GameSession
 * rather than a method on the FSM itself.
 */
export class InputValidator {
  constructor({ debounceMs = TIMING.DEBOUNCE_MS } = {}) {
    this._debounceMs = debounceMs;
    this._lastPressAt = new Map(); // index -> timestamp of last accepted press
    this._inputPhaseOpenedAt = null;
  }

  /**
   * Call this the moment the session enters STATE_WAITING_INPUT (including
   * every re-arm after a correct-but-not-final input, per GDD 6.7's
   * "discrete press-down -> release cycle after the input phase begins").
   */
  markInputPhaseOpened(nowMs = Date.now()) {
    this._inputPhaseOpenedAt = nowMs;
  }

  /** Call this on abort/reset so stale press timestamps don't leak into the next stage. */
  reset() {
    this._lastPressAt.clear();
    this._inputPhaseOpenedAt = null;
  }

  /**
   * @param {{ index: number, pressDownTs: number, releaseTs?: number }} press
   * @param {number} [nowMs]
   * @returns {{ valid: boolean, reason?: 'DEBOUNCED' | 'STALE_PRESS' | 'PHASE_NOT_OPEN' }}
   */
  validate(press, nowMs = Date.now()) {
    const { index, pressDownTs } = press;

    if (this._inputPhaseOpenedAt === null) {
      // Defensive: GameSession should never call this outside an open
      // input phase, but a stale/racing client event could still arrive.
      return { valid: false, reason: 'PHASE_NOT_OPEN' };
    }

    // GDD 6.7: a press that began before the input phase opened (i.e. the
    // button was already held down during STATE_SHOWING_PATTERN) does not
    // count, even if it's "released" after the phase opens.
    if (typeof pressDownTs === 'number' && pressDownTs < this._inputPhaseOpenedAt) {
      return { valid: false, reason: 'STALE_PRESS' };
    }

    // GDD 6.5: 50ms debounce per physical button.
    const last = this._lastPressAt.get(index);
    if (typeof last === 'number' && nowMs - last < this._debounceMs) {
      return { valid: false, reason: 'DEBOUNCED' };
    }

    this._lastPressAt.set(index, nowMs);
    return { valid: true };
  }
}
