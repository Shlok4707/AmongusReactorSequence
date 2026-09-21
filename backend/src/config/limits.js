// These are NOT from the GDD - they're basic abuse/capacity guards for
// running this as a real server. Kept in their own file so it's obvious
// at a glance which numbers come from game design vs. operations.
export const LIMITS = Object.freeze({
  // Caps total simultaneous GameSessions this process will hold. Each one
  // is small (one FSM + a handful of timers), but unbounded creation from
  // an unauthenticated socket is still a resource-exhaustion vector.
  MAX_CONCURRENT_SESSIONS: Number(process.env.MAX_CONCURRENT_SESSIONS) || 500,

  // Minimum time between two session:create events on the SAME socket.
  // Nothing in normal play ever needs to recreate a session this fast;
  // this just stops a misbehaving/malicious client from rapidly
  // create/destroy-churning FSM + timer instances.
  SESSION_CREATE_COOLDOWN_MS: 250,
});

export class SessionLimitError extends Error {
  constructor() {
    super('Server is at maximum concurrent session capacity');
    this.name = 'SessionLimitError';
  }
}
