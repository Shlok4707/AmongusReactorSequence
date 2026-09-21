// Exactly the 7 states enumerated in GDD 4.2. We deliberately do NOT add
// extra states for things the GDD leaves implicit (e.g. the 500ms
// stage-transition pause has no named state in the doc) - see the comment
// above `_enterStageTransitionHold()` in StartReactorFSM.js for how that
// gap is represented without inventing new spec surface.
export const STATES = Object.freeze({
  INIT: 'STATE_INIT',
  SHOWING_PATTERN: 'STATE_SHOWING_PATTERN',
  WAITING_INPUT: 'STATE_WAITING_INPUT',
  EVALUATING: 'STATE_EVALUATING',
  ERROR: 'STATE_ERROR',
  VICTORY: 'STATE_VICTORY',
  ABORTED: 'STATE_ABORTED',
});

export const STAGE_INDICATOR = Object.freeze({
  OFF: 'OFF', // GDD 6.8 - stage not yet reached
  BLUE: 'BLUE', // GDD 6.8 - current active stage, flashing
  GREEN: 'GREEN', // GDD 6.8 - successfully completed stage
});
