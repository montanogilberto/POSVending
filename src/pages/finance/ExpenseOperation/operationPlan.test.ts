import { describe, it, expect } from 'vitest';
import type { MatchCandidate, ProposalLine, TicketProposal } from '../../../api/expenseAgentApi';
import { buildDraft, hermosilloNoonUtc, humanizeNote, linesTotal, missingItems, summarize, totalDifference, totalsAgree } from './operationPlan';

// What the agents service (LoanAgents_SmartLoans proposal.py) returns; the decisions
// themselves are tested THERE. These tests cover mirroring + editing the proposal.
const line = (over: Partial<ProposalLine> = {}): ProposalLine => ({
  index: 0, ticketName: 'Suavizante Suavitel 8.5 L', quantity: 2, unitCost: 214.98, lineTotal: 429.96,
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
    expect(d.lines[1].decision).toEqual({ mode: 'new', name: "Jabón Member's Mark 5 L" });
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
