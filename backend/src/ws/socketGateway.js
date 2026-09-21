import { INBOUND_EVENTS } from './socketEvents.js';
import { LIMITS, SessionLimitError } from '../config/limits.js';

/**
 * attachSocketGateway
 * --------------------
 * Pure adapter: translates Socket.io connection lifecycle and inbound
 * events into calls on SessionManager/GameSession, and forwards
 * GameSession's outbound events back over the socket. Contains no game
 * rules whatsoever - if you're ever tempted to add an `if` statement here
 * that inspects `state` or `targetSequence`, it belongs in the engine
 * instead, not here.
 *
 * Lifecycle model: session creation is driven entirely by the socket
 * connection, not by a separate REST handshake. One socket may create at
 * most one active session at a time; sending SESSION_CREATE again while
 * one is already active tears down the old one first (GDD 6.10 - "no
 * saving progress by closing the UI" applies just as much to opening a
 * second copy without closing the first).
 *
 * Two lightweight abuse guards (not from the GDD - see config/limits.js):
 * a per-socket cooldown between SESSION_CREATE events, and a server-wide
 * concurrent-session cap enforced by SessionManager.
 */
export function attachSocketGateway(io, sessionManager) {
  io.on('connection', (socket) => {
    /** @type {import('../session/GameSession.js').GameSession | null} */
    let session = null;
    let lastCreateAt = 0;

    const forwardToClient = (event, payload) => {
      socket.emit(event, payload);
    };

    const teardownExisting = (reason) => {
      if (session) {
        sessionManager.destroy(session.sessionId, reason);
        session = null;
      }
    };

    socket.on(INBOUND_EVENTS.SESSION_CREATE, () => {
      const now = Date.now();
      if (now - lastCreateAt < LIMITS.SESSION_CREATE_COOLDOWN_MS) {
        socket.emit('session:error', { reason: 'CREATE_RATE_LIMITED' });
        return;
      }
      lastCreateAt = now;

      teardownExisting('REPLACED'); // GDD 6.10 - no resuming/stacking sessions
      try {
        session = sessionManager.create(forwardToClient);
      } catch (err) {
        if (err instanceof SessionLimitError) {
          socket.emit('session:error', { reason: 'SERVER_AT_CAPACITY' });
          return;
        }
        throw err;
      }
      // Lets the client correlate logs/debugging with a concrete session,
      // though nothing in the protocol requires the client to store it -
      // this socket connection IS the session as far as the client cares.
      socket.emit('session:ready', { sessionId: session.sessionId });
    });

    socket.on(INBOUND_EVENTS.INPUT_SUBMIT, (payload, ack) => {
      if (!session) return; // stray input with no active session - ignore
      const result = session.submitInput(payload ?? {});
      if (typeof ack === 'function') ack(result);
    });

    socket.on(INBOUND_EVENTS.SESSION_ABORT, (payload) => {
      teardownExisting(payload?.reason ?? 'MANUAL');
    });

    // GDD 4.1 / 6.10: a dropped connection simply drops the state - no
    // resume, no persistence. Disconnect is itself an abort trigger.
    socket.on('disconnect', () => {
      teardownExisting('DISCONNECT');
    });
  });
}

