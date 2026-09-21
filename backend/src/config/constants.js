// All numeric/behavioral constants from the "Start Reactor" GDD live here.
// Nothing outside this file should hardcode a timing number - if the design
// changes (e.g. flash duration tuned from 400ms to 350ms), this is the only
// file that needs to change.

export const GRID_SIZE = 9; // 3x3 grid, zero-indexed 0-8 (GDD 1.2)
export const MAX_STAGES = 5; // GDD 2.1 - five cumulative stages

export const TIMING = Object.freeze({
  // GDD 3.1 - buffer before the very first playback of a fresh session,
  // so the player's eyes can adjust from the 3D world to the 2D panel.
  INIT_OBSERVATION_DELAY_MS: 1000,

  // GDD 3.2 - each flashed square is lit for 400ms, then dark for 150ms
  // before the next index in the sequence begins.
  FLASH_DURATION_MS: 400,
  GAP_DURATION_MS: 150,

  // GDD 6.1 - pause between the last correct input of a non-final stage
  // and the start of the next (longer) sequence playback.
  STAGE_TRANSITION_DELAY_MS: 500,

  // GDD 6.3 - player must submit their next input within this window while
  // in STATE_WAITING_INPUT, or the task fails.
  INPUT_TIMEOUT_MS: 15000,

  // GDD 6.4 - cosmetic button press feedback duration. This is a frontend
  // rendering concern (Phase 2), not gated by backend logic, but is kept
  // here so the wire contract / frontend has one authoritative source.
  BUTTON_FEEDBACK_MS: 100,

  // GDD 6.5 - per-button debounce window to reject switch-bounce / macro
  // double-fires. Enforced by InputValidator (Milestone 2).
  DEBOUNCE_MS: 50,

  // NOT specified in the GDD: how long STATE_ERROR's "red flash" holds
  // before auto-resetting to Stage 1. The doc describes the behavior
  // ("Preparing to reset to Stage 1") but gives no duration. This is an
  // explicit assumption - flagged here, not buried in logic - and is
  // trivially tunable if product/design supplies a real value.
  ERROR_DISPLAY_MS: 1500,
});
