import { useCallback, useEffect, useRef, useState } from 'react';
import { useIonAlert } from '@ionic/react';
import { listPendingTopUpEvidence, TransferEvidence, uploadTransferEvidenceImage } from '../../../api/bankingApi';
import { confirmTransferTopUp, rejectTransferEvidence } from '../../../api/laundryWalletApi';
import { readTransferEvidence } from '../../../api/transferReadingApi';
import { fmtMXN } from '../../../utils/format';
import { pickEvidencePhoto } from '../../../utils/pickAvatarPhoto';
import { useViewEnterLoad } from '../../../hooks/useViewEnterLoad';
import { notifyDataChanged, onDataChanged } from '../../../utils/refreshBus';

const EMPTY_FORM = { amount: '', trackingKey: '', transferDate: '', bankFrom: '' };
export type TransferForm = typeof EMPTY_FORM;

/**
 * Abono por transferencia: el cajero sube el comprobante, el agente llena el
 * formulario y el cajero lo revisa. El agente nunca confirma dinero: sólo abona
 * una persona que ya vio la transferencia en la cuenta de la compañía.
 */
export const usePosTransfer = (
  companyId: number,
  clientId: number,
  userId: number,
  clientName: string,
  showToast: (msg: string, color?: string) => void,
) => {
  const [showTransfer, setShowTransfer] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [form, setForm] = useState<TransferForm>(EMPTY_FORM);
  const [reading, setReading] = useState(false);
  const [readingIssues, setReadingIssues] = useState<string[]>([]);
  const [transferSaving, setTransferSaving] = useState(false);
  const [pendingEvidence, setPendingEvidence] = useState<TransferEvidence[]>([]);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [presentConfirm] = useIonAlert();
  const latestRead = useRef(0);

  const loadPending = useCallback(() => {
    if (!companyId || !clientId) return;
    listPendingTopUpEvidence(companyId, clientId)
      .then(setPendingEvidence)
      .catch((err) => console.log('[usePosTransfer] pending failed:', err));
  }, [companyId, clientId]);

  useViewEnterLoad(() => { loadPending(); }, !!companyId && !!clientId);
  useEffect(() => onDataChanged(loadPending), [loadPending]);

  /** Abre un comprobante que el cliente mandó por WhatsApp, ya leído por el agente. */
  const reviewEvidence = (e: TransferEvidence) => {
    latestRead.current++;
    setPhoto(e.evidenceFileUrl ?? null);
    setForm({
      amount: e.amountMXN ? String(e.amountMXN) : '',
      trackingKey: e.claveRastreo ?? '',
      transferDate: (e.transferDate ?? '').slice(0, 10),
      bankFrom: e.bankFrom ?? '',
    });
    setReadingIssues([]);
    setReading(false);
    setReviewingId(e.transferEvidenceId);
    setShowTransfer(true);
  };

  const openTransferTopUp = () => {
    latestRead.current++;
    setReviewingId(null);
    setPhoto(null);
    setForm(EMPTY_FORM);
    setReadingIssues([]);
    setReading(false);
    setShowTransfer(true);
  };

  const closeTransfer = () => {
    latestRead.current++;
    if (!transferSaving) setShowTransfer(false);
  };

  const setField = (field: keyof TransferForm, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const pickEvidence = async () => {
    const dataUrl = await pickEvidencePhoto();
    if (!dataUrl) return;
    const mine = ++latestRead.current;
    setPhoto(dataUrl);
    setReadingIssues([]);
    setReading(true);
    const result = await readTransferEvidence(dataUrl);
    if (mine !== latestRead.current) return;
    setReading(false);
    if (!result) {
      setReadingIssues(['No se pudo leer el comprobante. Llena los datos a mano.']);
      return;
    }
    setForm({
      amount: result.amountMXN ? String(result.amountMXN) : '',
      trackingKey: result.claveRastreo,
      transferDate: result.transferDate,
      bankFrom: result.bankFrom,
    });
    setReadingIssues(result.issues);
  };

  const amount = Math.round(Number(form.amount) * 100) / 100;
  const trackingKey = form.trackingKey.replace(/[\s-]/g, '').toUpperCase();
  const formValid = !!photo && amount > 0 && trackingKey.length >= 6 && !!form.transferDate && !!form.bankFrom.trim();

  const save = async () => {
    setTransferSaving(true);
    try {
      let evidenceFileUrl: string | undefined;
      if (!reviewingId) {
        const { blobUrl, error } = await uploadTransferEvidenceImage({ companyId, clientId, imageBase64: photo! });
        if (error || !blobUrl) throw new Error(error ?? 'upload failed');
        evidenceFileUrl = blobUrl;
      }
      const r = await confirmTransferTopUp({
        companyId, clientId, userId, amountMXN: amount, claveRastreo: trackingKey, bankFrom: form.bankFrom.trim(),
        transferDate: form.transferDate, evidenceFileUrl, transferEvidenceId: reviewingId ?? undefined,
      });
      setShowTransfer(false);
      notifyDataChanged('laundry_transfer_top_up');
      if (r.replayed) showToast('Esa clave de rastreo ya estaba registrada. No se abonó de nuevo.', 'warning');
      else if (!r.evidenceSaved || !r.journalPosted) {
        showToast(`Se abonó, pero falta ${!r.evidenceSaved ? 'el comprobante' : 'el asiento contable'}. Clave ${trackingKey}.`, 'warning');
      } else showToast(`✓ Se abonaron ${fmtMXN(amount)}${r.balanceAfter != null ? ` · saldo ${fmtMXN(r.balanceAfter)}` : ''}`);
    } catch (err) {
      console.log('[usePosTransfer] save failed:', err);
      showToast('No se pudo registrar la transferencia. Intenta de nuevo.', 'danger');
    } finally {
      setTransferSaving(false);
    }
  };

  const rejectEvidence = () => {
    if (!reviewingId || transferSaving) return;
    presentConfirm({
      header: 'Rechazar comprobante',
      message: 'No se abonará nada. El comprobante queda como rechazado.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Rechazar',
          handler: async () => {
            setTransferSaving(true);
            try {
              await rejectTransferEvidence(companyId, reviewingId, userId);
              setShowTransfer(false);
              showToast('Comprobante rechazado.', 'warning');
              notifyDataChanged('laundry_transfer_rejected');
            } catch (err) {
              console.log('[usePosTransfer] reject failed:', err);
              showToast('No se pudo rechazar el comprobante.', 'danger');
            } finally {
              setTransferSaving(false);
            }
          },
        },
      ],
    });
  };

  const confirmTransfer = () => {
    if (!formValid || transferSaving) return;
    presentConfirm({
      header: 'Confirmar transferencia',
      message: `¿Ya viste ${fmtMXN(amount)} de ${clientName} en la cuenta de la compañía? Clave ${trackingKey}.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Sí, abonar', handler: () => { save(); } },
      ],
    });
  };

  return {
    showTransfer, openTransferTopUp, closeTransfer, pickEvidence, photo, reading, readingIssues,
    transferForm: form, setTransferField: setField, transferFormValid: formValid, confirmTransfer,
    transferSaving,
    pendingEvidence, reviewEvidence, reviewingEvidence: !!reviewingId, rejectEvidence,
  };
};
