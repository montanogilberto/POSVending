// Income money rules shared by /dashboard and /cart — one place, so the two
// screens can never disagree about what a sale is worth.
//
// Card-terminal commission: the business absorbs it (the customer pays the
// sale total), so it is a cost deducted from income, never a surcharge.
// The backend stamps it on every card sale at insert time
// (dbo.income.commissionRatePct / commissionAmount, via
// sp_income_applyCommission) — the stored amount is the source of truth.
// terminalCommission() mirrors that SP's formula exactly, for previews (cart)
// and for a card sale the backend has not stamped yet.

import { CommissionTerminal } from '../api/commissionTerminalsApi';

export type PaymentMethodLabel = 'Efectivo' | 'Tarjeta' | 'Transferencia';

// Every spelling that reaches dbo.income.paymentMethod. The cart saves
// 'transferir' (its button label, lowercased) — before this map it was
// silently dropped from the COBROS breakdown.
const PAYMENT_METHOD_MAP: Record<string, PaymentMethodLabel> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  terminal: 'Tarjeta',
  transferencia: 'Transferencia',
  transferir: 'Transferencia',
};

export const normalizePaymentMethod = (method?: string | null): PaymentMethodLabel | null =>
  PAYMENT_METHOD_MAP[(method ?? '').trim().toLowerCase()] ?? null;

export const isCardPayment = (method?: string | null) => normalizePaymentMethod(method) === 'Tarjeta';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Same formula as sp_income_applyCommission: ROUND(total * rate / 100, 2) + fixed fee. */
export const terminalCommission = (
  amount: number,
  terminal?: Pick<CommissionTerminal, 'commissionRatePct' | 'fixedFeeAmount'> | null
): number => {
  if (!terminal || !(amount > 0)) return 0;
  return round2((amount * Number(terminal.commissionRatePct || 0)) / 100) + Number(terminal.fixedFeeAmount || 0);
};

/** The active catalog terminal a card sale is charged on (the backend picks the same one). */
export const activeCardTerminal = (terminals: CommissionTerminal[]): CommissionTerminal | null =>
  [...terminals]
    .filter((t) => t.isActive && (t.paymentMethod ?? '').toLowerCase() === 'tarjeta')
    .sort((a, b) => a.commissionTerminalId - b.commissionTerminalId)[0] ?? null;

export interface IncomeMoneyFields {
  total: number;
  paymentMethod: string;
  commissionAmount?: number | null;
  commissionRatePct?: number | null;
}

/** Commission of one sale: the stamped amount; estimated only if the backend has not stamped it. */
export const incomeCommission = (income: IncomeMoneyFields, fallbackTerminal?: CommissionTerminal | null): number => {
  if (!isCardPayment(income.paymentMethod)) return 0;
  if (income.commissionRatePct != null) return Number(income.commissionAmount) || 0;
  return terminalCommission(Number(income.total) || 0, fallbackTerminal);
};

/** What actually reaches the bank for one sale. `total` is already post-discount. */
export const incomeNet = (income: IncomeMoneyFields, fallbackTerminal?: CommissionTerminal | null): number =>
  (Number(income.total) || 0) - incomeCommission(income, fallbackTerminal);
