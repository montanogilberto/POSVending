import type { TicketProposal } from '../../../api/expenseAgentApi';
import type { ProductCategoryItem } from '../../../hooks/useProductCategories';
import type { CategoryChoice, OperationDraft, OperationSummary, PlanLine, SupplierDecision } from './ExpenseOperationTypes';

const round2 = (n: number) => Math.round(n * 100) / 100;

const stripCode = (text: string, code: string) =>
  code && text.startsWith(`${code} `) ? text.slice(code.length).trim() : text;

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
    code: l.code ?? '',
    // l.name is the matched product's name on a 'use' line; the ticket's own
    // description is ticketName minus the code.
    name: l.action === 'use' ? stripCode(l.ticketName, l.code ?? '') : l.name,
    quantity: l.quantity,
    unitCost: l.unitCost,
    unitsPerPack: l.unitsPerPack && l.unitsPerPack > 0 ? l.unitsPerPack : 1,
    netContent: l.netContent ?? 0,
    unitOfMeasure: l.unitOfMeasure ?? '',
    discount: l.discount ?? 0,
    decision: l.action === 'use' && l.productId ? { mode: 'existing', productId: l.productId, name: l.name }
      : l.action === 'create'
        ? { mode: 'new', name: l.name, code: l.code ?? '', netContent: l.netContent ?? 0, unitOfMeasure: l.unitOfMeasure ?? '' }
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

/** Pieces that enter the inventory: 1 pack of 45 → 45. */
export const linePieces = (line: PlanLine) => line.quantity * Math.max(line.unitsPerPack || 1, 1);

/**
 * What is saved on the egreso for this line: the stock in PIECES and the cost of
 * one piece. The egreso's total is still the sum of lineAmount (pack prices, what
 * the ticket charged); the piece cost is rounded to cents because
 * expenseDetails.unitCost is DECIMAL(18,2).
 */
export const savedLine = (line: PlanLine) => {
  const pieces = linePieces(line);
  return { quantity: pieces, unitCost: pieces > 0 ? round2(lineAmount(line) / pieces) : 0 };
};

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
    const blankSub = kept.filter(l => l.decision.mode === 'new' && l.decision.category?.mode === 'new' && !l.decision.category.name.trim()).length;
    if (blankSub > 0) missing.push('nombre de la subcategoría nueva');
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
    units: kept.reduce((sum, l) => sum + linePieces(l), 0),
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

// ── Category › subcategory of a new product ──────────────────────────────────

const fold = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

/** Where products bought on a ticket go by default: the top-level "Productos", else the first top-level category. */
export const defaultParent = (categories: ProductCategoryItem[]): ProductCategoryItem | undefined => {
  const tops = categories.filter(c => !c.parentCategoryId);
  return tops.find(c => fold(c.name) === 'productos') ?? tops[0];
};

/** "Productos › Detergente" for a subcategory, the plain name for a top-level one. */
export const categoryLabel = (category: ProductCategoryItem, categories: ProductCategoryItem[]) => {
  const parent = category.parentCategoryId ? categories.find(c => c.categoryId === category.parentCategoryId) : undefined;
  return parent ? `${parent.name} › ${category.name}` : category.name;
};

/**
 * The web search's product type ("Detergente") → where to file the product: the
 * existing subcategory of that name under the default parent, any category of
 * that name, or a NEW subcategory under the default parent. undefined when there
 * is no type or no category at all.
 */
export const categoryForType = (type: string, categories: ProductCategoryItem[]): CategoryChoice | undefined => {
  const wanted = fold(type);
  const parent = defaultParent(categories);
  if (!wanted || !parent) return undefined;
  const same = categories.filter(c => fold(c.name) === wanted);
  const found = same.find(c => c.parentCategoryId === parent.categoryId) ?? same[0];
  if (found) return { mode: 'existing', categoryId: found.categoryId };
  return { mode: 'new', parentId: parent.categoryId, name: type.trim() };
};

/** A category the person picked, or the default one, as the label the line shows. */
export const categoryChoiceLabel = (choice: CategoryChoice | undefined, categories: ProductCategoryItem[]) => {
  if (choice?.mode === 'new') {
    const parent = categories.find(c => c.categoryId === choice.parentId);
    return `${parent ? `${parent.name} › ` : ''}${choice.name || '(sin nombre)'}`;
  }
  const category = choice ? categories.find(c => c.categoryId === choice.categoryId) : defaultParent(categories);
  return category ? categoryLabel(category, categories) : '';
};
