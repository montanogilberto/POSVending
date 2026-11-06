// Frontend observability: workflow lifecycle + a global fetch interceptor that
// stamps trace/identity headers on every backend call. Installed once at
// bootstrap (see main.tsx) so the 25+ api modules that call fetch() directly all
// get the headers without being modified.
//
// Backend reads these in ObservabilityMiddleware. Identity headers are
// client-asserted — used for observability only, never for authorization.

import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { API_BASE_URL } from './appEnv';
import { getAccessToken } from './sessionTokens';
import { refreshSession } from '../api/sessionApi';

const AUTH_STORAGE_KEY = 'pos_gmo_auth';        // written by UserContext
const WORKFLOW_STORAGE_KEY = 'pos_gmo_workflow'; // current business workflow
const BACKEND_HOST = new URL(API_BASE_URL).host; // prod: smartloansbackend.azurewebsites.net, dev: localhost:8000

// Cached device/version — resolved once (async) at install; header falls back to
// platform until resolved.
let cachedDevice = Capacitor.getPlatform();
let cachedAppVersion = 'web';

// Opt-in debug logging — silent unless localStorage.obs_debug === '1' (any build)
// or a Vite dev build. Lets you watch trace ids being injected before the DB
// side is deployed. Off in production → no console noise.
function obsDebug(): boolean {
  try {
    if (localStorage.getItem('obs_debug') === '1') return true;
  } catch {
    /* ignore */
  }
  try {
    return Boolean((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV);
  } catch {
    return false;
  }
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  // RFC4122-ish fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Workflow lifecycle ──────────────────────────────────────────────────────

interface StoredWorkflow {
  workflowId: string;
  name: string;
  startedAt: number;
}

export function startWorkflow(name: string): string {
  const workflowId = uuid();
  const record: StoredWorkflow = { workflowId, name, startedAt: Date.now() };
  try {
    localStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* ignore storage errors */
  }
  if (obsDebug()) console.debug('[obs] workflow START', name, workflowId);
  return workflowId;
}

export function getCurrentWorkflowId(): string | null {
  try {
    const raw = localStorage.getItem(WORKFLOW_STORAGE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as StoredWorkflow).workflowId ?? null;
  } catch {
    return null;
  }
}

export function endWorkflow(): void {
  if (obsDebug()) console.debug('[obs] workflow END', getCurrentWorkflowId());
  try {
    localStorage.removeItem(WORKFLOW_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// ── Identity (best-effort, from stored auth) ────────────────────────────────

function readAuth(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// ── Fetch interceptor ───────────────────────────────────────────────────────

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return (input as Request).url ?? '';
}

function isBackendCall(url: string): boolean {
  return url.includes(BACKEND_HOST);
}

// A 401 from these is the answer itself, not an expired session.
const NO_REFRESH_PATHS = [
  '/auth/refresh', '/login', '/set_client_password', '/verify_client_login_code', '/verify_client_password',
];

function canRefreshFor(url: string): boolean {
  const { pathname } = new URL(url);
  return !NO_REFRESH_PATHS.includes(pathname) && !pathname.startsWith('/laundryDevices/');
}

let refreshing: Promise<string | null> | null = null;

/** Parallel 401s share one renewal. */
function refreshOnce(fetchImpl: typeof fetch): Promise<string | null> {
  refreshing ??= refreshSession(fetchImpl).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

function backendHeaders(input: RequestInfo | URL, init?: RequestInit): Headers | null {
  if (!isBackendCall(urlOf(input))) return null;

  const headers = new Headers(
    init?.headers || (input instanceof Request ? input.headers : undefined),
  );

  // Do not overwrite an explicitly-set correlation id.
  if (!headers.has('X-Correlation-Id')) headers.set('X-Correlation-Id', uuid());

  const workflowId = getCurrentWorkflowId();
  if (workflowId && !headers.has('X-Workflow-Id')) headers.set('X-Workflow-Id', workflowId);

  const auth = readAuth();
  const setId = (name: string, value: unknown) => {
    if (value != null && value !== 0 && value !== '0' && !headers.has(name)) {
      headers.set(name, String(value));
    }
  };
  setId('X-User-Id', auth.userId);
  setId('X-Company-Id', auth.companyId);
  setId('X-Client-Id', auth.clientId);

  if (!headers.has('X-App-Version')) headers.set('X-App-Version', cachedAppVersion);
  if (!headers.has('X-Device')) headers.set('X-Device', cachedDevice);

  const accessToken = getAccessToken();
  if (accessToken && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${accessToken}`);

  if (obsDebug()) {
    console.debug('[obs] →', urlOf(input), {
      correlationId: headers.get('X-Correlation-Id'),
      workflowId: headers.get('X-Workflow-Id'),
      userId: headers.get('X-User-Id'),
    });
  }

  return headers;
}

let installed = false;

export function installObservabilityFetch(): void {
  if (installed || typeof window === 'undefined' || !window.fetch) return;
  installed = true;

  // Resolve real device/app version once (native only; web keeps defaults).
  if (Capacitor.isNativePlatform()) {
    CapacitorApp.getInfo()
      .then((info) => {
        cachedAppVersion = `${info.version} (${info.build})`;
        cachedDevice = Capacitor.getPlatform();
      })
      .catch(() => {
        /* keep defaults */
      });
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let headers: Headers | null = null;
    try {
      headers = backendHeaders(input, init);
    } catch {
      // Never let header injection break a request.
    }
    if (!headers) return originalFetch(input, init);

    // Only header building is guarded: a network failure must reach the caller,
    // sending the request again could repeat a payment.
    const retryInput = input instanceof Request ? input.clone() : input;
    const response = await originalFetch(input, { ...init, headers });
    if (response.status !== 401 || !headers.has('Authorization') || !canRefreshFor(urlOf(input))) {
      return response;
    }

    const accessToken = await refreshOnce(originalFetch);
    if (!accessToken) return response;
    headers.set('Authorization', `Bearer ${accessToken}`);
    return originalFetch(retryInput, { ...init, headers });
  };
}
