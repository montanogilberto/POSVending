/**
 * useBorrowerOnboarding — ViewModel del onboarding de prestatario (MVVM).
 * Todo el estado, efectos y lógica de negocio viven aquí; la View solo pinta.
 */
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useUser } from '../../../contexts/UserContext';
import {
  getAllClientFaceRecognitions, updateClientFaceRecognition,
  ClientFaceRecognition,
} from '../../../api/clientFaceRecognitionApi';
import { uploadSignatureBlob } from './BorrowerOnboardingApi';
import { Step } from './BorrowerOnboardingTypes';
import { p2pLendingRoute } from '../../../utils/routes';

export function useBorrowerOnboarding() {
  const history = useHistory();
  const { clientId, companyId } = useUser();

  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [record, setRecord] = useState<ClientFaceRecognition | null>(null);

  // Step 1 — Pagaré
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [pagareAccepted, setPagareAccepted] = useState(false);

  // Step 2 — Contract
  const [contractAccepted, setContractAccepted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const recs = await getAllClientFaceRecognitions(companyId);
        const mine = recs.find(r => r.clientId === clientId) ?? null;
        setRecord(mine);
        if (mine?.pagareAccepted) setPagareAccepted(true);
        if (mine?.contractAccepted) setContractAccepted(true);
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, [clientId, companyId]);

  const biometricDone = !!record?.isVerified;
  const pagareDone    = !!record?.pagareAccepted;
  const contractDone  = !!record?.contractAccepted;
  const allDone       = biometricDone && pagareDone && contractDone;
  const stepDone      = [biometricDone, pagareDone, contractDone];

  // ── Step 0: Biometría ──────────────────────────────────────────────────
  const goToFaceRecognition = () => {
    history.push(`/client-face-recognition`);
  };

  // ── Step 1: Pagaré ─────────────────────────────────────────────────────
  const savePagare = async () => {
    if (!signatureDataUrl && !pagareDone) {
      setToast('Debes firmar el pagaré antes de continuar');
      return;
    }
    if (!pagareAccepted) {
      setToast('Debes aceptar el pagaré');
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (record?.clientFaceRecognitionId) {
        let blobUrl = record.pagarePdfBlobUrl ?? '';
        if (signatureDataUrl && clientId && companyId) {
          try {
            blobUrl = await uploadSignatureBlob(signatureDataUrl, clientId, companyId, 'pagare');
          } catch {
            blobUrl = signatureDataUrl; // fallback to base64 if upload fails
          }
        }
        await updateClientFaceRecognition(record.clientFaceRecognitionId, {
          pagareAccepted: true,
          pagareAcceptedAt: now,
          pagarePdfBlobUrl: blobUrl,
        });
        setRecord(r => r ? { ...r, pagareAccepted: true, pagareAcceptedAt: now } : r);
      }
      setStep(2);
    } catch (e: any) {
      setToast(e?.message ?? 'Error al guardar pagaré');
    }
    setSaving(false);
  };

  // ── Step 2: Contract ───────────────────────────────────────────────────
  const saveContract = async () => {
    if (!contractAccepted) {
      setToast('Debes aceptar el contrato para continuar');
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      if (record?.clientFaceRecognitionId) {
        await updateClientFaceRecognition(record.clientFaceRecognitionId, {
          contractAccepted: true,
          contractAcceptedAt: now,
        });
      }
      history.replace(p2pLendingRoute(clientId));
    } catch (e: any) {
      setToast(e?.message ?? 'Error al guardar contrato');
    }
    setSaving(false);
  };

  return {
    step,
    setStep,

    loading,
    saving,

    toast,
    setToast,

    biometricDone,
    pagareDone,
    contractDone,
    allDone,
    stepDone,

    signatureDataUrl,
    setSignatureDataUrl,

    pagareAccepted,
    setPagareAccepted,

    contractAccepted,
    setContractAccepted,

    savePagare,
    saveContract,
    goToFaceRecognition,

    history,
    // La View arma /p2p-lending/:clientId al terminar el onboarding.
    clientId,

    record,
  };
}

export type BorrowerOnboardingVM = ReturnType<typeof useBorrowerOnboarding>;
