# Observability (Frontend)

The frontend's job in observability is **trace propagation**: give every backend call the ids that let the whole system reconstruct what a user did. It generates a `workflowId` when a business process starts, and stamps trace + identity headers on every request so the backend can tie logs together.

> Backend counterpart (tables, middleware, logger, query cookbook): `smartloans_backend/MD/OBSERVABILITY.md`.

---

## What the frontend sends

On **every call to the backend host** (`smartloansbackend.azurewebsites.net`), these headers are injected automatically:

| Header | Value | Source |
|--------|-------|--------|
| `X-Correlation-Id` | new UUID per request | generated per call |
| `X-Workflow-Id` | current business-process id | `startWorkflow()` (if a workflow is active) |
| `X-User-Id` / `X-Company-Id` / `X-Client-Id` | logged-in identity | `localStorage` auth (`pos_gmo_auth`) |
| `X-App-Version` | app version / build | Capacitor `App.getInfo()` (native); `"web"` otherwise |
| `X-Device` | platform | `Capacitor.getPlatform()` |

Third-party URLs are **never** touched — only backend-host calls get headers.

---

## Files

| File | Role |
|------|------|
| `src/utils/observability.ts` | Installs a **global `window.fetch` interceptor** (once, at bootstrap) + the workflow lifecycle helpers (`startWorkflow`, `endWorkflow`, `getCurrentWorkflowId`, `uuid`) |
| `src/contexts/ObservabilityContext.tsx` | React wrapper: `useObservability()` → `{ currentWorkflowId, startWorkflow, endWorkflow }` |
| `src/main.tsx` | Calls `installObservabilityFetch()` before render; wraps the tree in `<ObservabilityProvider>` |

### Why a global fetch interceptor?

There is no central API client — 25+ files in `src/api/` each call `fetch()` directly with their own `API_BASE_URL`. Wrapping `window.fetch` **once** stamps headers on all of them without editing any api module. It preserves any headers the caller already set and never breaks a request (all logic is wrapped in try/catch).

---

## Workflow lifecycle

A "workflow" is one business process (registration, loan application, payment). Start it when the process begins; every backend call until you end it carries the same `X-Workflow-Id`, so the backend can render "one workflow, one trace".

```tsx
import { useObservability } from '../../contexts/ObservabilityContext';

const { startWorkflow, endWorkflow } = useObservability();

// at the entry point (e.g. "Create Account" click)
startWorkflow('client_registration');

// ... user goes through steps; every backend call is tagged ...

// at the final success step
endWorkflow();
```

The current implementation wires this into `src/pages/Authentication/CreateAccount.tsx`:
`startWorkflow('client_registration')` on account creation → `endWorkflow()` at `handleStep3Submit`.

The id is persisted in `localStorage` (`pos_gmo_workflow`), so it survives step-to-step navigation and page reloads within the flow.

### Adding a new traced workflow

1. Call `startWorkflow('<process_name>')` where the process begins.
2. Do nothing else — the interceptor tags every backend call automatically.
3. Call `endWorkflow()` at the terminal step.

Use the same `<process_name>` the backend expects in `workflowName` (e.g. the backend logs registration steps under `workflow_name="client_registration"`).

---

## Notes & caveats

- **Identity headers are client-asserted.** They are for observability only — the backend must never use them for authorization.
- **No secrets are sent as trace headers** — only ids/version/platform. Request bodies are the api modules' own concern; the backend redacts anything sensitive before storing.
- If no workflow is active, `X-Workflow-Id` is simply omitted (per-request `X-Correlation-Id` still flows, so isolated calls are still traceable).

---

## Verification status

**Confirmed (live, via the dev server):**
- The interceptor injects `X-Correlation-Id`, `X-Workflow-Id`, `X-User-Id/Company-Id/Client-Id`, `X-App-Version`, `X-Device` on a backend call, preserving `Content-Type`.
- A third-party URL (`example.com`) receives **no** trace headers.
- `startWorkflow()` produces a stable id that appears as `X-Workflow-Id` on subsequent calls.
- `tsc` clean across all edits.

**Not yet exercised end-to-end:** a real registration run producing one `workflowId` trace **in the backend tables** — blocked on deploying `sp_observability.sql`. Confirm post-deploy with the backend query cookbook (`observability_queries.sql`, queries #1 and #2).

---

## Debug logging (opt-in)

Silent by default. Turn on to watch trace ids being injected in the console:
- `localStorage.setItem('obs_debug', '1')` (any build), or automatically in a Vite dev build.

You'll see `[obs] workflow START …`, `[obs] → <url> {correlationId, workflowId, userId}`, and `[obs] workflow END …`. Backend has a matching switch: run the API with `OBS_DEBUG=1`.

## Follow-ups

- Instrument more workflows (loan application, payment, collections) with `startWorkflow`/`endWorkflow`.
- Optionally surface the `correlationId` of a failed call to the user (e.g. in an error toast) so support can quote it.
