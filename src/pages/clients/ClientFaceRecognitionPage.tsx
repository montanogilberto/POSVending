import React, { useRef, useState } from 'react';
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
import FaceLivenessCapture, { FaceLivenessResult } from '../../components/FaceLivenessCapture';
import IdExtractedFieldsSummary from '../../components/IdExtractedFieldsSummary';
import ZoomableImage from '../../components/ZoomableImage';
import PresenceCapture, { PresenceCaptureResult } from '../../components/PresenceCapture';
import SignaturePad from '../../components/SignaturePad';
import { useUser } from '../../components/UserContext';
import { Client } from '../../api/clientsApi';
import {
  submitContractClientFaceRecognition,
  uploadClientFaceRecognitionImage,
  upsertClientFaceRecognition,
  uploadPresenceCapture as uploadPresenceCaptureApi,
  reverseGeocode,
  ContractSubmissionRequest,
} from '../../api/clientFaceRecognitionApi';
import { isBiometricLockEnabled, authenticateBiometric } from '../../utils/biometricAuth';
import { getFaceDescriptorFromImage, compareFaceDescriptors, distanceToConfidence } from '../../utils/faceLiveness';
import { ExtractedIdFields } from '../../utils/idOcr';
import { cropIneSignatureRegion } from '../../utils/signatureCrop';

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
  const { companyId } = useUser();

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
  const [documentType, setDocumentType] = useState<'INE' | 'Passport' | 'Driver License' | ''>('');
  const [idFrontImageBase64, setIdFrontImageBase64] = useState<string>('');
  const [idBackImageBase64, setIdBackImageBase64] = useState<string>('');
  const [idFrontImageBlobUrl, setIdFrontImageBlobUrl] = useState<string>('');
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
  const [presenceResult, setPresenceResult] = useState<PresenceCaptureResult | null>(null);
  const [contractSignatureBase64, setContractSignatureBase64] = useState<string>('');
  // Tracks the ClientFaceRecognition row created on first capture, so later
  // captures/scores update that same row instead of creating duplicates.
  const clientFaceRecognitionIdRef = useRef<number | undefined>(undefined);

  const STEPS = ['Cliente y documento', 'Captura', 'Verificación', 'Contrato'];

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
  const uploadCapturedImage = async (side: 'front' | 'back' | 'selfie', base64: string) => {
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

  const startLivenessSession = async () => {
    console.log('[Expediente] startLivenessSession: user tapped "Iniciar proceso"');
    if (await isBiometricLockEnabled()) {
      console.log('[Expediente] startLivenessSession: biometric lock enabled, requesting device confirmation first');
      const confirmed = await authenticateBiometric('Confirma tu identidad para iniciar la verificación');
      console.log('[Expediente] startLivenessSession: biometric confirmation result =', confirmed);
      if (!confirmed) return;
    }
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

      const { distance, isMatch } = compareFaceDescriptors(idDescriptor, result.descriptor);
      const confidence = distanceToConfidence(distance);
      console.log('[Expediente] handleLivenessComplete: match result — distance =', distance.toFixed(4), 'confidence =', confidence.toFixed(4), 'isMatch =', isMatch);

      const selfieBlobUrl = await uploadCapturedImage('selfie', result.selfieBase64);

      setConfidenceScore(confidence);
      setIsVerified(isMatch);
      setClientSelfieBlobUrl(selfieBlobUrl);
      setLivenessStatus(isMatch ? 'completed' : 'failed');

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

      setToastMessage(
        isMatch ? 'Validación facial completada correctamente.' : 'El rostro no coincide con la identificación. Vuelve a intentarlo.'
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
    setExtractedIdFields(EMPTY_EXTRACTED_ID_FIELDS);
    setPresenceResult(null);
    setContractSignatureBase64('');
    clientFaceRecognitionIdRef.current = undefined;
  };

  const handleSubmitContract = async () => {
    console.log('[Expediente] handleSubmitContract: starting, contractAccepted =', contractAccepted, 'isVerified =', isVerified, 'confidenceScore =', confidenceScore);
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
        contractAccepted: true,
        contractPdfBase64: btoa('Contrato de crédito aceptado electrónicamente'),
        contractAcceptedAt: now,
        pagareAccepted: true,
        pagarePdfBase64: btoa('Pagaré aceptado electrónicamente'),
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
        console.log('[Expediente] handleSubmitContract: SUCCESS — record persisted, resetting wizard');
        setToastMessage('¡Contrato aceptado y enviado exitosamente!');
        setShowToast(true);
        resetWizard();
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
              style={{ cursor: i < step ? 'pointer' : 'default', border: 'none' }}
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
          onCapture={(base64) => {
            setIdFrontImageBase64(base64);
            setCaptureSubStep('front-review');
            uploadCapturedImage('front', base64);
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
              Revisa los datos y las capturas de la identificación antes de continuar con la validación facial.
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

            <IdExtractedFieldsSummary
              idFrontImageBase64={idFrontImageBase64}
              idBackImageBase64={idBackImageBase64}
              fields={extractedIdFields}
              onFieldsChange={setExtractedIdFields}
            />

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

    return (
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

          {contractAccepted && pagareAccepted && (
            <div className="ion-margin-top">
              <p><strong>Firma electrónica:</strong></p>
              <SignaturePad
                label="Firma aquí para validar tu identidad"
                onSave={(dataUrl) => setContractSignatureBase64(dataUrl)}
                onClear={() => setContractSignatureBase64('')}
              />
              {contractSignatureBase64 && <p style={{ color: '#059669', fontSize: 13 }}>Firma guardada ✓</p>}
            </div>
          )}
        </IonCardContent>
      </IonCard>
    );
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
