import { describe, it, expect } from 'vitest';
import type { MatchCandidate, ProposalLine, TicketProposal } from '../../../api/expenseAgentApi';
import { buildDraft, categoryChoiceLabel, categoryForType, defaultParent, hermosilloNoonUtc, humanizeNote, linePieces, linesTotal, missingItems, savedLine, summarize, totalDifference, totalsAgree } from './operationPlan';

// What the agents service (LoanAgents_SmartLoans proposal.py) returns; the decisions
// themselves are tested THERE. These tests cover mirroring + editing the proposal.
const line = (over: Partial<ProposalLine> = {}): ProposalLine => ({
  index: 0, ticketName: 'Suavizante Suavitel 8.5 L', code: '', quantity: 2, unitCost: 214.98, lineTotal: 429.96,
  action: 'create', productId: null, name: 'Suavizante Suavitel 8.5 L', candidates: [], needsReview: false, ...over,
});

const proposal = (over: Partial<TicketProposal> = {}): TicketProposal => ({
  supplier: { action: 'create', supplierId: null, name: "Sam's Club", candidates: [] },
  lines: [
    line({ index: 0, ticketName: 'Detergente Ariel 8.5 L', quantity: 1, unitCost: 339.99, lineTotal: 339.99, action: 'use', productId: 10, name: 'Detergente Líquido Ariel' }),
    line({ index: 1, ticketName: "Jabón Member's Mark 5 L", quantity: 1, unitCost: 166, lineTotal: 166, name: "Jabón Member's Mark 5 L" }),
    line({ index: 2 }),
  ],
  paymentMethod: 'Tarjeta', paymentDate: '2026-10-02', ticketTotal: 935.95,
  ...over,
});

describe('buildDraft', () => {
  it('mirrors a create supplier as new and a use line as an existing product', () => {
    const d = buildDraft(proposal());
    expect(d.supplier).toEqual({ mode: 'new', name: "Sam's Club" });
    expect(d.lines[0].decision).toEqual({ mode: 'existing', productId: 10, name: 'Detergente Líquido Ariel' });
    expect(d.lines[1].decision).toEqual({ mode: 'new', name: "Jabón Member's Mark 5 L", code: '', netContent: 0, unitOfMeasure: '' });
  });

  it('carries the promotion with a unit cost that is already net', () => {
    const d = buildDraft(proposal({ lines: [line({ quantity: 1, unitCost: 304.85, lineTotal: 304.85, discount: 42.97 })] }));
    expect(d.lines[0]).toMatchObject({ unitCost: 304.85, discount: 42.97 });
    expect(buildDraft(proposal()).lines[0].discount).toBe(0);
  });

  it('keeps the ticket item code apart from the new product name', () => {
    const d = buildDraft(proposal({ lines: [line({ ticketName: '981055673 AXION ROSAS', code: '981055673', name: 'AXION ROSAS' })] }));
    expect(d.lines[0].decision).toEqual({ mode: 'new', name: 'AXION ROSAS', code: '981055673', netContent: 0, unitOfMeasure: '' });
  });

  it('defaults a matched line to the ticket description without the code', () => {
    const d = buildDraft(proposal({ lines: [line({ ticketName: '84281 SUAVITEL', code: '84281', action: 'use', productId: 12, name: 'Suavitel Fresca Primavera' })] }));
    expect(d.lines[0]).toMatchObject({ code: '84281', name: 'SUAVITEL' });
  });

  it('mirrors an existing supplier', () => {
    expect(buildDraft(proposal({ supplier: { action: 'use', supplierId: 7, name: 'SAMS CLUB MEXICO', candidates: [] } })).supplier)
      .toEqual({ mode: 'existing', supplierId: 7, name: 'SAMS CLUB MEXICO' });
  });

  it('leaves "choose" undecided and keeps the candidates for the person', () => {
    const cand: MatchCandidate[] = [{ id: 1, name: 'A', score: 0.8 }, { id: 2, name: 'B', score: 0.79 }];
    const d = buildDraft(proposal({
      supplier: { action: 'choose', supplierId: null, name: '', candidates: cand },
      lines: [line({ action: 'choose', candidates: cand })],
    }));
    expect(d.supplier).toEqual({ mode: 'none' });
    expect(d.supplierCandidates).toEqual(cand);
    expect(d.lines[0].decision).toEqual({ mode: 'none' });
  });

  it('takes quantity and unit cost exactly as the agents service computed them', () => {
    expect(buildDraft(proposal()).lines[2]).toMatchObject({ quantity: 2, unitCost: 214.98 });
  });

  it('keeps blank payment method / date so they show up as missing', () => {
    const d = buildDraft(proposal({ paymentMethod: '', paymentDate: '' }));
    expect(d.paymentMethod).toBe('');
    expect(missingItems(d)).toEqual(expect.arrayContaining(['método de pago', 'fecha']));
  });
});

describe('hermosilloNoonUtc', () => {
  it('stores the ticket day as noon in Hermosillo (UTC-7)', () => {
    expect(hermosilloNoonUtc('2026-10-02')).toBe('2026-10-02T19:00:00.000Z');
  });
});

describe('totals', () => {
  it('sums quantity × unit cost and agrees with the ticket within a peso', () => {
    const d = buildDraft(proposal());
    expect(linesTotal(d)).toBe(935.95);
    expect(totalDifference(d)).toBe(0);
    expect(totalsAgree(d)).toBe(true);
  });

  it('flags a real mismatch and ignores skipped lines in the total', () => {
    const d = buildDraft(proposal());
    d.lines[1].decision = { mode: 'skip' };
    expect(linesTotal(d)).toBe(769.95);
    expect(totalDifference(d)).toBe(-166);
    expect(totalsAgree(d)).toBe(false);
  });

  it('has nothing to compare when the ticket total was not read', () => {
    const d = buildDraft(proposal({ ticketTotal: 0 }));
    expect(totalDifference(d)).toBeNull();
    expect(totalsAgree(d)).toBe(true);
  });
});

describe('missingItems', () => {
  it('is empty for a fully proposed operation', () => {
    expect(missingItems(buildDraft(proposal()))).toEqual([]);
  });

  it('asks for a supplier, undecided products and bad numbers', () => {
    const d = buildDraft(proposal({ supplier: { action: 'choose', supplierId: null, name: '', candidates: [] } }));
    d.lines[0].decision = { mode: 'none' };
    d.lines[1].unitCost = 0;
    expect(missingItems(d)).toEqual(['proveedor', '1 producto por definir', 'cantidad y costo de cada producto']);
  });

  it('needs at least one kept line', () => {
    const d = buildDraft(proposal());
    d.lines.forEach(l => { l.decision = { mode: 'skip' }; });
    expect(missingItems(d)).toContain('al menos un producto');
  });
});

describe('summarize', () => {
  it('counts what will be created vs reused', () => {
    const s = summarize(buildDraft(proposal()));
    expect(s).toMatchObject({
      newSupplier: true, supplierName: "Sam's Club", existingProducts: 1, skippedLines: 0, savedLines: 3, units: 4, total: 935.95,
    });
    expect(s.newProducts).toEqual(["Jabón Member's Mark 5 L", 'Suavizante Suavitel 8.5 L']);
  });
});

describe('humanizeNote', () => {
  it('replaces the agent\'s field names with Spanish words', () => {
    expect(humanizeNote('No se pudo leer: merchantName, merchantRfc, ticketNumber, ticketDate, subtotal, tax.'))
      .toBe('No se pudo leer: proveedor, RFC, folio, fecha, subtotal, IVA.');
  });
  it('leaves ordinary sentences untouched', () => {
    expect(humanizeNote('El ticket parece estar recortado.')).toBe('El ticket parece estar recortado.');
  });
});

describe('desglose: packs → pieces', () => {
  const water = () => buildDraft(proposal({
    lines: [line({ ticketName: '981017658 45/500ML AGU', code: '981017658', name: '45/500ML AGU', quantity: 1,
      unitCost: 122.76, lineTotal: 122.76, unitsPerPack: 45, netContent: 500, unitOfMeasure: 'ml' })],
    ticketTotal: 122.76,
  }));

  it('carries the breakdown the agents service read off the ticket', () => {
    const l = water().lines[0];
    expect(l).toMatchObject({ unitsPerPack: 45, netContent: 500, unitOfMeasure: 'ml' });
    expect(l.decision).toEqual({ mode: 'new', name: '45/500ML AGU', code: '981017658', netContent: 500, unitOfMeasure: 'ml' });
  });

  it('saves pieces at the cost of one piece, and keeps the ticket total', () => {
    const d = water();
    expect(linePieces(d.lines[0])).toBe(45);
    expect(savedLine(d.lines[0])).toEqual({ quantity: 45, unitCost: 2.73 });
    expect(linesTotal(d)).toBe(122.76);
    expect(totalsAgree(d)).toBe(true);
    expect(summarize(d).units).toBe(45);
  });

  it('multiplies packs by pieces per pack', () => {
    const d = water();
    const l = { ...d.lines[0], quantity: 2, unitCost: 122.76 };
    expect(savedLine(l)).toEqual({ quantity: 90, unitCost: 2.73 });
  });

  it('defaults to one piece per unit when the ticket says nothing (older agents builds too)', () => {
    const l = buildDraft(proposal()).lines[2];
    expect(l).toMatchObject({ unitsPerPack: 1, netContent: 0, unitOfMeasure: '' });
    expect(savedLine(l)).toEqual({ quantity: 2, unitCost: 214.98 });
  });
});

describe('categoría › subcategoría of a new product', () => {
  // Live company 1: two top-level categories, no subcategories yet.
  const cats = [
    { categoryId: 1002, name: 'Servicios', parentCategoryId: null },
    { categoryId: 1004, name: 'Productos', parentCategoryId: null },
  ];
  const withDetergente = [...cats, { categoryId: 2001, name: 'Detergente', parentCategoryId: 1004 }];

  it('defaults to the top-level "Productos"', () => {
    expect(defaultParent(cats)?.categoryId).toBe(1004);
    expect(categoryChoiceLabel(undefined, cats)).toBe('Productos');
  });

  it('files a web type under its existing subcategory, ignoring case and accents', () => {
    expect(categoryForType('detergente', withDetergente)).toEqual({ mode: 'existing', categoryId: 2001 });
    expect(categoryChoiceLabel({ mode: 'existing', categoryId: 2001 }, withDetergente)).toBe('Productos › Detergente');
  });

  it('proposes a NEW subcategory under Productos when the type does not exist', () => {
    expect(categoryForType('Suavizante', cats)).toEqual({ mode: 'new', parentId: 1004, name: 'Suavizante' });
    expect(categoryChoiceLabel({ mode: 'new', parentId: 1004, name: 'Suavizante' }, cats)).toBe('Productos › Suavizante');
    expect(categoryForType('', cats)).toBeUndefined();
  });

  it('asks for the name of a new subcategory before confirming', () => {
    const d = buildDraft(proposal());
    d.lines = d.lines.map(l => (l.decision.mode === 'new'
      ? { ...l, decision: { ...l.decision, category: { mode: 'new' as const, parentId: 1004, name: ' ' } } } : l));
    expect(missingItems(d)).toContain('nombre de la subcategoría nueva');
  });
});
