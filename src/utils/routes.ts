/**
 * Rutas que llevan el clientId en el path.
 *
 * Igual que /client-dashboard/:clientId y /lender-dashboard/:clientId, el hub
 * P2P lleva el clientId en la URL para que la ruta sea compartible y sobreviva
 * un refresh, en vez de depender solo del UserContext. Si todavía no hay
 * clientId (sesión sin cliente), cae a /p2p-lending, que resuelve la identidad
 * desde el contexto — por eso ambas rutas siguen registradas en App.tsx.
 */
/**
 * Pestaña del hub P2P. 'offers' es el marketplace; 'proposals' es la bandeja
 * del PRESTAMISTA (ahí se aprueba/rechaza) y 'my' son las solicitudes que el
 * PRESTATARIO envió. Un prestatario nunca aprueba su propio préstamo, así que
 * quien entra desde el aviso "solicitud enviada" debe caer en 'my', no en el
 * marketplace ni en la bandeja del lender.
 */
export type P2PTab = 'offers' | 'proposals' | 'my';

/** Cartera de préstamos del usuario (prestamista o prestatario). */
export function myLoansRoute(clientId?: number | string | null): string {
  return clientId ? `/my-loans/${clientId}` : '/my-loans';
}

export function p2pLendingRoute(clientId?: number | string | null, tab?: P2PTab): string {
  const base = clientId ? `/p2p-lending/${clientId}` : '/p2p-lending';
  return tab ? `${base}?tab=${tab}` : base;
}

/**
 * Normaliza una ruta guardada (navigationRoute de una notificación) al formato
 * con clientId. Las notificaciones se emiten con '/p2p-lending' a secas —el
 * emisor no conoce el clientId del destinatario—, así que el id se completa al
 * abrirlas, con la identidad de quien las está leyendo.
 */
export function withClientId(route: string, clientId?: number | string | null): string {
  return route === '/p2p-lending' ? p2pLendingRoute(clientId) : route;
}
