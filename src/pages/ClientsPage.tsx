import React, { useState, useEffect, useMemo, useRef } from 'react';
import './ClientsPage.css';
import './ClientFaceRecognitionPage.css';
import {
  IonPage,
  IonContent,
  IonCard,
  IonCardContent,
  IonCardTitle,
  IonFab,
  IonFabButton,
  IonAlert,
  IonToast,
  IonModal,
  IonInput,
  IonNote,
  IonText,
  IonSearchbar,
  IonIcon,
  IonButton,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonLabel,
  IonItem,
  IonList,
  IonListHeader,
  IonRadioGroup,
  IonRadio,
  IonCheckbox,
  IonSpinner,
  IonLoading,
  IonFooter,
} from '@ionic/react';
import {
  add,
  trash,
  pencil,
  person,
  mail,
  checkmarkCircle,
  closeCircle,
  call,
  personCircle,
  chevronForward,
  chevronBack,
  cameraOutline,
  refreshOutline,
  personOutline,
  idCardOutline,
  checkmark,
  documentTextOutline,
  shieldCheckmarkOutline,
  clipboardOutline,
  qrCodeOutline,
  downloadOutline,
  barChartOutline,
  walletOutline,
  calendarOutline,
  shareOutline,
  logoWhatsapp,
  chatbubbleOutline,
  copyOutline,
  closeOutline,
  close,
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useHistory } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import Header from '../components/Header';
import AlertPopover from '../components/PopOver/AlertPopover';
import MailPopover from '../components/PopOver/MailPopover';
import { useUser } from '../components/UserContext';
import { Client, ClientType, getAllClients, createOrUpdateClient, CreateClientRequest, uploadClientQr } from '../api/clientsApi';
import QRCode from 'qrcode';
import { buildClientQrValue, downloadClientQrPdf } from '../utils/clientQrPdf';
import {
  verifyClientFaceRecognition,
  submitContractClientFaceRecognition,
  createClientFaceRecognitionSession,
  getAllClientFaceRecognitions,
  FaceVerificationResponse,
  ContractSubmissionRequest,
  ClientFaceRecognition,
} from '../api/clientFaceRecognitionApi';
import LoanCompletionRing from '../components/LoanCompletionRing';

type CaptureSubStep =
  | 'doc-intro'
  | 'front-capture'
  | 'flip-instruction'
  | 'back-capture'
  | 'back-review'
  | 'liveness-intro'
  | 'liveness-active'
  | 'processing';

const WIZARD_STEPS = ['Cliente', 'Código QR', 'Documento', 'Captura', 'Verificación', 'Contrato', 'Cuenta'];

const API_BASE = 'https://smartloansbackend.azurewebsites.net';

async function stripeCreateAccount(clientId: number, companyId: number, email: string) {
  const res = await fetch(`${API_BASE}/stripe/connected-accounts`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId, companyId, email }),
  });
  return res.json();
}

async function stripeGetOnboardingLink(clientId: number, companyId: number) {
  const res = await fetch(`${API_BASE}/stripe/onboarding-link`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId, companyId,
      returnUrl: 'http://localhost:8100/clients',
      refreshUrl: 'http://localhost:8100/clients',
    }),
  });
  return res.json();
}

const emptyErrors = {
  first_name: '',
  last_name: '',
  email: { isValid: true, message: '' },
  cellphone: '',
};

const ClientsPage: React.FC = () => {
  const { companyId } = useUser();
  const history = useHistory();

  // ── List state ─────────────────────────────────────────────────────────────
  const [clients, setClients] = useState<Client[]>([]);
  const [clientSelfieMap, setClientSelfieMap] = useState<Record<number, string>>({});
  const [faceRecordMap, setFaceRecordMap] = useState<Record<number, ClientFaceRecognition>>({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Client | null>(null);
  const [popoverState, setPopoverState] = useState<{ showAlertPopover: boolean; showMailPopover: boolean; event?: Event }>({
    showAlertPopover: false,
    showMailPopover: false,
  });

  // ── Wizard state ───────────────────────────────────────────────────────────
  const [showWizard, setShowWizard] = useState(false);
  const [wizardMode, setWizardMode] = useState<'create' | 'edit'>('create');
  const [wizardStep, setWizardStep] = useState(0);
  const [captureSubStep, setCaptureSubStep] = useState<CaptureSubStep>('doc-intro');
  const [wizardLoading, setWizardLoading] = useState(false);
  const [wizardError, setWizardError] = useState('');

  // Step 0 — client info
  const [newClient, setNewClient] = useState<Partial<Client>>({ first_name: '', last_name: '', email: '', cellphone: '', clientType: 'borrower' });
  const [createErrors, setCreateErrors] = useState(emptyErrors);
  const [createdClientId, setCreatedClientId] = useState<number | null>(null);

  // Step 1 — QR
  const [qrBlobUrl, setQrBlobUrl] = useState('');
  const [qrUploading, setQrUploading] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrModalClient, setQrModalClient] = useState<Client | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareClient, setShareClient] = useState<Client | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [qrDownloading, setQrDownloading] = useState(false);

  // Step 6 — Stripe
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [stripeOnboardingUrl, setStripeOnboardingUrl] = useState('');
  const [stripeKycDone, setStripeKycDone] = useState(false);

  // Step 2 — document
  const [documentType, setDocumentType] = useState<'INE' | 'Passport' | 'Driver License' | ''>('');

  // Step 3 — capture
  const [idFrontImageBase64, setIdFrontImageBase64] = useState('');
  const [idBackImageBase64, setIdBackImageBase64] = useState('');
  const [azureSessionId, setAzureSessionId] = useState('');
  const [livenessStatus, setLivenessStatus] = useState<'idle' | 'in-progress' | 'completed' | 'failed'>('idle');

  // Step 3 — verification result
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [idFrontBlobUrl, setIdFrontBlobUrl] = useState('');
  const [selfieBlobUrl, setSelfieBlobUrl] = useState('');

  // Step 4 — contract
  const [contractAccepted, setContractAccepted] = useState(false);
  const [pagareAccepted, setPagareAccepted] = useState(false);
  const [hasPhysicalPagare, setHasPhysicalPagare] = useState(false);
  const [contractAcceptedAt, setContractAcceptedAt] = useState('');

  // ── Helpers ────────────────────────────────────────────────────────────────
  const presentAlertPopover = (e: React.MouseEvent) => setPopoverState({ ...popoverState, showAlertPopover: true, event: e.nativeEvent });
  const dismissAlertPopover = () => setPopoverState({ ...popoverState, showAlertPopover: false });
  const presentMailPopover = (e: React.MouseEvent) => setPopoverState({ ...popoverState, showMailPopover: true, event: e.nativeEvent });
  const dismissMailPopover = () => setPopoverState({ ...popoverState, showMailPopover: false });

  const toast = (msg: string) => { setToastMessage(msg); setShowToast(true); };

  const handleDownloadQrPdf = async (client: Pick<Client, 'clientId' | 'first_name' | 'last_name' | 'cellphone' | 'email'>) => {
    setQrDownloading(true);
    try {
      await downloadClientQrPdf({
        clientId: client.clientId,
        firstName: client.first_name,
        lastName: client.last_name,
        cellphone: client.cellphone,
        email: client.email,
      });
      toast('PDF descargado correctamente');
    } catch {
      toast('Error al generar el PDF del QR');
    } finally {
      setQrDownloading(false);
    }
  };

  const validateEmail = (email: string) => {
    if (!email.trim()) return { isValid: true, message: '' };
    const ok = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
    return ok ? { isValid: true, message: 'Email válido' } : { isValid: false, message: 'Formato de email inválido (ej. nombre@dominio.com)' };
  };

  const validateCellphone = (v: string) => {
    if (!v) return 'El teléfono es obligatorio';
    const d = v.replace(/\D/g, '');
    if (d.length < 10) return 'El teléfono debe tener al menos 10 dígitos';
    return '';
  };

  const formatDate = (ds?: string) => {
    if (!ds) return 'N/A';
    return new Date(ds).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // ── Load clients ───────────────────────────────────────────────────────────
  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const [fetchedClients, faceRecords] = await Promise.all([
        getAllClients(),
        getAllClientFaceRecognitions(Number(companyId)).catch(() => [] as ClientFaceRecognition[]),
      ]);
      setClients(fetchedClients);
      const selfieMap: Record<number, string> = {};
      const faceMap: Record<number, ClientFaceRecognition> = {};
      faceRecords.forEach((r) => {
        if (r.clientSelfieBlobUrl) selfieMap[r.clientId] = r.clientSelfieBlobUrl;
        faceMap[r.clientId] = r;
      });
      setClientSelfieMap(selfieMap);
      setFaceRecordMap(faceMap);
    } catch { toast('Error al cargar los clientes'); }
    finally { setLoading(false); }
  };

  const getLoanCompletion = (client: Client) => {
    const face = faceRecordMap[client.clientId];
    return [
      { label: 'Información general', done: true },
      { label: 'Código QR',           done: !!client.qrBlobUrl },
      { label: 'Cuenta de pago',      done: false }, // requires Stripe check — shown in dashboard
      { label: 'Biométrico',          done: !!face?.isVerified },
      { label: 'Contrato',            done: !!face?.contractAccepted },
      { label: 'Pagaré',              done: !!face?.pagareAccepted },
    ];
  };

  const filteredClients = useMemo(() => {
    const t = searchTerm.toLowerCase().trim();
    if (!t) return clients;
    return clients.filter(c =>
      c.first_name?.toLowerCase().includes(t) ||
      c.last_name?.toLowerCase().includes(t) ||
      c.cellphone?.includes(t) ||
      c.email?.toLowerCase().includes(t)
    );
  }, [clients, searchTerm]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  // ── App store links (update with real URLs once published) ───────────────
  const PLAY_STORE_URL  = 'https://play.google.com/store/apps/details?id=com.lavanderia.gmo';
  const APP_STORE_URL   = 'https://apps.apple.com/app/pos-gmo/id000000000';

  const buildShareMessage = (client: Client): string => {
    const name  = `${client.first_name} ${client.last_name}`;
    const type  = client.clientType ?? 'borrower';
    const store = `📱 Android: ${PLAY_STORE_URL}\n🍎 iOS: ${APP_STORE_URL}`;

    if (type === 'lender') {
      return `Hola ${name} 👋\n\nTe invitamos a descargar la app *POS GMO* para gestionar tu cartera de préstamos, ver el estado de tus acreditados y más.\n\n${store}\n\nUna vez instalada, inicia sesión con tu cuenta de prestamista y accede a tu dashboard de portfolio.`;
    }
    return `Hola ${name} 👋\n\nTe invitamos a descargar la app *POS GMO* para consultar tu préstamo, ver tu estado de cuenta y realizar pagos fácilmente.\n\n${store}\n\nUna vez instalada, inicia sesión con tu cuenta para ver tu dashboard.`;
  };

  const openWhatsApp = (client: Client) => {
    const phone = client.cellphone?.replace(/\D/g, '');
    const msg   = encodeURIComponent(buildShareMessage(client));
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const openSMS = (client: Client) => {
    const phone = client.cellphone?.replace(/\D/g, '');
    const msg   = encodeURIComponent(buildShareMessage(client));
    window.open(`sms:${phone}?body=${msg}`, '_blank');
  };

  const copyLink = async (client: Client) => {
    await navigator.clipboard.writeText(buildShareMessage(client));
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleDelete = (client: Client) => { setSelectedForDelete(client); setShowDeleteAlert(true); };
  const confirmDelete = async () => {
    if (selectedForDelete) {
      setClients(clients.filter(c => c.clientId !== selectedForDelete.clientId));
      toast('Cliente eliminado exitosamente');
    }
    setShowDeleteAlert(false);
    setSelectedForDelete(null);
  };

  // ── Edit modal ─────────────────────────────────────────────────────────────
  const handleEdit = (client: Client) => {
    resetWizard();
    setWizardMode('edit');
    setNewClient({ first_name: client.first_name, last_name: client.last_name, email: client.email, cellphone: client.cellphone, clientType: client.clientType ?? 'borrower' });
    setCreatedClientId(client.clientId);
    setShowWizard(true);
  };

  // ── Wizard helpers ─────────────────────────────────────────────────────────
  const resetWizard = () => {
    setWizardStep(0);
    setCaptureSubStep('doc-intro');
    setWizardError('');
    setNewClient({ first_name: '', last_name: '', email: '', cellphone: '', clientType: 'borrower' });
    setCreateErrors(emptyErrors);
    setCreatedClientId(null);
    setDocumentType('');
    setIdFrontImageBase64('');
    setIdBackImageBase64('');
    setAzureSessionId('');
    setLivenessStatus('idle');
    setConfidenceScore(0);
    setIsVerified(false);
    setIdFrontBlobUrl('');
    setSelfieBlobUrl('');
    setContractAccepted(false);
    setPagareAccepted(false);
    setHasPhysicalPagare(false);
    setContractAcceptedAt('');
    setStripeAccountId('');
    setStripeOnboardingUrl('');
    setStripeKycDone(false);
    setQrBlobUrl('');
    setQrUploading(false);
  };

  const createIsValid = useMemo(() => {
    const e = validateEmail(newClient.email || '');
    return !!(newClient.first_name && newClient.last_name && e.isValid && !validateCellphone(newClient.cellphone || ''));
  }, [newClient]);

  useEffect(() => {
    setCreateErrors({
      first_name: newClient.first_name ? '' : 'El nombre es obligatorio',
      last_name: newClient.last_name ? '' : 'El apellido es obligatorio',
      email: validateEmail(newClient.email || ''),
      cellphone: validateCellphone(newClient.cellphone || ''),
    });
  }, [newClient.first_name, newClient.last_name, newClient.email, newClient.cellphone]);

  // Step 0 → Next: create or update client, then advance
  const handleWizardNext0 = async () => {
    if (!createIsValid) return;
    setWizardLoading(true);
    try {
      if (wizardMode === 'edit' && createdClientId) {
        const req: CreateClientRequest = {
          clients: [{ clientId: createdClientId, first_name: newClient.first_name!, last_name: newClient.last_name!, cellphone: newClient.cellphone!, email: newClient.email!, companyId, clientType: newClient.clientType, action: '2' }],
        };
        await createOrUpdateClient(req);
        loadClients();
      } else if (!createdClientId) {
        const clientId = Date.now();
        const req: CreateClientRequest = {
          clients: [{ clientId, first_name: newClient.first_name!, last_name: newClient.last_name!, cellphone: newClient.cellphone!, email: newClient.email!, companyId, clientType: newClient.clientType, action: '1' }],
        };
        await createOrUpdateClient(req);
        setCreatedClientId(clientId);
        loadClients();
      }
      setWizardStep(1);
    } catch { toast(wizardMode === 'edit' ? 'Error al actualizar el cliente' : 'Error al crear el cliente'); }
    finally { setWizardLoading(false); }
  };

  const takePicture = async (setter: React.Dispatch<React.SetStateAction<string>>, onSuccess?: () => void) => {
    try {
      const photo = await Camera.getPhoto({ quality: 90, allowEditing: false, resultType: CameraResultType.Base64, source: CameraSource.Camera });
      if (photo.base64String) {
        setter(`data:image/jpeg;base64,${photo.base64String}`);
        onSuccess?.();
      }
    } catch (err) {
      toast((err as Error).message ?? 'Error al capturar la imagen');
    }
  };

  const startLivenessSession = async () => {
    setCaptureSubStep('liveness-active');
    setLivenessStatus('in-progress');
    try {
      const { sessionId } = await createClientFaceRecognitionSession(Number(companyId), Number(createdClientId));
      setAzureSessionId(sessionId);
      setLivenessStatus('completed');
      setCaptureSubStep('processing');
      setTimeout(() => {
        toast('Validación facial completada correctamente.');
        setWizardStep(4);
        setCaptureSubStep('doc-intro');
      }, 1800);
    } catch (err) {
      setLivenessStatus('failed');
      toast((err as Error).message ?? 'No se pudo iniciar la sesión de validación facial');
      setCaptureSubStep('liveness-intro');
    }
  };

  const handleVerify = async () => {
    setWizardLoading(true);
    try {
      const res: FaceVerificationResponse = await verifyClientFaceRecognition({
        companyId: Number(companyId),
        clientId: Number(createdClientId),
        documentType,
        idFrontImageBase64: idFrontImageBase64.split(',')[1],
        idBackImageBase64: idBackImageBase64.split(',')[1],
        azureSessionId,
      });
      setConfidenceScore(res.confidenceScore);
      setIsVerified(res.isVerified);
      setIdFrontBlobUrl(res.idFrontImageBlobUrl);
      setSelfieBlobUrl(res.clientSelfieBlobUrl);
      if (res.error) { toast(res.error); }
      else { toast('¡Verificación completada!'); setWizardStep(5); }
    } catch (err) {
      toast((err as Error).message ?? 'Error durante la verificación biométrica');
    } finally { setWizardLoading(false); }
  };

  const handleSubmitContract = async () => {
    if (!contractAccepted || !pagareAccepted) { toast('Por favor acepta los términos del contrato y el pagaré.'); return; }
    setWizardLoading(true);
    try {
      const now = new Date().toISOString();
      setContractAcceptedAt(now);
      const payload: ContractSubmissionRequest = {
        companyId: Number(companyId),
        clientId: Number(createdClientId),
        documentType,
        idFrontImageBlobUrl: idFrontBlobUrl,
        clientSelfieBlobUrl: selfieBlobUrl,
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
      const res = await submitContractClientFaceRecognition(payload);
      if (res.error) { toast(`Error: ${res.msg || res.error}`); }
      else {
        toast('¡Contrato enviado! Configurando cuenta de pagos...');
        // Create Stripe Connected Account for this client
        try {
          const acct = await stripeCreateAccount(
            Number(createdClientId),
            Number(companyId),
            newClient.email ?? `client${createdClientId}@posgmo.mx`,
          );
          if (acct?.account?.connectedAccountId) {
            setStripeAccountId(acct.account.connectedAccountId);
          }
          const link = await stripeGetOnboardingLink(Number(createdClientId), Number(companyId));
          if (link?.url) setStripeOnboardingUrl(link.url);
        } catch {
          toast('Contrato guardado. No se pudo crear cuenta Stripe.');
        }
        setWizardStep(6);
      }
    } catch (err) {
      toast((err as Error).message ?? 'Error al enviar el contrato');
    } finally { setWizardLoading(false); }
  };

  const goBackWizard = () => {
    if (wizardStep === 3 && captureSubStep !== 'doc-intro') {
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
      setWizardStep(s => Math.max(s - 1, 0));
      setCaptureSubStep('doc-intro');
    }
  };

  const jumpWizard = (target: number) => {
    if (target < wizardStep) { setWizardStep(target); setCaptureSubStep('doc-intro'); }
  };

  // QR value encodes enough to identify the client at any POS terminal
  const qrValue = createdClientId
    ? buildClientQrValue(createdClientId, newClient.first_name ?? '', newClient.last_name ?? '')
    : '';

  // Auto-upload QR when wizard reaches step 1 and we have a clientId
  useEffect(() => {
    if (wizardStep !== 1 || !createdClientId || !qrValue || qrBlobUrl || qrUploading) return;
    setQrUploading(true);
    QRCode.toDataURL(qrValue, { width: 512, errorCorrectionLevel: 'H' })
      .then(dataUrl => uploadClientQr(createdClientId, companyId, dataUrl))
      .then(res => { setQrBlobUrl(res.qrBlobUrl); })
      .catch(() => { /* non-fatal — QR still shows in UI */ })
      .finally(() => setQrUploading(false));
  }, [wizardStep, createdClientId, qrValue]);

  // ── Wizard renderers ───────────────────────────────────────────────────────

  const WizardStepBar = () => (
    <div className="wizard-step-indicator">
      {WIZARD_STEPS.map((s, i) => (
        <React.Fragment key={s}>
          <div className="wizard-step-item">
            <button
              className={`wizard-step-circle${i === wizardStep ? ' active' : ''}${i < wizardStep ? ' completed' : ''}`}
              onClick={() => jumpWizard(i)}
              style={{ cursor: i < wizardStep ? 'pointer' : 'default', border: 'none' }}
            >
              {i < wizardStep ? <IonIcon icon={checkmark} /> : i + 1}
            </button>
            <span className={`wizard-step-label${i === wizardStep ? ' active' : ''}${i < wizardStep ? ' completed' : ''}`}>{s}</span>
          </div>
          {i < WIZARD_STEPS.length - 1 && <div className={`wizard-step-connector${i < wizardStep ? ' completed' : ''}`} />}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep0 = () => (
    <div className="wizard-step-body">
      <div className="wizard-step-header">
        <p className="wizard-step-desc">Ingresa la información personal del nuevo cliente.</p>
      </div>

      <div className="wizard-form-fields">
        <div className="wizard-field-group">
          <IonInput
            fill="outline"
            label="Nombre *"
            labelPlacement="floating"
            value={newClient.first_name}
            onIonInput={(e) => setNewClient(p => ({ ...p, first_name: e.detail.value! }))}
            className={createErrors.first_name ? 'ion-invalid ion-touched' : ''}
            errorText={createErrors.first_name}
          />
        </div>

        <div className="wizard-field-group">
          <IonInput
            fill="outline"
            label="Apellido *"
            labelPlacement="floating"
            value={newClient.last_name}
            onIonInput={(e) => setNewClient(p => ({ ...p, last_name: e.detail.value! }))}
            className={createErrors.last_name ? 'ion-invalid ion-touched' : ''}
            errorText={createErrors.last_name}
          />
        </div>

        <div className="wizard-field-group">
          <IonInput
            fill="outline"
            label="Teléfono *"
            labelPlacement="floating"
            type="tel"
            value={newClient.cellphone}
            onIonInput={(e) => setNewClient(p => ({ ...p, cellphone: e.detail.value! }))}
            className={createErrors.cellphone ? 'ion-invalid ion-touched' : ''}
            errorText={createErrors.cellphone}
          />
        </div>

        <div className="wizard-field-group">
          <IonInput
            fill="outline"
            label="Email"
            labelPlacement="floating"
            type="email"
            value={newClient.email}
            onIonInput={(e) => setNewClient(p => ({ ...p, email: e.detail.value! }))}
            className={newClient.email && !createErrors.email.isValid ? 'ion-invalid ion-touched' : ''}
            errorText={newClient.email && !createErrors.email.isValid ? createErrors.email.message : undefined}
          >
            {newClient.email && createErrors.email.isValid && (
              <IonIcon icon={checkmarkCircle} slot="end" color="success" aria-hidden="true" />
            )}
          </IonInput>
        </div>
      </div>

      {/* Client type selector */}
      <div className="wizard-client-type-section">
        <p className="wizard-client-type-label">Tipo de cliente:</p>
        <div className="wizard-client-type-grid">
          {([
            { id: 'borrower', label: '📋 Acreditado', desc: 'Solicita préstamo', color: '#2563eb' },
            { id: 'lender',   label: '💼 Prestamista', desc: 'Financia préstamos', color: '#15803d' },
            { id: 'both',     label: '🔄 Ambos', desc: 'Acreditado y prestamista', color: '#7c3aed' },
          ] as { id: ClientType; label: string; desc: string; color: string }[]).map(t => (
            <button
              key={t.id}
              type="button"
              className={`wizard-client-type-btn${newClient.clientType === t.id ? ' selected' : ''}`}
              style={newClient.clientType === t.id
                ? { borderColor: t.color, background: `${t.color}14` }
                : undefined}
              onClick={() => setNewClient(p => ({ ...p, clientType: t.id }))}
            >
              <span className="wizard-client-type-btn-name" style={newClient.clientType === t.id ? { color: t.color } : undefined}>
                {t.label}
              </span>
              <span className="wizard-client-type-btn-desc">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="wizard-step-body">
      <div className="wizard-step-header">
        <p className="wizard-step-desc">
          Este código QR identifica al cliente en todos los puntos de venta. Imprímelo o guárdalo.
        </p>
      </div>

      <div className="client-qr-box">
        {qrValue ? (
          <QRCodeSVG value={qrValue} size={200} level="H" includeMargin />
        ) : (
          <div className="client-qr-placeholder">Sin datos</div>
        )}
      </div>

      <div className="wizard-summary-box" style={{ marginTop: 16 }}>
        <p><strong>Cliente:</strong> {newClient.first_name} {newClient.last_name}</p>
        <p><strong>Teléfono:</strong> {newClient.cellphone}</p>
        {newClient.email && <p><strong>Email:</strong> {newClient.email}</p>}
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>ID: {createdClientId}</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, fontSize: 12 }}>
        {qrUploading && (
          <><IonSpinner name="crescent" style={{ width: 14, height: 14 }} /><span style={{ color: '#6b7280' }}>Guardando QR...</span></>
        )}
        {!qrUploading && qrBlobUrl && (
          <><IonIcon icon={checkmarkCircle} style={{ color: '#059669', fontSize: 16 }} /><span style={{ color: '#059669', fontWeight: 600 }}>QR guardado en Azure</span></>
        )}
      </div>

      {qrValue && createdClientId && (
        <IonButton
          expand="block"
          className="client-qr-download-btn"
          onClick={() => handleDownloadQrPdf({
            clientId: createdClientId,
            first_name: newClient.first_name ?? '',
            last_name: newClient.last_name ?? '',
            cellphone: newClient.cellphone ?? '',
            email: newClient.email ?? '',
          })}
          disabled={qrDownloading}
        >
          {qrDownloading ? (
            <IonSpinner name="crescent" style={{ width: 18, height: 18 }} />
          ) : (
            <>
              <IonIcon icon={downloadOutline} slot="start" />
              Descargar QR como PDF
            </>
          )}
        </IonButton>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="wizard-step-body">
      <div className="wizard-step-header">
        <div className="wizard-step-icon-wrap" style={{ background: '#fef3c7' }}>
          <IonIcon icon={idCardOutline} style={{ fontSize: 40, color: '#d97706' }} />
        </div>
        <h2 className="wizard-step-title">Tipo de Documento</h2>
        <p className="wizard-step-desc">Selecciona el documento de identificación oficial del cliente.</p>
      </div>

      <div className="wizard-doc-type-list">
        {([
          { value: 'INE',            label: 'INE',                  desc: 'Credencial para votar',  icon: idCardOutline },
          { value: 'Passport',       label: 'Pasaporte',            desc: 'Pasaporte vigente',      icon: documentTextOutline },
          { value: 'Driver License', label: 'Licencia de Conducir', desc: 'Licencia vigente',       icon: idCardOutline },
        ] as { value: typeof documentType; label: string; desc: string; icon: string }[]).map(opt => {
          const selected = documentType === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              className={`wizard-doc-type-btn${selected ? ' selected' : ''}`}
              onClick={() => setDocumentType(opt.value)}
            >
              <div className="wizard-doc-type-btn-icon">
                <IonIcon icon={opt.icon} />
              </div>
              <div className="wizard-doc-type-btn-text">
                <span className="wizard-doc-type-btn-name">{opt.label}</span>
                <span className="wizard-doc-type-btn-desc">{opt.desc}</span>
              </div>
              <div className={`wizard-doc-type-btn-radio${selected ? ' selected' : ''}`} />
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderCaptureSubStep = () => {
    if (captureSubStep === 'doc-intro') return (
      <IonCard className="client-face-recognition-step-card cfr-capture-card">
        <IonCardContent>
          <h2 className="cfr-capture-title">Verifica tu documento</h2>
          <p className="cfr-capture-desc">
            Al dar clic en Capturar deberás autorizar el acceso a la cámara para escanear la
            identificación original del cliente (no se permiten fotocopias).
          </p>
          <div className="cfr-illustration">
            <div className="cfr-phone-id-illustration">
              <IonIcon icon={idCardOutline} className="cfr-illus-id-icon" />
            </div>
          </div>
        </IonCardContent>
      </IonCard>
    );

    if (captureSubStep === 'front-capture') return (
      <IonCard className="client-face-recognition-step-card cfr-capture-card">
        <IonCardContent>
          <h2 className="cfr-capture-title">Parte delantera</h2>
          <p className="cfr-capture-desc">Muestre la parte delantera del documento a cámara.</p>
          <div className="cfr-camera-frame">
            {idFrontImageBase64
              ? <img src={idFrontImageBase64} alt="Frente" className="cfr-camera-preview" />
              : <div className="cfr-camera-placeholder"><IonIcon icon={idCardOutline} className="cfr-camera-guide-icon" /></div>}
          </div>
        </IonCardContent>
      </IonCard>
    );

    if (captureSubStep === 'flip-instruction') return (
      <IonCard className="client-face-recognition-step-card cfr-capture-card">
        <IonCardContent>
          <h2 className="cfr-capture-title">Voltea la identificación con la parte trasera hacia arriba</h2>
          <div className="cfr-illustration">
            <div className="cfr-flip-illustration">
              <IonIcon icon={idCardOutline} className="cfr-illus-id-icon cfr-illus-id-back" />
              <div className="cfr-flip-arrow">↺</div>
            </div>
          </div>
        </IonCardContent>
      </IonCard>
    );

    if (captureSubStep === 'back-capture') return (
      <IonCard className="client-face-recognition-step-card cfr-capture-card">
        <IonCardContent>
          <h2 className="cfr-capture-title">Parte trasera</h2>
          <p className="cfr-capture-desc">Muestre la parte trasera del documento a cámara.</p>
          <div className="cfr-camera-frame">
            {idBackImageBase64
              ? <img src={idBackImageBase64} alt="Reverso" className="cfr-camera-preview" />
              : <div className="cfr-camera-placeholder">
                  <IonIcon icon={idCardOutline} className="cfr-camera-guide-icon" />
                  <span className="cfr-camera-hint">Aleja el documento</span>
                </div>}
          </div>
        </IonCardContent>
      </IonCard>
    );

    if (captureSubStep === 'back-review') return (
      <IonCard className="client-face-recognition-step-card cfr-capture-card">
        <IonCardContent>
          <h2 className="cfr-capture-title">Asegúrate de que la identificación sea legible</h2>
          {idBackImageBase64 && <img src={idBackImageBase64} alt="Reverso" className="cfr-review-image" />}
        </IonCardContent>
      </IonCard>
    );

    if (captureSubStep === 'liveness-intro') return (
      <IonCard className="client-face-recognition-step-card cfr-capture-card">
        <IonCardContent>
          <h2 className="cfr-capture-title">Validación facial en vivo</h2>
          <p className="cfr-capture-desc">
            El cliente debe mirar directo a la cámara. Asegúrate de que no lleve gafas de sol,
            gorras u otros elementos que tapen su cara.
          </p>
          <div className="cfr-illustration">
            <div className="cfr-face-circle">
              <IonIcon icon={personOutline} className="cfr-face-icon" />
            </div>
          </div>
        </IonCardContent>
      </IonCard>
    );

    if (captureSubStep === 'liveness-active') return (
      <IonCard className="client-face-recognition-step-card cfr-capture-card">
        <IonCardContent>
          <h2 className="cfr-capture-title">Movimientos de cabeza</h2>
          <p className="cfr-capture-desc">Coloca la cara al centro y mira a la cámara.</p>
          <div className="cfr-camera-frame cfr-liveness-frame">
            <div className="cfr-liveness-overlay">
              <IonIcon icon={personOutline} className="cfr-liveness-face-icon" />
            </div>
            <div className="cfr-liveness-hint-badge">→ Mueve la cabeza hacia la derecha</div>
          </div>
        </IonCardContent>
      </IonCard>
    );

    if (captureSubStep === 'processing') return (
      <div className="cfr-processing-screen">
        <IonSpinner name="crescent" className="cfr-processing-spinner" />
        <h2 className="cfr-processing-title">Procesando...</h2>
        <p className="cfr-processing-desc">Espera unos segundos</p>
      </div>
    );

    return null;
  };

  const renderStep4 = () => (
    <div className="wizard-step-body">
      <div className="wizard-step-header">
        <div className="wizard-step-icon-wrap" style={{ background: '#d1fae5' }}>
          <IonIcon icon={shieldCheckmarkOutline} style={{ fontSize: 40, color: '#059669' }} />
        </div>
        <h2 className="wizard-step-title">Verificación Biométrica</h2>
        <p className="wizard-step-desc">Confirma las capturas y ejecuta la verificación de identidad.</p>
      </div>

      <div className="id-preview-grid ion-margin-top">
        <div className="id-preview-card">
          <span className="id-preview-title">Frente</span>
          {idFrontImageBase64
            ? <img src={idFrontImageBase64} alt="Frente" className="captured-image captured-image-small" />
            : <div className="id-preview-placeholder">Sin captura</div>}
        </div>
        <div className="id-preview-card">
          <span className="id-preview-title">Reverso</span>
          {idBackImageBase64
            ? <img src={idBackImageBase64} alt="Reverso" className="captured-image captured-image-small" />
            : <div className="id-preview-placeholder">Sin captura</div>}
        </div>
      </div>

      <div className="wizard-summary-box">
        <p><strong>Cliente:</strong> {newClient.first_name} {newClient.last_name}</p>
        <p><strong>Documento:</strong> {documentType || '—'}</p>
        <p><strong>Sesión de liveness:</strong> {azureSessionId ? 'Completada ✓' : 'Pendiente'}</p>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="wizard-step-body">
      <div className="wizard-step-header">
        <div className="wizard-step-icon-wrap" style={{ background: '#ede9fe' }}>
          <IonIcon icon={clipboardOutline} style={{ fontSize: 40, color: '#7c3aed' }} />
        </div>
        <h2 className="wizard-step-title">Aceptación de Contrato</h2>
        <p className="wizard-step-desc">Revisa el resumen y acepta los términos para finalizar.</p>
      </div>

      <div className="wizard-summary-box">
        <p><strong>Cliente:</strong> {newClient.first_name} {newClient.last_name}</p>
        <p><strong>Teléfono:</strong> {newClient.cellphone}</p>
        <p><strong>Documento:</strong> {documentType || '—'}</p>
        <p><strong>Puntaje de confianza:</strong> {confidenceScore > 0 ? confidenceScore.toFixed(4) : '—'}</p>
        <p><strong>Identidad verificada:</strong> {isVerified ? 'Sí ✓' : 'No'}</p>
      </div>

      <div className="wizard-contract-terms">
        <p><strong>Términos y Condiciones del Contrato:</strong></p>
        <p>
          Al aceptar, el cliente reconoce haber leído, entendido y aceptado todos los términos
          y condiciones del contrato de crédito, incluyendo tasas de interés, plazos de pago,
          cargos por mora y condiciones de cancelación anticipada.
        </p>
      </div>

      <div className="wizard-checkbox-list">
        {([
          { checked: contractAccepted,  onChange: setContractAccepted,  label: 'Acepto los términos del contrato de crédito',     required: true },
          { checked: pagareAccepted,    onChange: setPagareAccepted,    label: 'Acepto y firmo electrónicamente el pagaré',        required: true },
          { checked: hasPhysicalPagare, onChange: setHasPhysicalPagare, label: 'El pagaré físico está en resguardo',              required: false },
        ]).map((item, i) => (
          <button
            key={i}
            type="button"
            className={`wizard-checkbox-card${item.checked ? ' checked' : ''}`}
            onClick={() => item.onChange(!item.checked)}
          >
            <div className={`wizard-checkbox-box${item.checked ? ' checked' : ''}`}>
              {item.checked && <IonIcon icon={checkmark} />}
            </div>
            <span className="wizard-checkbox-card-label">
              {item.label}
              {item.required && <span className="wizard-checkbox-required"> *</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="wizard-step-body">
      <div className="wizard-step-header">
        <div className="wizard-step-icon-wrap" style={{ background: '#F0FDF4' }}>
          <IonIcon icon={walletOutline} style={{ fontSize: 40, color: '#059669' }} />
        </div>
        <h2 className="wizard-step-title">Cuenta de Pagos</h2>
        <p className="wizard-step-desc">
          El cliente registra su información bancaria para recibir y realizar pagos de forma segura.
        </p>
      </div>

      {/* Client + KYC status summary */}
      <div className="wizard-stripe-status-card">
        <div className={`wizard-stripe-status-icon-wrap${stripeKycDone ? ' done' : ''}`}>
          <IonIcon icon={stripeKycDone ? checkmarkCircle : walletOutline} />
        </div>
        <div className="wizard-stripe-status-body">
          <span className="wizard-stripe-status-name">
            {newClient.first_name} {newClient.last_name}
          </span>
          <span className="wizard-stripe-status-sub">
            {stripeKycDone ? 'Cuenta bancaria verificada ✓' : 'Verificación pendiente'}
          </span>
          {stripeAccountId && (
            <span className="wizard-stripe-account-id">{stripeAccountId}</span>
          )}
        </div>
        <span className={`wizard-stripe-kyc-badge${stripeKycDone ? ' done' : ''}`}>
          {stripeKycDone ? 'KYC ✓' : 'Pendiente'}
        </span>
      </div>

      {stripeOnboardingUrl ? (
        <div className="wizard-stripe-section">
          {/* URL preview box */}
          <div className="wizard-stripe-url-box">
            <IonIcon icon={shareOutline} className="wizard-stripe-url-icon" />
            <span className="wizard-stripe-url-text">{stripeOnboardingUrl}</span>
          </div>

          {/* Action cards — same pattern as doc type buttons */}
          <div className="wizard-stripe-actions">
            <button
              type="button"
              className="wizard-stripe-action-btn primary"
              onClick={() => window.open(stripeOnboardingUrl, '_blank')}
            >
              <div className="wizard-stripe-action-icon-wrap">
                <IonIcon icon={walletOutline} />
              </div>
              <div className="wizard-stripe-action-text">
                <span className="wizard-stripe-action-name">Abrir registro bancario</span>
                <span className="wizard-stripe-action-desc">Se abre en el navegador del cliente</span>
              </div>
              <IonIcon icon={chevronForward} className="wizard-stripe-action-arrow" />
            </button>

            <button
              type="button"
              className="wizard-stripe-action-btn"
              onClick={() => { navigator.clipboard.writeText(stripeOnboardingUrl); toast('Enlace copiado al portapapeles'); }}
            >
              <div className="wizard-stripe-action-icon-wrap">
                <IonIcon icon={copyOutline} />
              </div>
              <div className="wizard-stripe-action-text">
                <span className="wizard-stripe-action-name">Copiar enlace</span>
                <span className="wizard-stripe-action-desc">Comparte por WhatsApp, SMS o email</span>
              </div>
              <IonIcon icon={chevronForward} className="wizard-stripe-action-arrow" />
            </button>
          </div>

          {/* KYC confirmation checkbox — same as contract step */}
          <div className="wizard-checkbox-list" style={{ marginTop: 8 }}>
            <button
              type="button"
              className={`wizard-checkbox-card${stripeKycDone ? ' checked' : ''}`}
              onClick={() => setStripeKycDone(!stripeKycDone)}
            >
              <div className={`wizard-checkbox-box${stripeKycDone ? ' checked' : ''}`}>
                {stripeKycDone && <IonIcon icon={checkmark} />}
              </div>
              <span className="wizard-checkbox-card-label">El cliente completó su registro bancario</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="wizard-stripe-error-card">
          <div className="wizard-stripe-error-icon-wrap">
            <IonIcon icon={closeCircle} />
          </div>
          <div className="wizard-stripe-error-body">
            <span className="wizard-stripe-error-title">Enlace no disponible</span>
            <span className="wizard-stripe-error-desc">
              Puedes generarlo desde el dashboard del cliente una vez guardado.
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const ClientWizardFooterBar: React.FC<{
    showBack?: boolean;
    onBack?: () => void;
    backLabel?: string;
    backIcon?: string;
    primary: React.ReactNode;
    onPrimary: () => void;
    primaryDisabled?: boolean;
    variant?: 'next' | 'submit';
  }> = ({
    showBack = true,
    onBack,
    backLabel = 'Atrás',
    backIcon = chevronBack,
    primary,
    onPrimary,
    primaryDisabled,
    variant = 'next',
  }) => (
    <IonFooter className="client-wizard-footer">
      <div className={`client-wizard-footer-inner${showBack ? '' : ' client-wizard-footer-inner--single'}`}>
        {showBack && onBack && (
          <button type="button" className="client-wizard-btn-back" onClick={onBack}>
            <IonIcon icon={backIcon} />
            <span>{backLabel}</span>
          </button>
        )}
        <button
          type="button"
          className={variant === 'submit' ? 'client-wizard-btn-submit' : 'client-wizard-btn-next'}
          onClick={onPrimary}
          disabled={primaryDisabled}
        >
          {primary}
        </button>
      </div>
    </IonFooter>
  );

  const WizardFooter = () => {
    if (wizardStep === 3) {
      if (captureSubStep === 'processing' || captureSubStep === 'liveness-active') return null;

      if (captureSubStep === 'doc-intro') {
        return (
          <ClientWizardFooterBar
            onBack={goBackWizard}
            onPrimary={() => setCaptureSubStep('front-capture')}
            primary={<>Capturar <IonIcon icon={cameraOutline} /></>}
          />
        );
      }

      if (captureSubStep === 'front-capture') {
        return (
          <ClientWizardFooterBar
            onBack={goBackWizard}
            onPrimary={() => takePicture(setIdFrontImageBase64, () => setCaptureSubStep('flip-instruction'))}
            primary={<>Capturar frente <IonIcon icon={cameraOutline} /></>}
          />
        );
      }

      if (captureSubStep === 'flip-instruction') {
        return (
          <ClientWizardFooterBar
            onBack={goBackWizard}
            onPrimary={() => setCaptureSubStep('back-capture')}
            primary={<>Continuar <IonIcon icon={chevronForward} /></>}
          />
        );
      }

      if (captureSubStep === 'back-capture') {
        return (
          <ClientWizardFooterBar
            onBack={goBackWizard}
            onPrimary={() => takePicture(setIdBackImageBase64, () => setCaptureSubStep('back-review'))}
            primary={<>Capturar reverso <IonIcon icon={cameraOutline} /></>}
          />
        );
      }

      if (captureSubStep === 'back-review') {
        return (
          <ClientWizardFooterBar
            onBack={() => { setIdBackImageBase64(''); setCaptureSubStep('back-capture'); }}
            backLabel="Repetir"
            backIcon={refreshOutline}
            onPrimary={() => setCaptureSubStep('liveness-intro')}
            primary={<>Continuar <IonIcon icon={chevronForward} /></>}
          />
        );
      }

      if (captureSubStep === 'liveness-intro') {
        return (
          <ClientWizardFooterBar
            onBack={goBackWizard}
            onPrimary={startLivenessSession}
            primary={<>Iniciar validación <IonIcon icon={chevronForward} /></>}
          />
        );
      }

      return null;
    }

    if (wizardStep === 0) {
      return (
        <ClientWizardFooterBar
          showBack={false}
          onPrimary={handleWizardNext0}
          primaryDisabled={!createIsValid || wizardLoading}
          primary={
            wizardLoading
              ? <IonSpinner name="crescent" className="client-wizard-btn-spinner" />
              : <>Siguiente <IonIcon icon={chevronForward} /></>
          }
        />
      );
    }

    if (wizardStep === 1) {
      return (
        <ClientWizardFooterBar
          onBack={goBackWizard}
          onPrimary={() => setWizardStep(2)}
          primary={<>Siguiente <IonIcon icon={chevronForward} /></>}
        />
      );
    }

    if (wizardStep === 2) {
      return (
        <ClientWizardFooterBar
          onBack={goBackWizard}
          onPrimary={() => {
            if (!documentType) { toast('Selecciona un tipo de documento'); return; }
            setWizardStep(3);
          }}
          primary={<>Siguiente <IonIcon icon={chevronForward} /></>}
        />
      );
    }

    if (wizardStep === 4) {
      return (
        <ClientWizardFooterBar
          onBack={goBackWizard}
          onPrimary={handleVerify}
          primaryDisabled={wizardLoading}
          variant="submit"
          primary={
            wizardLoading
              ? <IonSpinner name="crescent" className="client-wizard-btn-spinner" />
              : 'Verificar biometría'
          }
        />
      );
    }

    if (wizardStep === 5) {
      return (
        <ClientWizardFooterBar
          onBack={goBackWizard}
          onPrimary={handleSubmitContract}
          primaryDisabled={!contractAccepted || !pagareAccepted || wizardLoading}
          variant="submit"
          primary={
            wizardLoading
              ? <IonSpinner name="crescent" className="client-wizard-btn-spinner" />
              : <>Enviar contrato <IonIcon icon={checkmark} /></>
          }
        />
      );
    }

    if (wizardStep === 6) {
      return (
        <ClientWizardFooterBar
          showBack={false}
          onPrimary={() => { setShowWizard(false); resetWizard(); loadClients(); }}
          variant="submit"
          primary={<>Finalizar <IonIcon icon={checkmark} /></>}
        />
      );
    }

    return null;
  };

  const renderWizardStep = () => {
    if (wizardStep === 0) return renderStep0();
    if (wizardStep === 1) return renderStep1();
    if (wizardStep === 2) return renderStep2();
    if (wizardStep === 3) return renderCaptureSubStep();
    if (wizardStep === 4) return renderStep4();
    if (wizardStep === 5) return renderStep5();
    return renderStep6();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <IonPage>
      <Header
        presentAlertPopover={presentAlertPopover}
        presentMailPopover={presentMailPopover}
        screenTitle="Clientes"
        showBackButton={true}
        backButtonText="Menú"
        backButtonHref="/dashboard"
      />

      <IonContent>
        <div className="search-container">
          <IonSearchbar
            value={searchTerm}
            onIonInput={(e) => setSearchTerm(e.detail.value!)}
            placeholder="Buscar por nombre, teléfono o email..."
            className="clients-searchbar"
          />
        </div>

        <div className="clients-list">
          {filteredClients.map((client) => (
            <IonCard key={client.clientId} className="client-card">
              <IonCardContent className="client-card-content">
                <div className="client-card-row">
                  <div className="client-left" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    {clientSelfieMap[client.clientId] ? (
                      <img
                        src={clientSelfieMap[client.clientId]}
                        alt={`${client.first_name}`}
                        className="client-avatar-photo"
                      />
                    ) : (
                      <IonIcon icon={personCircle} className="client-avatar" />
                    )}
                    {(() => {
                      const steps = getLoanCompletion(client);
                      const pct = Math.round((steps.filter(s => s.done).length / steps.length) * 100);
                      return <LoanCompletionRing percentage={pct} size={48} strokeWidth={4} />;
                    })()}
                  </div>
                  <div className="client-main">
                    <div className="client-header">
                      <IonCardTitle className="client-name">{client.first_name} {client.last_name}</IonCardTitle>
                    </div>
                    <p className="client-subtitle">{client.email || 'Sin correo registrado'}</p>
                    <div className="client-meta-row">
                      <span className="client-meta-badge">
                        <span className="meta-label">Teléfono</span>
                        <span className="meta-value">{client.cellphone || '—'}</span>
                      </span>
                      <span className="client-meta-badge">
                        <span className="meta-label">Creado</span>
                        <span className="meta-value">{formatDate(client.created_At)}</span>
                      </span>
                    </div>
                  </div>
                  <div className="client-actions">
                    <IonButton fill="outline" size="small" color="success" onClick={() => { setQrModalClient(client); setShowQrModal(true); }} className="action-button">
                      <IonIcon icon={qrCodeOutline} slot="start" /> QR
                    </IonButton>
                    <IonButton fill="outline" size="small" color="medium" onClick={() => { setShareClient(client); setShowShareModal(true); }} className="action-button">
                      <IonIcon icon={shareOutline} slot="start" /> Invitar
                    </IonButton>
                    {/* Dashboard based on clientType */}
                    {(client.clientType === 'borrower' || client.clientType === 'both' || !client.clientType) && (
                      <IonButton fill="outline" size="small" color="tertiary" onClick={() => history.push(`/client-dashboard/${client.clientId}`)} className="action-button">
                        <IonIcon icon={barChartOutline} slot="start" /> Dashboard
                      </IonButton>
                    )}
                    {(client.clientType === 'lender' || client.clientType === 'both') && (
                      <IonButton fill="outline" size="small" style={{ '--color': '#15803d', '--border-color': '#15803d' }} onClick={() => history.push(`/lender-dashboard/${client.clientId}`)} className="action-button">
                        <IonIcon icon={walletOutline} slot="start" /> Portfolio
                      </IonButton>
                    )}
                    <IonButton fill="outline" size="small" color="warning" onClick={() => history.push(`/client-followup/${client.clientId}`)} className="action-button">
                      <IonIcon icon={calendarOutline} slot="start" /> Seguimiento
                    </IonButton>
                    <IonButton fill="outline" size="small" color="primary" onClick={() => handleEdit(client)} className="action-button edit-button">
                      <IonIcon icon={pencil} slot="start" /> Editar
                    </IonButton>
                    <IonButton fill="outline" size="small" color="danger" onClick={() => handleDelete(client)} className="action-button delete-button">
                      <IonIcon icon={trash} slot="start" /> Eliminar
                    </IonButton>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>
          ))}
        </div>

        {filteredClients.length === 0 && !loading && (
          <div className="empty-state">
            <IonIcon icon={person} className="empty-icon" />
            <IonText color="medium"><p>{searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados'}</p></IonText>
          </div>
        )}
        {loading && (
          <div className="loading-state">
            <IonText color="medium"><p>Cargando clientes...</p></IonText>
          </div>
        )}

        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => { resetWizard(); setWizardMode('create'); setShowWizard(true); }} aria-label="Nuevo cliente">
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        {/* ── Delete Alert ────────────────────────────────────────────────── */}
        <IonAlert
          isOpen={showDeleteAlert}
          onDidDismiss={() => setShowDeleteAlert(false)}
          header="Confirmar eliminación"
          message={`¿Eliminar al cliente ${selectedForDelete?.first_name} ${selectedForDelete?.last_name}?`}
          buttons={[
            { text: 'Cancelar', role: 'cancel', handler: () => setShowDeleteAlert(false) },
            { text: 'Eliminar', role: 'destructive', handler: confirmDelete },
          ]}
        />

        <IonToast isOpen={showToast} onDidDismiss={() => setShowToast(false)} message={toastMessage} duration={2500} color={toastMessage.toLowerCase().includes('error') ? 'danger' : 'success'} />
      </IonContent>

      {/* ── QR View Modal ──────────────────────────────────────────────────── */}
      <IonModal isOpen={showQrModal} onDidDismiss={() => { setShowQrModal(false); setQrModalClient(null); }} breakpoints={[0, 0.6]} initialBreakpoint={0.6}>
        <IonHeader className="ion-no-border">
          <IonToolbar>
            <IonTitle>Código QR</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowQrModal(false)}>Cerrar</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {qrModalClient && (
            <div className="client-qr-modal-content">
              <QRCodeSVG
                value={buildClientQrValue(qrModalClient.clientId, qrModalClient.first_name, qrModalClient.last_name)}
                size={220}
                level="H"
                includeMargin
              />
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>{qrModalClient.first_name} {qrModalClient.last_name}</p>
                <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>{qrModalClient.cellphone}</p>
                <p style={{ margin: '2px 0 0', color: '#9ca3af', fontSize: 12 }}>ID: {qrModalClient.clientId}</p>
              </div>
              <IonButton
                expand="block"
                className="client-qr-download-btn"
                onClick={() => handleDownloadQrPdf(qrModalClient)}
                disabled={qrDownloading}
              >
                {qrDownloading ? (
                  <IonSpinner name="crescent" style={{ width: 18, height: 18 }} />
                ) : (
                  <>
                    <IonIcon icon={downloadOutline} slot="start" />
                    Descargar QR como PDF
                  </>
                )}
              </IonButton>
            </div>
          )}
        </IonContent>
      </IonModal>

      {/* ── Share / Invite Modal ───────────────────────────────────────────── */}
      <IonModal isOpen={showShareModal} onDidDismiss={() => { setShowShareModal(false); setShareClient(null); setShareCopied(false); }} breakpoints={[0, 0.7]} initialBreakpoint={0.7}>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Invitar a descargar la app</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowShareModal(false)}>
                <IonIcon icon={closeOutline} slot="icon-only" />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          {shareClient && (
            <div>
              {/* Client info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 14px', background: '#f9fafb', borderRadius: 14, border: '1px solid #e5e7eb' }}>
                {clientSelfieMap[shareClient.clientId]
                  ? <img src={clientSelfieMap[shareClient.clientId]} alt="selfie" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
                  : <IonIcon icon={personCircle} style={{ fontSize: 44, color: '#9ca3af' }} />}
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: '#111827' }}>{shareClient.first_name} {shareClient.last_name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6b7280' }}>{shareClient.cellphone}</p>
                  <span style={{ fontSize: 11, background: shareClient.clientType === 'lender' ? '#dcfce7' : '#eff6ff', color: shareClient.clientType === 'lender' ? '#15803d' : '#2563eb', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>
                    {shareClient.clientType === 'lender' ? '💼 Prestamista' : shareClient.clientType === 'both' ? '🔄 Ambos' : '📋 Acreditado'}
                  </span>
                </div>
              </div>

              {/* Message preview */}
              <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', margin: '0 0 8px' }}>Vista previa del mensaje:</p>
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#14532d', whiteSpace: 'pre-line', marginBottom: 20, lineHeight: 1.6 }}>
                {buildShareMessage(shareClient)}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <IonButton expand="block" shape="round" color="success" onClick={() => openWhatsApp(shareClient)}
                  style={{ '--background': '#25D366', '--color': '#fff' }}>
                  <IonIcon icon={logoWhatsapp} slot="start" />
                  Enviar por WhatsApp
                </IonButton>
                <IonButton expand="block" shape="round" fill="outline" onClick={() => openSMS(shareClient)}>
                  <IonIcon icon={chatbubbleOutline} slot="start" />
                  Enviar por SMS
                </IonButton>
                <IonButton expand="block" shape="round" fill="outline" color="medium" onClick={() => copyLink(shareClient)}>
                  <IonIcon icon={copyOutline} slot="start" />
                  {shareCopied ? '✓ Mensaje copiado' : 'Copiar mensaje'}
                </IonButton>
              </div>

              {/* Store links */}
              <div style={{ marginTop: 20, padding: '10px 14px', background: '#f9fafb', borderRadius: 12, border: '1px solid #e5e7eb' }}>
                <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Links de descarga</p>
                <p style={{ margin: '3px 0', fontSize: 12, color: '#374151' }}>📱 Android: <span style={{ color: '#2563eb' }}>{PLAY_STORE_URL}</span></p>
                <p style={{ margin: '3px 0', fontSize: 12, color: '#374151' }}>🍎 iOS: <span style={{ color: '#2563eb' }}>{APP_STORE_URL}</span></p>
                <p style={{ margin: '8px 0 0', fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>⚠️ Actualiza los URLs cuando publiques en las tiendas.</p>
              </div>
            </div>
          )}
        </IonContent>
      </IonModal>

      {/* ── Client Wizard Modal ──────────────────────────────────────────────── */}
      <IonModal isOpen={showWizard} onDidDismiss={() => { setShowWizard(false); resetWizard(); }} className="client-wizard-modal">
        <IonHeader>
          <IonToolbar>
            <IonTitle className="client-wizard-modal-title">
              {wizardMode === 'edit' ? 'Editar Cliente' : 'Nuevo Cliente'}
            </IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => { setShowWizard(false); resetWizard(); }} fill="clear">
                <IonIcon icon={close} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <WizardStepBar />

        <IonContent className="client-wizard-content client-face-recognition-page">
          <div className="client-wizard-scroll-content">{renderWizardStep()}</div>
        </IonContent>

        <WizardFooter />
      </IonModal>

      <AlertPopover isOpen={popoverState.showAlertPopover} event={popoverState.event} onDidDismiss={dismissAlertPopover} />
      <MailPopover isOpen={popoverState.showMailPopover} event={popoverState.event} onDidDismiss={dismissMailPopover} />
    </IonPage>
  );
};

export default ClientsPage;
