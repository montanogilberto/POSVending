import { useCallback, useEffect, useState } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { onDataChanged, notifyDataChanged } from '../../../utils/refreshBus';
import { loanPaymentApi, LoanPayment } from '../../../api/loanPaymentApi';

const PAGE_SIZE = 20;

export const useLoanPayment = () => {
  const { companyId, userId } = useUser();
  const { showToast, toastProps } = useToast();
  const [items, setItems] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [filterLoanId, setFilterLoanId] = useState<number | undefined>(undefined);
  const [filterPayeeClientId, setFilterPayeeClientId] = useState<number | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);

  const [showResolutionAlert, setShowResolutionAlert] = useState(false);
  const [selectedEscalatedPaymentId, setSelectedEscalatedPaymentId] = useState<number | null>(null);
  const [resolutionAction, setResolutionAction] = useState<'CONFIRMED' | 'REJECTED' | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const load = useCallback(async (page: number, append = false) => {
    if (companyId === 0) return;
    setLoading(true);
    try {
      const newItems = await loanPaymentApi.list(
        companyId,
        filterLoanId,
        filterPayeeClientId,
        filterStatus
      );

      if (append) {
        setItems((prevItems) => [...prevItems, ...newItems]);
      } else {
        setItems(newItems);
      }
      setTotalItems(newItems.length); // For this simple list, assume total items are what's returned.
      setCurrentPage(page);
    } catch (err) {
      showToast((err as Error).message ?? 'Error cargando pagos de préstamos', 'danger');
      setItems([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [companyId, showToast, filterLoanId, filterPayeeClientId, filterStatus]);

  const loadMoreItems = useCallback(async () => {
    if (items.length < totalItems) {
      await load(currentPage + 1, true);
    }
  }, [load, currentPage, items.length, totalItems]);

  const hasMoreItems = totalItems > items.length;

  useEffect(() => { load(0); }, [load]);
  useIonViewWillEnter(() => { load(0); });
  useEffect(() => onDataChanged(() => load(0)), [load]);

  const handleResolveEscalationPrompt = (paymentId: number, action: 'CONFIRMED' | 'REJECTED') => {
    setSelectedEscalatedPaymentId(paymentId);
    setResolutionAction(action);
    setResolutionNote(''); // Reset note for new prompt
    setShowResolutionAlert(true);
  };

  const handleResolveEscalation = async (note: string) => {
    if (!selectedEscalatedPaymentId || !resolutionAction || note.trim() === '') {
      showToast('Debe ingresar una nota de resolución.', 'danger');
      return;
    }

    setIsResolving(true);
    try {
      await loanPaymentApi.resolveEscalation({
        loanPaymentId: selectedEscalatedPaymentId,
        resolution: resolutionAction,
        resolutionNote: note.trim(),
        resolverUserId: userId! // userId is guaranteed to be present for authenticated users
      });
      showToast('Escalación resuelta exitosamente.', 'success');
      notifyDataChanged('loanPayment-resolved');
      setShowResolutionAlert(false);
    } catch (err) {
      showToast((err as Error).message ?? 'Error al resolver la escalación', 'danger');
    } finally {
      setIsResolving(false);
    }
  };

  return {
    items,
    loading,
    toastProps,
    loadMoreItems,
    hasMoreItems,
    filterLoanId, setFilterLoanId,
    filterPayeeClientId, setFilterPayeeClientId,
    filterStatus, setFilterStatus,
    showResolutionAlert, setShowResolutionAlert,
    selectedEscalatedPaymentId, setSelectedEscalatedPaymentId,
    resolutionAction, setResolutionAction,
    resolutionNote, setResolutionNote,
    handleResolveEscalationPrompt,
    handleResolveEscalation,
    isResolving,
  };
};

export type LoanPaymentVM = ReturnType<typeof useLoanPayment>;
