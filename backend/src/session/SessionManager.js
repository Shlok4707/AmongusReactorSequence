import { randomUUID } from 'node:crypto';
import { GameSession } from './GameSession.js';
import { LIMITS, SessionLimitError } from '../config/limits.js';

/**
 * SessionManager
 * --------------
 * Owns the map of sessionId -> GameSession. This is the scalability
 * boundary called out in the architecture plan: each GameSession is fully
 * self-contained (its own FSM, its own TimerService, its own
 * InputValidator), so creating/destroying one is O(1) and cannot leak
 * into or interfere with any other player's session. There is
 * intentionally no persistence layer - GDD 6.10 is explicit that a
 * disconnect simply drops the state, and reopening always starts fresh.
 */
export class SessionManager {
  constructor({ maxConcurrentSessions = LIMITS.MAX_CONCURRENT_SESSIONS } = {}) {
    /** @type {Map<string, GameSession>} */
    this._sessions = new Map();
    this._maxConcurrentSessions = maxConcurrentSessions;
  }

  /**
   * Creates and starts a new session.
   * @param {(event: string, payload: object) => void} onEvent
   * @param {{ rng?: () => number }} [options]
   * @returns {GameSession}
   * @throws {SessionLimitError} if the server is already at capacity.
   */
  create(onEvent, { rng } = {}) {
    if (this._sessions.size >= this._maxConcurrentSessions) {
      throw new SessionLimitError();
    }
    const sessionId = randomUUID();
    const session = new GameSession({ sessionId, onEvent, rng });
    this._sessions.set(sessionId, session);
    session.start();
    return session;
  }

  get(sessionId) {
    return this._sessions.get(sessionId);
  }

  has(sessionId) {
    return this._sessions.has(sessionId);
  }

  /** Aborts (if still active) and removes a session. Safe to call more than once. */
  destroy(sessionId, reason = 'MANUAL') {
    const session = this._sessions.get(sessionId);
    if (!session) return;
    session.abort(reason);
    this._sessions.delete(sessionId);
  }

  /** Aborts and removes every active session - used on process shutdown. */
  destroyAll(reason = 'SERVER_SHUTDOWN') {
    for (const sessionId of [...this._sessions.keys()]) {
      this.destroy(sessionId, reason);
    }
  }

  /** Mostly for tests/metrics. */
  get activeCount() {
    return this._sessions.size;
  }

  /** Used by graceful-shutdown handlers to enumerate sessions to abort. */
  listSessionIds() {
    return [...this._sessions.keys()];
  }
}
