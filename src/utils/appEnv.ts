/**
 * Bandera de entorno de la app: distingue builds de DESARROLLO de las de
 * usuarios reales.
 *
 * - `VITE_APP_ENV=dev` (o `staging`, etc.) fijado al compilar gana siempre.
 * - Sin variable: `import.meta.env.DEV` (servidor de desarrollo de Vite) → 'dev';
 *   build de producción → 'prod'.
 *
 * Se usa en:
 * - /registerDevice → el Hub etiqueta la instalación con `env_<APP_ENV>`
 *   (pushes de prueba solo a devs, auditoría de qué builds están instaladas).
 * - Header → chip "DEV" visible para saber qué build estás usando.
 */
export const APP_ENV: string =
  (import.meta.env.VITE_APP_ENV as string | undefined)?.trim() ||
  (import.meta.env.DEV ? 'dev' : 'prod');

export const IS_DEV_BUILD = APP_ENV !== 'prod';

/** Backend de producción (Azure App Service → base de datos de producción). */
export const PROD_API_URL = 'https://smartloansbackend.azurewebsites.net';
/** Backend local (`python main.py` → uvicorn :8000 → base de datos de desarrollo). */
export const DEV_API_URL = 'http://localhost:8000';

/**
 * URL base del backend — ÚNICA fuente para todas las llamadas HTTP.
 *
 * - `VITE_API_URL` fijado al compilar gana siempre (por ambiente en GitHub
 *   Environments: dev / qa / production → ver .github/workflows/_deploy-swa.yml).
 * - Sin variable: servidor de desarrollo de Vite (`npm run dev`) → backend local;
 *   cualquier build (`npm run build`, apps nativas) → producción.
 */
export const API_BASE_URL: string = (
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
  (import.meta.env.DEV ? DEV_API_URL : PROD_API_URL)
).replace(/\/+$/, '');

/**
 * Llave publicable de Stripe (pk_live_… / pk_test_…) — ÚNICA fuente para el
 * frontend. Es pública por diseño (va en el bundle), pero debe ser de la MISMA
 * cuenta y modo que `STRIPE_SECRET_KEY` del backend (hoy: live).
 *
 * Se fija al compilar con `VITE_STRIPE_PUBLISHABLE_KEY` (GitHub vars para web;
 * `.env` local para builds nativas). Sin ella queda vacía y la UI muestra un
 * error claro en lugar de llamar a Stripe con una llave falsa.
 */
export const STRIPE_PUBLISHABLE_KEY: string =
  (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined)?.trim() || '';

export const STRIPE_KEY_MISSING_MSG =
  'Los pagos no están configurados en esta versión de la app. Contacta a soporte.';
