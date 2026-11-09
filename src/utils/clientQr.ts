/**
 * Extracts the clientId from a client QR. Accepts the signed laundry format
 * `GMO1.<companyId>.<clientId>.<firma>` (served by /laundryDevices/clientQr)
 * and, during the transition, the legacy `CLIENT:<id>:<name>`. The signature
 * is only verified server-side; here the id just picks the client to load.
 *
 * The prefix is matched case-insensitively: a handheld scanner types the code
 * as keystrokes, so Caps Lock on the register flips its case.
 */
export function parseClientQrValue(raw: string): number | null {
  const value = raw.trim();
  const upper = value.toUpperCase();
  let idPart: string | undefined;
  if (upper.startsWith('GMO1.')) {
    const parts = value.split('.');
    if (parts.length !== 4) return null;
    idPart = parts[2];
  } else if (upper.startsWith('CLIENT:')) {
    idPart = value.split(':')[1];
  }
  if (!idPart || !/^\d+$/.test(idPart)) return null;
  const clientId = parseInt(idPart, 10);
  return clientId > 0 ? clientId : null;
}
