import { OUTBOUND_EVENTS } from '../engine/events.js';

// Re-exported so Phase 2 (and anyone reading only the ws/ folder) has one
// place documenting the FULL wire protocol, not just the client->server
// half. OUTBOUND_EVENTS is authored in engine/events.js because the FSM's
// effect objects reference those exact strings - re-exporting here avoids
// a second, driftable copy of the same names.
export { OUTBOUND_EVENTS };

// Client -> Server event names. Intentionally minimal: the client only
// ever reports raw facts (the panel opened, a button was pressed, the
// task should be torn down) - it never asserts game state or correctness.
export const INBOUND_EVENTS = Object.freeze({
  // Sent the moment the client instantiates the task UI (GDD 3.1). No
  // payload required.
  SESSION_CREATE: 'session:create',

  // payload: { index: number, pressDownTs: number, releaseTs?: number }
  // optional ack callback receives { accepted: boolean, reason?: string }
  INPUT_SUBMIT: 'input:submit',

  // payload: { reason?: string } - GDD 6.10 trigger events (manual close,
  // emergency meeting, dead body reported, scene change). Disconnect is
  // handled separately via the socket's own 'disconnect' event, not this.
  SESSION_ABORT: 'session:abort',
});
