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
