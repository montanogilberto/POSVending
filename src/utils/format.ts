/**
 * Formateadores compartidos de dinero y fecha (es-MX / Hermosillo).
 * Única fuente de verdad — antes había 7 copias de `fmt` con 4 comportamientos
 * distintos y 4 copias de la normalización UTC→local, con salidas inconsistentes.
 */

/** $1,234.56 — moneda MXN completa (pantallas de pago, marketplace, detalle). */
export const fmtMXN = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });

/** 1,234.56 — solo número con 2 decimales (cuando el "$" ya está en el markup). */
export const fmtNum = (n: number) =>
  n.toLocaleString('es-MX', { minimumFractionDigits: 2 });

/** 1,234 — número sin decimales forzados (puntos, conteos). */
export const fmtInt = (n: number) => n.toLocaleString('es-MX');

/** Los timestamps del backend llegan sin zona: interpretarlos como UTC. */
const asUtc = (s: string) =>
  new Date(s.includes('Z') || s.includes('+') ? s : `${s}Z`);

/** "07 ago 2026" — fecha corta con año; '—' si viene null/undefined. */
export const mxDate = (utc?: string | null): string => {
  if (!utc) return '—';
  return asUtc(utc).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** "07 ago" — separador de fecha en chat. */
export const mxChatDate = (s: string) =>
  asUtc(s).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

/** "14:35" — hora de mensaje en chat. */
export const mxChatTime = (s: string) =>
  asUtc(s).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

/** Fecha+hora completa desplazada a Hermosillo (UTC-7, sin DST). */
export const toHermosillo = (utc: string | undefined): string => {
  if (!utc) return '';
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString();
};
