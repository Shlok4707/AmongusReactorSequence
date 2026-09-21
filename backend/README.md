# Start Reactor - Backend (Phase 1)

Server-authoritative game engine for the "Start Reactor" minigame. The
Node backend owns all game rules, timing, and validation; a frontend
client (Phase 2, separate repo/chat) is a pure renderer that reacts to
events pushed over Socket.io.

## Run it

```bash
npm install
cp .env.example .env
npm start          # or: npm run dev  (auto-restarts on file changes)
```

Server listens on `http://localhost:4000` by default. Check it's alive:

```bash
curl http://localhost:4000/api/health
# {"status":"ok","activeSessions":0}
```

## Test it

```bash
npm test
```

47 tests across 7 files: pure engine logic (no timers), session/timer
wiring (fake timers), and one real end-to-end test that boots an actual
HTTP+Socket.io server and plays a full 5-stage game to victory over a real
WebSocket connection with `socket.io-client`.

## Folder map

```
src/
├── config/
│   ├── constants.js     All GDD timing/stage numbers, one source of truth
│   └── limits.js        Operational (non-GDD) capacity/abuse guards
├── engine/               PURE game logic - no setTimeout, no I/O, no sockets
│   ├── states.js         The 7 FSM states
│   ├── events.js         Wire event names + the effects/SCHEDULE vocabulary
│   ├── SequenceGenerator.js
│   └── StartReactorFSM.js   The state machine itself - read this first
├── session/              The "imperative shell" around the pure engine
│   ├── TimerService.js   Only place that calls real setTimeout
│   ├── InputValidator.js Debounce + fresh-press checks
│   ├── GameSession.js    Binds FSM + TimerService + InputValidator together
│   └── SessionManager.js Registry of all active sessions (one per player)
├── ws/
│   ├── socketEvents.js   Wire protocol event name constants
│   └── socketGateway.js  Socket.io <-> SessionManager adapter (no game rules)
├── http/
│   └── routes/health.routes.js
├── app.js                Express app assembly (no listener)
└── server.js             Real entrypoint - start here to see it all wired up
```

**Read order if you want to understand the system**: `engine/StartReactorFSM.js`
first (this is where every game rule lives), then `session/GameSession.js`
(how the pure FSM becomes real behavior), then `ws/socketGateway.js` (how
it reaches a client).

## How a game actually happens (wire protocol)

Client connects, then:

```
Client                                Server
  │──socket.emit('session:create')──────▶│
  │◀──'session:ready' {sessionId}────────│
  │◀──'state:changed' {state:'STATE_INIT'}│
  │◀──'state:changed' {state:'STATE_SHOWING_PATTERN'}│  (after 1000ms)
  │◀──'square:lit' {index, durationMs:400}│
  │◀──'square:dark' {index}──────────────│  (after 400ms; 150ms gap follows)
  │◀──'state:changed' {state:'STATE_WAITING_INPUT'}│
  │──socket.emit('input:submit', {index, pressDownTs}, ackCallback)──▶│
  │◀── ackCallback({accepted: true}) ────│
  │◀──'input:result' {index, correct, playerStep}│
  │◀──'progress:update' {filledCount}────│
  │        ... repeats, stage gets longer each time ...
  │◀──'stage:complete' {stage}───────────│
  │◀──'task:completed' {}────────────────│   (or 'task:failed' {reason})
```

Full event list: `src/ws/socketEvents.js` (client→server) and
`src/engine/events.js` `OUTBOUND_EVENTS` (server→client).

To end a session early: `socket.emit('session:abort', {reason})`, or just
disconnect - both are treated identically (GDD 6.10).

## Documented assumptions / deviations from the GDD

The GDD doesn't specify everything a real implementation needs. Rather
than bury these choices in code, they're flagged in comments at the exact
line they matter, and summarized here:

1. **`ERROR_DISPLAY_MS` (1500ms)** - how long `STATE_ERROR` holds before
   auto-resetting to Stage 1. Not specified in the GDD. See
   `src/config/constants.js`.
2. **The 500ms stage-transition pause has no named state in the GDD's
   7-state table.** Represented as remaining in `STATE_EVALUATING` rather
   than inventing an 8th state, since behavior (locked, no input) is
   identical either way. See the class doc in `StartReactorFSM.js`.
3. **A failure-reset skips the 1000ms observation delay.** That delay
   exists because the UI panel was just instantiated (GDD 3.1); a
   mid-task failure never closes the panel. See `onErrorResetElapsed()`
   in `StartReactorFSM.js`.
4. **Session creation is socket-driven, not REST-driven.** No separate
   `POST /api/sessions` handshake - see `socketGateway.js`. There's no
   auth system in scope yet; if one is added later, it slots in front of
   the `session:create` event without touching the engine at all.
5. **Concurrent-session cap and per-socket create-cooldown** are basic
   operational hardening, not from the GDD. See `src/config/limits.js`.
