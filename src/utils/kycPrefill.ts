// Maps the identity fields already extracted from the client's INE
// (ClientFaceRecognitions.nombre / domicilio / curp / fecha_nacimiento — see
// clientFaceRecognitionApi.ts) onto the Stripe Connect KYC form.
//
// Stripe requires this data from anyone who receives money, but the app has
// already read all of it off the ID card, so asking the client to retype their
// CURP and address is pure friction — and a second chance to get it wrong.
// Every field stays editable; this only fills the starting values.

export interface KycPrefill {
  firstName: string;
  lastName: string;
  dob: string; // yyyy-mm-dd, the format the form's date input expects
  phone: string;
  taxId: string;
  line1: string;
  city: string;
  stateProv: string;
  postalCode: string;
}

export interface IneIdentityFields {
  nombre?: string;
  domicilio?: string;
  curp?: string;
  fechaNacimiento?: string;
}

// Mexican names carry TWO surnames, and the INE prints them FIRST:
// "MONTAÑO QUIHUIS GILBERTO" is apellido paterno + apellido materno + nombre.
// Splitting naively on the first token would file this person under the given
// name "MONTAÑO", which then disagrees with their CURP and fails Stripe's
// verification against government records.
//
// The CURP itself resolves the ambiguity, because its first four characters
// are derived from the name:
//   [0] first letter of apellido paterno
//   [1] first internal vowel of apellido paterno
//   [2] first letter of apellido materno
//   [3] first letter of the first given name
// e.g. MOQG860519HSRNHL08 -> M(ontaño) O Q(uihuis) G(ilberto)
//
// So we look for the token split that satisfies [2] and [3]. That handles
// compound surnames ("DE LA CRUZ") and multiple given names ("MARIA DEL
// CARMEN") without hardcoding particle lists. Without a CURP, fall back to the
// standard two-surname assumption.
export function splitMexicanName(nombre: string, curp?: string): { firstName: string; lastName: string } {
  const tokens = nombre.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { firstName: '', lastName: '' };
  if (tokens.length === 1) return { firstName: tokens[0], lastName: '' };

  const build = (surnameCount: number) => ({
    lastName: tokens.slice(0, surnameCount).join(' '),
    firstName: tokens.slice(surnameCount).join(' '),
  });

  const normalized = (curp ?? '').trim().toUpperCase();
  if (normalized.length >= 4) {
    const maternalInitial = normalized[2];
    const givenInitial = normalized[3];
    // surnameCount must leave at least one token for the given name.
    for (let surnameCount = 1; surnameCount < tokens.length; surnameCount++) {
      const lastSurname = tokens[surnameCount - 1];
      const firstGiven = tokens[surnameCount];
      if (
        stripAccents(lastSurname[0]) === stripAccents(maternalInitial) &&
        stripAccents(firstGiven[0]) === stripAccents(givenInitial)
      ) {
        return build(surnameCount);
      }
    }
  }

  return build(Math.min(2, tokens.length - 1));
}

// Ñ is a distinct CURP character, but accented vowels in the printed name are
// not, so compare on a folded form.
function stripAccents(char: string): string {
  return (char ?? '').normalize('NFD').replace(/[̀-̃̈]/g, '').toUpperCase();
}

// The INE prints dates as DD/MM/YYYY. Read as MM/DD/YYYY — which is what an
// unconfigured <input type="date"> suggests — 19/05/1986 is invalid and
// 08/05/1980 silently becomes 5 August. Stripe verifies the date of birth
// against government records, so a transposed date fails KYC with no useful
// error. Returns '' rather than guessing when the input isn't a plain date.
export function ineDateToIso(fechaNacimiento: string): string {
  const match = (fechaNacimiento ?? '').trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return '';
  const [, dayRaw, monthRaw, year] = match;
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// The INE's DOMICILIO block is three printed lines — street, colonia + postal
// code + city, state — which the extraction flattens into one string:
//   "C VIZNAGA ZUCULENTA 16 COL NUEVO HERMOSILLO 83296 HERMOSILLO, SON."
// The 5-digit postal code is the reliable anchor: the street precedes the
// colonia marker, and city/state follow the postal code.
// Abbreviations as printed on the INE, used only to split "CITY STATE" when no
// comma separates them. Full state names already survive the comma path.
const MX_STATE_CODES = new Set([
  'AGS', 'BC', 'BCS', 'CAMP', 'COAH', 'COL', 'CHIS', 'CHIH', 'CDMX', 'DF',
  'DGO', 'GTO', 'GRO', 'HGO', 'JAL', 'MEX', 'MICH', 'MOR', 'NAY', 'NL',
  'OAX', 'PUE', 'QRO', 'QROO', 'SLP', 'SIN', 'SON', 'TAB', 'TAMPS', 'TLAX',
  'VER', 'YUC', 'ZAC',
]);

export function parseIneAddress(domicilio: string): {
  line1: string; city: string; stateProv: string; postalCode: string;
} {
  const text = (domicilio ?? '').replace(/\s+/g, ' ').trim();
  const empty = { line1: '', city: '', stateProv: '', postalCode: '' };
  if (!text) return empty;

  const cpMatch = text.match(/\b(\d{5})\b/);
  const postalCode = cpMatch ? cpMatch[1] : '';

  // Street is whatever precedes the colonia marker; if there's no marker, fall
  // back to everything before the postal code.
  const colIndex = text.search(/\bCOL(?:ONIA)?\b\.?/i);
  let line1 = '';
  if (colIndex > 0) {
    line1 = text.slice(0, colIndex).trim();
  } else if (cpMatch && cpMatch.index !== undefined) {
    line1 = text.slice(0, cpMatch.index).trim();
  } else {
    line1 = text;
  }

  // City / state follow the postal code, usually comma-separated.
  let city = '';
  let stateProv = '';
  if (cpMatch && cpMatch.index !== undefined) {
    const tail = text.slice(cpMatch.index + cpMatch[1].length).trim().replace(/\.$/, '');
    if (tail) {
      const parts = tail.split(',').map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        city = parts[0];
        stateProv = parts[parts.length - 1].replace(/\.$/, '');
      } else {
        // No comma — the INE doesn't always print one, so "HERMOSILLO SON"
        // arrives as a single run. Split on a trailing state abbreviation
        // rather than dumping the state into the city field, which Stripe
        // then can't match against a real address.
        const single = parts[0] ?? '';
        const words = single.split(/\s+/).filter(Boolean);
        const trailing = (words[words.length - 1] ?? '').replace(/\.$/, '').toUpperCase();
        if (words.length > 1 && MX_STATE_CODES.has(trailing)) {
          stateProv = trailing;
          city = words.slice(0, -1).join(' ');
        } else {
          city = single;
        }
      }
    }
  }

  return { line1: line1.replace(/[,\s]+$/, ''), city, stateProv, postalCode };
}

export function buildKycPrefill(fields: IneIdentityFields, cellphone?: string): KycPrefill {
  const { firstName, lastName } = splitMexicanName(fields.nombre ?? '', fields.curp);
  const address = parseIneAddress(fields.domicilio ?? '');
  const prefill: KycPrefill = {
    firstName,
    lastName,
    dob: ineDateToIso(fields.fechaNacimiento ?? ''),
    phone: (cellphone ?? '').trim(),
    taxId: (fields.curp ?? '').trim(),
    line1: address.line1,
    city: address.city,
    stateProv: address.stateProv,
    postalCode: address.postalCode,
  };

  // Which fields resolved, and whether the source data was even there — the
  // difference between "parsing is broken" and "the INE extraction never ran,
  // so there is nothing to prefill from". Logs presence, not values: this is
  // the client's CURP, date of birth and home address.
  console.log('[KycPrefill] buildKycPrefill', JSON.stringify({
    source: {
      nombre: !!fields.nombre,
      domicilio: !!fields.domicilio,
      curp: !!fields.curp,
      fechaNacimiento: !!fields.fechaNacimiento,
    },
    resolved: (Object.keys(prefill) as (keyof KycPrefill)[]).filter((k) => prefill[k]),
    empty: (Object.keys(prefill) as (keyof KycPrefill)[]).filter((k) => !prefill[k]),
  }));

  return prefill;
}
