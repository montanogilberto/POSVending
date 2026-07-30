// Frontend observability: workflow lifecycle + a global fetch interceptor that
// stamps trace/identity headers on every backend call. Installed once at
// bootstrap (see main.tsx) so the 25+ api modules that call fetch() directly all
// get the headers without being modified.
//
// Backend reads these in ObservabilityMiddleware. Identity headers are
// client-asserted — used for observability only, never for authorization.

import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';

const AUTH_STORAGE_KEY = 'pos_gmo_auth';        // written by UserContext
const WORKFLOW_STORAGE_KEY = 'pos_gmo_workflow'; // current business workflow
const BACKEND_HOST = 'smartloansbackend.azurewebsites.net';

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

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      if (!isBackendCall(urlOf(input))) {
        return originalFetch(input, init);
      }

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

      if (obsDebug()) {
        console.debug('[obs] →', urlOf(input), {
          correlationId: headers.get('X-Correlation-Id'),
          workflowId: headers.get('X-Workflow-Id'),
          userId: headers.get('X-User-Id'),
        });
      }

      return originalFetch(input, { ...init, headers });
    } catch {
      // Never let header injection break a request.
      return originalFetch(input, init);
    }
  };
}
