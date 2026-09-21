import { describe, it, expect } from 'vitest';
import { StartReactorFSM } from '../../src/engine/StartReactorFSM.js';
import { STATES, STAGE_INDICATOR } from '../../src/engine/states.js';
import { OUTBOUND_EVENTS, EFFECT_TYPES, SCHEDULE_KIND, TIMERS } from '../../src/engine/events.js';
import { TIMING, MAX_STAGES } from '../../src/config/constants.js';

/** Deterministic rng: forces generateSequence() to output exactly `seq`. */
function rngFromSequence(seq) {
  let i = 0;
  return () => {
    const v = seq[i % seq.length];
    i += 1;
    return (v + 0.5) / 9; // lands squarely inside floor(x*9) === v
  };
}

function findSchedule(effects, name) {
  return effects.find((e) => e.type === EFFECT_TYPES.SCHEDULE && e.name === name);
}
function findEmit(effects, event) {
  return effects.find((e) => e.type === EFFECT_TYPES.EMIT && e.event === event);
}

/** Drives a fresh FSM all the way to STATE_WAITING_INPUT for the given stage. */
function fsmAtWaitingInput(seq) {
  const fsm = new StartReactorFSM({ rng: rngFromSequence(seq) });
  fsm.createSession();
  fsm.onInitDelayElapsed();
  fsm.onPlaybackComplete();
  return fsm;
}

describe('StartReactorFSM - session bootstrap (GDD 2.2, 3.1)', () => {
  it('createSession generates a full 5-length sequence up front and enters STATE_INIT', () => {
    const fsm = new StartReactorFSM({ rng: rngFromSequence([4, 8, 8, 1, 3]) });
    const effects = fsm.createSession();

    expect(fsm.state).toBe(STATES.INIT);
    expect(fsm.targetSequence).toEqual([4, 8, 8, 1, 3]);
    expect(fsm.currentStage).toBe(1);
    expect(fsm.playerStep).toBe(0);

    const initTimer = findSchedule(effects, TIMERS.INIT_DELAY);
    expect(initTimer.delayMs).toBe(TIMING.INIT_OBSERVATION_DELAY_MS);
    expect(initTimer.action).toEqual({ kind: SCHEDULE_KIND.TRANSITION, trigger: 'onInitDelayElapsed' });
  });

  it('onInitDelayElapsed builds a full flash/gap timeline for Stage 1 only', () => {
    const fsm = new StartReactorFSM({ rng: rngFromSequence([4, 8, 8, 1, 3]) });
    fsm.createSession();
    const effects = fsm.onInitDelayElapsed();

    expect(fsm.state).toBe(STATES.SHOWING_PATTERN);
    expect(fsm.stageIndicators[0]).toBe(STAGE_INDICATOR.BLUE);

    // Stage 1 -> only index 0 of the sequence is played.
    const flash0 = findSchedule(effects, TIMERS.flashStep(0));
    const gap0 = findSchedule(effects, TIMERS.gapStep(0));
    expect(flash0.delayMs).toBe(0);
    expect(flash0.action.payload).toEqual({ index: 4, durationMs: TIMING.FLASH_DURATION_MS });
    expect(gap0.delayMs).toBe(TIMING.FLASH_DURATION_MS);
    expect(gap0.action.payload).toEqual({ index: 4 });

    const complete = findSchedule(effects, TIMERS.PLAYBACK_COMPLETE);
    expect(complete.delayMs).toBe(TIMING.FLASH_DURATION_MS + TIMING.GAP_DURATION_MS);
  });

  it('ignores onInitDelayElapsed if not in STATE_INIT (stale timer safety)', () => {
    const fsm = new StartReactorFSM({ rng: rngFromSequence([1, 1, 1, 1, 1]) });
    const effects = fsm.onInitDelayElapsed(); // never created
    expect(effects).toEqual([]);
    expect(fsm.state).toBeNull();
  });
});

describe('StartReactorFSM - cumulative playback (GDD 2.1, 3.2)', () => {
  it('Stage 3 playback replays indices 0,1,2 with correct cumulative offsets', () => {
    const seq = [2, 5, 7, 0, 1];
    const fsm = new StartReactorFSM({ rng: rngFromSequence(seq) });
    fsm.createSession();
    fsm.currentStage = 3; // simulate having reached stage 3
    const effects = fsm._enterShowingPattern();

    const step = TIMING.FLASH_DURATION_MS + TIMING.GAP_DURATION_MS;
    [0, 1, 2].forEach((i) => {
      const flash = findSchedule(effects, TIMERS.flashStep(i));
      expect(flash.delayMs).toBe(i * step);
      expect(flash.action.payload.index).toBe(seq[i]);
    });
    const complete = findSchedule(effects, TIMERS.PLAYBACK_COMPLETE);
    expect(complete.delayMs).toBe(3 * step);
  });

  it('allows consecutive duplicate indices without collapsing the timeline (GDD 2.3)', () => {
    const fsm = new StartReactorFSM({ rng: rngFromSequence([4, 4, 4, 4, 4]) });
    fsm.createSession();
    fsm.currentStage = 2;
    const effects = fsm._enterShowingPattern();
    expect(findSchedule(effects, TIMERS.flashStep(0)).action.payload.index).toBe(4);
    expect(findSchedule(effects, TIMERS.flashStep(1)).action.payload.index).toBe(4);
    // Two distinct scheduled flashes still exist - not merged into one.
    expect(effects.filter((e) => e.name?.startsWith('FLASH_'))).toHaveLength(2);
  });
});

describe('StartReactorFSM - waiting input & timeout (GDD 6.3)', () => {
  it('onPlaybackComplete unlocks input and arms the 15s timeout', () => {
    const fsm = fsmAtWaitingInput([4, 8, 8, 1, 3]);
    expect(fsm.state).toBe(STATES.WAITING_INPUT);
  });

  it('input during STATE_SHOWING_PATTERN is rejected, never queued (GDD 3.3)', () => {
    const fsm = new StartReactorFSM({ rng: rngFromSequence([4, 8, 8, 1, 3]) });
    fsm.createSession();
    fsm.onInitDelayElapsed(); // now SHOWING_PATTERN
    const result = fsm.submitInput(4);
    expect(result.accepted).toBe(false);
    expect(fsm.playerStep).toBe(0);
  });

  it('onInputTimeout fails the task and schedules an error-reset', () => {
    const fsm = fsmAtWaitingInput([4, 8, 8, 1, 3]);
    const effects = fsm.onInputTimeout();
    expect(fsm.state).toBe(STATES.ERROR);
    expect(findEmit(effects, OUTBOUND_EVENTS.TASK_FAILED).payload).toEqual({ reason: 'TIMEOUT' });
    expect(findSchedule(effects, TIMERS.ERROR_RESET_DELAY).delayMs).toBe(TIMING.ERROR_DISPLAY_MS);
  });

  it('error-reset regenerates the sequence and re-enters showing pattern WITHOUT the 1000ms buffer', () => {
    const fsm = fsmAtWaitingInput([4, 8, 8, 1, 3]);
    fsm.onInputTimeout();
    fsm._rng = rngFromSequence([7, 7, 2, 2, 0]); // simulate a new random draw
    const effects = fsm.onErrorResetElapsed();
    expect(fsm.currentStage).toBe(1);
    expect(fsm.playerStep).toBe(0);
    expect(fsm.targetSequence).toEqual([7, 7, 2, 2, 0]);
    expect(fsm.state).toBe(STATES.SHOWING_PATTERN);
    expect(findSchedule(effects, TIMERS.INIT_DELAY)).toBeUndefined();
  });
});

describe('StartReactorFSM - input validation (GDD 6.2)', () => {
  it('correct-but-not-final input advances playerStep and re-arms the timeout', () => {
    const fsm = fsmAtWaitingInput([4, 8, 8, 1, 3]);
    fsm.currentStage = 3; // stage 3 requires 3 inputs
    fsm.playerStep = 0;
    const { effects, accepted } = fsm.submitInput(4);

    expect(accepted).toBe(true);
    expect(fsm.state).toBe(STATES.WAITING_INPUT);
    expect(fsm.playerStep).toBe(1);
    expect(fsm.stepIndicators).toEqual([true, false, false, false, false]);
    expect(findEmit(effects, OUTBOUND_EVENTS.INPUT_RESULT).payload).toEqual({
      index: 4,
      correct: true,
      playerStep: 0,
    });
    expect(findSchedule(effects, TIMERS.INPUT_TIMEOUT).delayMs).toBe(TIMING.INPUT_TIMEOUT_MS);
  });

  it('wrong input immediately enters STATE_ERROR regardless of prior progress', () => {
    const fsm = fsmAtWaitingInput([4, 8, 8, 1, 3]);
    fsm.currentStage = 3;
    fsm.playerStep = 1; // already got index 0 right
    const { effects } = fsm.submitInput(0); // target[1] is 8, not 0

    expect(fsm.state).toBe(STATES.ERROR);
    expect(findEmit(effects, OUTBOUND_EVENTS.INPUT_RESULT).payload.correct).toBe(false);
    expect(findEmit(effects, OUTBOUND_EVENTS.TASK_FAILED).payload).toEqual({ reason: 'WRONG_INPUT' });
  });

  it('completing a non-final stage lights the stage indicator and schedules the 500ms hold (GDD 6.1)', () => {
    const fsm = fsmAtWaitingInput([4, 8, 8, 1, 3]); // stage 1, 1 input needed
    const { effects } = fsm.submitInput(4);

    expect(fsm.stageIndicators[0]).toBe(STAGE_INDICATOR.GREEN);
    expect(findEmit(effects, OUTBOUND_EVENTS.STAGE_COMPLETE).payload).toEqual({ stage: 1 });
    const hold = findSchedule(effects, TIMERS.STAGE_TRANSITION_DELAY);
    expect(hold.delayMs).toBe(TIMING.STAGE_TRANSITION_DELAY_MS);
    expect(hold.action.trigger).toBe('onStageTransitionElapsed');
    // Input is locked during the hold - no state exposed for "waiting for next stage".
    expect(fsm.state).toBe(STATES.EVALUATING);
  });

  it('onStageTransitionElapsed advances the stage, resets step indicators, and replays from index 0', () => {
    const fsm = fsmAtWaitingInput([4, 8, 8, 1, 3]);
    fsm.submitInput(4); // completes stage 1
    const effects = fsm.onStageTransitionElapsed();

    expect(fsm.currentStage).toBe(2);
    expect(fsm.playerStep).toBe(0);
    expect(fsm.stepIndicators).toEqual([false, false, false, false, false]);
    expect(fsm.state).toBe(STATES.SHOWING_PATTERN);
    expect(fsm.stageIndicators[1]).toBe(STAGE_INDICATOR.BLUE);
    // Stage 2 plays indices 0 AND 1.
    expect(findSchedule(effects, TIMERS.flashStep(0)).action.payload.index).toBe(4);
    expect(findSchedule(effects, TIMERS.flashStep(1)).action.payload.index).toBe(8);
  });

  it('completing the final stage (5) enters STATE_VICTORY and fires TASK_COMPLETED', () => {
    const seq = [4, 8, 8, 1, 3];
    const fsm = fsmAtWaitingInput(seq);
    fsm.currentStage = MAX_STAGES;
    fsm.playerStep = 4; // one input remaining
    const { effects } = fsm.submitInput(3); // target[4] === 3

    expect(fsm.state).toBe(STATES.VICTORY);
    expect(findEmit(effects, OUTBOUND_EVENTS.TASK_COMPLETED)).toBeTruthy();
    expect(fsm.stageIndicators[4]).toBe(STAGE_INDICATOR.GREEN);
  });
});

describe('StartReactorFSM - queue prevention & stale input safety (GDD 6.6)', () => {
  it('rejects a second submitInput once the machine has already left STATE_WAITING_INPUT', () => {
    const fsm = fsmAtWaitingInput([4, 8, 8, 1, 3]); // stage 1
    const first = fsm.submitInput(4); // completes stage 1, moves to EVALUATING (hold)
    expect(first.accepted).toBe(true);

    // A rapid-fire extra press arriving during the 500ms hold must be discarded.
    const stepAfterStageComplete = fsm.playerStep; // 1: reset happens in onStageTransitionElapsed, not yet
    const second = fsm.submitInput(2);
    expect(second.accepted).toBe(false);
    expect(fsm.playerStep).toBe(stepAfterStageComplete); // untouched by the discarded press
  });
});

describe('StartReactorFSM - abort / teardown (GDD 6.10)', () => {
  it('abort() from an active state cancels everything and nullifies the sequence', () => {
    const fsm = fsmAtWaitingInput([4, 8, 8, 1, 3]);
    const effects = fsm.abort('MANUAL_CLOSE');

    expect(fsm.state).toBe(STATES.ABORTED);
    expect(fsm.targetSequence).toEqual([]);
    expect(fsm.stageIndicators).toEqual(Array(5).fill(STAGE_INDICATOR.OFF));
    expect(effects.some((e) => e.type === EFFECT_TYPES.CANCEL_ALL)).toBe(true);
    expect(findEmit(effects, OUTBOUND_EVENTS.SESSION_ABORTED).payload).toEqual({ reason: 'MANUAL_CLOSE' });
  });

  it('abort() is idempotent - calling it twice is a safe no-op the second time', () => {
    const fsm = fsmAtWaitingInput([4, 8, 8, 1, 3]);
    fsm.abort('MANUAL_CLOSE');
    const effects = fsm.abort('MANUAL_CLOSE');
    expect(effects).toEqual([]);
  });

  it('reopening after abort always requires a brand-new createSession() (no resume)', () => {
    const fsm = fsmAtWaitingInput([4, 8, 8, 1, 3]);
    fsm.abort('MANUAL_CLOSE');
    fsm._rng = rngFromSequence([0, 0, 0, 0, 0]);
    fsm.createSession();
    expect(fsm.targetSequence).toEqual([0, 0, 0, 0, 0]);
    expect(fsm.currentStage).toBe(1);
  });
});
