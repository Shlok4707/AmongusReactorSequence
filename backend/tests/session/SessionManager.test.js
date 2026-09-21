import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionManager } from '../../src/session/SessionManager.js';
import { STATES } from '../../src/engine/states.js';
import { OUTBOUND_EVENTS } from '../../src/engine/events.js';
import { SessionLimitError } from '../../src/config/limits.js';
import { TIMING } from '../../src/config/constants.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function rngFromSequence(seq) {
  let i = 0;
  return () => {
    const v = seq[i % seq.length];
    i += 1;
    return (v + 0.5) / 9;
  };
}

describe('SessionManager - capacity cap', () => {
  it('throws SessionLimitError once the concurrent-session cap is reached', () => {
    const manager = new SessionManager({ maxConcurrentSessions: 2 });
    manager.create(() => {});
    manager.create(() => {});
    expect(() => manager.create(() => {})).toThrow(SessionLimitError);
    expect(manager.activeCount).toBe(2);
  });

  it('destroying a session frees a capacity slot', () => {
    const manager = new SessionManager({ maxConcurrentSessions: 1 });
    const first = manager.create(() => {});
    expect(() => manager.create(() => {})).toThrow(SessionLimitError);
    manager.destroy(first.sessionId);
    expect(() => manager.create(() => {})).not.toThrow();
  });
});

describe('SessionManager - isolation under concurrent load', () => {
  it('runs 50 fully-independent sessions with different sequences to completion without any cross-talk', () => {
    const manager = new SessionManager({ maxConcurrentSessions: 100 });
    const SESSION_COUNT = 50;

    const rigs = Array.from({ length: SESSION_COUNT }, (_, i) => {
      // Every session gets a distinct sequence, so any cross-talk between
      // sessions (e.g. a shared/leaked targetSequence, or one session's
      // timer firing into another's handler) would produce an easily
      // detectable wrong-sequence failure rather than a silent pass.
      const seq = [i % 9, (i + 1) % 9, (i + 2) % 9, (i + 3) % 9, (i + 4) % 9];
      const events = [];
      const session = manager.create((event, payload) => events.push({ event, payload }), {
        rng: rngFromSequence(seq),
      });
      return { seq, events, session };
    });

    expect(manager.activeCount).toBe(SESSION_COUNT);
    rigs.forEach(({ session }) => expect(session.state).toBe(STATES.INIT));

    // Drive every session through all 5 stages IN LOCKSTEP - interleaving
    // their inputs is the whole point: it's what would expose one
    // session's TimerService or FSM leaking into another's.
    vi.advanceTimersByTime(TIMING.INIT_OBSERVATION_DELAY_MS);

    for (let stage = 1; stage <= 5; stage++) {
      vi.advanceTimersByTime(stage * (TIMING.FLASH_DURATION_MS + TIMING.GAP_DURATION_MS));
      rigs.forEach(({ session }) => expect(session.state).toBe(STATES.WAITING_INPUT));

      for (let step = 0; step < stage; step++) {
        rigs.forEach(({ session, seq }) => {
          const result = session.submitInput({ index: seq[step], pressDownTs: Date.now() });
          expect(result.accepted).toBe(true);
        });
        if (step < stage - 1) vi.advanceTimersByTime(TIMING.DEBOUNCE_MS + 10);
      }

      if (stage < 5) {
        vi.advanceTimersByTime(TIMING.STAGE_TRANSITION_DELAY_MS);
      }
    }

    rigs.forEach(({ session, events, seq }, i) => {
      expect(session.state, `session ${i} did not reach VICTORY`).toBe(STATES.VICTORY);
      expect(
        events.filter((e) => e.event === OUTBOUND_EVENTS.TASK_COMPLETED),
        `session ${i} did not fire TASK_COMPLETED exactly once`
      ).toHaveLength(1);
      // Confirms this session really did validate against ITS OWN
      // sequence, not a neighbor's - every one of this session's 15 total
      // inputs across 5 stages (1+2+3+4+5) should show as correct.
      const correctCount = events.filter(
        (e) => e.event === OUTBOUND_EVENTS.INPUT_RESULT && e.payload.correct
      ).length;
      expect(correctCount, `session ${i} (seq ${seq}) had wrong correct-input count`).toBe(15);
    });
  });

  it('aborting one session mid-flight does not disturb any other concurrently-running session', () => {
    const manager = new SessionManager({ maxConcurrentSessions: 10 });
    const seqA = [1, 1, 1, 1, 1];
    const seqB = [7, 7, 7, 7, 7];
    const eventsA = [];
    const eventsB = [];

    const sessionA = manager.create((event, payload) => eventsA.push({ event, payload }), {
      rng: rngFromSequence(seqA),
    });
    const sessionB = manager.create((event, payload) => eventsB.push({ event, payload }), {
      rng: rngFromSequence(seqB),
    });

    vi.advanceTimersByTime(TIMING.INIT_OBSERVATION_DELAY_MS);
    expect(sessionA.state).toBe(STATES.SHOWING_PATTERN);
    expect(sessionB.state).toBe(STATES.SHOWING_PATTERN);

    manager.destroy(sessionA.sessionId, 'TEST_ABORT');
    expect(manager.activeCount).toBe(1);

    // B must be completely unaffected - it keeps ticking toward its own
    // WAITING_INPUT on its own schedule, unaware A ever existed.
    vi.advanceTimersByTime(TIMING.FLASH_DURATION_MS + TIMING.GAP_DURATION_MS);
    expect(sessionB.state).toBe(STATES.WAITING_INPUT);

    const result = sessionB.submitInput({ index: 7, pressDownTs: Date.now() });
    expect(result.accepted).toBe(true);
    // Stage 1 of a 5-stage run just completed correctly - B moves into the
    // stage-transition hold, completely unaffected by A's earlier abort.
    expect(sessionB.state).toBe(STATES.EVALUATING);

    // A, meanwhile, must never fire another event again post-abort.
    const eventCountAtAbort = eventsA.length;
    vi.advanceTimersByTime(60000);
    expect(eventsA).toHaveLength(eventCountAtAbort);
  });
});
