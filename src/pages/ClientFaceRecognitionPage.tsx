import React, { useState, useContext, useEffect } from 'react';
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
} from '@ionic/react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import { AuthContext } from '../context/AuthContext';
import {
  verifyClientFaceRecognition,
  submitContractClientFaceRecognition,
  FaceVerificationResponse,
  ContractSubmissionRequest,
} from '../api/clientFaceRecognitionApi';

import './ClientFaceRecognitionPage.css';

const toHermosillo = (utc: string | undefined): string => {
  if (!utc) return '';
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString();
};

const ClientFaceRecognitionPage: React.FC = () => {
  const { user } = useContext(AuthContext);
  const companyId = user?.companyId || 0;

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

  // Step 1: Document Selection
  const [documentType, setDocumentType] = useState<'INE' | 'Passport' | 'Driver License' | ''>('');

  // Step 2: Camera Capture
  const [idFrontImageBase64, setIdFrontImageBase64] = useState<string>('');
  const [clientSelfieBase64, setClientSelfieBase64] = useState<string>('');
  const [idFrontImageBlobUrl, setIdFrontImageBlobUrl] = useState<string>('');
  const [clientSelfieBlobUrl, setClientSelfieBlobUrl] = useState<string>('');

  // Step 3: Biometric Verification
  const [confidenceScore, setConfidenceScore] = useState<number>(0);
  const [isVerified, setIsVerified] = useState<boolean>(false);

  // Step 4: Contract Agreement
  const [contractAccepted, setContractAccepted] = useState<boolean>(false);
  const [acceptedAt, setAcceptedAt] = useState<string>('');

  const handleNextStep = () => {
    // Basic validation before moving to the next step
    if (currentStep === 1 && !documentType) {
      setError('Please select a document type.');
      setShowToast(true);
      return;
    }
    if (currentStep === 2 && (!idFrontImageBase64 || !clientSelfieBase64)) {
      setError('Please capture both ID front image and a selfie.');
      setShowToast(true);
      return;
    }
    setCurrentStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => prev - 1);
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
      setError((err as Error).message ?? 'Error capturing image');
      setShowToast(true);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setError('');
    try {
      const response: FaceVerificationResponse = await verifyClientFaceRecognition({
        companyId,
        documentType,
        idFrontImageBase64: idFrontImageBase64.split(',')[1], // Remove data URI prefix
        clientSelfieBase64: clientSelfieBase64.split(',')[1], // Remove data URI prefix
      });
      setConfidenceScore(response.confidenceScore);
      setIsVerified(response.isVerified);
      setIdFrontImageBlobUrl(response.idFrontImageBlobUrl);
      setClientSelfieBlobUrl(response.clientSelfieBlobUrl);
      if (response.error) {
        setError(response.error);
        setShowToast(true);
      } else {
        setToastMessage('Verification complete!');
        setShowToast(true);
        handleNextStep(); // Move to next step on successful verification
      }
    } catch (err) {
      setError((err as Error).message ?? 'Error during biometric verification');
      setShowToast(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitContract = async () => {
    if (!contractAccepted) {
      setError('Please accept the contract terms to proceed.');
      setShowToast(true);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const now = new Date().toISOString();
      setAcceptedAt(now);

      const payload: ContractSubmissionRequest = {
        companyId,
        documentType,
        idFrontImageBlobUrl,
        clientSelfieBlobUrl,
        confidenceScore,
        isVerified,
        contractAccepted: true,
        acceptedAt: now,
        // contractPdfBase64: 'optional base64 PDF string if generated client-side',
      };

      const response = await submitContractClientFaceRecognition(payload);

      if (response.error) {
        setError(response.error);
        setToastMessage(`Contract submission failed: ${response.msg || ''}`);
        setShowToast(true);
      } else {
        setToastMessage('Contract accepted and submitted successfully!');
        setShowToast(true);
        // Reset wizard or navigate away
        setCurrentStep(1);
        setDocumentType('');
        setIdFrontImageBase64('');
        setClientSelfieBase64('');
        setIdFrontImageBlobUrl('');
        setClientSelfieBlobUrl('');
        setConfidenceScore(0);
        setIsVerified(false);
        setContractAccepted(false);
        setAcceptedAt('');
      }
    } catch (err) {
      setError((err as Error).message ?? 'Error submitting contract');
      setShowToast(true);
    } finally {
      setLoading(false);
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

      <IonLoading isOpen={loading} message={'Please wait...'} />
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
        {
          currentStep === 1 && (
            <IonCard className="client-face-recognition-step-card">
              <IonCardHeader>
                <IonCardTitle>DocumentSelectionStep</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p>IonRadioGroup letting the user select documentType from: INE, Passport, or Driver License.</p>
                <IonList className="client-face-recognition-radio-list">
                  <IonListHeader>
                    <IonLabel>Select Document Type</IonLabel>
                  </IonListHeader>
                  <IonRadioGroup
                    value={documentType}
                    onIonChange={(e: CustomEvent<{
                      value: 'INE' | 'Passport' | 'Driver License';
                    }>) => setDocumentType(e.detail.value)}
                  >
                    <IonItem>
                      <IonLabel>INE</IonLabel>
                      <IonRadio value="INE"></IonRadio>
                    </IonItem>
                    <IonItem>
                      <IonLabel>Passport</IonLabel>
                      <IonRadio value="Passport"></IonRadio>
                    </IonItem>
                    <IonItem>
                      <IonLabel>Driver License</IonLabel>
                      <IonRadio value="Driver License"></IonRadio>
                    </IonItem>
                  </IonRadioGroup>
                </IonList>
                <IonButton expand="block" onClick={handleNextStep} className="ion-margin-top">
                  Next
                </IonButton>
              </IonCardContent>
            </IonCard>
          )
        }

        {
          currentStep === 2 && (
            <IonCard className="client-face-recognition-step-card">
              <IonCardHeader>
                <IonCardTitle>CameraCaptureStep</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p>Capacitor Camera interface capturing two separate images: idFrontImageBlobUrl (document front) and clientSelfieBlobUrl (live selfie).</p>
                <IonButton expand="block" onClick={() => takePicture(setIdFrontImageBase64)} className="ion-margin-bottom">
                  Capture ID Front
                </IonButton>
                {idFrontImageBase64 && (
                  <img src={idFrontImageBase64} alt="ID Front" className="captured-image" />
                )}
                <IonButton expand="block" onClick={() => takePicture(setClientSelfieBase64)} className="ion-margin-top ion-margin-bottom">
                  Capture Selfie
                </IonButton>
                {clientSelfieBase64 && (
                  <img src={clientSelfieBase64} alt="Client Selfie" className="captured-image" />
                )}
                <IonButton expand="block" onClick={handlePrevStep} fill="outline" className="ion-margin-top">
                  Back
                </IonButton>
                <IonButton expand="block" onClick={handleNextStep} className="ion-margin-top">
                  Next
                </IonButton>
              </IonCardContent>
            /
          )
        }

        {
          currentStep === 3 && (
            <IonCard className="client-face-recognition-step-card">
              <IonCardHeader>
                <IonCardTitle>BiometricVerificationStep</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p>Calls the verify endpoint, displays matching progress, then shows confidenceScore and isVerified result. IonLoading while the API call is in flight.</p>
                <IonButton expand="block" onClick={handleVerify} disabled={loading}>
                  Verify Biometrics
                </IonButton>
                {confidenceScore > 0 && (
                  <div className="ion-margin-top">
                    <p><strong>Confidence Score:</strong> {confidenceScore.toFixed(4)}</p>
                    <p><strong>Verification Status:</strong> {isVerified ? 'Verified' : 'Not Verified'}</p>
                  </div>
                )}
                <IonButton expand="block" onClick={handlePrevStep} fill="outline" className="ion-margin-top">
                  Back
                </IonButton>
              </IonCardContent>
            </IonCard>
          )
        }

        {
          currentStep === 4 && (
            <IonCard className="client-face-recognition-step-card">
              <IonCardHeader>
                <IonCardTitle>ContractAgreementStep</IonCardTitle>
              </IonCardHeader>
              <IonCardContent>
                <p>Displays contract terms in a scrollable IonContent block. IonCheckbox bound to contractAccepted. Submit button calls the contract endpoint and records acceptedAt.</p>
                <IonContent className="contract-terms-content ion-padding" scrollY={true}>
                  <p><strong>Contract Terms and Conditions:</strong></p>
                  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                  <p>...</p>
                  <p>By checking the box below, you acknowledge that you have read, understood, and agree to all the terms and conditions stated in this contract.</p>
                </IonContent>
                <IonItem>
                  <IonLabel>I accept the contract terms</IonLabel>
                  <IonCheckbox
                    checked={contractAccepted}
                    onIonChange={(e: CustomEvent<{
                      checked: boolean;
                    }>) => setContractAccepted(e.detail.checked)}
                  />
                </IonItem>
                <IonButton expand="block" onClick={handlePrevStep} fill="outline" className="ion-margin-top">
                  Back
                </IonButton>
                <IonButton expand="block" onClick={handleSubmitContract} disabled={!contractAccepted || loading} className="ion-margin-top">
                  Submit Contract
                </IonButton>
              </IonCardContent>
            </IonCard>
          )
        }
      </IonContent>
    </IonPage>
  );
};

export default ClientFaceRecognitionPage;
