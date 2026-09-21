/**
 * TimerService
 * ------------
 * The ONLY piece of this backend allowed to call setTimeout/clearTimeout.
 * Every other layer (StartReactorFSM, GameSession) only ever describes
 * "run this in N ms, under this name" - this class is what actually does
 * it, and it does it in a way that makes GDD 6.10 (abort/teardown, "cancel
 * all active coroutines and clear all timeouts") a single method call
 * instead of something every call site has to remember to do correctly.
 *
 * Design rationale: GDD 4.3 talks about engine coroutines and delta-time
 * to avoid hardware desync in a compiled game engine (Unity/Unreal/Godot).
 * That specific concern doesn't apply here - Node has no per-hardware
 * frame rate to desync against, and wall-clock setTimeout is the correct
 * tool for a server-authoritative model. What DOES carry over from that
 * section's spirit is "don't let ad-hoc, hand-rolled timer bookkeeping
 * cause drift or leaks" - which is exactly what centralizing all
 * scheduling into one named-timer registry solves.
 */
export class TimerService {
  constructor() {
    /** @type {Map<string, NodeJS.Timeout>} */
    this._handles = new Map();
  }

  /**
   * Schedules `callback` to run after `delayMs`, registered under `name`.
   * If a timer with that name already exists, it is replaced (the old one
   * is cleared first) - this matters for INPUT_TIMEOUT, which is
   * re-armed on every correct-but-not-final input (GDD 6.2/6.3).
   */
  schedule(name, delayMs, callback) {
    this.cancel(name);
    const handle = setTimeout(() => {
      this._handles.delete(name);
      callback();
    }, delayMs);
    this._handles.set(name, handle);
  }

  /** Cancels one named timer. Safe to call even if it doesn't exist/already fired. */
  cancel(name) {
    const handle = this._handles.get(name);
    if (handle) {
      clearTimeout(handle);
      this._handles.delete(name);
    }
  }

  /** GDD 6.10 step 1: cancels every pending timer for this session in one call. */
  cancelAll() {
    for (const handle of this._handles.values()) {
      clearTimeout(handle);
    }
    this._handles.clear();
  }

  /** Mostly for tests/debugging - how many timers are currently live. */
  get pendingCount() {
    return this._handles.size;
  }
}
