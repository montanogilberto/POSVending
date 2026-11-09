import { useCallback, useEffect, useState } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { onDataChanged, notifyDataChanged } from '../../../utils/refreshBus';
import { getAllVoiceCalls, getOneVoiceCall, VoiceCall } from '../../../api/voiceCallApi';
import { usePopovers } from '../../../hooks/usePopovers';
import { toHermosillo } from '../../../utils/format';

export type VoiceCallFilter = 'all' | 'pending' | 'confirmed' | 'needsStaff';

const PAGE_SIZE = 20;

// Status badge maps based on specification.prd_hints.domain_context.ui_hints.status_badge_maps
const CALL_STATUS_MAP = {
  queued: { label: 'En cola', color: 'medium' },
  ringing: { label: 'Sonando', color: 'primary' },
  in_progress: { label: 'En curso', color: 'tertiary' },
  completed: { label: 'Completada', color: 'success' },
  no_answer: { label: 'Sin respuesta', color: 'warning' },
  busy: { label: 'Ocupado', color: 'warning' },
  failed: { label: 'Fallida', color: 'danger' },
  canceled: { label: 'Cancelada', color: 'danger' },
  skipped: { label: 'Omitida', color: 'light' },
};

const AGREEMENT_STATUS_MAP = {
  none: { label: 'Sin acuerdo', color: 'light' },
  invalid: { label: 'Inválido', color: 'danger' },
  pending_confirmation: { label: 'Por confirmar', color: 'warning' },
  confirmed: { label: 'Confirmado', color: 'success' },
  cancelled: { label: 'Cancelado', color: 'danger' },
  expired: { label: 'Expirado', color: 'medium' },
};

export const useVoiceCall = () => {
  const { companyId, clientId } = useUser();
  const { showToast, toastProps } = useToast();
  const pops = usePopovers();

  const [items, setItems] = useState<VoiceCall[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<VoiceCallFilter>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCall, setSelectedCall] = useState<VoiceCall | null>(null);

  const loadVoiceCalls = useCallback(async (reset: boolean = false) => {
    if (loading) return;
    setLoading(true);

    const currentLimit = reset ? PAGE_SIZE : (currentPage + 1) * PAGE_SIZE;

    try {
      const newItems = await getAllVoiceCalls(companyId, filter, currentLimit);
      // Apply UTC-7 conversion for displayed dates
      const formattedItems = newItems.map(item => ({
        ...item,
        created_At: toHermosillo(item.created_At),
        updated_at: item.updated_at ? toHermosillo(item.updated_at) : null,
        confirmedAt: item.confirmedAt ? toHermosillo(item.confirmedAt) : null,
      }));

      setItems(formattedItems);
      setHasMore(newItems.length === currentLimit); // If we received fewer than requested, there's no more
      setCurrentPage(reset ? 0 : currentPage); // Only increment on successful load more

    } catch (err) {
      showToast((err as Error).message ?? 'Error cargando llamadas de voz', 'danger');
      setHasMore(false);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [companyId, filter, currentPage, loading, showToast]);

  const loadMoreItems = useCallback(() => {
    if (hasMore && !loading) {
      setCurrentPage(prevPage => prevPage + 1);
    }
  }, [hasMore, loading]);

  const handleFilterChange = useCallback((newFilter: VoiceCallFilter) => {
    setFilter(newFilter);
    setCurrentPage(0);
    setItems([]);
    setHasMore(true);
    setIsRefreshing(true); // Indicate refresh for immediate visual feedback
  }, []);

  const openDetailModal = useCallback(async (voiceCallId: number) => {
    setLoading(true);
    try {
      const call = await getOneVoiceCall(voiceCallId, companyId);
      if (call) {
        // Apply UTC-7 conversion for displayed dates in detail modal
        const formattedCall = {
          ...call,
          created_At: toHermosillo(call.created_At),
          updated_at: call.updated_at ? toHermosillo(call.updated_at) : null,
          confirmedAt: call.confirmedAt ? toHermosillo(call.confirmedAt) : null,
        };
        setSelectedCall(formattedCall);
        setShowDetailModal(true);
      } else {
        showToast('Llamada de voz no encontrada', 'danger');
      }
    } catch (err) {
      showToast((err as Error).message ?? 'Error cargando detalle de llamada', 'danger');
    } finally {
      setLoading(false);
    }
  }, [companyId, showToast]);

  const closeDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setSelectedCall(null);
  }, []);

  // Helper to format agreement JSON into a readable sentence
  const formatAgreementSentence = useCallback((agreementJsonString: string | null): string => {
    if (!agreementJsonString) return '';
    try {
      const agreement = JSON.parse(agreementJsonString);
      if (agreement.capability === 'PICKUP_AGREEMENT') {
        const { deliveryMethod, agreedDate, agreedTime, paymentMethod } = agreement.fields;
        const date = agreedDate ? toHermosillo(agreedDate) : null;
        let dateStr = date ? `el ${date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}` : '';
        const timeStr = agreedTime ? `a las ${agreedTime}` : '';
        const paymentStr = paymentMethod ? `, pago en ${paymentMethod}` : '';
        return `${deliveryMethod} ${dateStr} ${timeStr}${paymentStr}.`;
      }
      return 'Acuerdo no reconocido.';
    } catch (e) {
      console.error('Error parsing agreement JSON:', e);
      return 'Error al procesar el acuerdo.';
    }
  }, []);

  useEffect(() => { loadVoiceCalls(true); }, [loadVoiceCalls, filter]);
  useIonViewWillEnter(() => { setIsRefreshing(true); loadVoiceCalls(true); });
  useEffect(() => onDataChanged(() => { setIsRefreshing(true); loadVoiceCalls(true); }), [loadVoiceCalls]);
  // after every successful mutation: notifyDataChanged('voiceCall-saved');

  return {
    items,
    loading,
    isRefreshing,
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
    callStatusMap: CALL_STATUS_MAP,
    agreementStatusMap: AGREEMENT_STATUS_MAP,
    formatAgreementSentence,
  };
};

export type VoiceCallVM = ReturnType<typeof useVoiceCall>;
