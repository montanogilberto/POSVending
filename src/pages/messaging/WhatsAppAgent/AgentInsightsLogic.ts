import { useEffect, useRef, useState } from 'react';
import { useUser } from '../../../contexts/UserContext';
import { whatsappAgentApi, type WhatsAppAgentInsights } from '../../../api/whatsappAgentApi';

/** "¿Qué quieren mis clientes?" — on demand (one LLM call), for the period on screen. */
export const useAgentInsights = (startDate: string, endDate: string) => {
  const { companyId } = useUser();
  const [insights, setInsights] = useState<WhatsAppAgentInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const seq = useRef(0);

  // A different period invalidates the summary on screen.
  useEffect(() => {
    seq.current++;
    setInsights(null);
    setError(false);
    setLoading(false);
  }, [startDate, endDate]);

  const analyze = async () => {
    if (!companyId || loading) return;
    const mine = ++seq.current;
    setLoading(true);
    setError(false);
    try {
      const res = await whatsappAgentApi.getInsights(companyId, startDate, endDate);
      if (mine === seq.current) setInsights(res);
    } catch {
      if (mine === seq.current) setError(true);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  };

  return { insights, loading, error, analyze };
};
