import { StartReactorFSM } from '../engine/StartReactorFSM.js';
import { STATES } from '../engine/states.js';
import { EFFECT_TYPES, SCHEDULE_KIND, OUTBOUND_EVENTS } from '../engine/events.js';
import { TimerService } from './TimerService.js';
import { InputValidator } from './InputValidator.js';

/**
 * GameSession
 * -----------
 * One isolated instance per player/task-run. This is the "imperative
 * shell" around the pure StartReactorFSM: it owns a TimerService (the only
 * thing allowed to call setTimeout) and an InputValidator (debounce /
 * fresh-press checks), and it interprets the effect arrays the FSM hands
 * back into real scheduled callbacks and real outbound events.
 *
 * Every outbound event goes through the single `onEvent(event, payload)`
 * callback supplied at construction - GameSession has no idea whether
 * that callback forwards to a Socket.io client, a test spy, or /dev/null.
 * That's the seam Milestone 3's socket gateway plugs into.
 */
export class GameSession {
  /**
   * @param {{ sessionId: string, onEvent: (event: string, payload: object) => void, rng?: () => number }} options
   */
  constructor({ sessionId, onEvent, rng }) {
    this.sessionId = sessionId;
    this._onEvent = onEvent;
    this._fsm = new StartReactorFSM({ rng });
    this._timers = new TimerService();
    this._inputValidator = new InputValidator();
    this._lastKnownState = null;
    this._destroyed = false;
  }

  get state() {
    return this._fsm.state;
  }

  /** Begins the task run. Call once, right after the session is created. */
  start() {
    this._assertAlive();
    this._interpret(this._fsm.createSession());
  }

  /**
   * Submits one raw button press from the client.
   *
   * @param {{ index: number, pressDownTs: number, releaseTs?: number }} press
   * @returns {{ accepted: boolean, reason?: string }}
   */
  submitInput(press) {
    this._assertAlive();
    const now = Date.now();
    const check = this._inputValidator.validate(press, now);
    if (!check.valid) {
      // GDD 3.3 / 6.5 / 6.7: hardware artifacts (bounce, stale held-button
      // press, or a press arriving before any input phase has opened) are
      // "swallowed by the logic controller" - no distinct wire feedback is
      // specified for these, so we just drop them.
      return { accepted: false, reason: check.reason };
    }

    // NOTE on GDD 6.5 "simultaneous input protection": we do not need an
    // explicit mutex/lock here. Node's event loop runs this method to
    // completion before it can be re-entered, and by the time this method
    // returns the FSM has already left STATE_WAITING_INPUT (moved to
    // EVALUATING and onward). A second call arriving "simultaneously"
    // still executes strictly after this one finishes, and the FSM's own
    // `_require(STATES.WAITING_INPUT)` guard will reject it. The
    // correctness guard IS the race protection.
    const result = this._fsm.submitInput(press.index);
    this._interpret(result.effects);
    return { accepted: result.accepted };
  }

  /** GDD 6.10: manual close, emergency meeting, dead body report, scene change, disconnect. */
  abort(reason = 'MANUAL') {
    if (this._destroyed) return;
    this._interpret(this._fsm.abort(reason));
    this._teardown();
  }

  /** Called by SessionManager once abort's effects have been fully interpreted. */
  _teardown() {
    this._timers.cancelAll();
    this._inputValidator.reset();
    this._destroyed = true;
  }

  _assertAlive() {
    if (this._destroyed) {
      throw new Error(`GameSession ${this.sessionId} has already been destroyed`);
    }
  }

  // ---------------------------------------------------------------------
  // Effect interpretation - the only place SCHEDULE/EMIT/CANCEL effects
  // are turned into real setTimeout calls and real onEvent() calls.
  // ---------------------------------------------------------------------

  _interpret(effects) {
    for (const effect of effects) {
      this._interpretOne(effect);
    }
  }

  _interpretOne(effect) {
    switch (effect.type) {
      case EFFECT_TYPES.EMIT:
        this._handleEmit(effect.event, effect.payload);
        return;

      case EFFECT_TYPES.SCHEDULE:
        this._timers.schedule(effect.name, effect.delayMs, () => {
          this._runScheduledAction(effect.action);
        });
        return;

      case EFFECT_TYPES.CANCEL:
        this._timers.cancel(effect.name);
        return;

      case EFFECT_TYPES.CANCEL_ALL:
        this._timers.cancelAll();
        return;

      default:
        throw new Error(`Unknown effect type: ${effect.type}`);
    }
  }

  _runScheduledAction(action) {
    if (this._destroyed) return; // GDD 6.10 - stale timers after teardown are no-ops
    if (action.kind === SCHEDULE_KIND.EMIT) {
      this._handleEmit(action.event, action.payload);
      return;
    }
    if (action.kind === SCHEDULE_KIND.TRANSITION) {
      const trigger = this._fsm[action.trigger];
      if (typeof trigger !== 'function') {
        throw new Error(`FSM has no transition method '${action.trigger}'`);
      }
      this._interpret(trigger.call(this._fsm));
      return;
    }
    throw new Error(`Unknown schedule action kind: ${action.kind}`);
  }

  _handleEmit(event, payload) {
    if (event === OUTBOUND_EVENTS.STATE_CHANGED) {
      this._trackInputPhaseTransition(payload.state);
    }
    this._onEvent(event, payload);
  }

  /**
   * GDD 6.7 (fresh-press requirement): the input phase's "open" timestamp
   * must be marked exactly once per stage - the moment the machine first
   * enters STATE_WAITING_INPUT from STATE_SHOWING_PATTERN. It must NOT be
   * reset on every subsequent correct-but-not-final input within the same
   * stage (those re-enter WAITING_INPUT too, but a press that's been
   * "fresh" since the stage began is still fresh for step 2, 3, etc.).
   * Comparing against the previously observed state is what gives us
   * "first entry only" without special-casing which FSM method fired.
   */
  _trackInputPhaseTransition(newState) {
    if (newState === STATES.WAITING_INPUT && this._lastKnownState !== STATES.WAITING_INPUT) {
      this._inputValidator.markInputPhaseOpened();
    }
    this._lastKnownState = newState;
  }
}
