/** The 6-digit PIN a phone-login customer uses instead of a password. */
export const PIN_LENGTH = 6;

export const isPinFormat = (pin: string) => new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);

/** Same digit repeated, or an ascending/descending run — the first guesses of anyone trying a stranger's phone. */
export const isWeakPin = (pin: string) => {
  if (!isPinFormat(pin)) return false;
  const d = [...pin].map(Number);
  if (d.every(x => x === d[0])) return true;
  const diffs = d.slice(1).map((x, i) => x - d[i]);
  return diffs.every(x => x === 1) || diffs.every(x => x === -1);
};

/** Spanish reason a PIN can't be used, or null when it is fine. */
export const pinProblem = (pin: string, confirm: string): string | null => {
  if (!isPinFormat(pin)) return `El PIN debe tener ${PIN_LENGTH} dígitos`;
  if (isWeakPin(pin)) return 'Elige un PIN menos obvio (no repitas dígitos ni uses 123456)';
  if (pin !== confirm) return 'Los PIN no coinciden';
  return null;
};
