import { useCallback, useEffect, useRef, useState } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { onDataChanged } from '../../../utils/refreshBus';
import { getAllVoiceCalls, getOneVoiceCall, VoiceCall } from '../../../api/voiceCallApi';
import { usePopovers } from '../../../hooks/usePopovers';
import { VOICE_CALL_STATUS, VOICE_AGREEMENT_STATUS } from '../../../components/ui/statusMaps';

export type VoiceCallFilter = 'all' | 'pending' | 'confirmed' | 'needsStaff';

const PAGE_SIZE = 20;

export const useVoiceCall = () => {
  const { companyId } = useUser();
  const { showToast, toastProps } = useToast();
  const pops = usePopovers();

  // Dates stay in raw UTC here; the View formats them to Hermosillo once.
  const [items, setItems] = useState<VoiceCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filter, setFilter] = useState<VoiceCallFilter>('all');
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [hasMore, setHasMore] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState<VoiceCall | null>(null);

  // Ref guard instead of `loading` in deps — that re-created the callback on
  // every loading toggle and the effect below re-fired it in a loop.
  const inFlight = useRef(false);

  const load = useCallback(async (rows: number) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const data = await getAllVoiceCalls(companyId, filter, rows);
      setItems(data);
      setHasMore(data.length === rows); // fewer than requested → no more pages
    } catch (err) {
      showToast((err as Error).message || 'Error cargando llamadas de voz', 'danger');
      setHasMore(false);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [companyId, filter, showToast]);

  const reload = useCallback(() => {
    setLimit(PAGE_SIZE);
    load(PAGE_SIZE);
  }, [load]);

  // Runs on mount, on filter change (load identity changes) and on load-more (limit changes).
  useEffect(() => { load(limit); }, [load, limit]);
  useIonViewWillEnter(reload, [reload]);
  useEffect(() => onDataChanged(reload), [reload]);

  const loadMoreItems = useCallback(() => {
    if (hasMore && !inFlight.current) setLimit(l => l + PAGE_SIZE);
  }, [hasMore]);

  const handleFilterChange = useCallback((newFilter: VoiceCallFilter) => {
    setItems([]);
    setHasMore(true);
    setLimit(PAGE_SIZE);
    setFilter(newFilter);
  }, []);

  const openDetailModal = useCallback(async (voiceCallId: number) => {
    setDetailLoading(true);
    try {
      const call = await getOneVoiceCall(voiceCallId, companyId);
      if (call) {
        setSelectedCall(call);
        setShowDetailModal(true);
      } else {
        showToast('Llamada de voz no encontrada', 'danger');
      }
    } catch (err) {
      showToast((err as Error).message || 'Error cargando detalle de llamada', 'danger');
    } finally {
      setDetailLoading(false);
    }
  }, [companyId, showToast]);

  const closeDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedCall(null);
  }, []);

  // Agreement JSON → readable sentence. agreedDate is a calendar date
  // (YYYY-MM-DD), not a UTC instant, so format it in UTC to avoid a day shift.
  const formatAgreementSentence = useCallback((agreementJsonString: string | null): string => {
    if (!agreementJsonString) return '';
    try {
      const agreement = JSON.parse(agreementJsonString);
      if (agreement.capability === 'PICKUP_AGREEMENT') {
        const { deliveryMethod, agreedDate, agreedTime, paymentMethod } = agreement.fields ?? {};
        const date = agreedDate ? new Date(agreedDate) : null;
        const dateStr = date && !isNaN(date.getTime())
          ? `el ${date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}`
          : '';
        const timeStr = agreedTime ? `a las ${agreedTime}` : '';
        const paymentStr = paymentMethod ? `, pago en ${paymentMethod}` : '';
        return `${deliveryMethod ?? ''} ${dateStr} ${timeStr}${paymentStr}.`.replace(/\s+/g, ' ').trim();
      }
      return 'Acuerdo no reconocido.';
    } catch (e) {
      console.error('Error parsing agreement JSON:', e);
      return 'Error al procesar el acuerdo.';
    }
  }, []);

  return {
    items,
    loading,
    detailLoading,
    toastProps,
    pops,
    filter,
    handleFilterChange,
    loadMoreItems,
    hasMore,
    showDetailModal,
    selectedCall,
    openDetailModal,
    closeDetailModal,
    callStatusMap: VOICE_CALL_STATUS,
    agreementStatusMap: VOICE_AGREEMENT_STATUS,
    formatAgreementSentence,
  };
};

export type VoiceCallVM = ReturnType<typeof useVoiceCall>;
