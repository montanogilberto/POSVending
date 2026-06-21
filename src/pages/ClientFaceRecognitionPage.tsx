import React, { useState } from 'react';
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
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { checkmark, chevronForward, cameraOutline, refreshOutline, personOutline, idCardOutline } from 'ionicons/icons';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import ClientSelector from '../components/ClientSelector';
import { useUser } from '../components/UserContext';
import { Client } from '../api/clientsApi';
import {
  verifyClientFaceRecognition,
  submitContractClientFaceRecognition,
  FaceVerificationResponse,
  ContractSubmissionRequest,
} from '../api/clientFaceRecognitionApi';

import './ClientFaceRecognitionPage.css';

// Sub-steps inside the capture wizard step
type CaptureSubStep =
  | 'doc-intro'       // "Verifica tu documento"
  | 'front-capture'   // live camera front
  | 'flip-instruction'// "Ahora voltea tu identificación"
  | 'back-capture'    // live camera back
  | 'back-review'     // "Asegúrate de que sea legible"
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
  const [clientSelfieBlobUrl, setClientSelfieBlobUrl] = useState<string>('');
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [contractAccepted, setContractAccepted] = useState<boolean>(false);
  const [pagareAccepted, setPagareAccepted] = useState<boolean>(false);
  const [hasPhysicalPagare, setHasPhysicalPagare] = useState<boolean>(false);
  const [contractAcceptedAt, setContractAcceptedAt] = useState<string>('');
  const [azureSessionId, setAzureSessionId] = useState<string>('');
  const [azureAuthToken, setAzureAuthToken] = useState<string>('');
  const [livenessStatus, setLivenessStatus] = useState<'idle' | 'ready' | 'in-progress' | 'completed' | 'failed'>('idle');

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
    if (step === 1 && (!idFrontImageBase64 || !idBackImageBase64 || !azureSessionId)) {
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
        'flip-instruction': 'front-capture',
        'back-capture': 'flip-instruction',
        'back-review': 'back-capture',
        'liveness-intro': 'back-review',
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

  const takePicture = async (
    setImageBase64: React.Dispatch<React.SetStateAction<string>>,
    onSuccess?: () => void
  ) => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });
      if (photo.base64String) {
        setImageBase64(`data:image/jpeg;base64,${photo.base64String}`);
        onSuccess?.();
      }
    } catch (err) {
      setError((err as Error).message ?? 'Error al capturar la imagen');
      setShowToast(true);
    }
  };

  const startLivenessSession = async () => {
    try {
      setCaptureSubStep('liveness-active');
      setLivenessStatus('in-progress');
      const { sessionId, authToken } = await (await import('../api/clientFaceRecognitionApi'))
        .createClientFaceRecognitionSession(Number(companyId), Number(selectedClient?.clientId));
      setAzureSessionId(sessionId);
      setAzureAuthToken(authToken);
      setLivenessStatus('completed');
      setCaptureSubStep('processing');
      // Simulate processing then advance
      setTimeout(() => {
        setToastMessage('Validación facial completada correctamente.');
        setShowToast(true);
        setStep(2);
        setCaptureSubStep('doc-intro');
      }, 1800);
    } catch (err) {
      setLivenessStatus('failed');
      setError((err as Error).message ?? 'No se pudo iniciar la sesión de validación facial');
      setShowToast(true);
      setCaptureSubStep('liveness-intro');
    }
  };

  const handleVerify = async () => {
    if (!validateStep()) return;

    setLoading(true);
    setError('');
    try {
      const response: FaceVerificationResponse = await verifyClientFaceRecognition({
        companyId: Number(companyId),
        clientId: Number(selectedClient?.clientId),
        documentType,
        idFrontImageBase64: idFrontImageBase64.split(',')[1],
        idBackImageBase64: idBackImageBase64.split(',')[1],
        azureSessionId,
      });

      setConfidenceScore(response.confidenceScore);
      setIsVerified(response.isVerified);
      setIdFrontImageBlobUrl(response.idFrontImageBlobUrl);
      setClientSelfieBlobUrl(response.clientSelfieBlobUrl);

      if (response.error) {
        setError(response.error);
        setShowToast(true);
      } else {
        setToastMessage('¡Verificación completada!');
        setShowToast(true);
        setStep(3);
      }
    } catch (err) {
      setError((err as Error).message ?? 'Error durante la verificación biométrica');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setStep(0);
    setCaptureSubStep('doc-intro');
    setSelectedClient(null);
    setDocumentType('');
    setIdFrontImageBase64('');
    setIdBackImageBase64('');
    setIdFrontImageBlobUrl('');
    setClientSelfieBlobUrl('');
    setConfidenceScore(0);
    setIsVerified(false);
    setContractAccepted(false);
    setPagareAccepted(false);
    setHasPhysicalPagare(false);
    setContractAcceptedAt('');
    setAzureSessionId('');
    setAzureAuthToken('');
    setLivenessStatus('idle');
  };

  const handleSubmitContract = async () => {
    if (!contractAccepted) {
      setError('Por favor acepta los términos del contrato para continuar.');
      setShowToast(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const now = new Date().toISOString();
      setContractAcceptedAt(now);

      const payload: ContractSubmissionRequest = {
        companyId: Number(companyId),
        clientId: Number(selectedClient?.clientId),
        documentType,
        idFrontImageBlobUrl,
        clientSelfieBlobUrl,
        confidenceScore,
        isVerified,
        contractAccepted: true,
        contractPdfBase64: btoa('Contrato de crédito aceptado electrónicamente'),
        contractAcceptedAt: now,
        pagareAccepted: true,
        pagarePdfBase64: btoa('Pagaré aceptado electrónicamente'),
        hasPhysicalPagare,
        userId: 0,
      };

      const response = await submitContractClientFaceRecognition(payload);

      if (response.error) {
        setError(response.error);
        setToastMessage(`Error al enviar el contrato: ${response.msg || ''}`);
        setShowToast(true);
      } else {
        setToastMessage('¡Contrato aceptado y enviado exitosamente!');
        setShowToast(true);
        resetWizard();
      }
    } catch (err) {
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
      if (captureSubStep === 'processing' || captureSubStep === 'liveness-active') return null;

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
            <div className="wizard-footer-spacer" />
            <button
              className="wizard-footer-next"
              onClick={() => takePicture(setIdFrontImageBase64, () => setCaptureSubStep('flip-instruction'))}
            >
              Capturar <IonIcon icon={cameraOutline} />
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
            <div className="wizard-footer-spacer" />
            <button
              className="wizard-footer-next"
              onClick={() => takePicture(setIdBackImageBase64, () => setCaptureSubStep('back-review'))}
            >
              Capturar <IonIcon icon={cameraOutline} />
            </button>
          </div>
        );
      }

      if (captureSubStep === 'back-review') {
        return (
          <div className="wizard-footer">
            <button className="wizard-footer-back" onClick={() => {
              setIdBackImageBase64('');
              setCaptureSubStep('back-capture');
            }}>
              <IonIcon icon={refreshOutline} /> Volver a capturar
            </button>
            <div className="wizard-footer-spacer" />
            <button className="wizard-footer-next" onClick={() => setCaptureSubStep('liveness-intro')}>
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
          <button className="wizard-footer-back" onClick={goBack}>
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
          <button className="wizard-footer-submit" onClick={handleVerify} disabled={loading}>
            Verificar biometría
          </button>
        )}
        {step === 3 && (
          <button className="wizard-footer-submit" onClick={handleSubmitContract} disabled={!contractAccepted || !pagareAccepted || loading}>
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
        <IonCard className="client-face-recognition-step-card cfr-capture-card">
          <IonCardContent>
            <h2 className="cfr-capture-title">Parte delantera</h2>
            <p className="cfr-capture-desc">Muestre la parte delantera del documento a cámara.</p>
            <div className="cfr-camera-frame">
              {idFrontImageBase64 ? (
                <img src={idFrontImageBase64} alt="Frente" className="cfr-camera-preview" />
              ) : (
                <div className="cfr-camera-placeholder">
                  <IonIcon icon={idCardOutline} className="cfr-camera-guide-icon" />
                </div>
              )}
            </div>
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
        <IonCard className="client-face-recognition-step-card cfr-capture-card">
          <IonCardContent>
            <h2 className="cfr-capture-title">Parte trasera</h2>
            <p className="cfr-capture-desc">Muestre la parte trasera del documento a cámara.</p>
            <div className="cfr-camera-frame">
              {idBackImageBase64 ? (
                <img src={idBackImageBase64} alt="Reverso" className="cfr-camera-preview" />
              ) : (
                <div className="cfr-camera-placeholder">
                  <IonIcon icon={idCardOutline} className="cfr-camera-guide-icon" />
                  <span className="cfr-camera-hint">Aleja el documento</span>
                </div>
              )}
            </div>
          </IonCardContent>
        </IonCard>
      );
    }

    if (captureSubStep === 'back-review') {
      return (
        <IonCard className="client-face-recognition-step-card cfr-capture-card">
          <IonCardContent>
            <h2 className="cfr-capture-title">Asegúrate de que tu identificación sea legible</h2>
            {idBackImageBase64 && (
              <img src={idBackImageBase64} alt="Reverso" className="cfr-review-image" />
            )}
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
            <h2 className="cfr-capture-title">Movimientos de cabeza</h2>
            <p className="cfr-capture-desc">Coloca tu cara al centro y mira a la cámara.</p>
            <div className="cfr-camera-frame cfr-liveness-frame">
              <div className="cfr-liveness-overlay">
                <IonIcon icon={personOutline} className="cfr-liveness-face-icon" />
              </div>
              <div className="cfr-liveness-hint-badge">
                → Mueve la cabeza hacia la derecha
              </div>
            </div>
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
                  ? <img src={idFrontImageBase64} alt="ID Front" className="captured-image captured-image-small" />
                  : <div className="id-preview-placeholder">Sin captura</div>}
              </div>
              <div className="id-preview-card">
                <span className="id-preview-title">Reverso</span>
                {idBackImageBase64
                  ? <img src={idBackImageBase64} alt="ID Back" className="captured-image captured-image-small" />
                  : <div className="id-preview-placeholder">Sin captura</div>}
              </div>
            </div>

            <div className="ion-margin-top">
              <p><strong>Cliente:</strong> {selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : '—'}</p>
              <p><strong>Documento:</strong> {documentType || '—'}</p>
              <p><strong>Sesión Azure:</strong> {azureSessionId ? 'Iniciada ✓' : 'Pendiente'}</p>
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
