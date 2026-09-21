import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient } from 'socket.io-client';
import { createApp } from '../../src/app.js';
import { SessionManager } from '../../src/session/SessionManager.js';
import { attachSocketGateway } from '../../src/ws/socketGateway.js';
import { INBOUND_EVENTS, OUTBOUND_EVENTS } from '../../src/ws/socketEvents.js';
import { TIMING, MAX_STAGES } from '../../src/config/constants.js';

/**
 * This is the one test in the whole suite that does NOT use fake timers
 * and does NOT talk to the engine/session layer directly - it goes
 * through a real TCP socket, exactly as the eventual React frontend will.
 * Its only job is to prove the wiring: that GameSession's effects really
 * do turn into real Socket.io emissions a real client can receive, and
 * that a real client's emissions really do reach GameSession.
 */

let httpServer;
let baseUrl;
let sessionManager;

beforeAll(async () => {
  sessionManager = new SessionManager();
  const app = createApp(sessionManager);
  httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, { cors: { origin: '*' } });
  attachSocketGateway(io, sessionManager);

  await new Promise((resolve) => httpServer.listen(0, resolve));
  const { port } = httpServer.address();
  baseUrl = `http://localhost:${port}`;
});

afterAll(async () => {
  await new Promise((resolve) => httpServer.close(resolve));
}, 15000);

function connectClient() {
  return new Promise((resolve, reject) => {
    const socket = ioClient(baseUrl, { transports: ['websocket'] });
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

/** Resolves the next time `event` is received on `socket`, or rejects after `ms` for a clear diagnostic instead of a silent hang. */
function waitFor(socket, event, ms = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for '${event}'`)), ms);
    socket.once(event, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

describe('Socket.io gateway - end-to-end over a real connection', () => {
  it('GET /api/health reports ok and the current active session count', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok', activeSessions: 0 });
  });

  it(
    'plays an entire 5-stage task to victory over a real socket connection',
    async () => {
      const socket = await connectClient();
      try {
        const readyPromise = waitFor(socket, 'session:ready');
        socket.emit(INBOUND_EVENTS.SESSION_CREATE);
        const { sessionId } = await readyPromise;
        expect(typeof sessionId).toBe('string');

        // Registered NOW, before any input is sent. TASK_COMPLETED can
        // fire synchronously as part of the final input's server-side
        // effects, ahead of that input's own ack packet - registering
        // this listener only after the loop below finishes would risk
        // missing an event that already fired (socket.once does not
        // buffer past emissions).
        const victoryPromise = waitFor(socket, OUTBOUND_EVENTS.TASK_COMPLETED, 20000);

        // The real GameSession's targetSequence is genuinely random here -
        // this test doesn't know it in advance, so it must LISTEN for each
        // square:lit event to learn what to press, exactly like a real
        // player watching the display panel. Since every stage REPLAYS the
        // sequence from index 0 (GDD 2.1), only the LAST flash of each
        // stage's playback is new information - earlier flashes in that
        // same playback are just replays of already-known steps.
        const knownSequence = [];

        for (let stage = 1; stage <= MAX_STAGES; stage++) {
          let lastFlashIndex = null;
          const flashHandler = ({ index }) => {
            lastFlashIndex = index;
          };
          socket.on(OUTBOUND_EVENTS.SQUARE_LIT, flashHandler);

          // Wait specifically for this stage's WAITING_INPUT transition.
          // (STATE_CHANGED also fires for SHOWING_PATTERN - filter it out.)
          await new Promise((resolve, reject) => {
            const timer = setTimeout(
              () => reject(new Error(`Timed out waiting for STATE_WAITING_INPUT at stage ${stage}`)),
              5000
            );
            const handler = (payload) => {
              if (payload.state === 'STATE_WAITING_INPUT' && payload.currentStage === stage) {
                clearTimeout(timer);
                socket.off(OUTBOUND_EVENTS.STATE_CHANGED, handler);
                resolve();
              }
            };
            socket.on(OUTBOUND_EVENTS.STATE_CHANGED, handler);
          });

          socket.off(OUTBOUND_EVENTS.SQUARE_LIT, flashHandler);
          knownSequence.push(lastFlashIndex);
          expect(knownSequence).toHaveLength(stage);

          for (let step = 0; step < stage; step++) {
            const ackPromise = new Promise((resolve) => {
              socket.emit(
                INBOUND_EVENTS.INPUT_SUBMIT,
                { index: knownSequence[step], pressDownTs: Date.now() },
                resolve
              );
            });
            const ack = await ackPromise;
            expect(ack.accepted).toBe(true);
            // Space presses out beyond the debounce window - see the note
            // in tests/session/GameSession.test.js about consecutive
            // duplicate indices within one stage.
            await new Promise((r) => setTimeout(r, TIMING.DEBOUNCE_MS + 20));
          }
        }

        await victoryPromise;
      } finally {
        socket.close();
      }
    },
    20000 // real wall-clock timers make this the slowest test in the suite by design
  );

  it('a disconnect tears the session down (GDD 6.10) - active session count drops back to 0', async () => {
    const socket = await connectClient();
    socket.emit(INBOUND_EVENTS.SESSION_CREATE);
    await waitFor(socket, 'session:ready');

    const healthDuring = await (await fetch(`${baseUrl}/api/health`)).json();
    expect(healthDuring.activeSessions).toBe(1);

    socket.close();
    // Give the server a tick to process the 'disconnect' event.
    await new Promise((r) => setTimeout(r, 50));

    const healthAfter = await (await fetch(`${baseUrl}/api/health`)).json();
    expect(healthAfter.activeSessions).toBe(0);
  });
});
