import { describe, it, expect } from 'vitest';
import { buildTicketDraft, lineToItem, lineUnitCost, mergeItems } from './ticketDraft';
import type { RecordMatch, TicketExtraction, TicketLine } from '../../api/expenseAgentApi';

const match = (status: RecordMatch['status'], id: number | null = null, name = ''): RecordMatch =>
  ({ status, id, name, score: 0.9, candidates: [] });

const line = (over: Partial<TicketLine> = {}): TicketLine => ({
  name: 'Detergente Ariel 8.5 L', quantity: 1, unitPrice: 0, lineTotal: 339.99, needsReview: false,
  productMatch: match('MATCHED', 10, 'Detergente Líquido Ariel RevitaColor 8.5 L'), ...over,
});

const ticket = (over: Partial<TicketExtraction> = {}): TicketExtraction => ({
  isPurchaseTicket: true, confidence: 0.9, merchantName: "Sam's Club", ticketDate: '2026-10-01',
  subtotal: 0, tax: 0, total: 935.95, paymentMethod: 'Tarjeta', paymentTypeRaw: 'VISA',
  supplierMatch: match('MATCHED', 1, 'SAMS CLUB MEXICO'), lineItems: [line()],
  unreadableFields: [], notes: [], itemsTotal: 339.99, totalMatchesItems: true, issues: [], needsReview: false,
  ...over,
});

describe('lineUnitCost', () => {
  it('prefers the printed unit price', () => {
    expect(lineUnitCost(line({ quantity: 2, unitPrice: 214.98, lineTotal: 429.96 }))).toBe(214.98);
  });
  it('derives it from the line total when no unit price is printed', () => {
    expect(lineUnitCost(line({ quantity: 2, unitPrice: 0, lineTotal: 429.96 }))).toBe(214.98);
    expect(lineUnitCost(line({ quantity: 3, unitPrice: 0, lineTotal: 100 }))).toBe(33.33);
  });
  it('does not divide by a zero quantity', () => {
    expect(lineUnitCost(line({ quantity: 0, unitPrice: 0, lineTotal: 50 }))).toBe(50);
  });
});

describe('buildTicketDraft', () => {
  it('fills supplier, date, payment method and matched items for an inventory egreso', () => {
    const d = buildTicketDraft(ticket({
      lineItems: [line(), line({ name: 'Suavizante', quantity: 2, lineTotal: 429.96, productMatch: match('MATCHED', 12, 'Suavizante Suavitel 8.5 L') })],
    }), 'inventory');
    expect(d.supplierId).toBe(1);
    expect(d.paymentMethod).toBe('Tarjeta');
    expect(d.paymentDate).toBe('2026-10-01');
    expect(d.items).toEqual([
      { productId: 10, name: 'Detergente Líquido Ariel RevitaColor 8.5 L', quantity: 1, unitCost: 339.99 },
      { productId: 12, name: 'Suavizante Suavitel 8.5 L', quantity: 2, unitCost: 214.98 },
    ]);
    expect(d.pendingLines).toEqual([]);
    expect(d.total).toBeUndefined();
  });

  it('leaves ambiguous and new products, and an ambiguous supplier, for the user', () => {
    const d = buildTicketDraft(ticket({
      supplierMatch: match('AMBIGUOUS'),
      lineItems: [line(), line({ productMatch: match('AMBIGUOUS') }), line({ productMatch: match('NEW') })],
    }), 'inventory');
    expect(d.supplierId).toBeUndefined();
    expect(d.items).toHaveLength(1);
    expect(d.pendingLines).toEqual([1, 2]);
  });

  it('never clears the form with blank agent values', () => {
    const d = buildTicketDraft(ticket({ paymentMethod: '', ticketDate: '' }), 'inventory');
    expect('paymentMethod' in d).toBe(false);
    expect('paymentDate' in d).toBe(false);
  });

  it('uses the ticket total for a general (servicios) egreso and ignores suppliers/products', () => {
    const d = buildTicketDraft(ticket(), 'general');
    expect(d.total).toBe(935.95);
    expect(d.supplierId).toBeUndefined();
    expect(d.items).toEqual([]);
  });

  it('applies only date and payment method to payroll', () => {
    const d = buildTicketDraft(ticket(), 'payroll');
    expect(d).toEqual({ items: [], pendingLines: [], paymentMethod: 'Tarjeta', paymentDate: '2026-10-01' });
  });

  it('applies nothing when the image is not a purchase ticket', () => {
    expect(buildTicketDraft(ticket({ isPurchaseTicket: false }), 'inventory'))
      .toEqual({ items: [], pendingLines: [] });
  });
});

describe('mergeItems', () => {
  it('keeps what the user already entered for a product', () => {
    const mine = { productId: 10, name: 'x', quantity: 5, unitCost: 1 };
    const merged = mergeItems([mine], [lineToItem(line(), 10, 'x'), lineToItem(line(), 12, 'y')]);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toBe(mine);
  });
});
