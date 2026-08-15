import {
  checkmarkCircleOutline, ellipseOutline, alertCircleOutline,
  arrowDownOutline, arrowUpOutline,
} from 'ionicons/icons';
import { LedgerEntry } from '../../../api/bankingApi';

export const toDate = (utc: string | undefined) => {
  if (!utc) return '—';
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

// Status compare is case-insensitive: the P2P accept flow writes 'active'
// (lowercase) while the legacy CRUD wrote 'Active' — both must match.
export const normStatus = (s?: string) => (s ?? '').toLowerCase();

export const statusColor = (s: string) => ({
  active: '#15803d', pending: '#b45309', closed: '#2563eb',
  paidoff: '#2563eb', rejected: '#dc2626',
}[normStatus(s)] ?? '#6b7280');

export const statusLabel = (s: string) => ({
  active: 'Activo', pending: 'Pendiente', closed: 'Cerrado',
  paidoff: 'Pagado', rejected: 'Rechazado',
}[normStatus(s)] ?? s);

export const statusIcon = (s: string) =>
  normStatus(s) === 'active' ? checkmarkCircleOutline
  : normStatus(s) === 'pending' ? ellipseOutline
  : alertCircleOutline;

export const activityIcon = (e: LedgerEntry) => (e.direction === 'C' ? arrowDownOutline : arrowUpOutline);

// SmartLoans es conector, no custodio — estas etiquetas describen actividad
// de capital/préstamo (ver [[non-custodial-pivot]]), nunca un balance de
// wallet. Los CAPITAL_* solo aparecen aquí como historial de eventos de
// declaración; no representan dinero movido por SmartLoans.
export const activityLabel = (e: LedgerEntry) => ({
  DEPOSIT: 'Depósito SPEI', LOAN_FUNDING: 'Préstamo fondeado',
  REPAYMENT_PRINCIPAL: 'Capital recuperado', REPAYMENT_INTEREST: 'Interés ganado',
  WITHDRAWAL: 'Retiro a banco', REVERSAL: 'Reversa', LOAN_REPAYMENT: 'Pago de cuota',
  DISBURSEMENT_RECEIVED: 'Desembolso recibido',
  CAPITAL_DECLARED: 'Capital declarado', CAPITAL_COMMITTED: 'Capital comprometido',
  CAPITAL_UNDECLARED: 'Capital liberado', RESERVE: 'Capital reservado',
  RELEASE: 'Capital liberado', REFUND: 'Reembolso',
}[e.entryType] ?? e.entryType);
