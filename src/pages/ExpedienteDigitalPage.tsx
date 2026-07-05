import React, { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonLoading,
  IonToast,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
} from '@ionic/react';
import {
  arrowBack,
  idCardOutline,
  personOutline,
  documentTextOutline,
  qrCodeOutline,
  checkmarkCircle,
  closeCircle,
  downloadOutline,
  shieldCheckmarkOutline,
  ribbonOutline,
} from 'ionicons/icons';
import { useUser } from '../components/UserContext';
import { Client, getOneClient } from '../api/clientsApi';
import { ClientFaceRecognition, getAllClientFaceRecognitions } from '../api/clientFaceRecognitionApi';
import './ExpedienteDigitalPage.css';
import './ClientFaceRecognitionPage.css';

const formatDate = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
};

interface DocSlotProps {
  title: string;
  url?: string;
  kind: 'image' | 'pdf';
  meta?: string;
}

const DocSlot: React.FC<DocSlotProps> = ({ title, url, kind, meta }) => (
  <div className="id-preview-card expediente-doc-card">
    <span className="id-preview-title">{title}</span>
    {url ? (
      kind === 'image' ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt={title} className="captured-image-small" />
        </a>
      ) : (
        <a href={url} target="_blank" rel="noopener noreferrer" className="expediente-pdf-link">
          <IonIcon icon={documentTextOutline} />
          Ver documento
        </a>
      )
    ) : (
      <div className="id-preview-placeholder">Sin captura</div>
    )}
    <div className={`expediente-doc-status ${url ? 'ok' : 'missing'}`}>
      <IonIcon icon={url ? checkmarkCircle : closeCircle} />
      {url ? 'Disponible' : 'No disponible'}
    </div>
    {meta && <span className="expediente-doc-meta">{meta}</span>}
  </div>
);

const ExpedienteDigitalPage: React.FC = () => {
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const clientId = Number(clientIdParam);
  const history = useHistory();
  const { companyId } = useUser();

  const [client, setClient] = useState<Client | null>(null);
  const [record, setRecord] = useState<ClientFaceRecognition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!clientId || !companyId) return;
    setLoading(true);
    setError('');
    Promise.all([
      getOneClient({ clients: [{ clientId }] }),
      getAllClientFaceRecognitions(Number(companyId)),
    ])
      .then(([clients, records]) => {
        setClient(clients[0] ?? null);
        setRecord(records.find((r) => r.clientId === clientId) ?? null);
      })
      .catch(() => setError('No se pudo cargar el expediente digital.'))
      .finally(() => setLoading(false));
  }, [clientId, companyId]);

  const contractDate = formatDate(record?.contractAcceptedAt);
  const pagareDate = formatDate(record?.pagareAcceptedAt);
  const physicalPagareDate = formatDate(record?.physicalPagareVerifiedAt);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}>
              <IonIcon icon={arrowBack} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Expediente Digital</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding expediente-digital-page">
        <IonLoading isOpen={loading} message="Cargando expediente..." />
        <IonToast isOpen={!!error} message={error} duration={3000} onDidDismiss={() => setError('')} color="danger" />

        {client && (
          <IonCard className="expediente-client-card">
            <IonCardContent>
              <h2 className="expediente-client-name">{client.first_name} {client.last_name}</h2>
              <p className="expediente-client-meta">
                ID: {client.clientId} · Tel: {client.cellphone || '—'} · {client.email || 'Sin correo'}
              </p>
              {client.clientType && <span className="expediente-client-type">{client.clientType}</span>}
            </IonCardContent>
          </IonCard>
        )}

        <IonCard className="client-face-recognition-step-card">
          <IonCardHeader>
            <IonCardTitle className="expediente-section-title">
              <IonIcon icon={idCardOutline} /> Identificación oficial
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <p className="expediente-section-desc">
              Tipo de documento: <strong>{record?.documentType ?? '—'}</strong>
            </p>
            <div className="id-preview-grid">
              <DocSlot title="Frente" url={record?.idFrontImageBlobUrl} kind="image" />
              <DocSlot title="Reverso" url={record?.idBackImageBlobUrl} kind="image" />
            </div>
          </IonCardContent>
        </IonCard>

        <IonCard className="client-face-recognition-step-card">
          <IonCardHeader>
            <IonCardTitle className="expediente-section-title">
              <IonIcon icon={personOutline} /> Verificación facial
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="id-preview-grid">
              <DocSlot title="Selfie" url={record?.clientSelfieBlobUrl} kind="image" />
              <div className="id-preview-card expediente-doc-card">
                <span className="id-preview-title">Resultado</span>
                <div className={`expediente-doc-status ${record?.isVerified ? 'ok' : 'missing'}`}>
                  <IonIcon icon={record?.isVerified ? shieldCheckmarkOutline : closeCircle} />
                  {record?.isVerified ? 'Verificado' : 'No verificado'}
                </div>
                {typeof record?.confidenceScore === 'number' && record.confidenceScore > 0 && (
                  <span className="expediente-doc-meta">Confianza: {record.confidenceScore.toFixed(4)}</span>
                )}
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        <IonCard className="client-face-recognition-step-card">
          <IonCardHeader>
            <IonCardTitle className="expediente-section-title">
              <IonIcon icon={qrCodeOutline} /> Código QR
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="id-preview-grid">
              <DocSlot title="QR del cliente" url={client?.qrBlobUrl} kind="image" />
            </div>
          </IonCardContent>
        </IonCard>

        <IonCard className="client-face-recognition-step-card">
          <IonCardHeader>
            <IonCardTitle className="expediente-section-title">
              <IonIcon icon={ribbonOutline} /> Documentos legales
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="id-preview-grid">
              <DocSlot
                title="Contrato de crédito"
                url={record?.contractPdfBlobUrl}
                kind="pdf"
                meta={contractDate ? `Aceptado: ${contractDate}` : undefined}
              />
              <DocSlot
                title="Pagaré"
                url={record?.pagarePdfBlobUrl}
                kind="pdf"
                meta={pagareDate ? `Aceptado: ${pagareDate}` : undefined}
              />
            </div>
            <p className="expediente-physical-pagare">
              <IonIcon icon={record?.hasPhysicalPagare ? checkmarkCircle : closeCircle} />
              {record?.hasPhysicalPagare
                ? `Pagaré físico en resguardo${physicalPagareDate ? ` — verificado: ${physicalPagareDate}` : ''}`
                : 'Sin pagaré físico en resguardo'}
            </p>
          </IonCardContent>
        </IonCard>

        <a
          className="expediente-download-all"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            [
              record?.idFrontImageBlobUrl,
              record?.idBackImageBlobUrl,
              record?.clientSelfieBlobUrl,
              client?.qrBlobUrl,
              record?.contractPdfBlobUrl,
              record?.pagarePdfBlobUrl,
            ]
              .filter((url): url is string => !!url)
              .forEach((url) => window.open(url, '_blank', 'noopener,noreferrer'));
          }}
        >
          <IonIcon icon={downloadOutline} /> Abrir todos los documentos disponibles
        </a>
      </IonContent>
    </IonPage>
  );
};

export default ExpedienteDigitalPage;
