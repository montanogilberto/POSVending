import { useCallback, useEffect, useState } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import { useUser } from '../../../contexts/UserContext';
import { useToast } from '../../../hooks/useToast';
import { onDataChanged, notifyDataChanged } from '../../../utils/refreshBus';
import { loanPaymentApi, LoanPayment } from '../../../api/loanPaymentApi';

export const useLoanPayment = () => {
  const { companyId, userId } = useUser();
  const { showToast, toastProps } = useToast();
  const [items, setItems] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterLoanId, setFilterLoanId] = useState<number | undefined>(undefined);
  const [filterPayeeClientId, setFilterPayeeClientId] = useState<number | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);

  const [showResolutionAlert, setShowResolutionAlert] = useState(false);
  const [selectedEscalatedPaymentId, setSelectedEscalatedPaymentId] = useState<number | null>(null);
  const [resolutionAction, setResolutionAction] = useState<'CONFIRMED' | 'REJECTED' | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const load = useCallback(async () => {
    if (companyId === 0) return;
    setLoading(true);
    try {
      const newItems = await loanPaymentApi.list(
        companyId,
        filterLoanId,
        filterPayeeClientId,
        filterStatus
      );

      setItems(newItems);
    } catch (err) {
      showToast((err as Error).message ?? 'Error cargando pagos de préstamos', 'danger');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [companyId, showToast, filterLoanId, filterPayeeClientId, filterStatus]);

  useEffect(() => { load(); }, [load]);
  useIonViewWillEnter(() => { load(); });
  useEffect(() => onDataChanged(() => load()), [load]);

  const handleResolveEscalationPrompt = (paymentId: number, action: 'CONFIRMED' | 'REJECTED') => {
    setSelectedEscalatedPaymentId(paymentId);
    setResolutionAction(action);
    setShowResolutionAlert(true);
  };

  const handleResolveEscalation = async (note: string) => {
    if (isResolving) return;
    if (!selectedEscalatedPaymentId || !resolutionAction || note.trim() === '') {
      showToast('Debe ingresar una nota de resolución.', 'danger');
      return;
    }

    setIsResolving(true);
    try {
      await loanPaymentApi.resolveEscalation({
        companyId,
        loanPaymentId: selectedEscalatedPaymentId,
        resolution: resolutionAction,
        resolutionNote: note.trim(),
        resolverUserId: userId
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
    filterLoanId, setFilterLoanId,
    filterPayeeClientId, setFilterPayeeClientId,
    filterStatus, setFilterStatus,
    showResolutionAlert, setShowResolutionAlert,
    selectedEscalatedPaymentId, setSelectedEscalatedPaymentId,
    resolutionAction, setResolutionAction,
    handleResolveEscalationPrompt,
    handleResolveEscalation,
    isResolving,
  };
};

export type LoanPaymentVM = ReturnType<typeof useLoanPayment>;
