# Start Reactor - Frontend (Phase 2)

A pure, dumb UI renderer for the "Start Reactor" minigame. Every game
rule, timer, and validation lives on the backend (Phase 1); this app only
subscribes to Socket.io events and renders what it's told, plus emits
`input:submit` on keypad presses.

## Run it

This app expects the Phase 1 backend running on `http://localhost:4000`
(see `backend/README.md`).

```bash
npm install
cp .env.example .env      # point VITE_BACKEND_URL elsewhere if needed
npm run dev                # http://localhost:5173
```

```bash
npm run build               # type-checks (tsc -b) then builds to dist/
npm run preview             # serve the production build locally
```

## Folder map

```
src/
├── types/
│   ├── protocol.ts      Wire protocol types - the ONLY file that should
│   │                    need editing if the backend's actual event names
│   │                    or payloads differ from what's documented here.
│   └── viewState.ts      Client-derived GameViewState shape (not wire data)
├── network/
│   └── SocketClient.ts   The one place io() is called; singleton connection
├── state/
│   └── useGameSocket.ts  Reducer: wire events in -> GameViewState out.
│                         Components never touch the socket directly.
├── components/
│   ├── layout/
│   │   ├── ReactorFrame.tsx   Outer stage + static chrome (lamp, toggle,
│   │   │                      placards, vents) - all decorative
│   │   └── HeaderBanner.tsx   "REACTOR SEQUENCE" banner
│   ├── panel/
│   │   ├── GamePanel.tsx      Shared metal-frame wrapper + LED row
│   │   ├── ProgressLEDs.tsx   5-dot stage indicator (OFF/BLUE/GREEN)
│   │   ├── PatternDisplay.tsx Left screen - renders square:lit/dark only
│   │   └── InputKeypad.tsx    Right keypad - emits input:submit
│   └── feedback/
│       └── StatusOverlay.tsx  Connection / error / win / abort banners
└── styles/
    └── index.css          Tailwind v4 import + design tokens (colors,
                            glows, hazard-stripe utility) from the Canva ref
```

## Wire protocol assumptions (verify against real backend `src/`)

Built from `backend/README.md` and the confirmed `src/engine/states.js`.
If any of these turn out to differ from the actual `src/ws/socketEvents.js`
/ `src/engine/events.js`, only `src/types/protocol.ts` needs to change -
no component imports event names directly.

1. **7 FSM states** (confirmed from `states.js`): `STATE_INIT`,
   `STATE_SHOWING_PATTERN`, `STATE_WAITING_INPUT`, `STATE_EVALUATING`,
   `STATE_ERROR`, `STATE_VICTORY`, `STATE_ABORTED`. An unrecognized state
   string from the server renders as "no known state" rather than crashing
   (see `isKnownGameState` in `protocol.ts`).
2. **Stage indicator is 3-valued** (`OFF` / `BLUE` / `GREEN`, confirmed
   from `states.js`), not a simple lit/unlit boolean. Since no dedicated
   event carries per-dot indicator state, the frontend **derives** it from
   `stage:complete` payloads (`{ stage }`) and the current `gameState`:
   stages `<= lastCompletedStage` render `GREEN`, the very next stage
   renders `BLUE` while a stage is actively in progress, everything after
   is `OFF`. This is presentation-only derivation - the backend remains
   the sole authority on when a stage actually completes.
3. **Failure reset**: entering `STATE_ERROR` resets the client's
   `lastCompletedStage` to 0 (and therefore the LED row) to reflect the
   GDD's "failure-reset returns to stage 1" behavior. If the real backend
   instead expects the client to wait for a fresh `stage:complete`/
   `progress:update` sequence to imply this, this is the one rule to
   double check against `StartReactorFSM.js`.
4. **New-pattern cell reset**: entering `STATE_SHOWING_PATTERN` clears all
   9 cells to dark, clears input-result feedback, and resets `filledCount`
   to 0 client-side, as a defensive UI reset in case of any missed event -
   it does not change what counts as correct/incorrect, only what's drawn
   before the next `square:lit` arrives.
5. **`input:submit` ack** (`{ accepted: boolean }`) is received but not
   yet used to render anything (e.g. an "unresponsive server" state).
   Reserved as a documented follow-up, not a missing requirement.
6. **Grid indexing**: 0-8, row-major, 3x3 (index 0 = top-left, 8 =
   bottom-right), matching the reference image and GDD.

## Visual reference

Layout and styling replicate the provided Canva reference 1:1: dark
gunmetal panels, amber/black hazard stripes, neon green glow on the
pattern screen, a physical-looking 3x3 keypad, and the ambient chrome
(alert lamp, danger toggle, caution/authorized placards, vents). Tokens
live in `src/styles/index.css` under the Tailwind v4 `@theme` block -
change a color once there rather than hardcoding hex values in components.
