// Session tokens from the backend. Kept apart from pos_gmo_auth on purpose:
// UserContext logs that object, and tokens must never reach the console.

const SESSION_STORAGE_KEY = 'pos_gmo_session';

/** Dispatched on window when the backend refuses to renew the session. */
export const SESSION_EXPIRED_EVENT = 'pos-gmo-session-expired';

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function read(): Partial<SessionTokens> {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<SessionTokens>) : {};
  } catch {
    return {};
  }
}

export const getAccessToken = (): string | null => read().accessToken ?? null;

export const getRefreshToken = (): string | null => read().refreshToken ?? null;

/** A backend without SESSION_JWT_SECRET sends no tokens: then nothing changes. */
export function saveSessionTokens(tokens?: SessionTokens | null): void {
  if (!tokens?.accessToken || !tokens.refreshToken) return;
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(tokens));
  } catch {
    /* ignore quota errors */
  }
}

export function clearSessionTokens(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
