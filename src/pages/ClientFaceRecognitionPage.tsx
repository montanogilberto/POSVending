import React, { useState, useEffect, useContext } from 'react';
import {
  IonPage,
  IonContent,
  IonLoading,
  IonToast,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonRadioGroup,
  IonRadio,
  IonLabel,
  IonItem,
  IonCheckbox,
} from '@ionic/react';
import { chevronBackOutline, chevronForwardOutline, cameraOutline, documentTextOutline, shieldCheckmarkOutline, readerOutline } from 'ionicons/icons';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import {
  ClientFaceRecognition,
  createClientFaceRecognition,
  verifyClientFaceRecognition,
  submitContractClientFaceRecognition,
  FaceVerificationRequest,
  FaceVerificationResponse,
  ContractSubmissionRequest,
} from '../api/clientFaceRecognitionApi';
import { UserContext } from '../components/UserContext';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'; // Assuming Capacitor Camera is available and configured

// UTC-7 date conversion
const toHermosillo = (utc: string | undefined): string => {
  if (!utc) return '';
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString();
};

const ClientFaceRecognitionPage: React.FC = () => {
  const { companyId } = useContext(UserContext);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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

  const [formData, setFormData] = useState<{
    documentType: 'INE' | 'Passport' | 'Driver License' | '';
    idFrontImageBase64: string;
    clientSelfieBase64: string;
    idFrontImageBlobUrl: string; // Store blob URLs after verification
    clientSelfieBlobUrl: string; // Store blob URLs after verification
    confidenceScore: number;
    isVerified: boolean;
    contractAccepted: boolean;
    acceptedAt: string;
  }> ({
    documentType: '',
    idFrontImageBase64: '',
    clientSelfieBase64: '',
    idFrontImageBlobUrl: '',
    clientSelfieBlobUrl: '',
    confidenceScore: 0,
    isVerified: false,
    contractAccepted: false,
    acceptedAt: '',
  });

  // Mock contract terms (replace with actual terms)
  const contractTerms = `\n    Términos y Condiciones del Servicio de Verificación Biométrica\n    1. Aceptación de los Términos: Al utilizar este servicio, usted acepta estar sujeto a estos términos y condiciones.\n    2. Recopilación de Datos: Se recopilarán imágenes de su documento de identificación y un selfie para fines de verificación biométrica. Estos datos serán tratados con la máxima confidencialidad y seguridad.\n    3. Uso de la Información: La información biométrica se utilizará exclusivamente para validar su identidad contra el documento proporcionado y para fines de cumplimiento normativo. No se compartirá con terceros sin su consentimiento explícito, salvo que sea requerido por ley.\n    4. Almacenamiento de Datos: Sus imágenes y resultados de verificación se almacenarán de forma segura en Azure Blob Storage, con acceso restringido y cifrado, por un período determinado según la política de retención de datos de la empresa.\n    5. Consentimiento para el Procesamiento: Usted da su consentimiento para el procesamiento de sus datos biométricos tal como se describe en esta sección.\n    6. Exactitud de la Información: Usted es responsable de proporcionar información precisa y veraz.\n    7. Modificaciones a los Términos: La empresa se reserva el derecho de modificar estos términos en cualquier momento. Se le notificará sobre cualquier cambio significativo.\n    8. Jurisdicción: Cualquier disputa que surja de estos términos se regirá por las leyes de México.\n    He leído y acepto los términos y condiciones.\n  `;

  const handleNextStep = async () => {
    try {
      setLoading(true);
      setError('');
      setShowToast(false);
      setToastMessage('');

      if (currentStep === 1) {
        if (!formData.documentType) {
          throw new Error('Please select a document type.');
        }
      } else if (currentStep === 2) {
        if (!formData.idFrontImageBase64 || !formData.clientSelfieBase64) {
          throw new Error('Please capture both ID front image and client selfie.');
        }
        // Call the verify connector API
        const verifyPayload: FaceVerificationRequest = {
          companyId: companyId!, // Assuming companyId is always available
          documentType: formData.documentType,
          idFrontImageBase64: formData.idFrontImageBase64,
          clientSelfieBase64: formData.clientSelfieBase64,
        };
        const response: FaceVerificationResponse = await verifyClientFaceRecognition(verifyPayload);
        if (response.error) {
          throw new Error(response.error);
        }
        setFormData((prev) => ({
          ...prev,
          confidenceScore: response.confidenceScore,
          isVerified: response.isVerified,
          idFrontImageBlobUrl: response.idFrontImageBlobUrl,
          clientSelfieBlobUrl: response.clientSelfieBlobUrl,
        }));
        if (!response.isVerified) {
          setShowToast(true);
          setToastMessage('Biometric verification failed. Please try again.');
          return; // Stay on this step or go to a specific error step
        }
      } else if (currentStep === 3) {
        if (!formData.isVerified) {
          throw new Error('Biometric verification not passed.');
        }
      } else if (currentStep === 4) {
        if (!formData.contractAccepted) {
          throw new Error('You must accept the contract terms to proceed.');
        }
        // Submit the final contract
        const submissionPayload: ContractSubmissionRequest = {
          companyId: companyId!,
          documentType: formData.documentType,
          idFrontImageBlobUrl: formData.idFrontImageBlobUrl,
          clientSelfieBlobUrl: formData.clientSelfieBlobUrl,
          confidenceScore: formData.confidenceScore,
          isVerified: formData.isVerified,
          contractAccepted: formData.contractAccepted,
          acceptedAt: new Date().toISOString(), // UTC timestamp
          // contractPdfBase64: '', // If we had a PDF generated in a previous step
        };
        await submitContractClientFaceRecognition(submissionPayload);
        setShowToast(true);
        setToastMessage('Client face recognition and contract submitted successfully!');
        // Optionally reset form or navigate
        setCurrentStep(1); // Reset wizard
        setFormData({ // Clear form data
            documentType: '',
            idFrontImageBase64: '',
            clientSelfieBase64: '',
            idFrontImageBlobUrl: '',
            clientSelfieBlobUrl: '',
            confidenceScore: 0,
            isVerified: false,
            contractAccepted: false,
            acceptedAt: '',
        });
        setLoading(false);
        return; // Exit function after final submission
      }
      setCurrentStep(currentStep + 1);
    } catch (err) {
      setError((err as Error).message ?? 'Error desconocido');
      setShowToast(true);
      setToastMessage((err as Error).message ?? 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handleBackStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleDocumentTypeChange = (e: CustomEvent) => {
    setFormData((prev) => ({ ...prev, documentType: e.detail.value }));
  };

  const handleContractAcceptedChange = (e: CustomEvent) => {
    setFormData((prev) => ({ ...prev, contractAccepted: e.detail.checked }));
  };

  const takePhoto = async (imageType: 'idFront' | 'selfie') => {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      if (photo.base64String) {
        if (imageType === 'idFront') {
          setFormData((prev) => ({ ...prev, idFrontImageBase64: photo.base64String }));
          setShowToast(true);
          setToastMessage('ID Front image captured!');
        } else {
          setFormData((prev) => ({ ...prev, clientSelfieBase64: photo.base64String }));
          setShowToast(true);
          setToastMessage('Client Selfie Captured!');
        }
      }
    } catch (err) {
      setError((err as Error).message ?? 'Failed to capture photo');
      setShowToast(true);
      setToastMessage((err as Error).message ?? 'Failed to capture photo');
    }
  };


  return (
    <IonPage className="client-face-recognition-page">
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Verificación Facial del Cliente — POS GMO"
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

      <IonContent className="client-face-recognition-content">
        <IonLoading isOpen={loading} message="Cargando..." />
        <IonToast
          isOpen={showToast}
          message={toastMessage}
          duration={3000}
          onDidDismiss={() => setShowToast(false)}
          color={error ? "danger" : "success"}
        />

        <div className="client-face-recognition-wizard-container">
          {currentStep === 1 && (
            <IonCard className="client-face-recognition-step-card">
              <IonCardHeader className="client-face-recognition-step-card-header">
                <IonCardTitle className="client-face-recognition-step-card-title">
                  <IonIcon icon={documentTextOutline} className="ion-margin-end" />
                  DocumentSelectionStep
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent className="client-face-recognition-step-card-content">
                <p>IonRadioGroup selecting documentType from: INE, Passport, or Driver License.</p>
                <IonRadioGroup
                  value={formData.documentType}
                  onIonChange={handleDocumentTypeChange}
                  className="client-face-recognition-radio-group"
                >
                  <IonItem className="client-face-recognition-radio-item">
                    <IonLabel>INE</IonLabel>
                    <IonRadio value="INE" />
                  </IonItem>
                  <IonItem className="client-face-recognition-radio-item">
                    <IonLabel>Passport</IonLabel>
                    <IonRadio value="Passport" />
                  </IonItem>
                  <IonItem className="client-face-recognition-radio-item">
                    <IonLabel>Driver License</IonLabel>
                    <IonRadio value="Driver License" />
                  </IonItem>
                </IonRadioGroup>
              </IonCardContent>
            </IonCard>
          )}

          {currentStep === 2 && (
            <IonCard className="client-face-recognition-step-card">
              <IonCardHeader className="client-face-recognition-step-card-header">
                <IonCardTitle className="client-face-recognition-step-card-title">
                  <IonIcon icon={cameraOutline} className="ion-margin-end" />
                  CameraCaptureStep
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent className="client-face-recognition-step-card-content">
                <p>Capacitor Camera interface capturing 2 separate images: idFrontImageBlobUrl and clientSelfieBlobUrl.</p>
                <IonButton expand="block" onClick={() => takePhoto('idFront')} className="ion-margin-top client-face-recognition-button">
                  <IonIcon icon={cameraOutline} slot="start" />
                  Capture ID Front Image
                </IonButton>
                {formData.idFrontImageBase64 && (
                  <p className="ion-text-center ion-margin-top">ID Front Image Captured!</p>
                )}
                <IonButton expand="block" onClick={() => takePhoto('selfie')} className="ion-margin-top client-face-recognition-button">
                  <IonIcon icon={cameraOutline} slot="start" />
                  Capture Client Selfie
                </IonButton>
                {formData.clientSelfieBase64 && (
                  <p className="ion-text-center ion-margin-top">Client Selfie Captured!</p>
                )}
              </IonCardContent>
            </IonCard>
          )}

          {currentStep === 3 && (
            <IonCard className="client-face-recognition-step-card">
              <IonCardHeader className="client-face-recognition-step-card-header">
                <IonCardTitle className="client-face-recognition-step-card-title">
                  <IonIcon icon={shieldCheckmarkOutline} className="ion-margin-end" />
                  BiometricVerificationStep
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent className="client-face-recognition-step-card-content">
                <p>Displays matching progress status along with the resulting AI confirmation metric (isVerified).</p>
                {loading ? (
                    <p className="ion-text-center">Verifying biometrics...</p>
                ) : (
                    <>
                        <div className={`client-face-recognition-verification-status ${formData.isVerified ? 'success' : 'fail'}`}>
                            {formData.isVerified ? 'Verification Successful!' : 'Verification Failed!'}
                        </div>
                        <p className="ion-text-center">Confidence Score: {(formData.confidenceScore * 100).toFixed(2)}%</p>
                    </>
                )}
              </IonCardContent>
            </IonCard>
          )}

          {currentStep === 4 && (
            <IonCard className="client-face-recognition-step-card">
              <IonCardHeader className="client-face-recognition-step-card-header">
                <IonCardTitle className="client-face-recognition-step-card-title">
                  <IonIcon icon={readerOutline} className="ion-margin-end" />
                  ContractAgreementStep
                </IonCardTitle>
              </IonCardHeader>
              <IonCardContent className="client-face-recognition-step-card-content">
                <p>Presents terms and conditions text bound to an IonCheckbox indicating contractAccepted.</p>
                <div className="client-face-recognition-contract-text">
                  <h3>Términos y Condiciones</h3>
                  <p>{contractTerms}</p>
                </div>
                <IonItem lines="none" className="client-face-recognition-checkbox-item">
                  <IonLabel>I accept the contract terms</IonLabel>
                  <IonCheckbox
                    slot="start"
                    checked={formData.contractAccepted}
                    onIonChange={handleContractAcceptedChange}
                  />
                </IonItem>
              </IonCardContent>
            </IonCard>
          )}

          <div className="client-face-recognition-navigation-buttons">
            {currentStep > 1 && (
              <IonButton onClick={handleBackStep} fill="outline" className="client-face-recognition-button">
                <IonIcon icon={chevronBackOutline} slot="start" />
                Back
              </IonButton>
            )}
            {currentStep < 4 ? (
              <IonButton onClick={handleNextStep} expand={currentStep === 1 ? "block" : undefined} className="client-face-recognition-button">
                Next
                <IonIcon icon={chevronForwardOutline} slot="end" />
              </IonButton>
            ) : (
              <IonButton onClick={handleNextStep} expand="block" className="client-face-recognition-button">
                Submit Contract
              </IonButton>
            )}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default ClientFaceRecognitionPage;
