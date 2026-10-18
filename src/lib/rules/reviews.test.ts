import { describe, expect, it } from 'vitest';
import { canSignOff } from './reviews';
import { FOUR } from './fixtures';

describe('peer review sign-off', () => {
  it('only the assigned reviewer can sign off', () => {
    // Week 1: michael is reviewed by oba.
    expect(canSignOff(FOUR, 1, 'michael', 'oba')).toBe(true);
    expect(canSignOff(FOUR, 1, 'michael', 'chisom')).toBe(false);
    expect(canSignOff(FOUR, 1, 'michael', 'michael')).toBe(false);
  });

  it('follows the rotation to the next week', () => {
    expect(canSignOff(FOUR, 2, 'michael', 'oba')).toBe(false);
    expect(canSignOff(FOUR, 2, 'michael', 'timi')).toBe(true);
  });
});
