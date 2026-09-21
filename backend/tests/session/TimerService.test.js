import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimerService } from '../../src/session/TimerService.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('TimerService', () => {
  it('runs the callback after the given delay', () => {
    const timers = new TimerService();
    const cb = vi.fn();
    timers.schedule('A', 100, cb);
    vi.advanceTimersByTime(99);
    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledOnce();
  });

  it('re-scheduling the same name cancels the previous pending timer (GDD 6.3 timeout re-arm)', () => {
    const timers = new TimerService();
    const first = vi.fn();
    const second = vi.fn();
    timers.schedule('INPUT_TIMEOUT', 100, first);
    vi.advanceTimersByTime(50);
    timers.schedule('INPUT_TIMEOUT', 100, second); // re-armed with 50ms of the old delay elapsed
    vi.advanceTimersByTime(100);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledOnce();
  });

  it('cancelAll clears every pending timer (GDD 6.10)', () => {
    const timers = new TimerService();
    const cb = vi.fn();
    timers.schedule('A', 100, cb);
    timers.schedule('B', 200, cb);
    expect(timers.pendingCount).toBe(2);
    timers.cancelAll();
    vi.advanceTimersByTime(500);
    expect(cb).not.toHaveBeenCalled();
    expect(timers.pendingCount).toBe(0);
  });

  it('cancel on an unknown name is a safe no-op', () => {
    const timers = new TimerService();
    expect(() => timers.cancel('NOPE')).not.toThrow();
  });
});
