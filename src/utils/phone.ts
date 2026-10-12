/**
 * Phone entry with a country code (LADA). Only countries whose national number
 * is 10 digits are listed: the backend matches a client's phone by its last 10
 * digits (sp_clientLoginCodes), so shorter numbers would collide.
 */
export interface Country {
  id: string;
  name: string;
  /** With the leading '+'. */
  dial: string;
  flag: string;
  nationalLength: number;
}

export const COUNTRIES: readonly Country[] = [
  { id: 'MX', name: 'México',         dial: '+52', flag: '🇲🇽', nationalLength: 10 },
  { id: 'US', name: 'Estados Unidos', dial: '+1',  flag: '🇺🇸', nationalLength: 10 },
  { id: 'CO', name: 'Colombia',       dial: '+57', flag: '🇨🇴', nationalLength: 10 },
];

export const DEFAULT_COUNTRY: Country = COUNTRIES[0];

export const digitsOnly = (value: string) => value.replace(/\D/g, '');

export const isValidNational = (country: Country, national: string) =>
  digitsOnly(national).length === country.nationalLength;

/** '+526621234567' — what the backend expects; the number the SMS goes to. */
export const toE164 = (country: Country, national: string) =>
  `${country.dial}${digitsOnly(national)}`;

/** '6621234567' -> '662 123 4567' while typing (any length). */
export const formatNational = (national: string) => {
  const d = digitsOnly(national).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
};

/** Best guess of the country for a stored E.164 number; Mexico when unsure. */
export const countryOf = (e164: string): Country => {
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  return sorted.find(c => e164.startsWith(c.dial)) ?? DEFAULT_COUNTRY;
};
