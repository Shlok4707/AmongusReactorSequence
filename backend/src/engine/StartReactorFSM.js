import { STATES, STAGE_INDICATOR } from './states.js';
import { OUTBOUND_EVENTS, EFFECT_TYPES, SCHEDULE_KIND, TIMERS } from './events.js';
import { generateSequence } from './SequenceGenerator.js';
import { MAX_STAGES, TIMING } from '../config/constants.js';

/**
 * StartReactorFSM
 * ----------------
 * Pure state machine for the "Start Reactor" memory minigame (GDD sections
 * 2-6). No I/O: no setTimeout, no console, no network. Every public method
 * takes the machine from one valid state to another and returns a plain
 * array of `effects` describing what the host (GameSession, Milestone 2)
 * should do about it - emit an event now, schedule something for later, or
 * cancel a pending schedule.
 *
 * Design rationale: the GDD explicitly warns against "loose boolean flags"
 * (isFlashing, canClick) causing race conditions (GDD 4.2), and insists on
 * a strict FSM. Making the FSM a pure reducer is the strongest version of
 * that: there is no ambient mutable timing state to race against - every
 * transition is a synchronous function call with a fully deterministic
 * return value, which also makes 100% of the edge cases in GDD section 6
 * unit-testable without fake timers.
 *
 * One deliberate interpretation, documented here rather than left implicit:
 * the GDD's FSM table (4.2) does not name a state for the 500ms pause
 * between a completed *non-final* stage and the start of the next
 * playback (GDD 6.1). Introducing an 8th state not in the spec felt like
 * scope creep, so that pause is represented by remaining in
 * STATE_EVALUATING - which the GDD already defines as a locked, no-input
 * micro-state - for the duration of the pause. Input stays rejected the
 * entire time either way, so behavior is identical to spec; only the
 * *label* of the state during that window is an interpretation.
 */
export class StartReactorFSM {
  /**
   * @param {{ rng?: () => number }} [options]
   */
  constructor({ rng = Math.random } = {}) {
    this._rng = rng;
    this.state = null;
    this.currentStage = 0;
    this.playerStep = 0;
    this.targetSequence = [];
    this.stageIndicators = this._freshStageIndicators();
    this.stepIndicators = this._freshStepIndicators();
  }

  // ---------------------------------------------------------------------
  // Public commands
  // ---------------------------------------------------------------------

  /**
   * Begins a brand-new task run. Called once when a session is first
   * created. GDD 3.1: this is the ONLY entry point that carries the 1000ms
   * initial observation delay.
   */
  createSession() {
    this._beginFreshRun();
    const effects = [
      this._stateChangedEffect(),
      this._schedule(TIMERS.INIT_DELAY, TIMING.INIT_OBSERVATION_DELAY_MS, {
        kind: SCHEDULE_KIND.TRANSITION,
        trigger: 'onInitDelayElapsed',
      }),
    ];
    return effects;
  }

  /** Fired by the host when the INIT_DELAY timer elapses (GDD 3.1 -> 3.2). */
  onInitDelayElapsed() {
    if (!this._require(STATES.INIT)) return this._ignored();
    return this._enterShowingPattern();
  }

  /** Fired by the host when the full playback timeline finishes (GDD 3.2 -> 6.3). */
  onPlaybackComplete() {
    if (!this._require(STATES.SHOWING_PATTERN)) return this._ignored();
    this.state = STATES.WAITING_INPUT;
    this.stepIndicators = this._freshStepIndicators(); // GDD 6.9 - reset each stage
    return [
      this._stateChangedEffect(),
      this._emit(OUTBOUND_EVENTS.PROGRESS_UPDATE, { filledCount: 0 }),
      this._armInputTimeout(),
    ];
  }

  /**
   * Submits one raw button press for validation (GDD 6.2).
   *
   * This method assumes debounce / fresh-press / single-in-flight checks
   * (GDD 6.5, 6.7) have ALREADY passed - those are InputValidator's job
   * (Milestone 2), which is a wall-clock/I/O-adjacent concern and does not
   * belong in this pure reducer. This method's only responsibility is:
   * "given a validator-approved press, is it the right next index?"
   *
   * @param {number} index - grid index 0-8 the player pressed.
   * @returns {{ effects: object[], accepted: boolean }}
   */
  submitInput(index) {
    if (!this._require(STATES.WAITING_INPUT)) {
      // GDD 3.3 / 6.6: input outside STATE_WAITING_INPUT is categorically
      // rejected and never queued.
      return { effects: [], accepted: false };
    }

    // GDD 4.2: STATE_EVALUATING is the micro-state for the exact frame the
    // input is judged. We pass through it synchronously - no external
    // caller can observe the machine "sitting" in EVALUATING for a wrong
    // or non-terminal-correct answer, only for the stage-transition hold
    // (see class doc above).
    this.state = STATES.EVALUATING;

    const effects = [this._cancel(TIMERS.INPUT_TIMEOUT)];
    const expected = this.targetSequence[this.playerStep];
    const correct = index === expected;

    effects.push(this._emit(OUTBOUND_EVENTS.INPUT_RESULT, { index, correct, playerStep: this.playerStep }));

    if (!correct) {
      return { effects: effects.concat(this._enterError('WRONG_INPUT')), accepted: true };
    }

    this.playerStep += 1;
    this.stepIndicators[this.playerStep - 1] = true;
    effects.push(this._emit(OUTBOUND_EVENTS.PROGRESS_UPDATE, { filledCount: this.playerStep }));

    const stageComplete = this.playerStep === this.currentStage;
    if (!stageComplete) {
      // GDD 6.2: correct-but-not-final input keeps the player in the same
      // input phase; GDD 6.3's timeout re-arms on the new step.
      this.state = STATES.WAITING_INPUT;
      effects.push(this._stateChangedEffect(), this._armInputTimeout());
      return { effects, accepted: true };
    }

    // Stage complete.
    this.stageIndicators[this.currentStage - 1] = STAGE_INDICATOR.GREEN; // GDD 6.8
    effects.push(this._emit(OUTBOUND_EVENTS.STAGE_COMPLETE, { stage: this.currentStage }));

    if (this.currentStage === MAX_STAGES) {
      this.state = STATES.VICTORY; // GDD 4.2
      effects.push(this._stateChangedEffect(), this._emit(OUTBOUND_EVENTS.TASK_COMPLETED, {}));
      return { effects, accepted: true };
    }

    // GDD 6.1: illuminate indicator + chime already emitted above via
    // STAGE_COMPLETE; now hold for 500ms before the next (longer) playback.
    effects.push(
      this._stateChangedEffect(),
      this._schedule(TIMERS.STAGE_TRANSITION_DELAY, TIMING.STAGE_TRANSITION_DELAY_MS, {
        kind: SCHEDULE_KIND.TRANSITION,
        trigger: 'onStageTransitionElapsed',
      })
    );
    return { effects, accepted: true };
  }

  /** Fired by the host when the 500ms stage-transition hold elapses (GDD 6.1 step 3-5). */
  onStageTransitionElapsed() {
    if (!this._require(STATES.EVALUATING)) return this._ignored();
    this.currentStage += 1;
    this.playerStep = 0;
    this.stepIndicators = this._freshStepIndicators();
    return this._enterShowingPattern();
  }

  /** Fired by the host when the 15s input-timeout timer elapses (GDD 6.3). */
  onInputTimeout() {
    if (!this._require(STATES.WAITING_INPUT)) return this._ignored();
    return this._enterError('TIMEOUT');
  }

  /** Fired by the host after STATE_ERROR's display window elapses. */
  onErrorResetElapsed() {
    if (!this._require(STATES.ERROR)) return this._ignored();
    this._beginFreshRun();
    // Assumption (see constants.js ERROR_DISPLAY_MS comment): a failure
    // reset does NOT replay the 1000ms observation delay, since per GDD
    // 3.1 that buffer exists because the UI panel was just instantiated
    // and the player's eyes are still adjusting from the 3D world. On an
    // in-task failure the panel was never closed, so we go straight into
    // Stage 1 playback.
    return this._enterShowingPattern();
  }

  /**
   * Tears the session down from ANY active state (GDD 6.10). Idempotent:
   * calling abort() on an already-aborted machine is a safe no-op.
   */
  abort(reason = 'MANUAL') {
    if (this.state === STATES.ABORTED) return this._ignored();
    this.state = STATES.ABORTED;
    this.targetSequence = []; // GDD 6.10 step 4 - nullify the sequence
    this.stageIndicators = this._freshStageIndicators(); // step 3 - reset indicators
    this.stepIndicators = this._freshStepIndicators();
    return [
      { type: EFFECT_TYPES.CANCEL_ALL }, // step 1 - cancel every coroutine/timeout
      this._emit(OUTBOUND_EVENTS.SESSION_ABORTED, { reason }),
    ];
  }

  // ---------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------

  _beginFreshRun() {
    // GDD 2.2: full sequence generated in one shot, on init or failure-reset.
    this.targetSequence = generateSequence(this._rng, MAX_STAGES);
    this.currentStage = 1;
    this.playerStep = 0;
    this.stageIndicators = this._freshStageIndicators();
    this.stepIndicators = this._freshStepIndicators();
    this.state = STATES.INIT;
  }

  _freshStageIndicators() {
    return Array(MAX_STAGES).fill(STAGE_INDICATOR.OFF);
  }

  _freshStepIndicators() {
    return Array(MAX_STAGES).fill(false);
  }

  /**
   * Shared entry into STATE_SHOWING_PATTERN, used both for a fresh
   * session's first stage and for every subsequent stage transition.
   * Builds the entire flash/gap timeline for targetSequence[0..currentStage-1]
   * as SCHEDULE effects with cumulative offsets (GDD 3.2).
   */
  _enterShowingPattern() {
    this.state = STATES.SHOWING_PATTERN;
    this.stageIndicators[this.currentStage - 1] = STAGE_INDICATOR.BLUE; // GDD 6.8

    const { FLASH_DURATION_MS, GAP_DURATION_MS } = TIMING;
    const stepDuration = FLASH_DURATION_MS + GAP_DURATION_MS;
    const effects = [
      this._stateChangedEffect(),
      this._emit(OUTBOUND_EVENTS.STAGE_ACTIVE, { stage: this.currentStage }),
    ];

    for (let i = 0; i < this.currentStage; i++) {
      const gridIndex = this.targetSequence[i];
      const flashAt = i * stepDuration;
      const darkAt = flashAt + FLASH_DURATION_MS;

      effects.push(
        this._schedule(TIMERS.flashStep(i), flashAt, {
          kind: SCHEDULE_KIND.EMIT,
          event: OUTBOUND_EVENTS.SQUARE_LIT,
          payload: { index: gridIndex, durationMs: FLASH_DURATION_MS },
        }),
        this._schedule(TIMERS.gapStep(i), darkAt, {
          kind: SCHEDULE_KIND.EMIT,
          event: OUTBOUND_EVENTS.SQUARE_DARK,
          payload: { index: gridIndex },
        })
      );
    }

    const totalDurationMs = this.currentStage * stepDuration;
    effects.push(
      this._schedule(TIMERS.PLAYBACK_COMPLETE, totalDurationMs, {
        kind: SCHEDULE_KIND.TRANSITION,
        trigger: 'onPlaybackComplete',
      })
    );

    return effects;
  }

  _enterError(reason) {
    this.state = STATES.ERROR;
    return [
      this._stateChangedEffect(),
      this._emit(OUTBOUND_EVENTS.TASK_FAILED, { reason }),
      this._schedule(TIMERS.ERROR_RESET_DELAY, TIMING.ERROR_DISPLAY_MS, {
        kind: SCHEDULE_KIND.TRANSITION,
        trigger: 'onErrorResetElapsed',
      }),
    ];
  }

  _armInputTimeout() {
    return this._schedule(TIMERS.INPUT_TIMEOUT, TIMING.INPUT_TIMEOUT_MS, {
      kind: SCHEDULE_KIND.TRANSITION,
      trigger: 'onInputTimeout',
    });
  }

  /** Guard: returns false (and leaves state untouched) if not in `expected`. */
  _require(expected) {
    return this.state === expected;
  }

  /**
   * Stale/racing timer callbacks (e.g. an INPUT_TIMEOUT that fires a tick
   * after abort() already ran) must be safe no-ops, never throw - the host
   * cancels what it can via CANCEL/CANCEL_ALL effects, but this is
   * defense-in-depth against scheduling races.
   */
  _ignored() {
    return [];
  }

  _emit(event, payload) {
    return { type: EFFECT_TYPES.EMIT, event, payload };
  }

  _schedule(name, delayMs, action) {
    return { type: EFFECT_TYPES.SCHEDULE, name, delayMs, action };
  }

  _cancel(name) {
    return { type: EFFECT_TYPES.CANCEL, name };
  }

  _stateChangedEffect() {
    return this._emit(OUTBOUND_EVENTS.STATE_CHANGED, {
      state: this.state,
      currentStage: this.currentStage,
      playerStep: this.playerStep,
    });
  }
}
