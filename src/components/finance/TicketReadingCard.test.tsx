// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import TicketReadingCard from './TicketReadingCard';
import type { RecordMatch, TicketExtraction, TicketLine } from '../../api/expenseAgentApi';

afterEach(cleanup);

const match = (status: RecordMatch['status'], id: number | null = null, name = '', candidates: RecordMatch['candidates'] = []): RecordMatch =>
  ({ status, id, name, score: 0.9, candidates });

const line = (name: string, productMatch: RecordMatch, lineTotal = 100): TicketLine =>
  ({ name, quantity: 2, unitPrice: 0, lineTotal, needsReview: false, productMatch });

const ticket = (over: Partial<TicketExtraction> = {}): TicketExtraction => ({
  isPurchaseTicket: true, confidence: 0.9, merchantName: "Sam's Club", ticketDate: '2026-10-01',
  subtotal: 0, tax: 0, total: 935.95, paymentMethod: 'Tarjeta', paymentTypeRaw: 'VISA',
  supplierMatch: match('MATCHED', 1, 'SAMS CLUB MEXICO'), lineItems: [],
  unreadableFields: [], notes: [], itemsTotal: 0, totalMatchesItems: true, issues: [], needsReview: false, ...over,
});

const handlers = () => ({
  onReview: vi.fn(), onApply: vi.fn(), onAnalyze: vi.fn(), onPickSupplier: vi.fn(), onCreateSupplier: vi.fn(),
  onPickLineProduct: vi.fn(), onCreateLineProduct: vi.fn(),
});

const renderCard = (over: Partial<React.ComponentProps<typeof TicketReadingCard>> = {}) => {
  const h = handlers();
  render(<TicketReadingCard state="done" ticket={ticket()} expenseType="inventory" applied={false}
    resolvedLines={[]} disabled={false} review={{ state: 'idle', result: null }} canReviewManually={false}
    {...h} {...over} />);
  return h;
};

describe('TicketReadingCard', () => {
  it('offers the analyze button before the agent has read anything', () => {
    const h = renderCard({ state: 'idle', ticket: null, canReviewManually: true });
    expect(screen.getByText(/El agente lee el ticket/)).toBeTruthy();
    fireEvent.click(screen.getByText('Analizar ticket con el agente'));
    expect(h.onAnalyze).toHaveBeenCalledTimes(1);
    // the manual category button would be redundant next to it
    expect(screen.queryByText('Sugerir categoría')).toBeNull();
  });

  it('disables the button and shows a spinner message while reading', () => {
    renderCard({ state: 'loading', ticket: null });
    const button = screen.getByText(/Leyendo el ticket…/).closest('ion-button');
    expect((button as (HTMLElement & { disabled?: boolean }) | null)?.disabled).toBe(true);
    expect(screen.queryByText('Analizar ticket con el agente')).toBeNull();
  });

  it('falls back to manual entry and offers a retry when the agent is unreachable', () => {
    const h = renderCard({ state: 'failed', ticket: null });
    expect(screen.getByText(/Captura los datos manualmente/)).toBeTruthy();
    fireEvent.click(screen.getByText('Reintentar'));
    expect(h.onAnalyze).toHaveBeenCalledTimes(1);
  });

  it('says so when the photo is not a purchase ticket', () => {
    renderCard({ ticket: ticket({ isPurchaseTicket: false }) });
    expect(screen.getByText(/no parece un ticket de compra/)).toBeTruthy();
  });

  it('summarises the read values and applies on request', () => {
    const h = renderCard();
    expect(screen.getByText("Sam's Club")).toBeTruthy();
    expect(screen.getByText('2026-10-01')).toBeTruthy();
    expect(screen.getByText('Tarjeta')).toBeTruthy();
    expect(screen.getByText(/Proveedor: SAMS CLUB MEXICO/)).toBeTruthy();
    fireEvent.click(screen.getByText('Aplicar al egreso'));
    expect(h.onApply).toHaveBeenCalledTimes(1);
  });

  it('replaces the apply button once applied', () => {
    renderCard({ applied: true });
    expect(screen.queryByText('Aplicar al egreso')).toBeNull();
    expect(screen.getByText('Datos aplicados al egreso')).toBeTruthy();
  });

  it('lets the user pick between ambiguous suppliers', () => {
    const h = renderCard({ ticket: ticket({ supplierMatch: match('AMBIGUOUS', null, '', [
      { id: 3, name: 'Ferretería El Tornillo', score: 0.86 }, { id: 4, name: 'Ferretería La Central', score: 0.86 }]) }) });
    fireEvent.click(screen.getByText('Ferretería La Central'));
    expect(h.onPickSupplier).toHaveBeenCalledWith(4);
  });

  it('offers to create a supplier that is new, with the merchant name', () => {
    const h = renderCard({ ticket: ticket({ supplierMatch: match('NEW') }) });
    fireEvent.click(screen.getByText('Crear proveedor'));
    expect(h.onCreateSupplier).toHaveBeenCalledWith("Sam's Club");
  });

  it('handles product lines: matched, ambiguous (pick), new (create) and resolved', () => {
    const h = renderCard({
      ticket: ticket({ lineItems: [
        line('Detergente Ariel', match('MATCHED', 10, 'Detergente Ariel 8.5 L')),
        line('Jabón de manos', match('AMBIGUOUS', null, '', [{ id: 13, name: 'Jabón líquido 5 L', score: 0.76 }])),
        line('Papel higiénico', match('NEW')),
        line('Cloro', match('NEW')),
      ] }),
      resolvedLines: [3],
    });
    expect(screen.getAllByText('En catálogo')).toHaveLength(1);
    fireEvent.click(screen.getByText('Jabón líquido 5 L'));
    expect(h.onPickLineProduct).toHaveBeenCalledWith(1, 13, 'Jabón líquido 5 L');
    // line 2 is new and unresolved -> one create button; line 3 is resolved -> none, shows "Agregado"
    const createButtons = screen.getAllByText(/crear producto/);
    expect(createButtons).toHaveLength(1);
    fireEvent.click(createButtons[0]);
    expect(h.onCreateLineProduct).toHaveBeenCalledWith(2);
    expect(screen.getByText('Agregado')).toBeTruthy();
  });

  it('shows supplier and product sections only for inventory egresos', () => {
    renderCard({ expenseType: 'general', ticket: ticket({ supplierMatch: match('NEW'), lineItems: [line('x', match('NEW'))] }) });
    expect(screen.queryByText('Crear proveedor')).toBeNull();
    expect(screen.queryByText(/crear producto/)).toBeNull();
  });

  it('surfaces the agent’s warnings', () => {
    renderCard({ ticket: ticket({ issues: ['La suma de los productos ($935.95) no coincide con el total del ticket ($1,701.93).'], notes: ['El ticket parece recortado.'] }) });
    expect(screen.getByText(/no coincide con el total/)).toBeTruthy();
    expect(screen.getByText('El ticket parece recortado.')).toBeTruthy();
  });

  describe('category review', () => {
    const result = { suggestedCategory: 'Insumos', isAnomaly: false, anomalyReason: null, confidence: 0.9 };

    it('shows a spinner while the review runs, and no ticket-level controls interfere', () => {
      renderCard({ review: { state: 'loading', result: null } });
      expect(screen.getByText('Revisando categoría…')).toBeTruthy();
    });

    it('shows the suggested category', () => {
      renderCard({ review: { state: 'done', result } });
      expect(screen.getByText('Insumos')).toBeTruthy();
      expect(screen.queryByText('Confianza baja')).toBeNull();
    });

    it('flags an anomaly with its reason and a low-confidence category', () => {
      renderCard({ review: { state: 'done', result: { ...result, isAnomaly: true, anomalyReason: 'Mismo monto hace 2 días', confidence: 0.3 } } });
      expect(screen.getByText('Mismo monto hace 2 días')).toBeTruthy();
      expect(screen.getByText('Confianza baja')).toBeTruthy();
    });

    it('says so when the review could not run', () => {
      renderCard({ review: { state: 'failed', result: null } });
      expect(screen.getByText(/No se pudo revisar la categoría/)).toBeTruthy();
    });

    it('offers a manual button only when idle and products exist (ticket could not be read)', () => {
      const h = renderCard({ state: 'failed', ticket: null, canReviewManually: true });
      fireEvent.click(screen.getByText('Sugerir categoría'));
      expect(h.onReview).toHaveBeenCalledTimes(1);
      cleanup();
      renderCard({ state: 'failed', ticket: null, canReviewManually: false });
      expect(screen.queryByText('Sugerir categoría')).toBeNull();
    });
  });
});
