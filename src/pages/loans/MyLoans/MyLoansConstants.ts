/**
 * Constantes de "Mis préstamos" — filtros y clasificación de estados.
 * Las etiquetas/colores de cada estado NO viven aquí: son las compartidas de
 * components/ui/statusMaps.ts (LOAN_STATUS), para que un préstamo "Activo" se
 * vea igual en esta lista, en el dashboard y en el detalle.
 */

export type LoanFilter = 'all' | 'active' | 'closed';

export const LOAN_FILTERS: { key: LoanFilter; label: string }[] = [
  { key: 'all',    label: 'Todos'   },
  { key: 'active', label: 'Activos' },
  { key: 'closed', label: 'Cerrados' },
];

/**
 * Un préstamo está CERRADO cuando ya no debe dinero: pagado, cerrado o
 * cancelado. Todo lo demás (incluido pending_funding, que espera el SPEI del
 * prestamista) sigue siendo cartera viva y cuenta en los totales.
 */
const CLOSED_STATUSES = ['paidoff', 'paid_off', 'closed', 'cancelled', 'canceled'];

export const isClosedLoan = (status?: string): boolean =>
  CLOSED_STATUSES.includes((status ?? '').toLowerCase());

/** Estados que piden atención — se marcan en la tarjeta. */
const ATTENTION_STATUSES = ['pending_funding', 'overdue', 'defaulted', 'pending'];

export const needsAttention = (status?: string): boolean =>
  ATTENTION_STATUSES.includes((status ?? '').toLowerCase());
