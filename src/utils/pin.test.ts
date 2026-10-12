import { describe, it, expect } from 'vitest';
import { isPinFormat, isWeakPin, pinProblem } from './pin';

describe('pin', () => {
  it('is exactly 6 digits', () => {
    expect(isPinFormat('482913')).toBe(true);
    expect(isPinFormat('48291')).toBe(false);
    expect(isPinFormat('4829134')).toBe(false);
    expect(isPinFormat('48a913')).toBe(false);
  });

  it('flags repeated and sequential PINs only', () => {
    expect(isWeakPin('000000')).toBe(true);
    expect(isWeakPin('123456')).toBe(true);
    expect(isWeakPin('654321')).toBe(true);
    expect(isWeakPin('482913')).toBe(false);
    expect(isWeakPin('121212')).toBe(false);
  });

  it('explains the first problem in Spanish, null when fine', () => {
    expect(pinProblem('123', '123')).toMatch(/6 dígitos/);
    expect(pinProblem('111111', '111111')).toMatch(/obvio/);
    expect(pinProblem('482913', '482914')).toMatch(/no coinciden/);
    expect(pinProblem('482913', '482913')).toBeNull();
  });
});
