import { describe, it, expect } from 'vitest';
import { fmtTokens } from './format';

describe('fmtTokens', () => {
  it('shows small amounts exactly', () => {
    expect(fmtTokens(0)).toBe('0');
    expect(fmtTokens(842)).toBe('842');
    expect(fmtTokens(999)).toBe('999');
  });
  it('compacts thousands with one decimal below 100K', () => {
    expect(fmtTokens(1_000)).toBe('1K');
    expect(fmtTokens(48_200)).toBe('48.2K');
    expect(fmtTokens(99_940)).toBe('99.9K');
  });
  it('drops the decimal from 100K up', () => {
    expect(fmtTokens(100_000)).toBe('100K');
    expect(fmtTokens(995_679)).toBe('996K');
  });
  it('compacts millions with up to two decimals', () => {
    expect(fmtTokens(1_000_000)).toBe('1M');
    expect(fmtTokens(1_240_000)).toBe('1.24M');
  });
  it('keeps the sign of an overdrawn balance', () => {
    expect(fmtTokens(-1_500)).toBe('-1.5K');
  });
});
