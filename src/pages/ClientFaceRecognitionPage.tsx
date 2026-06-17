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
} from '@ionic/react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { checkmark, chevronForward } from 'ionicons/icons';
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

const ClientFaceRecognitionPage: React.FC = () => {
  const { companyId } = useUser();

  const [step, setStep] = useState(0);
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
      setError('Por favor captura frente y reverso de la identificación e inicia la validación facial.');
      setShowToast(true);
      return false;
    }
    return true;
  };

  const goNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, 3));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const jump = (targetStep: number) => {
    if (targetStep < step) setStep(targetStep);
  };

  const takePicture = async (setImageBase64: React.Dispatch<React.SetStateAction<string>>) => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });
      if (photo.base64String) {
        setImageBase64(`data:image/jpeg;base64,${photo.base64String}`);
      }
    } catch (err) {
      setError((err as Error).message ?? 'Error al capturar la imagen');
      setShowToast(true);
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

  const Footer = () => (
    <div className="wizard-footer">
      {step > 0 && (
        <button className="wizard-footer-back" onClick={goBack}>
          <IonIcon icon={chevronForward} style={{ transform: 'rotate(180deg)' }} /> Atrás
        </button>
      )}
      <div className="wizard-footer-spacer" />
      {step < 2 && (
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
      return (
        <IonCard className="client-face-recognition-step-card">
          <IonCardHeader>
            <IonCardTitle>Paso 2: Captura con Cámara</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>Usa la cámara para capturar frente y reverso del documento, luego activa validación facial (Azure Liveness).</p>
            <IonButton expand="block" onClick={() => takePicture(setIdFrontImageBase64)} className="ion-margin-bottom">
              Capturar frente de identificación
            </IonButton>
            {(idFrontImageBase64 || idBackImageBase64) && (
              <div className="id-preview-grid">
                <div className="id-preview-card">
                  <span className="id-preview-title">Frente</span>
                  {idFrontImageBase64 ? (
                    <img src={idFrontImageBase64} alt="ID Front" className="captured-image captured-image-small" />
                  ) : (
                    <div className="id-preview-placeholder">Sin captura</div>
                  )}
                </div>

                <div className="id-preview-card">
                  <span className="id-preview-title">Reverso</span>
                  {idBackImageBase64 ? (
                    <img src={idBackImageBase64} alt="ID Back" className="captured-image captured-image-small" />
                  ) : (
                    <div className="id-preview-placeholder">Sin captura</div>
                  )}
                </div>
              </div>
            )}

            <IonButton expand="block" onClick={() => takePicture(setIdBackImageBase64)} className="ion-margin-top ion-margin-bottom">
              Capturar reverso de identificación
            </IonButton>

            <IonButton
              expand="block"
              className="ion-margin-top ion-margin-bottom"
              onClick={async () => {
                try {
                  setLivenessStatus('in-progress');
                  const { sessionId, authToken } = await (await import('../api/clientFaceRecognitionApi'))
                    .createClientFaceRecognitionSession(Number(companyId), Number(selectedClient?.clientId));
                  setAzureSessionId(sessionId);
                  setAzureAuthToken(authToken);
                  setLivenessStatus('completed');
                  setToastMessage('Sesión de validación facial iniciada correctamente.');
                  setShowToast(true);
                } catch (err) {
                  setLivenessStatus('failed');
                  setError((err as Error).message ?? 'No se pudo iniciar la sesión de validación facial');
                  setShowToast(true);
                }
              }}
            >
              Iniciar Validación Facial
            </IonButton>

            <div className="ion-margin-top">
              <p><strong>Estado Liveness:</strong> {livenessStatus}</p>
              <p><strong>Azure Session ID:</strong> {azureSessionId || 'Pendiente'}</p>
              <p><strong>Token:</strong> {azureAuthToken ? 'Recibido' : 'Pendiente'}</p>
            </div>
          </IonCardContent>
        </IonCard>
      );
    }

    if (step === 2) {
      return (
        <IonCard className="client-face-recognition-step-card">
          <IonCardHeader>
            <IonCardTitle>Paso 3: Verificación Biométrica</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p>Ejecuta la verificación biométrica para continuar al contrato.</p>
            <div className="ion-margin-top">
              <p><strong>Cliente:</strong> {selectedClient ? `${selectedClient.first_name} ${selectedClient.last_name}` : '—'}</p>
              <p><strong>Documento:</strong> {documentType || '—'}</p>
              <p><strong>Frente ID:</strong> {idFrontImageBase64 ? 'Capturada' : 'Pendiente'}</p>
              <p><strong>Reverso ID:</strong> {idBackImageBase64 ? 'Capturada' : 'Pendiente'}</p>
              <p><strong>Sesión Azure:</strong> {azureSessionId ? 'Iniciada' : 'Pendiente'}</p>
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
            <p><strong>Estado:</strong> {isVerified ? 'Verificado' : 'No verificado'}</p>
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
