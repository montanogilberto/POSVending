import { describe, it, expect } from 'vitest';
import { isPinFormat, isWeakPin, pinProblem } from './pin';

describe('pin', () => {
  it('is exactly 4 digits', () => {
    expect(isPinFormat('4829')).toBe(true);
    expect(isPinFormat('482')).toBe(false);
    expect(isPinFormat('48291')).toBe(false);
    expect(isPinFormat('48a9')).toBe(false);
  });

  it('flags repeated and sequential PINs only', () => {
    expect(isWeakPin('0000')).toBe(true);
    expect(isWeakPin('1234')).toBe(true);
    expect(isWeakPin('4321')).toBe(true);
    expect(isWeakPin('4829')).toBe(false);
    expect(isWeakPin('1212')).toBe(false);
  });

  it('explains the first problem in Spanish, null when fine', () => {
    expect(pinProblem('123', '123')).toMatch(/4 dígitos/);
    expect(pinProblem('1111', '1111')).toMatch(/obvio/);
    expect(pinProblem('4829', '4828')).toMatch(/no coinciden/);
    expect(pinProblem('4829', '4829')).toBeNull();
  });
});
