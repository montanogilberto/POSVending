import type { ExpenseType } from '../../api/expensesApi';
import type { TicketExtraction, TicketLine } from '../../api/expenseAgentApi';
import type { ExpenseItem } from './expenseItems';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Purchase cost PER UNIT for a ticket line: the printed unit price when there is one, else lineTotal ÷ quantity. */
export const lineUnitCost = (line: TicketLine): number => {
  if (line.unitPrice > 0) return round2(line.unitPrice);
  return round2(line.quantity > 0 ? line.lineTotal / line.quantity : line.lineTotal);
};

export const lineToItem = (line: TicketLine, productId: number, name: string): ExpenseItem => ({
  productId,
  name,
  quantity: line.quantity > 0 ? line.quantity : 1,
  unitCost: lineUnitCost(line),
});

/** Adds `added` to `existing`, skipping products the user already has on the egreso (their numbers win). */
export const mergeItems = (existing: ExpenseItem[], added: ExpenseItem[]): ExpenseItem[] => {
  const have = new Set(existing.map(i => i.productId));
  return [...existing, ...added.filter(i => !have.has(i.productId))];
};

export interface TicketDraft {
  supplierId?: number;
  paymentMethod?: string;
  paymentDate?: string;
  /** Only for non-inventory egresos; inventory totals are derived from the items. */
  total?: number;
  /** Lines whose product the agent matched to the catalog. */
  items: ExpenseItem[];
  /** Indexes of ticket lines still needing a product (ambiguous or new). */
  pendingLines: number[];
}

/**
 * What "Aplicar" will fill in, by expense type. Only confident values are
 * applied: a supplier/product that was ambiguous or new is left for the user,
 * and a blank date/payment method from the agent never clears the form.
 */
export const buildTicketDraft = (ticket: TicketExtraction, expenseType: ExpenseType): TicketDraft => {
  const draft: TicketDraft = { items: [], pendingLines: [] };
  if (!ticket.isPurchaseTicket) return draft;

  if (ticket.paymentMethod) draft.paymentMethod = ticket.paymentMethod;
  if (ticket.ticketDate) draft.paymentDate = ticket.ticketDate;

  if (expenseType === 'inventory') {
    const { supplierMatch } = ticket;
    if (supplierMatch.status === 'MATCHED' && supplierMatch.id) draft.supplierId = supplierMatch.id;
    ticket.lineItems.forEach((line, idx) => {
      const match = line.productMatch;
      if (match.status === 'MATCHED' && match.id) {
        draft.items.push(lineToItem(line, match.id, match.name || line.name));
      } else {
        draft.pendingLines.push(idx);
      }
    });
  } else if (expenseType === 'general' && ticket.total > 0) {
    draft.total = round2(ticket.total);
  }
  return draft;
};
