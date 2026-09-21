import express from 'express';
import cors from 'cors';
import { createHealthRouter } from './http/routes/health.routes.js';

/**
 * Builds the Express app without starting an HTTP listener - this split
 * (app.js vs server.js) is what lets tests import the app and drive it
 * with an in-memory request (e.g. supertest) without binding a real port.
 *
 * Express's job in this system is intentionally small: it exists to host
 * the Socket.io upgrade and a health endpoint. All game logic lives in
 * engine/ and session/, reached only through the socket gateway - see the
 * note earlier in this milestone about why session creation is
 * socket-driven rather than REST-driven for this phase.
 */
export function createApp(sessionManager) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.use('/api/health', createHealthRouter(sessionManager));

  // Centralized error handler - keeps stack traces out of client responses.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  });

  return app;
}
