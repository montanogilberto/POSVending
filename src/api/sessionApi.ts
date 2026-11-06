import { API_BASE_URL } from '../utils/appEnv';
import {
  SESSION_EXPIRED_EVENT, SessionTokens, clearSessionTokens, getRefreshToken, saveSessionTokens,
} from '../utils/sessionTokens';

/**
 * POST /auth/refresh — returns the new access token, or null when it can't be renewed.
 * Takes the unwrapped fetch: it is called from inside the global fetch wrapper.
 * Only a 401 ends the session; a network error or a 503 leaves it for the next try.
 */
export async function refreshSession(fetchImpl: typeof fetch): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetchImpl(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (res.status === 401) {
      console.log('[sessionApi] refresh refused: session ended');
      clearSessionTokens();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      return null;
    }
    if (!res.ok) {
      console.log('[sessionApi] refresh failed:', res.status);
      return null;
    }
    const tokens = (await res.json()) as SessionTokens;
    saveSessionTokens(tokens);
    return tokens.accessToken;
  } catch {
    console.log('[sessionApi] refresh failed: network');
    return null;
  }
}
