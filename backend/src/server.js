import 'dotenv/config';
import { createServer } from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { SessionManager } from './session/SessionManager.js';
import { attachSocketGateway } from './ws/socketGateway.js';

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const sessionManager = new SessionManager();
const app = createApp(sessionManager);
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, { cors: { origin: CORS_ORIGIN } });

attachSocketGateway(io, sessionManager);

httpServer.listen(PORT, () => {
  console.log(`Start Reactor backend listening on port ${PORT}`);
});

// Belt-and-braces: on shutdown, tear down every live session cleanly
// (cancels their timers) rather than just dropping socket connections and
// leaving Node's event loop pinned open by orphaned setTimeout handles.
function shutdown() {
  for (const sessionId of sessionManager.listSessionIds()) {
    sessionManager.destroy(sessionId, 'SERVER_SHUTDOWN');
  }
  httpServer.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
