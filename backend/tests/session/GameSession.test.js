import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameSession } from '../../src/session/GameSession.js';
import { STATES } from '../../src/engine/states.js';
import { OUTBOUND_EVENTS } from '../../src/engine/events.js';
import { TIMING } from '../../src/config/constants.js';

function rngFromSequence(seq) {
  let i = 0;
  return () => {
    const v = seq[i % seq.length];
    i += 1;
    return (v + 0.5) / 9;
  };
}

function collectEvents() {
  const events = [];
  const onEvent = (event, payload) => events.push({ event, payload });
  return { events, onEvent };
}

/** Advances a fresh session through N fully-correct stages, leaving it
 * parked in STATE_WAITING_INPUT at the start of stage N+1. */
function advanceThroughStages(session, seq, completedStages) {
  vi.advanceTimersByTime(TIMING.INIT_OBSERVATION_DELAY_MS);
  for (let stage = 1; stage <= completedStages; stage++) {
    vi.advanceTimersByTime(stage * (TIMING.FLASH_DURATION_MS + TIMING.GAP_DURATION_MS));
    for (let step = 0; step < stage; step++) {
      if (step > 0) vi.advanceTimersByTime(TIMING.DEBOUNCE_MS + 10); // realistic gap between presses
      session.submitInput({ index: seq[step], pressDownTs: Date.now() });
    }
    vi.advanceTimersByTime(TIMING.STAGE_TRANSITION_DELAY_MS);
  }
  const nextStage = completedStages + 1;
  vi.advanceTimersByTime(nextStage * (TIMING.FLASH_DURATION_MS + TIMING.GAP_DURATION_MS));
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('GameSession - full 5-stage win (end-to-end, real scheduling)', () => {
  it('drives the entire task from start() to TASK_COMPLETED using nothing but time advances and correct inputs', () => {
    const seq = [4, 8, 8, 1, 3];
    const { events, onEvent } = collectEvents();
    const session = new GameSession({ sessionId: 's1', onEvent, rng: rngFromSequence(seq) });

    session.start();
    expect(session.state).toBe(STATES.INIT);

    for (let stage = 1; stage <= 5; stage++) {
      if (stage === 1) {
        // GDD 3.1 - only the very first playback carries the 1000ms buffer.
        vi.advanceTimersByTime(TIMING.INIT_OBSERVATION_DELAY_MS);
      }
      expect(session.state).toBe(STATES.SHOWING_PATTERN);

      const playbackMs = stage * (TIMING.FLASH_DURATION_MS + TIMING.GAP_DURATION_MS);
      vi.advanceTimersByTime(playbackMs);
      expect(session.state).toBe(STATES.WAITING_INPUT);

      for (let step = 0; step < stage; step++) {
        if (step > 0) vi.advanceTimersByTime(TIMING.DEBOUNCE_MS + 10); // realistic gap between presses
        const result = session.submitInput({ index: seq[step], pressDownTs: Date.now() });
        expect(result.accepted).toBe(true);
      }

      if (stage < 5) {
        expect(session.state).toBe(STATES.EVALUATING); // GDD 6.1 hold
        vi.advanceTimersByTime(TIMING.STAGE_TRANSITION_DELAY_MS);
      }
    }

    expect(session.state).toBe(STATES.VICTORY);
    expect(events.filter((e) => e.event === OUTBOUND_EVENTS.TASK_COMPLETED)).toHaveLength(1);
    expect(
      events.filter((e) => e.event === OUTBOUND_EVENTS.STAGE_COMPLETE).map((e) => e.payload.stage)
    ).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('GameSession - failure paths', () => {
  function toWaitingInputStage1(seq) {
    const { events, onEvent } = collectEvents();
    const session = new GameSession({ sessionId: 's1', onEvent, rng: rngFromSequence(seq) });
    session.start();
    vi.advanceTimersByTime(TIMING.INIT_OBSERVATION_DELAY_MS);
    vi.advanceTimersByTime(TIMING.FLASH_DURATION_MS + TIMING.GAP_DURATION_MS);
    return { session, events };
  }

  it('15s of silence in STATE_WAITING_INPUT fails the task and auto-resets (GDD 6.3)', () => {
    const { session, events } = toWaitingInputStage1([4, 8, 8, 1, 3]);
    expect(session.state).toBe(STATES.WAITING_INPUT);

    vi.advanceTimersByTime(TIMING.INPUT_TIMEOUT_MS);
    expect(session.state).toBe(STATES.ERROR);
    const failed = events.find((e) => e.event === OUTBOUND_EVENTS.TASK_FAILED);
    expect(failed.payload.reason).toBe('TIMEOUT');

    vi.advanceTimersByTime(TIMING.ERROR_DISPLAY_MS);
    expect(session.state).toBe(STATES.SHOWING_PATTERN); // regenerated, straight back into Stage 1
  });

  it('a wrong index immediately fails the task, regardless of how much time is left', () => {
    const { session, events } = toWaitingInputStage1([4, 8, 8, 1, 3]);
    const result = session.submitInput({ index: 0, pressDownTs: Date.now() }); // target[0] is 4
    expect(result.accepted).toBe(true); // accepted BY THE FSM (validly processed), just wrong
    expect(session.state).toBe(STATES.ERROR);
    const failed = events.find((e) => e.event === OUTBOUND_EVENTS.TASK_FAILED);
    expect(failed.payload.reason).toBe('WRONG_INPUT');
  });
});

describe('GameSession - abort mid-flight (GDD 6.10)', () => {
  it('aborting mid-playback cancels every pending flash/gap/completion timer - nothing fires afterward', () => {
    const { events, onEvent } = collectEvents();
    const session = new GameSession({ sessionId: 's1', onEvent, rng: rngFromSequence([4, 8, 8, 1, 3]) });
    session.start();
    vi.advanceTimersByTime(TIMING.INIT_OBSERVATION_DELAY_MS);
    expect(session.state).toBe(STATES.SHOWING_PATTERN);

    session.abort('SCENE_CHANGE');
    expect(session.state).toBe(STATES.ABORTED);
    const eventCountAtAbort = events.length;

    // Advance well past when the (now-cancelled) playback-complete and
    // input-timeout timers would otherwise have fired.
    vi.advanceTimersByTime(60000);
    expect(events).toHaveLength(eventCountAtAbort); // nothing new fired
    expect(events.some((e) => e.event === OUTBOUND_EVENTS.SESSION_ABORTED)).toBe(true);
  });

  it('throws if the session is used after being destroyed (defensive misuse guard)', () => {
    const { onEvent } = collectEvents();
    const session = new GameSession({ sessionId: 's1', onEvent, rng: rngFromSequence([4, 8, 8, 1, 3]) });
    session.start();
    session.abort('MANUAL');
    expect(() => session.submitInput({ index: 0, pressDownTs: Date.now() })).toThrow();
  });
});

describe('GameSession - input hygiene wiring (GDD 6.5, 6.7)', () => {
  it('a press with a pressDownTs before the input phase opened is rejected without touching the FSM', () => {
    const seq = [4, 8, 8, 1, 3];
    const { onEvent } = collectEvents();
    const session = new GameSession({ sessionId: 's1', onEvent, rng: rngFromSequence(seq) });
    session.start();
    vi.advanceTimersByTime(TIMING.INIT_OBSERVATION_DELAY_MS);
    const staleTs = Date.now(); // captured BEFORE playback finishes / input phase opens
    vi.advanceTimersByTime(TIMING.FLASH_DURATION_MS + TIMING.GAP_DURATION_MS);
    expect(session.state).toBe(STATES.WAITING_INPUT);

    const result = session.submitInput({ index: 4, pressDownTs: staleTs });
    expect(result).toEqual({ accepted: false, reason: 'STALE_PRESS' });
    expect(session.state).toBe(STATES.WAITING_INPUT); // untouched
  });

  it('a debounced double-press (hardware echo of the same click) is dropped and does not affect progress', () => {
    const seq = [4, 8, 8, 1, 3];
    const { onEvent } = collectEvents();
    const session = new GameSession({ sessionId: 's1', onEvent, rng: rngFromSequence(seq) });
    session.start();
    // Get to Stage 3's input phase (needs 3 inputs: 4, 8, 8) with stages 1-2 already won.
    advanceThroughStages(session, seq, 2);
    expect(session.state).toBe(STATES.WAITING_INPUT);

    const t0 = Date.now();
    const legit = session.submitInput({ index: 4, pressDownTs: t0 }); // correct, step 1 of 3
    expect(legit.accepted).toBe(true);

    // Hardware echo: the same physical click on button 4 re-fires 5ms
    // later (well within the 50ms debounce window) - must be dropped, not
    // reinterpreted as a second real press.
    vi.setSystemTime(t0 + 5);
    const echo = session.submitInput({ index: 4, pressDownTs: t0 + 5 });
    expect(echo).toEqual({ accepted: false, reason: 'DEBOUNCED' });

    // Progress was NOT double-counted: the next real press still needs to
    // be index 8 (step 2 of 3), not index 8 again for a phantom step 3.
    vi.setSystemTime(t0 + 60);
    const nextReal = session.submitInput({ index: 8, pressDownTs: t0 + 60 });
    expect(nextReal.accepted).toBe(true);
    expect(session.state).toBe(STATES.WAITING_INPUT); // stage 3 needs one more (index 8 again)
  });
});
