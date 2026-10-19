# Environments — DEV / QA / PROD

How to open each environment, how code gets there, and where it is configured.
Set up 2026-10-19.

## 1. URLs

| Env | Frontend URL | Git branch | Backend | Database |
|---|---|---|---|---|
| **DEV** | https://lively-mud-0fee0c71e.4.azurestaticapps.net | `development` | production* | production* |
| **QA** | https://proud-island-02ca13b1e.1.azurestaticapps.net | `qa` | production* | production* |
| **PROD** | https://mango-smoke-0323ed91e.3.azurestaticapps.net | `main` | https://smartloansbackend.azurewebsites.net | production |
| **Local** | http://localhost:8100 (`npm run dev`) | any | http://localhost:8000 | whatever `LOCAL_DB_*` in the backend `.env` points to |

\* DEV and QA are hosted sites, so they can't reach your `localhost` backend. Until a DEV/QA
backend exists they call the **production backend and database**. To change that, set
`VITE_API_URL` in that GitHub Environment (see §5).

Each environment shows its name in the app header: a **DEV** / **QA** chip (from `VITE_APP_ENV`).
Production shows no chip.

## 2. How code reaches each environment

```
feature/* ──PR──► development ──PR──► qa ──PR──► main
                     │                │           │
                     ▼                ▼           ▼
                    DEV               QA         PROD
```

- **Merge into `development`** → deploys DEV automatically (`deploy-dev.yml`).
- **Release to QA**: GitHub → Actions → **Promote release** → Run workflow → `development → qa`.
  It opens the PR; merging it deploys QA (`deploy-qa.yml`).
- **Release to PROD**: same workflow → `qa → main (production)`. The PR gets a **preview URL**
  (`mango-smoke-0323ed91e-<PR#>.westus2.3.azurestaticapps.net`) posted as a comment.
  Merging it deploys PROD (`azure-static-web-apps-mango-smoke-0323ed91e.yml`).
- `release-guard.yml` rejects shortcuts: only `development` can merge into `qa`, and only `qa`
  or `hotfix/*` can merge into `main`.

You can redeploy DEV or QA without a commit: Actions → *Deploy DEV* / *Deploy QA* → Run workflow.

## 3. Checking a deploy

- GitHub → **Actions** tab → pick the run → the deploy step ends with
  `Visit your site at: https://…`
- GitHub → **Environments** (repo home page, right sidebar) shows the last deploy of
  `dev`, `qa` and `production` with a link to the site.
- If the DEV/QA run says *"Secret … is not set — skipping deploy"*, the token secret is missing (§4).

## 4. Azure

Azure Portal → Resource group **`POSGMO_group`** (subscription *Azure subscription 1*):

| Static Web App | Env | Plan |
|---|---|---|
| `POSGMO` | PROD | Free |
| `GMO-dev` | DEV | Free |
| `GMO-qa` | QA | Free |

Backend: App Service **`smartLoansBackend`** (deploys from `main` of the `smartloans_backend` repo).

From the CLI:

```bash
az staticwebapp list -g POSGMO_group -o table
```

Get a deployment token (for example after rotating it):

```bash
az staticwebapp secrets list -n GMO-dev -g POSGMO_group --query properties.apiKey -o tsv
```

## 5. Configuration

### GitHub repo secrets (Settings → Secrets and variables → Actions)

| Secret | Used by |
|---|---|
| `AZURE_SWA_TOKEN_DEV` | deploy to `GMO-dev` |
| `AZURE_SWA_TOKEN_QA` | deploy to `GMO-qa` |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_MANGO_SMOKE_0323ED91E` | deploy to `POSGMO` (prod) |

Rotate a token and store it again without printing it:

```bash
az staticwebapp secrets list -n GMO-dev -g POSGMO_group --query properties.apiKey -o tsv | tr -d '\n' | gh secret set AZURE_SWA_TOKEN_DEV
```

### GitHub Environments (Settings → Environments → `dev` / `qa` / `production`)

Optional per-environment build values. Anything left empty uses the defaults in code.

| Name | Kind | Purpose |
|---|---|---|
| `VITE_API_URL` | variable | Backend URL for that environment (default: production backend) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | variable | Stripe key (use `pk_test_…` for DEV/QA) |
| `VITE_WORKER_KEY` | secret | `x-worker-key` header for `/registerDevice` |

`VITE_APP_ENV` is set automatically by the workflow (`dev`, `qa`, `prod`).

### In code

- **Frontend**: every backend call uses `API_BASE_URL` from `src/utils/appEnv.ts`.
  The order is: `VITE_API_URL` → `npm run dev` uses `http://localhost:8000` → otherwise
  (builds and the native apps) production. Never type the backend URL into a file.
- **Backend**: `app_env.py` reads `APP_ENV` (`dev` locally, `prod` on Azure by default).
  Only the `LOCAL_DB_*` values pick the database. On startup the backend prints:
  `[appEnv][startup] APP_ENV=dev DB=<server>/<database>`. **Check this line before running
  anything that writes to the database.**
- **CORS**: to let DEV/QA call the production backend, add their URLs to the
  `smartLoansBackend` App Setting `CORS_EXTRA_ORIGINS` (comma-separated):
  `https://lively-mud-0fee0c71e.4.azurestaticapps.net,https://proud-island-02ca13b1e.1.azurestaticapps.net`

## 6. Running locally

```bash
cd ~/PycharmProjects/pythonProject/smartloans_backend && source venv/bin/activate && python main.py
```

```bash
cd ~/PycharmProjects/POSVendingV2/POSVending && npm run dev
```

To run the local frontend against the production backend instead, uncomment
`VITE_API_URL=https://smartloansbackend.azurewebsites.net` in the frontend `.env`.

## 7. Known gaps

- [ ] Create the DEV database and point the backend `.env` `LOCAL_DB_*` at it (it still points to production).
- [ ] Add `CORS_EXTRA_ORIGINS` to the `smartLoansBackend` App Settings.
- [ ] Settings → Actions → General → allow GitHub Actions to create pull requests (needed by *Promote release*).
- [ ] Branch protection on `qa` and `main`: require PRs and the *Release guard* checks.
- [ ] Delete the stale `production` branch (its old workflow would deploy to PROD on push).
- [ ] The backend scheduler sends real WhatsApp/SMS/push messages even when run locally.
