import { describe, it, expect } from 'vitest';
import { COUNTRIES, countryOf, DEFAULT_COUNTRY, digitsOnly, formatNational, isValidNational, toE164 } from './phone';

const MX = DEFAULT_COUNTRY;

describe('phone', () => {
  it('defaults to Mexico (+52)', () => {
    expect(MX.id).toBe('MX');
    expect(MX.dial).toBe('+52');
  });

  it('builds E.164 from the country code and the typed digits, ignoring formatting', () => {
    expect(toE164(MX, '662 123 4567')).toBe('+526621234567');
    expect(toE164(COUNTRIES[1], '(555) 010-9999')).toBe('+15550109999');
  });

  it('needs exactly the national length', () => {
    expect(isValidNational(MX, '662 123 4567')).toBe(true);
    expect(isValidNational(MX, '662 123 456')).toBe(false);
    expect(isValidNational(MX, '66212345678')).toBe(false);
  });

  it('formats while typing', () => {
    expect(formatNational('66')).toBe('66');
    expect(formatNational('6621')).toBe('662 1');
    expect(formatNational('6621234567')).toBe('662 123 4567');
    expect(formatNational('662123456789999')).toBe('662 123 4567');
  });

  it('keeps digits only', () => {
    expect(digitsOnly('+52 (662) 123-4567')).toBe('526621234567');
  });

  it('guesses the country of a stored number', () => {
    expect(countryOf('+526621234567').id).toBe('MX');
    expect(countryOf('+15550109999').id).toBe('US');
    expect(countryOf('+573001234567').id).toBe('CO');
    expect(countryOf('6621234567').id).toBe('MX');
  });
});
