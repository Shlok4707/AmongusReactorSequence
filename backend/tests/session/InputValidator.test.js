import { describe, it, expect } from 'vitest';
import { InputValidator } from '../../src/session/InputValidator.js';

describe('InputValidator', () => {
  it('rejects any press before an input phase has opened', () => {
    const validator = new InputValidator();
    const result = validator.validate({ index: 4, pressDownTs: 1000 }, 1000);
    expect(result).toEqual({ valid: false, reason: 'PHASE_NOT_OPEN' });
  });

  it('accepts a fresh press that started after the phase opened (GDD 6.7)', () => {
    const validator = new InputValidator();
    validator.markInputPhaseOpened(1000);
    const result = validator.validate({ index: 4, pressDownTs: 1050 }, 1050);
    expect(result).toEqual({ valid: true });
  });

  it('rejects a press that started BEFORE the phase opened - a held-down button (GDD 6.7)', () => {
    const validator = new InputValidator();
    validator.markInputPhaseOpened(1000);
    const result = validator.validate({ index: 4, pressDownTs: 950 }, 1050);
    expect(result).toEqual({ valid: false, reason: 'STALE_PRESS' });
  });

  it('rejects a second press on the same button within the 50ms debounce window (GDD 6.5)', () => {
    const validator = new InputValidator({ debounceMs: 50 });
    validator.markInputPhaseOpened(0);
    const first = validator.validate({ index: 4, pressDownTs: 10 }, 10);
    const second = validator.validate({ index: 4, pressDownTs: 40 }, 40);
    expect(first.valid).toBe(true);
    expect(second).toEqual({ valid: false, reason: 'DEBOUNCED' });
  });

  it('allows a press on a DIFFERENT button within the debounce window of another button', () => {
    const validator = new InputValidator({ debounceMs: 50 });
    validator.markInputPhaseOpened(0);
    validator.validate({ index: 4, pressDownTs: 10 }, 10);
    const other = validator.validate({ index: 5, pressDownTs: 20 }, 20);
    expect(other.valid).toBe(true);
  });

  it('allows the same button again once the debounce window has passed', () => {
    const validator = new InputValidator({ debounceMs: 50 });
    validator.markInputPhaseOpened(0);
    validator.validate({ index: 4, pressDownTs: 10 }, 10);
    const later = validator.validate({ index: 4, pressDownTs: 61 }, 61);
    expect(later.valid).toBe(true);
  });

  it('reset() clears debounce history and closes the open phase', () => {
    const validator = new InputValidator();
    validator.markInputPhaseOpened(0);
    validator.validate({ index: 4, pressDownTs: 10 }, 10);
    validator.reset();
    const result = validator.validate({ index: 4, pressDownTs: 20 }, 20);
    expect(result).toEqual({ valid: false, reason: 'PHASE_NOT_OPEN' });
  });
});
