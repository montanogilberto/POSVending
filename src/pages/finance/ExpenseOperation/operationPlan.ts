import type { TicketProposal } from '../../../api/expenseAgentApi';
import type { OperationDraft, OperationSummary, PlanLine, SupplierDecision } from './ExpenseOperationTypes';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Same one-peso tolerance the agents service uses for the ticket's own arithmetic. */
export const TOTAL_TOLERANCE = 1;

/** A ticket day is stored as that day's noon in Hermosillo (UTC-7, no DST). */
export const hermosilloNoonUtc = (day: string) => `${day}T19:00:00.000Z`;

/**
 * Turns the agents service's proposal into the editable operation. The decision
 * of what to use / create / ask is made THERE (LoanAgents_SmartLoans
 * agents/ticket_extraction/proposal.py); this only mirrors it so the person can
 * review and edit. Nothing is ever decided here.
 */
export const buildDraft = (proposal: TicketProposal): OperationDraft => {
  const { supplier: s } = proposal;
  let supplier: SupplierDecision = { mode: 'none' };
  if (s.action === 'use' && s.supplierId) supplier = { mode: 'existing', supplierId: s.supplierId, name: s.name };
  else if (s.action === 'create') supplier = { mode: 'new', name: s.name };

  const lines: PlanLine[] = proposal.lines.map(l => ({
    index: l.index,
    ticketName: l.ticketName,
    quantity: l.quantity,
    unitCost: l.unitCost,
    decision: l.action === 'use' && l.productId ? { mode: 'existing', productId: l.productId, name: l.name }
      : l.action === 'create' ? { mode: 'new', name: l.name }
      : { mode: 'none' },
    candidates: l.candidates,
    needsReview: l.needsReview,
  }));

  return {
    supplier,
    supplierCandidates: s.candidates,
    merchantName: s.name,
    lines,
    paymentMethod: proposal.paymentMethod,
    paymentDate: proposal.paymentDate,
    ticketTotal: proposal.ticketTotal,
  };
};

export const lineAmount = (line: PlanLine) => round2(line.quantity * line.unitCost);

/** Lines that will actually be saved (everything except skipped ones). */
export const keptLines = (draft: OperationDraft) => draft.lines.filter(l => l.decision.mode !== 'skip');

export const linesTotal = (draft: OperationDraft) =>
  round2(keptLines(draft).reduce((sum, l) => sum + lineAmount(l), 0));

/** null when the ticket's total could not be read, so there is nothing to compare against. */
export const totalDifference = (draft: OperationDraft): number | null =>
  draft.ticketTotal > 0 ? round2(linesTotal(draft) - draft.ticketTotal) : null;

export const totalsAgree = (draft: OperationDraft) => {
  const diff = totalDifference(draft);
  return diff === null || Math.abs(diff) <= TOTAL_TOLERANCE;
};

/** Spanish reasons the operation can't be confirmed yet; empty when it can. */
export const missingItems = (draft: OperationDraft): string[] => {
  const missing: string[] = [];
  if (draft.supplier.mode === 'none') missing.push('proveedor');
  if (draft.supplier.mode === 'new' && !draft.supplier.name.trim()) missing.push('nombre del proveedor');

  const kept = keptLines(draft);
  if (kept.length === 0) {
    missing.push('al menos un producto');
  } else {
    const undecided = kept.filter(l => l.decision.mode === 'none').length;
    if (undecided > 0) missing.push(undecided === 1 ? '1 producto por definir' : `${undecided} productos por definir`);
    const blankNew = kept.filter(l => l.decision.mode === 'new' && !l.decision.name.trim()).length;
    if (blankNew > 0) missing.push('nombre de producto nuevo');
    const badNumbers = kept.filter(l => !(l.quantity > 0) || !(l.unitCost > 0)).length;
    if (badNumbers > 0) missing.push('cantidad y costo de cada producto');
  }
  if (!draft.paymentMethod) missing.push('método de pago');
  if (!draft.paymentDate) missing.push('fecha');
  return missing;
};

export const summarize = (draft: OperationDraft): OperationSummary => {
  const kept = keptLines(draft);
  return {
    newSupplier: draft.supplier.mode === 'new',
    supplierName: draft.supplier.mode === 'none' ? '' : draft.supplier.name,
    newProducts: kept.flatMap(l => (l.decision.mode === 'new' ? [l.decision.name] : [])),
    existingProducts: kept.filter(l => l.decision.mode === 'existing').length,
    skippedLines: draft.lines.length - kept.length,
    savedLines: kept.length,
    units: kept.reduce((sum, l) => sum + l.quantity, 0),
    total: linesTotal(draft),
  };
};

const FIELD_LABELS: Record<string, string> = {
  merchantName: 'proveedor',
  merchantRfc: 'RFC',
  ticketNumber: 'folio',
  ticketDate: 'fecha',
  subtotal: 'subtotal',
  tax: 'IVA',
  total: 'total',
  paymentType: 'método de pago',
  cardLast4: 'últimos 4 dígitos de la tarjeta',
};

/** The agent names unreadable fields in code; show the cashier Spanish words instead. */
export const humanizeNote = (note: string): string =>
  note.replace(/\b(merchantName|merchantRfc|ticketNumber|ticketDate|subtotal|tax|total|paymentType|cardLast4)\b/g, m => FIELD_LABELS[m]);
