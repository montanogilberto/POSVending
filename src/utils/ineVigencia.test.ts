import { describe, it, expect } from 'vitest';
import { parseVigenciaYear, ineVigenciaStatus, ineVigenciaProblem } from './ineVigencia';

const TODAY = '2026-11-19';

describe('parseVigenciaYear', () => {
  it('takes the last year of a range', () => {
    expect(parseVigenciaYear('2023 - 2033')).toBe(2033);
    expect(parseVigenciaYear('VIGENCIA 2019-2029')).toBe(2029);
  });
  it('reads a single year (older models)', () => {
    expect(parseVigenciaYear('2025')).toBe(2025);
  });
  it('returns null when there is no year', () => {
    expect(parseVigenciaYear('')).toBeNull();
    expect(parseVigenciaYear('203')).toBeNull();
    expect(parseVigenciaYear(undefined)).toBeNull();
  });
});

describe('ineVigenciaStatus', () => {
  it('is valid through December 31 of the vigencia year', () => {
    expect(ineVigenciaStatus('2026', TODAY)).toBe('valid');
    expect(ineVigenciaStatus('2026', '2026-12-31')).toBe('valid');
    expect(ineVigenciaStatus('2026', '2027-01-01')).toBe('expired');
  });
  it('flags an expired credential', () => {
    expect(ineVigenciaStatus('2015 - 2025', TODAY)).toBe('expired');
  });
  it('is unknown when the year is missing', () => {
    expect(ineVigenciaStatus('', TODAY)).toBe('unknown');
  });
});

describe('ineVigenciaProblem', () => {
  it('explains an expired INE', () => {
    expect(ineVigenciaProblem('2025', TODAY)).toContain('venció en 2025');
  });
  it('asks to type the year when unknown', () => {
    expect(ineVigenciaProblem('', TODAY)).toContain('Escribe');
  });
  it('is null for a valid INE', () => {
    expect(ineVigenciaProblem('2033', TODAY)).toBeNull();
  });
});
