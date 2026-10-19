import { useCallback, useRef, useState } from 'react';
import { categorizeExpense, ExpenseCategorization, ExpenseCategorizeRequest } from '../../api/expenseAgentApi';

export type ExpenseReviewState = 'idle' | 'loading' | 'done' | 'failed';

/** Category suggestion + anomaly flag from the expense agent; a newer run (or reset) discards an older answer. */
export const useExpenseReview = () => {
  const [state, setState] = useState<ExpenseReviewState>('idle');
  const [review, setReview] = useState<ExpenseCategorization | null>(null);
  const latest = useRef(0);

  const run = useCallback(async (payload: ExpenseCategorizeRequest) => {
    const mine = ++latest.current;
    setState('loading');
    setReview(null);
    const result = await categorizeExpense(payload);
    if (mine !== latest.current) return;
    setReview(result);
    setState(result ? 'done' : 'failed');
  }, []);

  const reset = useCallback(() => {
    latest.current++;
    setState('idle');
    setReview(null);
  }, []);

  return { state, review, run, reset };
};
