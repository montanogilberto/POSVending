import React, { useEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  IonPage,
  IonContent,
  IonButton,
  IonLoading,
  IonToast,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonRadioGroup,
  IonRadio,
  IonListHeader,
  IonLabel,
  IonList,
  IonItem,
  IonCheckbox,
  IonIcon,
  IonSpinner,
} from '@ionic/react';
import { checkmark, chevronForward, cameraOutline, refreshOutline, personOutline, idCardOutline } from 'ionicons/icons';
import Header from '../../components/Header';
import AlertPopover from '../../components/PopOver/AlertPopover';
import MailPopover from '../../components/PopOver/MailPopover';
import ClientSelector from '../../components/ClientSelector';
import GuidedDocumentCapture from '../../components/GuidedDocumentCapture';
import FaceLivenessCapture, { FaceLivenessResult, FacePose } from '../../components/FaceLivenessCapture';
import IdExtractedFieldsSummary from '../../components/IdExtractedFieldsSummary';
import ZoomableImage from '../../components/ZoomableImage';
import PresenceCapture, { PresenceCaptureResult } from '../../components/PresenceCapture';
import SignaturePad from '../../components/SignaturePad';
import NativeConnectOnboarding from '../../components/NativeConnectOnboarding';
import SavedCardSetup from '../../components/SavedCardSetup';
import { buildKycPrefill } from '../../utils/kycPrefill';
import { validateFaceSession, FaceValidationResult } from '../../api/faceValidationApi';
import { useUser } from '../../components/UserContext';
import { saveProfileImage } from '../../api/usersApi';
import { Client, getOneClient } from '../../api/clientsApi';
import {
  submitContractClientFaceRecognition,
  uploadClientFaceRecognitionImage,
  upsertClientFaceRecognition,
  uploadPresenceCapture as uploadPresenceCaptureApi,
  reverseGeocode,
  ContractSubmissionRequest,
  getAllClientFaceRecognitions,
} from '../../api/clientFaceRecognitionApi';
import { getFaceDescriptorFromImage, compareFaceDescriptors, distanceToConfidence } from '../../utils/faceLiveness';
import { ExtractedIdFields, extractIneFields } from '../../utils/idOcr';
import { cropIneSignatureRegion } from '../../utils/signatureCrop';
import { generateContractPdfBase64, generatePagarePdfBase64 } from '../../utils/contractPdf';
import { createOrRefreshStripeAccount } from '../../api/stripeApi';

import './ClientFaceRecognitionPage.css';

const EMPTY_EXTRACTED_ID_FIELDS: ExtractedIdFields = {
  nombre: '',
  domicilio: '',
  curp: '',
  claveElector: '',
  fechaNacimiento: '',
};

// Sub-steps inside the capture wizard step
type CaptureSubStep =
  | 'doc-intro'       // "Verifica tu documento"
  | 'front-capture'   // live camera front
  | 'front-review'    // "Asegúrate de que sea legible" (front)
  | 'flip-instruction'// "Ahora voltea tu identificación"
  | 'back-capture'    // live camera back
  | 'back-review'     // "Asegúrate de que sea legible" (back)
  | 'id-summary'      // "Confirma que la información sea correcta"
  | 'presence-intro'  // "Verificación de presencia" explanation
  | 'presence-capture'// video + GPS capture
  | 'liveness-intro'  // "Mueve la cabeza..."
  | 'liveness-active' // liveness in progress
  | 'processing';     // "Cargando..."

const ClientFaceRecognitionPage: React.FC = () => {
  const { companyId, clientId: contextClientId, setAvatarUrl } = useUser();

  const [step, setStep] = useState(0);
  const [captureSubStep, setCaptureSubStep] = useState<CaptureSubStep>('doc-intro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [clientSelectorOpen, setClientSelectorOpen] = useState(false);

  const [popoverState, setPopoverState] = useState<{
    showAlertPopover: boolean;
    showMailPopover: boolean;
    event?: Event;
  }>({ showAlertPopover: false, showMailPopover: false });

  const presentAlertPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  const dismissAlertPopover = () =>
    setPopoverState({ ...popoverState, showAlertPopover: false });
  const presentMailPopover = (e: React.MouseEvent) =>
    setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  const dismissMailPopover = () =>
    setPopoverState({ ...popoverState, showMailPopover: false });

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const location = useLocation<{ clientId?: number; continueToPayments?: boolean; returnTo?: string } | undefined>();
  const history = useHistory();

  // Deep-link from the client (or lender) dashboard's onboarding checklist —
  // pre-select the client so they skip the staff-facing picker, and (when
  // continueToPayments is set) chain straight into bank-account setup after
  // the contract step instead of dropping them back on the dashboard to hunt
  // down the next item themselves. returnTo lets either dashboard say where
  // "done" goes back to — defaults to the borrower dashboard for callers
  // that predate this (e.g. old deep links) that don't pass it.
  const deepLinkClientId = location.state?.clientId;
  const continueToPayments = !!location.state?.continueToPayments;
  const returnTo = location.state?.returnTo || `/client-dashboard/${deepLinkClientId}?tab=home`;

  // When opened from a dashboard deep link the wizard fetches the client and
  // the existing expediente before it knows which step to resume to. Until
  // both land, the step content would flash the fresh step-0 form and then
  // jump — so a "Cargando" placeholder is shown instead. Both init true for a
  // staff-initiated fresh wizard (no deep link), which has nothing to load.
  const [clientLoaded, setClientLoaded] = useState(!deepLinkClientId);
  const [resumeLoaded, setResumeLoaded] = useState(!deepLinkClientId);

  useEffect(() => {
    if (!deepLinkClientId) return;
    getOneClient({ clients: [{ clientId: deepLinkClientId }] })
      .then((clients) => {
        if (clients[0]) setSelectedClient(clients[0]);
      })
      .catch((err) => console.warn('[Expediente] Failed to preselect client from dashboard link', err))
      .finally(() => setClientLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resume an expediente already in progress instead of restarting it.
  //
  // Every step of this wizard already persists to ClientFaceRecognitions as it
  // goes — the ID blobs on capture, isVerified after liveness, contractAccepted
  // on submit — but the page never read that record back, so reopening the
  // wizard always began at "Cliente y documento" and made the client
  // re-photograph an INE the system already had. Nothing new needs storing;
  // this just reads what is there and jumps to the first unfinished step.
  useEffect(() => {
    if (!deepLinkClientId || !companyId) {
      // No lookup to do (or companyId not ready) — release the spinner rather
      // than leaving it stuck on "Cargando" forever.
      setResumeLoaded(true);
      return;
    }
    getAllClientFaceRecognitions(Number(companyId))
      .then((records) => {
        const record = records.find((r) => r.clientId === Number(deepLinkClientId));
        if (!record) {
          console.log('[Expediente] resume: no existing record — starting fresh');
          return;
        }
        clientFaceRecognitionIdRef.current = record.clientFaceRecognitionId;
        if (record.documentType) setDocumentType(record.documentType as typeof documentType);
        if (record.idFrontImageBlobUrl) setIdFrontImageBlobUrl(record.idFrontImageBlobUrl);
        if (record.idBackImageBlobUrl) setIdBackImageBlobUrl(record.idBackImageBlobUrl);
        if (record.clientSelfieBlobUrl) setClientSelfieBlobUrl(record.clientSelfieBlobUrl);
        if (record.confidenceScore) setConfidenceScore(record.confidenceScore);
        setIsVerified(!!record.isVerified);
        setContractAccepted(!!record.contractAccepted);
        setPagareAccepted(!!record.pagareAccepted);
        setHasPhysicalPagare(!!record.hasPhysicalPagare);
        if (record.contractAcceptedAt) setContractAcceptedAt(record.contractAcceptedAt);

        // Identity read off the ID earlier — restoring it also means the
        // review screen and the Stripe KYC prefill work on resume.
        const extracted: ExtractedIdFields = {
          nombre: record.nombre ?? '',
          domicilio: record.domicilio ?? '',
          curp: record.curp ?? '',
          claveElector: record.claveElector ?? '',
          fechaNacimiento: record.fechaNacimiento ?? '',
        };
        if (Object.values(extracted).some(Boolean)) setExtractedIdFields(extracted);

        // Land on the first UNFINISHED step, which also makes every completed
        // step render green in the indicator (i < step). Previously a
        // fully-contracted record mapped to -1 and fell through the `> 0`
        // guard, so the wizard reopened at step 0 with nothing green even
        // though the client had already done everything — exactly the "why
        // aren't the circles green" case.
        //
        // Contract done → the remaining step is payment: the card/payout step
        // when this launch includes it (continueToPayments), otherwise there
        // is no further step and we clamp to the last one (Contrato) so the
        // whole run shows complete.
        const lastStepIndex = STEPS.length - 1;
        // contractAccepted implies the signature was captured too (submission
        // requires it), so the remaining step is payment when present,
        // otherwise the run is complete and we clamp to the last step.
        const resumeStep = record.contractAccepted
          ? (continueToPayments ? 5 : lastStepIndex)
          : record.isVerified ? 3
          : (record.idFrontImageBlobUrl && record.idBackImageBlobUrl) ? 2
          : 0;
        console.log('[Expediente] resume:', JSON.stringify({
          clientFaceRecognitionId: record.clientFaceRecognitionId,
          hasFront: !!record.idFrontImageBlobUrl,
          hasBack: !!record.idBackImageBlobUrl,
          isVerified: !!record.isVerified,
          contractAccepted: !!record.contractAccepted,
          continueToPayments,
          resumeStep,
        }));
        if (resumeStep > 0) {
          setStep(resumeStep);
          if (resumeStep === 2) setCaptureSubStep('liveness-intro');
        }
      })
      .catch((err) => console.warn('[Expediente] resume: lookup failed, starting fresh', err))
      .finally(() => setResumeLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [documentType, setDocumentType] = useState<'INE' | 'Passport' | 'Driver License' | ''>('');
  const [idFrontImageBase64, setIdFrontImageBase64] = useState<string>('');
  const [idBackImageBase64, setIdBackImageBase64] = useState<string>('');
  const [idFrontImageBlobUrl, setIdFrontImageBlobUrl] = useState<string>('');
  // Full-resolution front, sent to the face-validation agent for the INE-portrait
  // comparison. The standard idFrontImageBlobUrl stays the ~1100px OCR image.
  const [idFrontHiResBlobUrl, setIdFrontHiResBlobUrl] = useState<string>('');
  const [idBackImageBlobUrl, setIdBackImageBlobUrl] = useState<string>('');
  const [clientSelfieBlobUrl, setClientSelfieBlobUrl] = useState<string>('');
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [contractAccepted, setContractAccepted] = useState<boolean>(false);
  const [pagareAccepted, setPagareAccepted] = useState<boolean>(false);
  const [hasPhysicalPagare, setHasPhysicalPagare] = useState<boolean>(false);
  const [contractAcceptedAt, setContractAcceptedAt] = useState<string>('');
  const [livenessStatus, setLivenessStatus] = useState<'idle' | 'ready' | 'in-progress' | 'completed' | 'failed'>('idle');
  const [idInfoConfirmed, setIdInfoConfirmed] = useState<boolean>(false);
  const [extractedIdFields, setExtractedIdFields] = useState<ExtractedIdFields>(EMPTY_EXTRACTED_ID_FIELDS);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [stripeAccountReady, setStripeAccountReady] = useState(false);
  const [stripeAccountError, setStripeAccountError] = useState('');
  const ocrRanForRef = useRef('');
  const [presenceResult, setPresenceResult] = useState<PresenceCaptureResult | null>(null);
  // Held in state (not just written straight to the upsert) because the face
  // validation agent scores the presence video alongside the pose photos.
  const [presenceVideoBlobUrl, setPresenceVideoBlobUrl] = useState<string>('');
  // Null when the agent could not be reached — distinct from a real negative
  // verdict, which arrives as { isValid: false }.
  const [faceValidation, setFaceValidation] = useState<FaceValidationResult | null>(null);
  const [contractSignatureBase64, setContractSignatureBase64] = useState<string>('');
  // Tracks the ClientFaceRecognition row created on first capture, so later
  // captures/scores update that same row instead of creating duplicates.
  const clientFaceRecognitionIdRef = useRef<number | undefined>(undefined);

  // The payment step differs by role. Lenders (and 'both') RECEIVE money, so
  // theirs is the payout account (identity + CLABE, NativeConnectOnboarding).
  // Borrowers are CHARGED for repayments, so theirs is a card on file
  // (SavedCardSetup); their payout account is deferred to disbursement, when
  // they actually receive the loan principal. This is why the wizard needs
  // both — gating the whole step off for borrowers (as it briefly did) left
  // them with no way to register the card their monthly repayments run on.
  const isPayoutClient =
    selectedClient?.clientType === 'lender' || selectedClient?.clientType === 'both';
  const paymentStepLabel = isPayoutClient ? 'Cuenta de pago' : 'Tarjeta';

  // Firma (signature) is its own step now, split out of Contrato: the client
  // accepts the terms on step 3, then signs on step 4, then (if the launch
  // includes it) the payment step is 5.
  const STEPS = continueToPayments
    ? ['Cliente y documento', 'Captura', 'Verificación', 'Contrato', 'Firma', paymentStepLabel]
    : ['Cliente y documento', 'Captura', 'Verificación', 'Contrato', 'Firma'];

  // Single source of truth for step tracking: logs EVERY step / capture
  // sub-step transition regardless of which handler (goNext, goBack, jump,
  // footer buttons, resume, submit, …) triggered it. Cheaper and far more
  // reliable than a console.log at each of the ~30 setStep/setCaptureSubStep
  // call sites, and it can't drift out of sync with them.
  useEffect(() => {
    console.log('[Expediente] STEP →', JSON.stringify({
      step,
      stepLabel: STEPS[step] ?? '(out of range)',
      captureSubStep: step === 1 ? captureSubStep : undefined,
      totalSteps: STEPS.length,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, captureSubStep]);

  // Runs OCR against the front+back ID captures as soon as both are ready —
  // in the background, independent of which step/sub-step is on screen.
  // Previously this only fired once the client actually reached the review
  // screen right after capture, so the fields were still empty/"loading"
  // right when shown. Kicking it off here instead means the ~30-60s the
  // client spends on presence capture + liveness gives the OCR call time to
  // finish well before the review UI (now shown at the Contrato step) ever
  // appears.
  useEffect(() => {
    if (!idFrontImageBase64 || !idBackImageBase64) return;
    const key = `${idFrontImageBase64.length}:${idBackImageBase64.length}`;
    if (ocrRanForRef.current === key) return;
    ocrRanForRef.current = key;

    let cancelled = false;
    console.log('[Expediente] OCR effect: running OCR on front+back captures', JSON.stringify({
      frontSource: idFrontImageBlobUrl ? 'blobUrl' : 'base64',
      backSource: idBackImageBlobUrl ? 'blobUrl' : 'base64',
      idFrontImageBlobUrl: idFrontImageBlobUrl || '(not uploaded yet)',
      idBackImageBlobUrl: idBackImageBlobUrl || '(not uploaded yet)',
    }));
    setOcrLoading(true);
    setOcrError('');

    // One call for both sides — the agent reconciles front/back itself, so
    // the old two-call + merge dance is gone. Blob URLs are used when the
    // early upload has already landed; base64 covers the case where it
    // hasn't (or failed), so OCR still starts as soon as the captures exist.
    extractIneFields({
      frontUrl: idFrontImageBlobUrl || undefined,
      backUrl: idBackImageBlobUrl || undefined,
      frontBase64: idFrontImageBase64,
      backBase64: idBackImageBase64,
    })
      .then(({ fields, lowConfidenceFields }) => {
        if (cancelled) return;
        console.log('[Expediente] OCR effect: result', JSON.stringify(fields), 'lowConfidence:', lowConfidenceFields);
        setExtractedIdFields(fields);
      })
      .catch((err) => {
        console.log('[Expediente] OCR effect: FAILED', String(err));
        if (!cancelled) {
          setOcrError('No se pudo leer la identificación automáticamente. Completa los datos manualmente.');
        }
      })
      .finally(() => {
        if (!cancelled) setOcrLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idFrontImageBase64, idBackImageBase64]);

  // Ensures a Stripe connected account exists before mounting the embedded
  // onboarding form at step 4 — the backend's create-or-refresh endpoint is
  // safe to call even if one already exists. Without this, StripeAccountOnboarding
  // called /stripe/account-session directly against a client who never had an
  // account, which always 404s with "No connected account found. Create one
  // first." (confirmed via device logs).
  const ensureStripeAccount = async () => {
    if (!deepLinkClientId || !companyId) return;
    setStripeAccountError('');
    try {
      await createOrRefreshStripeAccount(deepLinkClientId, companyId, `client${deepLinkClientId}@posgmo.mx`);
      console.log('[Expediente] ensureStripeAccount: ready');
      setStripeAccountReady(true);
    } catch (err) {
      console.log('[Expediente] ensureStripeAccount: FAILED', String(err));
      setStripeAccountError((err as Error).message ?? 'No se pudo preparar la cuenta bancaria.');
    }
  };

  useEffect(() => {
    // Only lenders need a Stripe connected account provisioned here. A
    // borrower's card-on-file setup goes through the Customer/SetupIntent flow
    // (SavedCardSetup), which creates no connected account — calling
    // ensureStripeAccount for them would mint an unused payout account and
    // reintroduce the deferred KYC we removed.
    if (step === 5 && isPayoutClient && !stripeAccountReady && !stripeAccountError) {
      ensureStripeAccount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isPayoutClient]);

  const validateStep = (): boolean => {
    if (step === 0) {
      if (!selectedClient) {
        setError('Por favor selecciona un cliente.');
        setShowToast(true);
        return false;
      }
      if (!documentType) {
        setError('Por favor selecciona un tipo de documento.');
        setShowToast(true);
        return false;
      }
    }
    if (step === 1 && (!idFrontImageBase64 || !idBackImageBase64 || livenessStatus !== 'completed')) {
      setError('Por favor completa la captura del documento y la validación facial.');
      setShowToast(true);
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => {
    if (step === 1 && captureSubStep !== 'doc-intro') {
      // Navigate back within capture sub-steps
      const prev: Record<CaptureSubStep, CaptureSubStep> = {
        'doc-intro': 'doc-intro',
        'front-capture': 'doc-intro',
        'front-review': 'front-capture',
        'flip-instruction': 'front-review',
        'back-capture': 'flip-instruction',
        'back-review': 'back-capture',
        'id-summary': 'back-review',
        'presence-intro': 'id-summary',
        'presence-capture': 'presence-intro',
        'liveness-intro': 'presence-capture',
        'liveness-active': 'liveness-intro',
        'processing': 'liveness-active',
      };
      setCaptureSubStep(prev[captureSubStep]);
    } else {
      setStep((s) => Math.max(s - 1, 0));
      setCaptureSubStep('doc-intro');
    }
  };

  const jump = (targetStep: number) => {
    // Once the contract is submitted the earlier steps are finished and locked.
    // Their in-memory capture data (base64 ID images, signature) is NOT
    // restored on a resumed session — only the blob URLs are — so letting a
    // completed client tap an earlier circle drops them on step 0 with no way
    // forward without re-capturing everything, which reads as "it erased all my
    // progress". Keep the circles as status indicators but block navigating
    // back out of a completed expediente.
    if (contractAccepted) {
      console.log('[Expediente] jump: ignored — expediente already submitted, steps locked');
      return;
    }
    if (targetStep < step) {
      setStep(targetStep);
      setCaptureSubStep('doc-intro');
    }
  };

  const showCaptureHelp = () => {
    setToastMessage('Coloca tu identificación dentro del marco, evita reflejos y mantenla firme.');
    setShowToast(true);
  };

  // Persists a capture to blob storage as soon as it's taken, instead of only
  // at the final "Verificar biometría" step — so the image survives even if
  // the user closes the wizard before finishing. Failures here are non-fatal:
  // the local base64 still lets the user continue, and the final verify step
  // remains a fallback.
  // 'selfie_*' sides are the five liveness poses (see FacePose). They land in
  // the same per-client selfies/ folder as the main selfie; the backend routes
  // on the prefix.
  type UploadSide = 'front' | 'back' | 'selfie' | `selfie_${FacePose}`;

  const uploadCapturedImage = async (side: UploadSide, base64: string) => {
    console.log(`[Expediente] uploadCapturedImage(${side}): starting, clientId =`, selectedClient?.clientId);
    if (!selectedClient) {
      console.log(`[Expediente] uploadCapturedImage(${side}): ABORT — no selectedClient`);
      return '';
    }
    try {
      const { blobUrl } = await uploadClientFaceRecognitionImage({
        companyId: Number(companyId),
        clientId: selectedClient.clientId,
        side,
        imageBase64: base64.split(',')[1],
      });
      console.log(`[Expediente] uploadCapturedImage(${side}): uploaded to blob →`, blobUrl);
      if (side === 'front') setIdFrontImageBlobUrl(blobUrl);
      if (side === 'back') setIdBackImageBlobUrl(blobUrl);
      const record = await upsertClientFaceRecognition(
        Number(companyId),
        selectedClient.clientId,
        documentType,
        side === 'front'
          ? { idFrontImageBlobUrl: blobUrl }
          : side === 'back'
          ? { idBackImageBlobUrl: blobUrl }
          : { clientSelfieBlobUrl: blobUrl },
        clientFaceRecognitionIdRef.current
      );
      console.log(`[Expediente] uploadCapturedImage(${side}): persisted, clientFaceRecognitionId =`, record.clientFaceRecognitionId);
      clientFaceRecognitionIdRef.current = record.clientFaceRecognitionId;
      return blobUrl;
    } catch (err) {
      console.error(`[Expediente] Failed to upload ${side} ID image early:`, err);
      return '';
    }
  };

  // Persists the presence (video + GPS) capture the same way uploadCapturedImage
  // does for ID photos: upload the blob, then upsert it onto the client's
  // ClientFaceRecognitions row so it survives even if the wizard is abandoned
  // before the final contract submission.
  const handlePresenceCapture = async (result: PresenceCaptureResult) => {
    console.log('[Expediente] handlePresenceCapture: captured, hasPosition =', result.latitude !== null);
    setPresenceResult(result);
    setCaptureSubStep('liveness-intro');
    if (!selectedClient) {
      console.log('[Expediente] handlePresenceCapture: ABORT — no selectedClient');
      return;
    }
    try {
      const { blobUrl } = await uploadPresenceCaptureApi({
        companyId: Number(companyId),
        clientId: selectedClient.clientId,
        videoBase64: result.videoBase64.split(',')[1],
      });
      console.log('[Expediente] handlePresenceCapture: uploaded to blob →', blobUrl);
      setPresenceVideoBlobUrl(blobUrl);
      const record = await upsertClientFaceRecognition(
        Number(companyId),
        selectedClient.clientId,
        documentType,
        {
          presenceVideoBlobUrl: blobUrl,
          presenceLatitude: result.latitude,
          presenceLongitude: result.longitude,
          presenceLocationAccuracyMeters: result.accuracyMeters,
          presenceCapturedAt: result.capturedAt,
        },
        clientFaceRecognitionIdRef.current
      );
      clientFaceRecognitionIdRef.current = record.clientFaceRecognitionId;
      console.log('[Expediente] handlePresenceCapture: persisted, clientFaceRecognitionId =', record.clientFaceRecognitionId);
    } catch (err) {
      console.error('[Expediente] Failed to upload presence capture:', err);
    }

    // Domicilio can't be read off the ID (see idOcr.ts) — reverse-geocode
    // the GPS just captured as the actual address source. Best-effort: a
    // failure here just leaves Domicilio empty/manual, same as before this
    // existed.
    if (result.latitude !== null && result.longitude !== null) {
      try {
        const { address } = await reverseGeocode(result.latitude, result.longitude);
        console.log('[Expediente] handlePresenceCapture: reverse-geocoded address =', address);
        if (address) setExtractedIdFields((prev) => ({ ...prev, domicilio: address }));
      } catch (err) {
        console.error('[Expediente] Reverse geocoding failed:', err);
      }
    }
  };

  const startLivenessSession = () => {
    // No extra biometric re-confirmation here — the app-level lock
    // (BiometricLockGate) already gated entry to this whole authenticated
    // session. Calling authenticateBiometric() again mid-wizard pauses/
    // resumes the app for its native prompt, which was derailing the wizard
    // (confirmed via device logs: the wizard's state was lost right after
    // this second prompt).
    console.log('[Expediente] startLivenessSession: user tapped "Iniciar proceso"');
    setError('');
    setLivenessStatus('in-progress');
    setCaptureSubStep('liveness-active');
  };

  // Runs entirely client-side via face-api.js: compares the descriptor computed
  // from the live selfie challenge against one computed from the captured ID
  // photo, instead of round-tripping through Azure's liveness-with-verify API.
  const handleLivenessComplete = async (result: FaceLivenessResult) => {
    console.log('[Expediente] handleLivenessComplete: liveness challenge finished, computing ID descriptor + match');
    setCaptureSubStep('processing');
    try {
      const idDescriptor = await getFaceDescriptorFromImage(idFrontImageBase64);
      if (!idDescriptor) {
        console.log('[Expediente] handleLivenessComplete: no face found in ID image, aborting');
        throw new Error('No se detectó un rostro en la identificación capturada. Vuelve a capturar el documento.');
      }

      const { distance, isMatch: localMatch } = compareFaceDescriptors(idDescriptor, result.descriptor);
      const localConfidence = distanceToConfidence(distance);
      console.log('[Expediente] handleLivenessComplete: LOCAL match — distance =', distance.toFixed(4), 'confidence =', localConfidence.toFixed(4), 'isMatch =', localMatch);

      const selfieBlobUrl = await uploadCapturedImage('selfie', result.selfieBase64);

      // Upload the five head positions captured during the challenge. These
      // are the evidence set the validation agent scores (front/up/down/
      // left/right + the presence video + the INE), so they go up even when
      // the local descriptor match failed — a failed match is exactly the
      // case a human or the agent needs the images to adjudicate.
      const poseEntries = Object.entries(result.posePhotos) as [FacePose, string][];
      const poseBlobUrls: Partial<Record<FacePose, string>> = {};
      for (const [pose, base64] of poseEntries) {
        if (!base64) continue;
        const url = await uploadCapturedImage(`selfie_${pose}`, base64);
        if (url) poseBlobUrls[pose] = url;
      }
      console.log('[Expediente] handleLivenessComplete: pose uploads =', JSON.stringify(poseBlobUrls));

      // The agent scores the whole evidence set — five head positions, the
      // presence video and the INE — and its verdict supersedes the local
      // descriptor comparison. face-api.js only answers "do these two faces
      // look alike"; it cannot see that the camera was pointed at a phone, or
      // that all five poses are the same frame because the challenge was never
      // performed. Those are the failures that matter for KYC.
      //
      // Falling back to the local score when the agent is unreachable is
      // deliberate: an outage must not read as a failed identity check, and it
      // must not silently pass one either — the local comparison still ran.
      const agentResult = await validateFaceSession({
        front:    poseBlobUrls.front ? { url: poseBlobUrls.front } : undefined,
        up:       poseBlobUrls.up    ? { url: poseBlobUrls.up }    : undefined,
        down:     poseBlobUrls.down  ? { url: poseBlobUrls.down }  : undefined,
        left:     poseBlobUrls.left  ? { url: poseBlobUrls.left }  : undefined,
        right:    poseBlobUrls.right ? { url: poseBlobUrls.right } : undefined,
        video:    presenceVideoBlobUrl ? { url: presenceVideoBlobUrl } : undefined,
        // Prefer the full-res front for the INE-portrait comparison; fall back
        // to the ~1100px OCR image if the hi-res upload didn't land.
        ineFront: (idFrontHiResBlobUrl || idFrontImageBlobUrl)
          ? { url: idFrontHiResBlobUrl || idFrontImageBlobUrl }
          : undefined,
      });

      const confidence = agentResult ? agentResult.confidence : localConfidence;
      const isMatch    = agentResult ? agentResult.isValid    : localMatch;
      setFaceValidation(agentResult);
      console.log('[Expediente] handleLivenessComplete: verdict source =', agentResult ? 'agent' : 'local fallback',
        JSON.stringify({ confidence, isMatch, localConfidence, localMatch }));

      setConfidenceScore(confidence);
      setIsVerified(isMatch);
      setClientSelfieBlobUrl(selfieBlobUrl);
      setLivenessStatus(isMatch ? 'completed' : 'failed');

      // Promote the verified 'front' capture to the client's profile avatar.
      // Persist to dbo.users.imageUrl (survives logout) targeting the KYC
      // subject by clientId — this works for both self-serve and agent-assisted
      // flows. Only refresh the in-session avatar when the subject IS the
      // logged-in user (self-serve), so an agent's own avatar is never changed.
      if (isMatch && poseBlobUrls.front && selectedClient?.clientId) {
        try {
          await saveProfileImage({ clientId: Number(selectedClient.clientId) }, poseBlobUrls.front);
          if (contextClientId && Number(selectedClient.clientId) === contextClientId) {
            setAvatarUrl(poseBlobUrls.front);
          }
          console.log('[Expediente] handleLivenessComplete: saved front capture as profile avatar');
        } catch (avatarErr) {
          console.warn('[Expediente] handleLivenessComplete: could not save front photo as avatar:', avatarErr);
        }
      }

      if (clientFaceRecognitionIdRef.current) {
        console.log('[Expediente] handleLivenessComplete: persisting confidenceScore/isVerified onto record', clientFaceRecognitionIdRef.current);
        await upsertClientFaceRecognition(
          Number(companyId),
          Number(selectedClient?.clientId),
          documentType,
          { confidenceScore: confidence, isVerified: isMatch },
          clientFaceRecognitionIdRef.current
        );
        console.log('[Expediente] handleLivenessComplete: persisted successfully');
      } else {
        console.log('[Expediente] handleLivenessComplete: WARNING — no clientFaceRecognitionId yet, score not persisted');
      }

      // Prefer the agent's own reason over the generic message — it can say
      // "the poses are all the same frame" or "the ID portrait is unreadable",
      // which tells the client what to actually change.
      setToastMessage(
        isMatch
          ? 'Validación facial completada correctamente.'
          : agentResult?.failureReasons?.length
            ? agentResult.failureReasons[0]
            : 'El rostro no coincide con la identificación. Vuelve a intentarlo.'
      );
      setShowToast(true);
      setStep(2);
      setCaptureSubStep('doc-intro');
    } catch (err) {
      console.log('[Expediente] handleLivenessComplete: FAILED', err);
      setLivenessStatus('failed');
      setError((err as Error).message ?? 'No se pudo completar la validación facial. Vuelve a intentarlo.');
      setShowToast(true);
      setCaptureSubStep('liveness-intro');
    }
  };

  const handleContinueToContract = () => {
    console.log('[Expediente] handleContinueToContract: isVerified =', isVerified);
    if (!isVerified) {
      setError('La verificación facial no fue exitosa. Vuelve a capturar la validación facial.');
      setShowToast(true);
      return;
    }
    setStep(3);
  };

  // Going back from the verification summary previously reset captureSubStep
  // to 'doc-intro', forcing a full front+back ID re-capture just to retry a
  // failed face match. Front/back images are still valid here, so only send
  // the user back into the liveness challenge.
  const handleBackFromVerification = () => {
    console.log('[Expediente] handleBackFromVerification: returning to liveness-intro, keeping ID captures');
    setStep(1);
    setCaptureSubStep('liveness-intro');
  };

  const resetWizard = () => {
    setStep(0);
    setCaptureSubStep('doc-intro');
    setSelectedClient(null);
    setDocumentType('');
    setIdFrontImageBase64('');
    setIdBackImageBase64('');
    setIdFrontImageBlobUrl('');
    setIdBackImageBlobUrl('');
    setClientSelfieBlobUrl('');
    setConfidenceScore(0);
    setIsVerified(false);
    setContractAccepted(false);
    setPagareAccepted(false);
    setHasPhysicalPagare(false);
    setContractAcceptedAt('');
    setLivenessStatus('idle');
    setIdInfoConfirmed(false);
    setPresenceVideoBlobUrl('');
    setFaceValidation(null);
    setExtractedIdFields(EMPTY_EXTRACTED_ID_FIELDS);
    setPresenceResult(null);
    setContractSignatureBase64('');
    clientFaceRecognitionIdRef.current = undefined;
  };

  const handleSubmitContract = async () => {
    // confidenceScore now comes from the validation agent's whole-session
    // verdict, not the local two-descriptor comparison — 'scoreSource' makes
    // clear which produced it, because a local-fallback score means the agent
    // never ran and the anti-spoofing checks did not happen.
    console.log('[Expediente] handleSubmitContract: starting,', JSON.stringify({
      contractAccepted,
      isVerified,
      confidenceScore,
      scoreSource: faceValidation ? 'agent' : 'local-fallback',
      failedChecks: (faceValidation?.checks ?? []).filter((c) => c.status === 'FAIL').map((c) => c.name),
      assetsEvaluated: faceValidation?.assetsEvaluated ?? [],
    }));
    if (!contractAccepted) {
      setError('Por favor acepta los términos del contrato para continuar.');
      setShowToast(true);
      return;
    }
    if (!contractSignatureBase64) {
      setError('Por favor firma para validar tu identidad.');
      setShowToast(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const now = new Date().toISOString();
      setContractAcceptedAt(now);

      // Best-effort crop of the printed signature off the ID front photo, for
      // automated comparison against the signature just drawn above — only
      // meaningful for INE (see signatureCrop.ts); failures here shouldn't
      // block submission, they just mean no automated match is attempted.
      let idSignatureCropBase64 = '';
      if (documentType === 'INE' && idFrontImageBase64) {
        try {
          idSignatureCropBase64 = await cropIneSignatureRegion(idFrontImageBase64);
        } catch (cropErr) {
          console.log('[Expediente] handleSubmitContract: signature crop FAILED', cropErr);
        }
      }

      const pdfParams = {
        clientId: Number(selectedClient?.clientId),
        nombre: extractedIdFields.nombre,
        domicilio: extractedIdFields.domicilio,
        curp: extractedIdFields.curp,
        claveElector: extractedIdFields.claveElector,
        fechaNacimiento: extractedIdFields.fechaNacimiento,
        documentType,
        isVerified,
        confidenceScore,
        acceptedAtISO: now,
        signatureDataUrl: contractSignatureBase64,
      };

      const payload: ContractSubmissionRequest = {
        clientFaceRecognitionId: clientFaceRecognitionIdRef.current,
        companyId: Number(companyId),
        clientId: Number(selectedClient?.clientId),
        documentType,
        idFrontImageBlobUrl,
        idBackImageBlobUrl,
        clientSelfieBlobUrl,
        confidenceScore,
        isVerified,
        nombre: extractedIdFields.nombre,
        domicilio: extractedIdFields.domicilio,
        curp: extractedIdFields.curp,
        claveElector: extractedIdFields.claveElector,
        fechaNacimiento: extractedIdFields.fechaNacimiento,
        contractAccepted: true,
        contractPdfBase64: generateContractPdfBase64(pdfParams),
        contractAcceptedAt: now,
        pagareAccepted: true,
        pagarePdfBase64: generatePagarePdfBase64({ ...pdfParams, hasPhysicalPagare }),
        hasPhysicalPagare,
        idSignatureCropBase64: idSignatureCropBase64 ? idSignatureCropBase64.split(',')[1] : undefined,
        contractSignatureBase64: contractSignatureBase64.split(',')[1],
        userId: 0,
      };
      console.log('[Expediente] handleSubmitContract: submitting payload', {
        clientId: payload.clientId,
        documentType: payload.documentType,
        idFrontImageBlobUrl: payload.idFrontImageBlobUrl,
        clientSelfieBlobUrl: payload.clientSelfieBlobUrl,
        confidenceScore: payload.confidenceScore,
        isVerified: payload.isVerified,
      });

      const response = await submitContractClientFaceRecognition(payload);
      console.log('[Expediente] handleSubmitContract: response =', response);

      if (response.error) {
        console.log('[Expediente] handleSubmitContract: backend returned an error', response.error, response.msg);
        setError(response.error);
        setToastMessage(`Error al enviar el contrato: ${response.msg || ''}`);
        setShowToast(true);
      } else {
        setToastMessage('¡Contrato aceptado y enviado exitosamente!');
        setShowToast(true);
        if (continueToPayments) {
          console.log('[Expediente] handleSubmitContract: SUCCESS — advancing to payment step');
          setStep(5);
        } else {
          // Hand back to whoever opened the wizard rather than resetWizard(),
          // which sets step 0 and left the client staring at "Cliente y
          // documento" again — indistinguishable from the submit having
          // failed. There is no payout step for borrowers any more (that is
          // deferred to disbursement), so the contract IS the last step.
          console.log('[Expediente] handleSubmitContract: SUCCESS — expediente complete, returning to', returnTo);
          resetWizard();
          history.push(returnTo);
        }
      }
    } catch (err) {
      console.log('[Expediente] handleSubmitContract: FAILED', err);
      setError((err as Error).message ?? 'Error al enviar el contrato');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const StepBar = () => (
    <div className="wizard-step-indicator">
      {STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className="wizard-step-item">
            <button
              className={`wizard-step-circle${i === step ? ' active' : ''}${i < step ? ' completed' : ''}`}
              onClick={() => jump(i)}
              style={{ cursor: (!contractAccepted && i < step) ? 'pointer' : 'default', border: 'none' }}
            >
              {i < step ? <IonIcon icon={checkmark} /> : i + 1}
            </button>
            <span className={`wizard-step-label${i === step ? ' active' : ''}${i < step ? ' completed' : ''}`}>{s}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`wizard-step-connector${i < step ? ' completed' : ''}`} />}
        </React.Fragment>
      ))}
    </div>
  );

  const Footer = () => {
    if (step === 1) {
      // Capture sub-step footers
      if (captureSubStep === 'processing' || captureSubStep === 'liveness-active' || captureSubStep === 'presence-capture') return null;

      if (captureSubStep === 'doc-intro') {
        return (
          <div className="wizard-footer">
            <button className="wizard-footer-back" onClick={goBack}>
              <IonIcon icon={chevronForward} style={{ transform: 'rotate(180deg)' }} /> Cancelar
            </button>
            <div className="wizard-footer-spacer" />
            <button className="wizard-footer-next" onClick={() => setCaptureSubStep('front-capture')}>
              Capturar <IonIcon icon={cameraOutline} />
            </button>
          </div>
        );
      }

      if (captureSubStep === 'front-capture') {
        return (
          <div className="wizard-footer">
            <button className="wizard-footer-back" onClick={goBack}>
              <IonIcon icon={chevronForward} style={{ transform: 'rotate(180deg)' }} /> Cancelar
            </button>
          </div>
        );
      }

      if (captureSubStep === 'front-review') {
        return (
          <div className="wizard-footer">
            <button className="wizard-footer-back" onClick={() => {
              setIdFrontImageBase64('');
              setIdInfoConfirmed(false);
              setExtractedIdFields(EMPTY_EXTRACTED_ID_FIELDS);
              setCaptureSubStep('front-capture');
            }}>
              <IonIcon icon={refreshOutline} /> Volver a capturar
            </button>
            <div className="wizard-footer-spacer" />
            <button className="wizard-footer-next" onClick={() => setCaptureSubStep('flip-instruction')}>
              Continuar <IonIcon icon={chevronForward} />
            </button>
          </div>
        );
      }

      if (captureSubStep === 'flip-instruction') {
        return (
          <div className="wizard-footer">
            <button className="wizard-footer-back" onClick={goBack}>
              <IonIcon icon={chevronForward} style={{ transform: 'rotate(180deg)' }} /> Cancelar
            </button>
            <div className="wizard-footer-spacer" />
            <button className="wizard-footer-next" onClick={() => setCaptureSubStep('back-capture')}>
              Capturar <IonIcon icon={cameraOutline} />
            </button>
          </div>
        );
      }

      if (captureSubStep === 'back-capture') {
        return (
          <div className="wizard-footer">
            <button className="wizard-footer-back" onClick={goBack}>
              <IonIcon icon={chevronForward} style={{ transform: 'rotate(180deg)' }} /> Cancelar
            </button>
          </div>
        );
      }

      if (captureSubStep === 'back-review') {
        return (
          <div className="wizard-footer">
            <button className="wizard-footer-back" onClick={() => {
              setIdBackImageBase64('');
              setIdInfoConfirmed(false);
              setExtractedIdFields(EMPTY_EXTRACTED_ID_FIELDS);
              setCaptureSubStep('back-capture');
            }}>
              <IonIcon icon={refreshOutline} /> Volver a capturar
            </button>
            <div className="wizard-footer-spacer" />
            <button className="wizard-footer-next" onClick={() => setCaptureSubStep('id-summary')}>
              Continuar <IonIcon icon={chevronForward} />
            </button>
          </div>
        );
      }

      if (captureSubStep === 'id-summary') {
        return (
          <div className="wizard-footer">
            <button className="wizard-footer-back" onClick={goBack}>
              <IonIcon icon={chevronForward} style={{ transform: 'rotate(180deg)' }} /> Atrás
            </button>
            <div className="wizard-footer-spacer" />
            <button
              className="wizard-footer-submit"
              disabled={!idInfoConfirmed}
              onClick={() => setCaptureSubStep('presence-intro')}
            >
              Confirmar y continuar
            </button>
          </div>
        );
      }

      if (captureSubStep === 'presence-intro') {
        return (
          <div className="wizard-footer">
            <button className="wizard-footer-back" onClick={goBack}>
              <IonIcon icon={chevronForward} style={{ transform: 'rotate(180deg)' }} /> Atrás
            </button>
            <div className="wizard-footer-spacer" />
            <button className="wizard-footer-next" onClick={() => setCaptureSubStep('presence-capture')}>
              Continuar <IonIcon icon={chevronForward} />
            </button>
          </div>
        );
      }

      if (captureSubStep === 'liveness-intro') {
        return (
          <div className="wizard-footer">
            <button className="wizard-footer-back" onClick={goBack}>
              <IonIcon icon={chevronForward} style={{ transform: 'rotate(180deg)' }} /> Cancelar
            </button>
            <div className="wizard-footer-spacer" />
            <button className="wizard-footer-next" onClick={startLivenessSession}>
              Iniciar proceso <IonIcon icon={chevronForward} />
            </button>
          </div>
        );
      }

      return null;
    }

    if (step === 5) {
      // Payment — the embedded Stripe form / card setup drives its own
      // completion, there's nothing to submit/go-back to here.
      return null;
    }

    return (
      <div className="wizard-footer">
        {step > 0 && (
          <button
            className="wizard-footer-back"
            onClick={step === 2 ? handleBackFromVerification : goBack}
          >
            <IonIcon icon={chevronForward} style={{ transform: 'rotate(180deg)' }} /> Atrás
          </button>
        )}
        <div className="wizard-footer-spacer" />
        {step === 0 && (
          <button className="wizard-footer-next" onClick={goNext}>
            Siguiente <IonIcon icon={chevronForward} />
          </button>
        )}
        {step === 2 && (
          <button className="wizard-footer-submit" onClick={handleContinueToContract} disabled={loading}>
            Continuar
          </button>
        )}
        {step === 3 && (
          // Terms accepted here; signing happens on the next step (Firma).
          <button className="wizard-footer-next" onClick={() => setStep(4)} disabled={!contractAccepted || !pagareAccepted}>
            Continuar <IonIcon icon={chevronForward} />
          </button>
        )}
        {step === 4 && (
          // Firma — the actual submission, now that the signature exists.
          <button className="wizard-footer-submit" onClick={handleSubmitContract} disabled={!contractAccepted || !pagareAccepted || !contractSignatureBase64 || loading}>
            Enviar contrato
          </button>
        )}
      </div>
    );
  };

  // ── Capture sub-step renderers ──────────────────────────────────────────────

  const renderCaptureSubStep = () => {
    if (captureSubStep === 'doc-intro') {
      return (
        <IonCard className="client-face-recognition-step-card cfr-capture-card">
          <IonCardContent>
            <h2 className="cfr-capture-title">Verifica tu documento</h2>
            <p className="cfr-capture-desc">
              Al dar clic en Capturar deberás autorizar el acceso a la cámara de tu teléfono para
              escanear tu identificación original (no se permiten fotocopias).
            </p>
            <div className="cfr-illustration">
              <div className="cfr-phone-id-illustration">
                <IonIcon icon={idCardOutline} className="cfr-illus-id-icon" />
              </div>
            </div>
          </IonCardContent>
        </IonCard>
      );
    }

    if (captureSubStep === 'front-capture') {
      return (
        <GuidedDocumentCapture
          title="Parte delantera"
          instructions="Muestre la parte delantera del documento a cámara."
          onHelp={showCaptureHelp}
          onCapture={(base64, highResBase64) => {
            setIdFrontImageBase64(base64);
            // Drop the previous blob URL the moment a new photo is taken.
            // The OCR effect prefers URLs and fires on the base64 change, so
            // without this it races the upload and sends the PREVIOUS image —
            // on a resumed expediente that is a capture from another session
            // entirely. Clearing it makes the effect fall back to this
            // base64 until the new upload lands.
            setIdFrontImageBlobUrl('');
            setIdFrontHiResBlobUrl('');
            setCaptureSubStep('front-review');
            uploadCapturedImage('front', base64);
            // Upload the full-res front separately (does NOT touch the record's
            // idFrontImageBlobUrl / OCR image) and keep its URL for the agent.
            if (highResBase64 && selectedClient) {
              uploadClientFaceRecognitionImage({
                companyId: Number(companyId),
                clientId: selectedClient.clientId,
                side: 'front_hires',
                imageBase64: highResBase64.split(',')[1],
              })
                .then(({ blobUrl }) => {
                  console.log('[Expediente] front_hires uploaded to blob →', blobUrl);
                  setIdFrontHiResBlobUrl(blobUrl);
                })
                .catch((err) => console.warn('[Expediente] front_hires upload failed:', err));
            }
          }}
        />
      );
    }

    if (captureSubStep === 'front-review') {
      return (
        <IonCard className="client-face-recognition-step-card cfr-capture-card">
          <IonCardContent>
            <h2 className="cfr-capture-title">Asegúrate de que tu identificación sea legible</h2>
            {idFrontImageBase64 && (
              <ZoomableImage src={idFrontImageBase64} alt="Frente" className="cfr-review-image" />
            )}
          </IonCardContent>
        </IonCard>
      );
    }

    if (captureSubStep === 'flip-instruction') {
      return (
        <IonCard className="client-face-recognition-step-card cfr-capture-card">
          <IonCardContent>
            <h2 className="cfr-capture-title">Ahora coloca tu identificación con la parte trasera hacia arriba</h2>
            <div className="cfr-illustration">
              <div className="cfr-flip-illustration">
                <IonIcon icon={idCardOutline} className="cfr-illus-id-icon cfr-illus-id-back" />
                <div className="cfr-flip-arrow">↺</div>
              </div>
            </div>
          </IonCardContent>
        </IonCard>
      );
    }

    if (captureSubStep === 'back-capture') {
      return (
        <GuidedDocumentCapture
          title="Parte trasera"
          instructions="Muestre la parte trasera del documento a cámara."
          onHelp={showCaptureHelp}
          onCapture={(base64) => {
            setIdBackImageBase64(base64);
            // See the front capture — clears the stale URL so OCR can't run
            // against the previous back image while this one uploads.
            setIdBackImageBlobUrl('');
            setCaptureSubStep('back-review');
            uploadCapturedImage('back', base64);
          }}
        />
      );
    }

    if (captureSubStep === 'back-review') {
      return (
        <IonCard className="client-face-recognition-step-card cfr-capture-card">
          <IonCardContent>
            <h2 className="cfr-capture-title">Asegúrate de que tu identificación sea legible</h2>
            {idBackImageBase64 && (
              <ZoomableImage src={idBackImageBase64} alt="Reverso" className="cfr-review-image" />
            )}
          </IonCardContent>
        </IonCard>
      );
    }

    if (captureSubStep === 'id-summary') {
      return (
        <IonCard className="client-face-recognition-step-card cfr-capture-card">
          <IonCardContent>
            <h2 className="cfr-capture-title">Confirma que la información sea correcta</h2>
            <p className="cfr-capture-desc">
              Revisa las capturas de la identificación antes de continuar con la validación facial. Los datos
              extraídos de tu identificación se revisan más adelante, antes de firmar el contrato.
            </p>

            <div className="ion-margin-top">
              <p><strong>Cliente:</strong> {selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : '—'}</p>
              <p><strong>Teléfono:</strong> {selectedClient?.cellphone || '—'}</p>
              <p><strong>Email:</strong> {selectedClient?.email || '—'}</p>
              <p><strong>Documento:</strong> {documentType || '—'}</p>
            </div>

            <div className="id-summary-images">
              <div className="id-summary-image-card">
                <span className="id-preview-title">Frente</span>
                {idFrontImageBase64 && <ZoomableImage src={idFrontImageBase64} alt="Frente" className="cfr-review-image" />}
              </div>
              <div className="id-summary-image-card">
                <span className="id-preview-title">Reverso</span>
                {idBackImageBase64 && <ZoomableImage src={idBackImageBase64} alt="Reverso" className="cfr-review-image" />}
              </div>
            </div>

            <IonItem className="ion-margin-top" lines="none">
              <IonLabel className="ion-text-wrap">Confirmo que la información y las capturas de la identificación son correctas</IonLabel>
              <IonCheckbox
                checked={idInfoConfirmed}
                onIonChange={(e: CustomEvent<{ checked: boolean }>) => setIdInfoConfirmed(e.detail.checked)}
              />
            </IonItem>
          </IonCardContent>
        </IonCard>
      );
    }

    if (captureSubStep === 'presence-intro') {
      return (
        <IonCard className="client-face-recognition-step-card cfr-capture-card">
          <IonCardContent>
            <h2 className="cfr-capture-title">Verificación de presencia</h2>
            <p className="cfr-capture-desc">
              Vamos a grabar un video breve y registrar tu ubicación exacta como evidencia de que
              completaste este registro en persona. Esto ayuda a verificar tu domicilio cuando la
              identificación no es legible por OCR.
            </p>
          </IonCardContent>
        </IonCard>
      );
    }

    if (captureSubStep === 'presence-capture') {
      return (
        <IonCard className="client-face-recognition-step-card cfr-capture-card">
          <IonCardContent>
            <h2 className="cfr-capture-title">Verificación de presencia</h2>
            <PresenceCapture onCapture={handlePresenceCapture} />
          </IonCardContent>
        </IonCard>
      );
    }

    if (captureSubStep === 'liveness-intro') {
      return (
        <IonCard className="client-face-recognition-step-card cfr-capture-card">
          <IonCardContent>
            <h2 className="cfr-capture-title">Mueve la cabeza hacia el lado señalado</h2>
            <p className="cfr-capture-desc">
              Asegúrate de no llevar gafas de sol, gorras u otros elementos que tapen tu cara.
            </p>
            <div className="cfr-illustration">
              <div className="cfr-face-circle">
                <IonIcon icon={personOutline} className="cfr-face-icon" />
                <div className="cfr-face-dashes" />
              </div>
            </div>
          </IonCardContent>
        </IonCard>
      );
    }

    if (captureSubStep === 'liveness-active') {
      return (
        <IonCard className="client-face-recognition-step-card cfr-capture-card">
          <IonCardContent>
            <h2 className="cfr-capture-title">Validación de vida</h2>
            <p className="cfr-capture-desc">Coloca tu cara al centro y sigue las indicaciones en pantalla.</p>
            <FaceLivenessCapture
              onComplete={handleLivenessComplete}
              onCancel={() => setCaptureSubStep('liveness-intro')}
            />
          </IonCardContent>
        </IonCard>
      );
    }

    if (captureSubStep === 'processing') {
      return (
        <div className="cfr-processing-screen">
          <IonSpinner name="crescent" className="cfr-processing-spinner" />
          <h2 className="cfr-processing-title">Cargando...</h2>
          <p className="cfr-processing-desc">Espera unos segundos</p>
        </div>
      );
    }

    return null;
  };

  // ── Main step renderers ─────────────────────────────────────────────────────

  const renderStepContent = () => {
    // Deep-linked open still resolving the client + existing expediente — show
    // a placeholder until we know which step to land on, so the step content
    // doesn't flash the wrong state and then jump.
    if (!clientLoaded || !resumeLoaded) {
      return (
        <IonCard className="client-face-recognition-step-card">
          <IonCardContent>
            <div className="cfr-step-loading">
              <IonSpinner name="crescent" />
              <p>Cargando...</p>
            </div>
          </IonCardContent>
        </IonCard>
      );
    }

    if (step === 0) {
      return (
        <IonCard className="client-face-recognition-step-card">
          <IonCardHeader>
            <IonCardTitle>Paso 1: Cliente y Documento</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>Selecciona un cliente y el tipo de documento: INE, Pasaporte o Licencia de Conducir.</p>

            <IonButton expand="block" fill="outline" onClick={() => setClientSelectorOpen(true)} className="ion-margin-top">
              {selectedClient ? `Cliente: ${selectedClient.first_name} ${selectedClient.last_name}` : 'Seleccionar cliente'}
            </IonButton>

            <IonList className="client-face-recognition-radio-list ion-margin-top">
              <IonListHeader>
                <IonLabel>Selecciona el tipo de documento</IonLabel>
              </IonListHeader>
              <IonRadioGroup
                value={documentType}
                onIonChange={(e: CustomEvent<{ value: 'INE' | 'Passport' | 'Driver License' }>) => setDocumentType(e.detail.value)}
              >
                <IonItem>
                  <IonLabel>INE</IonLabel>
                  <IonRadio value="INE" />
                </IonItem>
                <IonItem>
                  <IonLabel>Pasaporte</IonLabel>
                  <IonRadio value="Passport" />
                </IonItem>
                <IonItem>
                  <IonLabel>Licencia de Conducir</IonLabel>
                  <IonRadio value="Driver License" />
                </IonItem>
              </IonRadioGroup>
            </IonList>
          </IonCardContent>
        </IonCard>
      );
    }

    if (step === 1) {
      return renderCaptureSubStep();
    }

    if (step === 2) {
      return (
        <IonCard className="client-face-recognition-step-card">
          <IonCardHeader>
            <IonCardTitle>Paso 3: Verificación Biométrica</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>Ejecuta la verificación biométrica para continuar al contrato.</p>

            <div className="id-preview-grid ion-margin-top">
              <div className="id-preview-card">
                <span className="id-preview-title">Frente</span>
                {idFrontImageBase64
                  ? <ZoomableImage src={idFrontImageBase64} alt="ID Front" className="captured-image captured-image-small" />
                  : <div className="id-preview-placeholder">Sin captura</div>}
              </div>
              <div className="id-preview-card">
                <span className="id-preview-title">Reverso</span>
                {idBackImageBase64
                  ? <ZoomableImage src={idBackImageBase64} alt="ID Back" className="captured-image captured-image-small" />
                  : <div className="id-preview-placeholder">Sin captura</div>}
              </div>
            </div>

            <div className="ion-margin-top">
              <p><strong>Cliente:</strong> {selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : '—'}</p>
              <p><strong>Documento:</strong> {documentType || '—'}</p>
              <p><strong>Coincidencia facial:</strong> {isVerified ? `Verificada ✓ (${(confidenceScore * 100).toFixed(1)}%)` : 'No verificada'}</p>
              <p><strong>Liveness:</strong> {livenessStatus}</p>
            </div>
          </IonCardContent>
        </IonCard>
      );
    }

    if (step === 3) return (
      <IonCard className="client-face-recognition-step-card">
        <IonCardHeader>
          <IonCardTitle>Paso 4: Aceptación de Contrato</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <p>Revisa el resumen, acepta términos y envía la solicitud.</p>

          <div className="ion-margin-vertical">
            <p><strong>Cliente:</strong> {selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : '—'}</p>
            <p><strong>Documento:</strong> {documentType || '—'}</p>
            <p><strong>Puntaje de confianza:</strong> {confidenceScore > 0 ? confidenceScore.toFixed(4) : '—'}</p>
            <p><strong>Estado:</strong> {isVerified ? 'Verificado ✓' : 'No verificado'}</p>
            <p><strong>Presencia registrada:</strong> {presenceResult ? 'Sí ✓' : 'No'}</p>
            <p><strong>Contrato aceptado en:</strong> {contractAcceptedAt || 'Pendiente de envío'}</p>
          </div>

          <IdExtractedFieldsSummary
            fields={extractedIdFields}
            onFieldsChange={setExtractedIdFields}
            ocrLoading={ocrLoading}
            ocrError={ocrError}
          />

          <IonContent className="contract-terms-content ion-padding" scrollY={true}>
            <p><strong>Términos y Condiciones del Contrato:</strong></p>
            <p>Al marcar la siguiente casilla, reconoces que has leído, entendido y aceptas todos los términos y condiciones de este contrato.</p>
          </IonContent>

          <IonItem>
            <IonLabel>Acepto los términos del contrato de crédito</IonLabel>
            <IonCheckbox
              checked={contractAccepted}
              onIonChange={(e: CustomEvent<{ checked: boolean }>) => setContractAccepted(e.detail.checked)}
            />
          </IonItem>

          <IonItem>
            <IonLabel>Acepto y firmo electrónicamente el pagaré</IonLabel>
            <IonCheckbox
              checked={pagareAccepted}
              onIonChange={(e: CustomEvent<{ checked: boolean }>) => setPagareAccepted(e.detail.checked)}
            />
          </IonItem>

          <IonItem>
            <IonLabel>¿El pagaré físico está en resguardo?</IonLabel>
            <IonCheckbox
              checked={hasPhysicalPagare}
              onIonChange={(e: CustomEvent<{ checked: boolean }>) => setHasPhysicalPagare(e.detail.checked)}
            />
          </IonItem>

        </IonCardContent>
      </IonCard>
    );

    // step === 4 — Firma. Split out of the Contrato step so signing is its own
    // deliberate action after the client has accepted the terms. This is where
    // the contract is actually submitted, because the generated PDF embeds the
    // signature drawn here.
    if (step === 4) return (
      <IonCard className="client-face-recognition-step-card">
        <IonCardHeader>
          <IonCardTitle>Paso 5: Firma</IonCardTitle>
        </IonCardHeader>
        <IonCardContent>
          <p>Firma para validar tu identidad y enviar el contrato y el pagaré.</p>
          <div className="ion-margin-top">
            <SignaturePad
              label="Firma aquí para validar tu identidad"
              onSave={(dataUrl) => setContractSignatureBase64(dataUrl)}
              onClear={() => setContractSignatureBase64('')}
            />
            {contractSignatureBase64 && <p style={{ color: '#059669', fontSize: 13 }}>Firma guardada ✓</p>}
          </div>
        </IonCardContent>
      </IonCard>
    );

    // step === 5 — the payment step, reached after a successful contract
    // submission when the wizard was launched with continueToPayments.
    // Borrowers register a repayment card; lenders register a payout account.
    if (deepLinkClientId && companyId) {
      if (!isPayoutClient) {
        // Borrower — card on file for automatic monthly repayment charges.
        // No connected account / KYC here; that is deferred to disbursement.
        return (
          <IonCard className="client-face-recognition-step-card">
            <IonCardHeader>
              <IonCardTitle>Paso 5: Tarjeta para cobros automáticos</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>Registra la tarjeta con la que se cobrarán automáticamente las cuotas de tu préstamo cada mes.</p>
              <SavedCardSetup
                clientId={deepLinkClientId}
                companyId={companyId}
                onSaved={() => {
                  console.log('[Expediente] step 4: repayment card saved, returning to', returnTo);
                  setToastMessage('Tarjeta registrada correctamente.');
                  setShowToast(true);
                  history.push(returnTo);
                }}
              />
            </IonCardContent>
          </IonCard>
        );
      }
      // Lender (or 'both') — payout account that receives repayments.
      return (
        <IonCard className="client-face-recognition-step-card">
          <IonCardHeader>
            <IonCardTitle>Paso 5: Cuenta de pago</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>Registra tu cuenta bancaria o tarjeta de débito para recibir pagos.</p>
            {stripeAccountError && (
              <div className="stripe-onboarding-error">
                <p>{stripeAccountError}</p>
                <IonButton size="small" fill="outline" onClick={ensureStripeAccount}>Reintentar</IonButton>
              </div>
            )}
            {!stripeAccountError && !stripeAccountReady && (
              <div className="stripe-onboarding-loading">
                <IonSpinner name="crescent" />
                <p>Preparando tu cuenta...</p>
              </div>
            )}
            {stripeAccountReady && (
              <NativeConnectOnboarding
                clientId={deepLinkClientId}
                companyId={companyId}
                email={`client${deepLinkClientId}@posgmo.mx`}
                onProgress={(done) => { if (done) history.push(returnTo); }}
                // Stripe wants exactly the identity we just read off the INE a
                // few steps ago — seed it rather than making the client type
                // their CURP and address again.
                prefill={buildKycPrefill(extractedIdFields, selectedClient?.cellphone)}
              />
            )}
          </IonCardContent>
        </IonCard>
      );
    }
    return null;
  };

  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Reconocimiento Facial — POS GMO"
      />
      <AlertPopover
        isOpen={popoverState.showAlertPopover}
        event={popoverState.event}
        onDidDismiss={dismissAlertPopover}
      />
      <MailPopover
        isOpen={popoverState.showMailPopover}
        event={popoverState.event}
        onDidDismiss={dismissMailPopover}
      />

      <ClientSelector
        isOpen={clientSelectorOpen}
        onClose={() => setClientSelectorOpen(false)}
        selectedClient={selectedClient}
        onChange={(client) => setSelectedClient(client)}
      />

      <IonLoading isOpen={loading} message={'Por favor espera...'} />
      <IonToast
        isOpen={showToast}
        message={toastMessage || error}
        duration={3000}
        onDidDismiss={() => {
          setShowToast(false);
          setToastMessage('');
          setError('');
        }}
        color={error ? 'danger' : 'success'}
      />

      <IonContent fullscreen className="ion-padding client-face-recognition-page">
        <StepBar />
        {renderStepContent()}
      </IonContent>

      <Footer />
    </IonPage>
  );
};

export default ClientFaceRecognitionPage;
