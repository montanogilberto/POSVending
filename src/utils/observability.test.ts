// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { API_BASE_URL } from './appEnv';
import { installObservabilityFetch } from './observability';
import { SESSION_EXPIRED_EVENT, getAccessToken, saveSessionTokens } from './sessionTokens';

const network = vi.fn();
const url = (path: string) => `${API_BASE_URL}${path}`;
const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const authOf = (call: number) => new Headers(network.mock.calls[call][1]?.headers).get('Authorization');

window.fetch = network as unknown as typeof fetch;
installObservabilityFetch();

describe('session handling in the fetch wrapper', () => {
  beforeEach(() => {
    network.mockReset();
    localStorage.clear();
  });

  it('sends the token to the backend only', async () => {
    saveSessionTokens({ accessToken: 'a1', refreshToken: 'r1', expiresIn: 1800 });
    network.mockResolvedValue(json(200));
    await window.fetch(url('/wallet'));
    await window.fetch('https://example.com/other');
    expect(authOf(0)).toBe('Bearer a1');
    expect(network.mock.calls[1][1]).toBeUndefined();
  });

  it('sends nothing for a session without tokens', async () => {
    network.mockResolvedValue(json(200));
    await window.fetch(url('/wallet'));
    expect(authOf(0)).toBeNull();
  });

  it('renews once on a 401 and repeats the request with the new token', async () => {
    saveSessionTokens({ accessToken: 'old', refreshToken: 'r1', expiresIn: 1800 });
    network
      .mockResolvedValueOnce(json(401))
      .mockResolvedValueOnce(json(200, { accessToken: 'new', refreshToken: 'r2', expiresIn: 1800 }))
      .mockResolvedValueOnce(json(200, { ok: true }));
    const response = await window.fetch(url('/wallet'), { method: 'POST', body: '{"a":1}' });
    expect(response.status).toBe(200);
    expect(network).toHaveBeenCalledTimes(3);
    expect(network.mock.calls[1][0]).toBe(url('/auth/refresh'));
    expect(authOf(2)).toBe('Bearer new');
    expect(network.mock.calls[2][1].body).toBe('{"a":1}');
    expect(getAccessToken()).toBe('new');
  });

  it('shares one renewal between parallel requests', async () => {
    saveSessionTokens({ accessToken: 'old', refreshToken: 'r1', expiresIn: 1800 });
    network.mockImplementation(async (input: string, init?: RequestInit) => {
      if (input.endsWith('/auth/refresh')) return json(200, { accessToken: 'new', refreshToken: 'r2', expiresIn: 1800 });
      return new Headers(init?.headers).get('Authorization') === 'Bearer new' ? json(200) : json(401);
    });
    await Promise.all([window.fetch(url('/a')), window.fetch(url('/b'))]);
    const refreshes = network.mock.calls.filter(([input]) => String(input).endsWith('/auth/refresh'));
    expect(refreshes).toHaveLength(1);
  });

  it('ends the session when the backend refuses to renew', async () => {
    const expired = vi.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    saveSessionTokens({ accessToken: 'old', refreshToken: 'r1', expiresIn: 1800 });
    network.mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json(401));
    const response = await window.fetch(url('/wallet'));
    window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
    expect(response.status).toBe(401);
    expect(expired).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
  });

  it('keeps the session when renewal fails for another reason', async () => {
    saveSessionTokens({ accessToken: 'old', refreshToken: 'r1', expiresIn: 1800 });
    network.mockResolvedValueOnce(json(401)).mockResolvedValueOnce(json(503));
    await window.fetch(url('/wallet'));
    expect(getAccessToken()).toBe('old');
  });

  it('does not renew for login routes or device errors', async () => {
    saveSessionTokens({ accessToken: 'a1', refreshToken: 'r1', expiresIn: 1800 });
    network.mockResolvedValue(json(401));
    await window.fetch(url('/set_client_password'), { method: 'POST' });
    await window.fetch(url('/laundryDevices/authorize'), { method: 'POST' });
    expect(network).toHaveBeenCalledTimes(2);
  });

  it('never sends a request twice when the network fails', async () => {
    saveSessionTokens({ accessToken: 'a1', refreshToken: 'r1', expiresIn: 1800 });
    network.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(window.fetch(url('/payments/disburse'), { method: 'POST' })).rejects.toThrow('Failed to fetch');
    expect(network).toHaveBeenCalledTimes(1);
  });
});
