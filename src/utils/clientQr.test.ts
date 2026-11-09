import { describe, expect, it } from 'vitest';
import { parseClientQrValue } from './clientQr';

describe('parseClientQrValue', () => {
  it('reads the clientId from the signed GMO1 format', () => {
    expect(parseClientQrValue('GMO1.1.57.abcDEF123')).toBe(57);
    expect(parseClientQrValue('  GMO1.1008.9.sig\n')).toBe(9);
  });

  it('reads the legacy CLIENT format', () => {
    expect(parseClientQrValue('CLIENT:12:Juan Perez')).toBe(12);
  });

  it('ignores the prefix case (scanner typed with Caps Lock on)', () => {
    expect(parseClientQrValue('gmo1.1.57.ABCdef')).toBe(57);
    expect(parseClientQrValue('client:12:juan')).toBe(12);
  });

  it('rejects anything that is not a client QR', () => {
    expect(parseClientQrValue('7501055300075')).toBeNull();
    expect(parseClientQrValue('GMO1.1.57')).toBeNull();
    expect(parseClientQrValue('GMO1.1.x.sig')).toBeNull();
    expect(parseClientQrValue('GMO1.1.0.sig')).toBeNull();
    expect(parseClientQrValue('https://example.com')).toBeNull();
  });
});
