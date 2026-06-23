import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import {
  IonPage, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonLoading, IonToast, IonIcon, IonAvatar, IonBadge,
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonInput,
  IonSelect, IonSelectOption, IonTextarea, IonAlert,
} from '@ionic/react';
import {
  arrowBack, addOutline, closeOutline, callOutline, homeOutline,
  cardOutline, documentTextOutline, alertCircleOutline, checkmarkCircleOutline,
  ellipseOutline, trashOutline, refreshOutline, personCircleOutline,
  timeOutline, createOutline, walletOutline, barChartOutline,
} from 'ionicons/icons';
import { useUser } from '../components/UserContext';
import { getAllClients, Client } from '../api/clientsApi';
import { getAllClientFaceRecognitions } from '../api/clientFaceRecognitionApi';
import {
  ClientFollowUp, FollowUpType, FollowUpStatus, ClientRisk,
  getAllClientFollowUps, createClientFollowUp, updateClientFollowUp, deleteClientFollowUp,
} from '../api/clientFollowUpApi';
import './ClientFollowUpPage.css';

// ── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_META: Record<FollowUpType, { icon: string; label: string; color: string }> = {
  call:    { icon: callOutline,          label: 'Llamada',       color: '#2563eb' },
  visit:   { icon: homeOutline,          label: 'Visita',        color: '#7c3aed' },
  payment: { icon: cardOutline,          label: 'Pago recibido', color: '#15803d' },
  note:    { icon: documentTextOutline,  label: 'Nota',          color: '#6b7280' },
  alert:   { icon: alertCircleOutline,   label: 'Alerta',        color: '#dc2626' },
};

const RISK_META: Record<ClientRisk, { label: string; color: string; bg: string }> = {
  on_track: { label: 'Al corriente',  color: '#15803d', bg: 'rgba(21,128,61,0.1)' },
  at_risk:  { label: 'En riesgo',     color: '#b45309', bg: 'rgba(180,83,9,0.1)'  },
  default:  { label: 'Incumplido',    color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
};

const toDisplay = (utc: string | undefined) => {
  if (!utc) return '—';
  const d = new Date(utc.includes('Z') ? utc : utc + 'Z');
  return new Date(d.getTime() - 7 * 60 * 60 * 1000).toLocaleString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const blank = (companyId: number, clientId: number): Omit<ClientFollowUp, 'followUpId' | 'created_At' | 'updated_at'> => ({
  companyId, clientId,
  followUpType: 'call',
  status: 'pending',
  riskStatus: 'on_track',
  title: '',
  notes: '',
  scheduledAt: new Date().toISOString().slice(0, 16),
});

// ── Component ─────────────────────────────────────────────────────────────────

const ClientFollowUpPage: React.FC = () => {
  const { clientId: clientIdParam } = useParams<{ clientId: string }>();
  const history = useHistory();
  const { companyId, userId } = useUser();
  const clientId = Number(clientIdParam);

  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [client, setClient]       = useState<Client | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<ClientFollowUp[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Partial<ClientFollowUp> | null>(null);
  const [deleteId, setDeleteId]   = useState<number | null>(null);

  const fetchAll = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [allClients, faceRecs, fus] = await Promise.all([
        getAllClients(),
        getAllClientFaceRecognitions(companyId),
        getAllClientFollowUps(companyId, clientId),
      ]);
      setClient(allClients.find(c => c.clientId === clientId) ?? null);
      const fr = faceRecs.find(f => f.clientId === clientId);
      setSelfieUrl(fr?.clientSelfieBlobUrl ?? null);
      setFollowUps(fus.sort((a, b) => new Date(b.created_At ?? 0).getTime() - new Date(a.created_At ?? 0).getTime()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [companyId, clientId]);

  // ── Current risk = latest record's riskStatus ─────────────────────────────
  const currentRisk: ClientRisk = followUps[0]?.riskStatus ?? 'on_track';
  const riskMeta = RISK_META[currentRisk];

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing({ ...blank(companyId!, clientId) });
    setShowModal(true);
  };

  const openEdit = (fu: ClientFollowUp) => {
    setEditing({ ...fu });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editing || !companyId) return;
    setLoading(true);
    try {
      if (editing.followUpId) {
        await updateClientFollowUp(editing.followUpId, { ...editing });
        setFollowUps(prev => prev.map(f => f.followUpId === editing.followUpId ? { ...f, ...editing } as ClientFollowUp : f));
      } else {
        const created = await createClientFollowUp({ ...editing as Omit<ClientFollowUp, 'followUpId' | 'created_At' | 'updated_at'>, createdBy: userId });
        setFollowUps(prev => [created, ...prev]);
      }
      setShowModal(false);
      setSuccess('Seguimiento guardado.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId == null || !companyId) return;
    setLoading(true);
    try {
      await deleteClientFollowUp(deleteId, companyId);
      setFollowUps(prev => prev.filter(f => f.followUpId !== deleteId));
      setSuccess('Seguimiento eliminado.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
      setDeleteId(null);
    }
  };

  const markDone = async (fu: ClientFollowUp) => {
    if (!fu.followUpId) return;
    const updated = { ...fu, status: 'completed' as FollowUpStatus, completedAt: new Date().toISOString() };
    await updateClientFollowUp(fu.followUpId, updated);
    setFollowUps(prev => prev.map(f => f.followUpId === fu.followUpId ? updated : f));
    setSuccess('Marcado como completado.');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}>
              <IonIcon icon={arrowBack} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Seguimiento de Cliente</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push(`/client-dashboard/${clientId}`)}>
              <IonIcon icon={barChartOutline} slot="icon-only" />
            </IonButton>
            <IonButton onClick={() => history.push('/loans')}>
              <IonIcon icon={walletOutline} slot="icon-only" />
            </IonButton>
            <IonButton onClick={fetchAll}><IonIcon icon={refreshOutline} slot="icon-only" /></IonButton>
            <IonButton onClick={openCreate}><IonIcon icon={addOutline} slot="icon-only" /></IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent className="cfu-content ion-padding">
        <IonLoading isOpen={loading} message="Cargando..." />
        <IonToast isOpen={!!error} message={error} duration={3000} onDidDismiss={() => setError('')} color="danger" />
        <IonToast isOpen={!!success} message={success} duration={2000} onDidDismiss={() => setSuccess('')} color="success" />

        {/* Client header */}
        {client && (
          <div className="cfu-header-bar">
            <IonAvatar className="cfu-avatar">
              {selfieUrl
                ? <img src={selfieUrl} alt="selfie" />
                : <IonIcon icon={personCircleOutline} style={{ fontSize: 44, color: '#9ca3af' }} />}
            </IonAvatar>
            <div className="cfu-header-info">
              <h2>{client.first_name} {client.last_name}</h2>
              <p>{client.cellphone} · {client.email}</p>
            </div>
            <IonBadge
              className="cfu-risk-badge"
              style={{ background: riskMeta.bg, color: riskMeta.color }}>
              {riskMeta.label}
            </IonBadge>
          </div>
        )}

        {/* Stats row */}
        <div className="cfu-stats-row">
          {[
            { label: 'Total',      value: followUps.length,                                color: '#374151' },
            { label: 'Pendientes', value: followUps.filter(f => f.status === 'pending').length,   color: '#b45309' },
            { label: 'Completados',value: followUps.filter(f => f.status === 'completed').length, color: '#15803d' },
            { label: 'Alertas',    value: followUps.filter(f => f.followUpType === 'alert').length, color: '#dc2626' },
          ].map(s => (
            <div key={s.label} className="cfu-stat">
              <strong style={{ color: s.color }}>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Timeline */}
        {followUps.length === 0 && !loading ? (
          <div className="cfu-empty">
            <IonIcon icon={documentTextOutline} />
            <p>Sin seguimientos registrados.</p>
            <IonButton size="small" onClick={openCreate}>Agregar seguimiento</IonButton>
          </div>
        ) : (
          <div className="cfu-timeline">
            {followUps.map((fu, i) => {
              const meta = TYPE_META[fu.followUpType];
              const isDone = fu.status === 'completed';
              return (
                <div key={fu.followUpId ?? i} className={`cfu-entry ${isDone ? 'cfu-entry-done' : ''}`}>
                  <div className="cfu-line-col">
                    <div className="cfu-dot" style={{ background: isDone ? '#15803d' : meta.color }}>
                      <IonIcon icon={isDone ? checkmarkCircleOutline : meta.icon} />
                    </div>
                    {i < followUps.length - 1 && <div className="cfu-connector" />}
                  </div>
                  <IonCard className="cfu-card">
                    <IonCardContent>
                      <div className="cfu-card-top">
                        <div>
                          <span className="cfu-type-label" style={{ color: meta.color }}>{meta.label}</span>
                          <h3 className="cfu-title">{fu.title || '(sin título)'}</h3>
                        </div>
                        <IonBadge
                          className="cfu-risk-chip"
                          style={{ background: RISK_META[fu.riskStatus].bg, color: RISK_META[fu.riskStatus].color }}>
                          {RISK_META[fu.riskStatus].label}
                        </IonBadge>
                      </div>
                      {fu.notes && <p className="cfu-notes">{fu.notes}</p>}
                      <div className="cfu-card-meta">
                        {fu.scheduledAt && (
                          <span><IonIcon icon={timeOutline} /> {toDisplay(fu.scheduledAt)}</span>
                        )}
                        {fu.completedAt && (
                          <span style={{ color: '#15803d' }}><IonIcon icon={checkmarkCircleOutline} /> {toDisplay(fu.completedAt)}</span>
                        )}
                      </div>
                      <div className="cfu-card-actions">
                        {!isDone && (
                          <IonButton fill="clear" size="small" color="success" onClick={() => markDone(fu)}>
                            <IonIcon icon={checkmarkCircleOutline} slot="start" /> Completar
                          </IonButton>
                        )}
                        <IonButton fill="clear" size="small" onClick={() => openEdit(fu)}>
                          <IonIcon icon={createOutline} slot="start" /> Editar
                        </IonButton>
                        <IonButton fill="clear" size="small" color="danger" onClick={() => setDeleteId(fu.followUpId!)}>
                          <IonIcon icon={trashOutline} slot="icon-only" />
                        </IonButton>
                      </div>
                    </IonCardContent>
                  </IonCard>
                </div>
              );
            })}
          </div>
        )}

        {/* Create / Edit modal */}
        <IonModal isOpen={showModal} onDidDismiss={() => setShowModal(false)}>
          <IonHeader>
            <IonToolbar>
              <IonTitle>{editing?.followUpId ? 'Editar seguimiento' : 'Nuevo seguimiento'}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setShowModal(false)}>
                  <IonIcon icon={closeOutline} slot="icon-only" />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent className="ion-padding">
            {editing && (
              <div className="cfu-form">
                <div className="cfu-form-group">
                  <label>Tipo</label>
                  <IonSelect value={editing.followUpType}
                    onIonChange={e => setEditing(p => ({ ...p!, followUpType: e.detail.value }))}>
                    {(Object.keys(TYPE_META) as FollowUpType[]).map(t => (
                      <IonSelectOption key={t} value={t}>{TYPE_META[t].label}</IonSelectOption>
                    ))}
                  </IonSelect>
                </div>
                <div className="cfu-form-group">
                  <label>Título</label>
                  <IonInput value={editing.title} placeholder="Ej. Llamada de cobranza"
                    onIonInput={e => setEditing(p => ({ ...p!, title: e.detail.value! }))} className="cfu-input" />
                </div>
                <div className="cfu-form-group">
                  <label>Notas</label>
                  <IonTextarea value={editing.notes} rows={3} placeholder="Detalles del seguimiento..."
                    onIonInput={e => setEditing(p => ({ ...p!, notes: e.detail.value! }))} className="cfu-input" />
                </div>
                <div className="cfu-form-group">
                  <label>Estatus del cliente</label>
                  <IonSelect value={editing.riskStatus}
                    onIonChange={e => setEditing(p => ({ ...p!, riskStatus: e.detail.value }))}>
                    {(Object.keys(RISK_META) as ClientRisk[]).map(r => (
                      <IonSelectOption key={r} value={r}>{RISK_META[r].label}</IonSelectOption>
                    ))}
                  </IonSelect>
                </div>
                <div className="cfu-form-group">
                  <label>Estado de acción</label>
                  <IonSelect value={editing.status}
                    onIonChange={e => setEditing(p => ({ ...p!, status: e.detail.value }))}>
                    <IonSelectOption value="pending">Pendiente</IonSelectOption>
                    <IonSelectOption value="completed">Completado</IonSelectOption>
                    <IonSelectOption value="cancelled">Cancelado</IonSelectOption>
                  </IonSelect>
                </div>
                <div className="cfu-form-group">
                  <label>Fecha programada</label>
                  <IonInput type="datetime-local" value={editing.scheduledAt?.slice(0, 16)}
                    onIonInput={e => setEditing(p => ({ ...p!, scheduledAt: e.detail.value! }))} className="cfu-input" />
                </div>
                <IonButton expand="block" shape="round" onClick={handleSave} disabled={loading} style={{ marginTop: 20 }}>
                  Guardar seguimiento
                </IonButton>
              </div>
            )}
          </IonContent>
        </IonModal>

        {/* Delete confirm */}
        <IonAlert
          isOpen={deleteId != null}
          onDidDismiss={() => setDeleteId(null)}
          header="Eliminar seguimiento"
          message="¿Estás seguro de que deseas eliminar este registro?"
          buttons={[
            { text: 'Cancelar', role: 'cancel' },
            { text: 'Eliminar', handler: handleDelete },
          ]}
        />
      </IonContent>
    </IonPage>
  );
};

export default ClientFollowUpPage;
