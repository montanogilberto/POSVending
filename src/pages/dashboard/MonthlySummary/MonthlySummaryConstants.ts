import type { PaymentMethodLabel } from '../../../utils/incomeMoney';

// Monedero = machine use paid from prepaid balance: income, but no cash enters the drawer.
export const PAYMENT_METHODS: PaymentMethodLabel[] = ['Efectivo', 'Transferencia', 'Tarjeta', 'Monedero'];
// Expenses are never paid from a client's prepaid balance.
export const EXPENSE_PAYMENT_METHODS: PaymentMethodLabel[] = ['Efectivo', 'Transferencia', 'Tarjeta'];

export const PAYMENT_COLORS: Record<PaymentMethodLabel, string> = {
  Efectivo: '#16A34A',
  Transferencia: '#22C55E',
  Tarjeta: '#86EFAC',
  Monedero: '#0EA5E9',
};

// PAGOS (expenses) uses the expense red of the Egresos trends chart.
export const EXPENSE_PAYMENT_COLORS: Record<PaymentMethodLabel, string> = {
  Efectivo: '#DC2626',
  Transferencia: '#F87171',
  Tarjeta: '#FCA5A5',
  Monedero: '#FECACA',
};
