import { describe, it, expect } from 'vitest';
import {
  normalizePaymentMethod,
  terminalCommission,
  activeCardTerminal,
  incomeCommission,
  incomeNet,
} from './incomeMoney';
import { CommissionTerminal } from '../api/commissionTerminalsApi';

const mercadoPago: CommissionTerminal = {
  commissionTerminalId: 1,
  provider: 'mercadopago',
  terminalName: 'Terminal Mercado Pago',
  paymentMethod: 'tarjeta',
  country: 'MX',
  commissionRatePct: 4.2,
  fixedFeeAmount: null,
  currency: 'MXN',
  isActive: true,
  validFrom: '2026-02-28T16:12:14.527',
  createdAt: '2026-02-28T16:12:14.527',
};

describe('normalizePaymentMethod', () => {
  it('maps every spelling stored in dbo.income', () => {
    expect(normalizePaymentMethod('efectivo')).toBe('Efectivo');
    expect(normalizePaymentMethod('Tarjeta')).toBe('Tarjeta');
    expect(normalizePaymentMethod('terminal')).toBe('Tarjeta');
    expect(normalizePaymentMethod('transferencia')).toBe('Transferencia');
  });

  it("counts the cart's 'transferir' as a transfer (was silently dropped)", () => {
    expect(normalizePaymentMethod('transferir')).toBe('Transferencia');
  });

  it('returns null for unknown or empty', () => {
    expect(normalizePaymentMethod('')).toBeNull();
    expect(normalizePaymentMethod(undefined)).toBeNull();
    expect(normalizePaymentMethod('bitcoin')).toBeNull();
  });
});

describe('terminalCommission (mirrors sp_income_applyCommission)', () => {
  it('4.2% of a $250 sale', () => {
    expect(terminalCommission(250, mercadoPago)).toBe(10.5);
  });

  it("September 2026's card total: $11,230 -> $471.66", () => {
    expect(terminalCommission(11230, mercadoPago)).toBe(471.66);
  });

  it('adds the fixed fee when the terminal has one', () => {
    expect(terminalCommission(100, { commissionRatePct: 3.5, fixedFeeAmount: 3 })).toBe(6.5);
  });

  it('is 0 without a terminal or amount', () => {
    expect(terminalCommission(100, null)).toBe(0);
    expect(terminalCommission(0, mercadoPago)).toBe(0);
  });
});

describe('activeCardTerminal', () => {
  it('picks the lowest-id active card terminal, like the backend', () => {
    const later = { ...mercadoPago, commissionTerminalId: 7, commissionRatePct: 3 };
    const inactive = { ...mercadoPago, commissionTerminalId: 0, isActive: false };
    const cash = { ...mercadoPago, commissionTerminalId: 2, paymentMethod: 'efectivo' };
    expect(activeCardTerminal([later, inactive, cash, mercadoPago])?.commissionTerminalId).toBe(1);
    expect(activeCardTerminal([inactive, cash])).toBeNull();
  });
});

describe('incomeCommission / incomeNet', () => {
  it('uses the stamped amount — history never re-prices', () => {
    // sold at an old 3.6% rate; catalog now says 4.2%
    const sale = { total: 250, paymentMethod: 'tarjeta', commissionRatePct: 3.6, commissionAmount: 9 };
    expect(incomeCommission(sale, mercadoPago)).toBe(9);
    expect(incomeNet(sale, mercadoPago)).toBe(241);
  });

  it('estimates an unstamped card sale from the catalog', () => {
    const sale = { total: 250, paymentMethod: 'tarjeta', commissionAmount: 0 };
    expect(incomeCommission(sale, mercadoPago)).toBe(10.5);
  });

  it('cash and transfer have no commission', () => {
    expect(incomeCommission({ total: 250, paymentMethod: 'efectivo' }, mercadoPago)).toBe(0);
    expect(incomeNet({ total: 980, paymentMethod: 'transferir' }, mercadoPago)).toBe(980);
  });
});
