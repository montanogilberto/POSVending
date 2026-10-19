import { useCallback, useRef, useState } from 'react';
import { extractTicket, TicketExtraction } from '../../api/expenseAgentApi';

export type TicketReadingState = 'idle' | 'loading' | 'done' | 'failed';

/** Runs the ticket agent on a photo; a newer read (or reset) discards an older, slower answer. */
export const useTicketReading = (companyId: number) => {
  const [state, setState] = useState<TicketReadingState>('idle');
  const [ticket, setTicket] = useState<TicketExtraction | null>(null);
  const latest = useRef(0);

  const read = useCallback(async (imageBase64: string) => {
    const mine = ++latest.current;
    setState('loading');
    setTicket(null);
    const result = await extractTicket({ companyId, imageBase64 });
    if (mine !== latest.current) return;
    setTicket(result);
    setState(result ? 'done' : 'failed');
  }, [companyId]);

  /** Shows a reading that was already done elsewhere (the one-tap flow) without calling the agent again. */
  const seed = useCallback((result: TicketExtraction) => {
    latest.current++;
    setTicket(result);
    setState('done');
  }, []);

  const reset = useCallback(() => {
    latest.current++;
    setState('idle');
    setTicket(null);
  }, []);

  return { state, ticket, read, seed, reset };
};
