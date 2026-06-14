import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  IonPage,
  IonContent,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonRadioGroup,
  IonRadio,
  IonLabel,
  IonItem,
  IonTextarea,
  IonCheckbox,
  IonInput,
  IonSpinner,
  IonLoading,
  IonToast,
  IonAlert,
  RadioGroupChangeEventDetail,
  CheckboxChangeEventDetail,
  InputInputEventDetail,
} from '@ionic/react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import { UserContext } from '../components/UserContext';
import {
  verifyClientFaceRecognition,
  contractClientFaceRecognition,
  FaceVerificationResponse,
  ClientFaceRecognition,
} from '../api/clientFaceRecognitionApi';

import './ClientFaceRecognitionPage.css';

// UTC-7 date conversion utility
const toHermosillo = (utc: string | undefined): string => {
  if (!utc) return '';
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString();
};

interface WizardFormData {
  companyId: number;
  documentType: 'INE' | 'Passport' | 'Driver License' | '';
  idFrontImageBase64: string;
  clientSelfieBase64: string;
  idFrontImageBlobUrl?: string;
  clientSelfieBlobUrl?: string;
  confidenceScore: number;
  isVerified: boolean;
  contractAccepted: boolean;
  acceptedAt: string;
  contractPdfBase64?: string;
}

const ClientFaceRecognitionPage: React.FC = () => {
  const { user } = useContext(UserContext);
  const companyId = user?.companyId;

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<WizardFormData>({
    companyId: companyId ?? 0,
    documentType: '',
    idFrontImageBase64: '',
    clientSelfieBase64: '',
    confidenceScore: 0,
    isVerified: false,
    contractAccepted: false,
    acceptedAt: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);

  // Popover states
  const [popoverState, setPopoverState] = useState<{ showAlertPopover: boolean; showMailPopover: boolean; event?: Event }>({ showAlertPopover: false, showMailPopover: false });
  const presentAlertPopover = (e: React.MouseEvent) => setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  const dismissAlertPopover = () => setPopoverState({ ...popoverState, showAlertPopover: false });
  const presentMailPopover = (e: React.MouseEvent) => setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  const dismissMailPopover = () => setPopoverState({ ...popoverState, showMailPopover: false });

  const handleInputChange = (e: CustomEvent<InputInputEventDetail> | CustomEvent<RadioGroupChangeEventDetail> | CustomEvent<CheckboxChangeEventDetail>) => {
    const { name, value, checked } = e.detail;
    setFormData(prev => ({
      ...prev,
      [name as string]: typeof checked === 'boolean' ? checked : value,
    }));
  };

  const handleNext = () => {
    // Basic validation before moving to the next step
    if (currentStep === 1 && !formData.documentType) {
      setToastMessage('Por favor, selecciona un tipo de documento.');
      setShowToast(true);
      return;
    }
    if (currentStep === 2 && (!formData.idFrontImageBase64 || !formData.clientSelfieBase64)) {
      setToastMessage('Por favor, captura ambas imágenes.');
      setShowToast(true);
      return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Capacitor Camera implementation placeholder
  const captureImage = async (type: 'idFront' | 'selfie') => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      if (photo.base64String) {
        if (type === 'idFront') {
          setFormData(prev => ({ ...prev, idFrontImageBase64: `data:image/jpeg;base64,${photo.base64String}` }));
          setToastMessage('Imagen frontal de ID capturada.');
        } else {
          setFormData(prev => ({ ...prev, clientSelfieBase64: `data:image/jpeg;base64,${photo.base64String}` }));
          setToastMessage('Selfie del cliente capturada.');
        }
        setShowToast(true);
      }
    } catch (err) {
      setError((err as Error).message ?? 'Error al capturar la imagen.');
    }
  };

  const handleVerifyBiometrics = async () => {
    if (!companyId) {
      setError('ID de compañía no disponible. Por favor, inicia sesión de nuevo.');
      return;
    }
    if (!formData.idFrontImageBase64 || !formData.clientSelfieBase64 || !formData.documentType) {
      setError('Faltan imágenes o tipo de documento para la verificación.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const verificationPayload = {
        companyId,
        documentType: formData.documentType,
        idFrontImageBase64: formData.idFrontImageBase64.split(',')[1], // Remove data URI prefix
        clientSelfieBase64: formData.clientSelfieBase64.split(',')[1], // Remove data URI prefix
      };
      const result: FaceVerificationResponse = await verifyClientFaceRecognition(verificationPayload);

      setFormData(prev => ({
        ...prev,
        isVerified: result.isVerified,
        confidenceScore: result.confidenceScore,
        idFrontImageBlobUrl: result.idFrontImageBlobUrl,
        clientSelfieBlobUrl: result.clientSelfieBlobUrl,
      }));

      setToastMessage(result.isVerified ? `Verificación exitosa con ${result.confidenceScore.toFixed(2)} de confianza.` : `Verificación fallida. Puntuación: ${result.confidenceScore.toFixed(2)}`);
      setShowToast(true);
      setShowVerificationAlert(true);
    } catch (err) {
      setError((err as Error).message ?? 'Error durante la verificación biométrica.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitContract = async () => {
    if (!companyId) {
      setError('ID de compañía no disponible. Por favor, inicia sesión de nuevo.');
      return;
    }
    if (!formData.contractAccepted) {
      setToastMessage('Debe aceptar los términos del contrato para finalizar.');
      setShowToast(true);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const submissionPayload: ClientFaceRecognition = {
        ...formData,
        companyId,
        acceptedAt: new Date().toISOString(),
        // Ensure blob URLs are present from verification step
        idFrontImageBlobUrl: formData.idFrontImageBlobUrl!,
        clientSelfieBlobUrl: formData.clientSelfieBlobUrl!,
      };

      // Remove base64 strings if blob URLs are available for final persistence
      delete (submissionPayload as any).idFrontImageBase64;
      delete (submissionPayload as any).clientSelfieBase64;

      await contractClientFaceRecognition(submissionPayload);
      setToastMessage('Contrato y verificación guardados exitosamente.');
      setShowToast(true);
      // Reset form or navigate away
      setFormData({
        companyId: companyId ?? 0,
        documentType: '',
        idFrontImageBase64: '',
        clientSelfieBase64: '',
        confidenceScore: 0,
        isVerified: false,
        contractAccepted: false,
        acceptedAt: '',
      });
      setCurrentStep(1);
    } catch (err) {
      setError((err as Error).message ?? 'Error al guardar el contrato.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <IonCard className="client-face-recognition-card">
            <IonCardHeader>
              <IonCardTitle>DocumentSelectionStep</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>IonRadioGroup selecting documentType from: INE, Passport, or Driver License.</p>
              <IonRadioGroup
                value={formData.documentType}
                onIonChange={(e: CustomEvent<RadioGroupChangeEventDetail>) => handleInputChange({ detail: { name: 'documentType', value: e.detail.value } } as any)}
                className="ion-margin-vertical"
              >
                <IonItem>
                  <IonRadio value="INE">INE</IonRadio>
                </IonItem>
                <IonItem>
                  <IonRadio value="Passport">Pasaporte</IonRadio>
                </IonItem>
                <IonItem>
                  <IonRadio value="Driver License">Licencia de Conducir</IonRadio>
                </IonItem>
              </IonRadioGroup>
              <IonButton expand="block" onClick={handleNext} className="ion-margin-top">Siguiente</IonButton>
            </IonCardContent>
          </IonCard>
        );
      case 2:
        return (
          <IonCard className="client-face-recognition-card">
            <IonCardHeader>
              <IonCardTitle>CameraCaptureStep</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>Capacitor Camera interface capturing 2 separate images: idFrontImageBlobUrl and clientSelfieBlobUrl.</p>
              <IonButton expand="block" onClick={() => captureImage('idFront')} className="ion-margin-vertical">
                Capturar Imagen Frontal de ID
              </IonButton>
              {formData.idFrontImageBase64 && <img src={formData.idFrontImageBase64} alt="ID Front" className="captured-image-thumbnail" />}

              <IonButton expand="block" onClick={() => captureImage('selfie')} className="ion-margin-vertical">
                Capturar Selfie del Cliente
              </IonButton>
              {formData.clientSelfieBase64 && <img src={formData.clientSelfieBase64} alt="Client Selfie" className="captured-image-thumbnail" />}

              <div className="ion-margin-top client-face-recognition-actions">
                <IonButton fill="outline" onClick={handleBack}>Atrás</IonButton>
                <IonButton onClick={handleNext}>Siguiente</IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        );
      case 3:
        return (
          <IonCard className="client-face-recognition-card">
            <IonCardHeader>
              <IonCardTitle>BiometricVerificationStep</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>Displays matching progress status along with the resulting AI confirmation metric (isVerified).</p>
              <IonButton expand="block" onClick={handleVerifyBiometrics} disabled={loading} className="ion-margin-vertical">
                {loading ? <IonSpinner name="crescent" /> : 'Realizar Verificación Biométrica'}
              </IonButton>
              {formData.isVerified !== undefined && (
                <div className="ion-margin-vertical">
                  <IonItem lines="none">
                    <IonLabel>Estado de Verificación:</IonLabel>
                    <IonInput value={formData.isVerified ? 'Verificado' : 'No Verificado'} readonly className={formData.isVerified ? 'verified-text' : 'not-verified-text'} />
                  </IonItem>
                  <IonItem lines="none">
                    <IonLabel>Puntuación de Confianza:</IonLabel>
                    <IonInput value={formData.confidenceScore.toFixed(4)} readonly />
                  </IonItem>
                </div>
              )}
              <div className="ion-margin-top client-face-recognition-actions">
                <IonButton fill="outline" onClick={handleBack}>Atrás</IonButton>
                <IonButton onClick={handleNext} disabled={!formData.isVerified}>Siguiente</IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        );
      case 4:
        return (
          <IonCard className="client-face-recognition-card">
            <IonCardHeader>
              <IonCardTitle>ContractAgreementStep</IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p>Presents terms and conditions text bound to an IonCheckbox indicating contractAccepted.</p>
              <IonTextarea
                label="Términos y Condiciones:"
                labelPlacement="stacked"
                value="[Placeholder para términos y condiciones del contrato legal. Aquí iría el texto completo que el cliente debe aceptar.]"
                rows={8}
                readonly
                className="ion-margin-vertical"
              ></IonTextarea>
              <IonItem lines="none">
                <IonCheckbox
                  name="contractAccepted"
                  checked={formData.contractAccepted}
                  onIonChange={(e: CustomEvent<CheckboxChangeEventDetail>) => handleInputChange({ detail: { name: 'contractAccepted', checked: e.detail.checked } } as any)}
                >
                  Acepto los términos del contrato.
                </IonCheckbox>
              </IonItem>
              {formData.acceptedAt && <IonItem lines="none"><IonLabel>Fecha de Aceptación: {toHermosillo(formData.acceptedAt)}</IonLabel></IonItem>}

              <div className="ion-margin-top client-face-recognition-actions">
                <IonButton fill="outline" onClick={handleBack}>Atrás</IonButton>
                <IonButton onClick={handleSubmitContract} disabled={!formData.contractAccepted}>Finalizar Contrato</IonButton>
              </div>
            </IonCardContent>
          </IonCard>
        );
      default:
        return <p>Paso de Wizard no encontrado.</p>;
    }
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

      <IonContent className="ion-padding client-face-recognition-page-content">
        {renderStep()}

        <IonLoading isOpen={loading} message="Por favor espera..." />
        <IonToast
          isOpen={showToast}
          message={toastMessage}
          duration={3000}
          onDidDismiss={() => setShowToast(false)}
          color={error ? 'danger' : 'success'}
        />
        <IonToast
          isOpen={!!error}
          message={error}
          duration={5000}
          onDidDismiss={() => setError('')}
          color="danger"
        />
        <IonAlert
          isOpen={showVerificationAlert}
          onDidDismiss={() => setShowVerificationAlert(false)}
          header={'Resultado de Verificación'}
          message={formData.isVerified ? 'La verificación biométrica fue exitosa.' : 'La verificación biométrica falló. Por favor, intente de nuevo.'}
          buttons={['OK']}
        />
      </IonContent>
    </IonPage>
  );
};

export default ClientFaceRecognitionPage;
