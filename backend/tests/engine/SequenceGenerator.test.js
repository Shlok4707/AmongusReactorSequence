import { describe, it, expect } from 'vitest';
import { generateSequence } from '../../src/engine/SequenceGenerator.js';

describe('generateSequence', () => {
  it('produces a sequence of the requested length', () => {
    const seq = generateSequence(() => 0.5, 5, 9);
    expect(seq).toHaveLength(5);
  });

  it('maps rng() to indices in [0, gridSize) using the documented formula', () => {
    // GDD 2.2: Math.floor(Math.random() * 9)
    const seq = generateSequence(() => 0.999, 3, 9);
    expect(seq).toEqual([8, 8, 8]);
  });

  it('does NOT suppress consecutive duplicates (GDD 2.3)', () => {
    const seq = generateSequence(() => 0.44, 5, 9); // floor(0.44*9) = 3 every time
    expect(seq).toEqual([3, 3, 3, 3, 3]);
  });

  it('defaults to MAX_STAGES length and 9-square grid when not overridden', () => {
    const seq = generateSequence(() => 0);
    expect(seq).toHaveLength(5);
    expect(seq.every((n) => n >= 0 && n < 9)).toBe(true);
  });
});
