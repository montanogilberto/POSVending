/**
 * Bus de refresco de datos — "algo cambió el dinero/la información, recarga".
 *
 * Emisores (notifyDataChanged): al completar cualquier transacción o acción —
 * pago confirmado, oferta publicada/eliminada, propuesta aceptada/rechazada,
 * retiro, depósito, cuota pagada — y también al RECIBIR un push (la acción la
 * hizo la contraparte) y al volver la app a primer plano.
 *
 * Oyentes (onDataChanged): dashboards y páginas con saldos, que recargan sus
 * datos sin esperar a que el usuario navegue (useIonViewWillEnter solo cubre
 * el caso "salir y volver").
 */
const EVENT = 'smartloans:data-changed';

export function notifyDataChanged(reason: string = 'action') {
  console.log('[refreshBus] notify →', reason);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { reason } }));
}

/** Suscribe y devuelve la función para desuscribir (úsala en el cleanup del efecto). */
export function onDataChanged(handler: (reason: string) => void): () => void {
  const h = (e: Event) => handler((e as CustomEvent).detail?.reason ?? 'unknown');
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}
