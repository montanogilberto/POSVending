// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('../../api/expenseAgentApi', () => ({ categorizeExpense: vi.fn() }));
import { categorizeExpense, ExpenseCategorization } from '../../api/expenseAgentApi';
import { useExpenseReview } from './useExpenseReview';

const mocked = vi.mocked(categorizeExpense);
const payload = { companyId: 1, description: 'Detergente', total: 100, paymentMethod: 'Efectivo' };
const category = (name: string) => ({ suggestedCategory: name, isAnomaly: false, anomalyReason: null, confidence: 0.9 });

beforeEach(() => { mocked.mockReset(); });

describe('useExpenseReview', () => {
  it('goes idle -> loading -> done with the agent result', async () => {
    mocked.mockResolvedValue(category('Insumos'));
    const { result } = renderHook(() => useExpenseReview());
    expect(result.current.state).toBe('idle');
    act(() => { result.current.run(payload); });
    expect(result.current.state).toBe('loading');
    await waitFor(() => expect(result.current.state).toBe('done'));
    expect(result.current.review?.suggestedCategory).toBe('Insumos');
  });

  it('reports failed when the agent is unreachable', async () => {
    mocked.mockResolvedValue(null);
    const { result } = renderHook(() => useExpenseReview());
    await act(async () => { await result.current.run(payload); });
    expect(result.current.state).toBe('failed');
    expect(result.current.review).toBeNull();
  });

  it('ignores a slower, older answer after a newer run', async () => {
    let releaseOld!: (v: ExpenseCategorization) => void;
    mocked.mockImplementationOnce(() => new Promise<ExpenseCategorization | null>(r => { releaseOld = r; }));
    mocked.mockResolvedValueOnce(category('Renta'));
    const { result } = renderHook(() => useExpenseReview());
    act(() => { result.current.run(payload); });
    await act(async () => { await result.current.run(payload); });
    expect(result.current.review?.suggestedCategory).toBe('Renta');
    await act(async () => { releaseOld(category('Insumos')); });
    expect(result.current.review?.suggestedCategory).toBe('Renta');
  });

  it('reset clears the result and discards an in-flight answer', async () => {
    let release!: (v: ExpenseCategorization) => void;
    mocked.mockImplementationOnce(() => new Promise<ExpenseCategorization | null>(r => { release = r; }));
    const { result } = renderHook(() => useExpenseReview());
    act(() => { result.current.run(payload); });
    act(() => { result.current.reset(); });
    await act(async () => { release(category('Insumos')); });
    expect(result.current.state).toBe('idle');
    expect(result.current.review).toBeNull();
  });
});
