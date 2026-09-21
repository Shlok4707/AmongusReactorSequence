import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../types/protocol';

/**
 * The backend URL. Matches backend/.env (PORT=4000) and CORS_ORIGIN=* during
 * local development. Override with VITE_BACKEND_URL for other environments.
 */
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketSingleton: GameSocket | null = null;

/**
 * Returns a single shared socket instance. Guards against React 18/19
 * StrictMode double-invoking effects and accidentally opening two sessions
 * against the server-authoritative backend.
 */
export function getSocket(): GameSocket {
  if (!socketSingleton) {
    socketSingleton = io(BACKEND_URL, {
      autoConnect: false, // caller decides when to connect (see useGameSocket)
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
    });
  }
  return socketSingleton;
}
