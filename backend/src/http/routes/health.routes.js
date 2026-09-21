import { Router } from 'express';

/**
 * Health/metrics route. Deliberately tiny: liveness for load balancers,
 * plus an active-session count as a cheap scalability signal (each
 * GameSession is self-contained, so this number is a direct proxy for
 * how many independent FSM+timer sets this process is currently holding).
 */
export function createHealthRouter(sessionManager) {
  const router = Router();
  router.get('/', (req, res) => {
    res.json({ status: 'ok', activeSessions: sessionManager.activeCount });
  });
  return router;
}
