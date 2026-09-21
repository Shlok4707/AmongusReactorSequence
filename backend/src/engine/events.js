// OUTBOUND_EVENTS: the event names the FSM asks its host to forward to the
// client (over Socket.io, in Milestone 3). The FSM never emits these
// itself - it hands them back inside an `effects` array. This is what keeps
// engine/ free of any transport dependency.
export const OUTBOUND_EVENTS = Object.freeze({
  STATE_CHANGED: 'state:changed',
  SQUARE_LIT: 'square:lit',
  SQUARE_DARK: 'square:dark',
  STAGE_ACTIVE: 'stage:active', // a stage indicator should turn BLUE
  STAGE_COMPLETE: 'stage:complete', // a stage indicator should turn GREEN
  INPUT_RESULT: 'input:result',
  PROGRESS_UPDATE: 'progress:update', // ephemeral per-stage indicator state
  TASK_COMPLETED: 'task:completed',
  TASK_FAILED: 'task:failed',
  SESSION_ABORTED: 'session:aborted',
});

// EFFECT_TYPES: the vocabulary the FSM uses to describe what should happen
// next, without doing it. GameSession/TimerService (Milestone 2) are the
// only things that interpret these.
export const EFFECT_TYPES = Object.freeze({
  EMIT: 'EMIT', // fire an outbound event right now, no delay
  SCHEDULE: 'SCHEDULE', // fire something after `delayMs`, cancelable by `name`
  CANCEL: 'CANCEL', // cancel one previously scheduled effect by name
  CANCEL_ALL: 'CANCEL_ALL', // cancel every pending scheduled effect for this session
});

// SCHEDULE effects carry an `action` describing what to do when the delay
// elapses. `kind: 'EMIT'` just forwards an event to the client with no FSM
// re-entry (used for the LIT/DARK playback timeline - purely cosmetic).
// `kind: 'TRANSITION'` calls back into a named FSM method (the state
// machine re-enters itself to decide what happens next).
export const SCHEDULE_KIND = Object.freeze({
  EMIT: 'EMIT',
  TRANSITION: 'TRANSITION',
});

// Canonical timer names. Used both when scheduling and when cancelling, so
// GameSession never has to guess/derive a name string.
export const TIMERS = Object.freeze({
  INIT_DELAY: 'INIT_DELAY',
  PLAYBACK_COMPLETE: 'PLAYBACK_COMPLETE',
  INPUT_TIMEOUT: 'INPUT_TIMEOUT',
  STAGE_TRANSITION_DELAY: 'STAGE_TRANSITION_DELAY',
  ERROR_RESET_DELAY: 'ERROR_RESET_DELAY',
  flashStep: (i) => `FLASH_${i}`,
  gapStep: (i) => `GAP_${i}`,
});
