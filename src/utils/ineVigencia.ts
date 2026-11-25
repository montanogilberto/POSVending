import { hermosilloTodayISO } from './format';

/**
 * INE "VIGENCIA" (RFC-015). The front prints the validity as a year range
 * ("VIGENCIA 2023 - 2033") or, on older models, a single year ("VIGENCIA 2025").
 * The credential is valid until December 31 of the LAST year shown.
 * This is a local check of the printed date — not an authenticity check
 * (that is the INE Lista Nominal lookup, RFC-015 step 2).
 */
export type IneVigenciaStatus = 'valid' | 'expired' | 'unknown';

/** The last 4-digit year (2000–2100) in the text, or null. */
export const parseVigenciaYear = (text: string | null | undefined): number | null => {
  const years = (String(text ?? '').match(/\b(20\d{2}|2100)\b/g) ?? []).map(Number);
  return years.length ? Math.max(...years) : null;
};

/** valid through Dec 31 of the vigencia year, in Hermosillo time. */
export const ineVigenciaStatus = (
  text: string | null | undefined,
  todayISO: string = hermosilloTodayISO(),
): IneVigenciaStatus => {
  const year = parseVigenciaYear(text);
  if (year == null) return 'unknown';
  const currentYear = Number(todayISO.slice(0, 4));
  return year < currentYear ? 'expired' : 'valid';
};

/** Spanish message for a status that blocks the KYC (null when valid). */
export const ineVigenciaProblem = (text: string | null | undefined, todayISO?: string): string | null => {
  const status = ineVigenciaStatus(text, todayISO);
  if (status === 'expired') {
    return `Tu INE venció en ${parseVigenciaYear(text)}. Para continuar necesitas una credencial vigente.`;
  }
  if (status === 'unknown') {
    return 'No pudimos leer la vigencia de tu INE. Escribe el último año que aparece en "VIGENCIA" (ej. 2033).';
  }
  return null;
};
