import React, { useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton,
  IonIcon, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonNote, IonBadge,
  IonModal, IonInput, IonSelect, IonSelectOption,
  IonToast, IonLoading, IonFab, IonFabButton, IonSegment, IonSegmentButton,
  IonGrid, IonRow, IonCol,
} from '@ionic/react';
import {
  addOutline, closeOutline, starOutline, giftOutline, trophyOutline,
  cashOutline, arrowBack, createOutline, trashOutline, refreshOutline,
  checkmarkCircleOutline, removeCircleOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import { useUser } from '../components/UserContext';
import { canAccess } from '../config/rolePermissions';
import { rewardsApi, RewardRule, RewardTransaction, RewardBalance } from '../api/rewardsApi';
import './RewardsPage.css';

type Tab = 'overview' | 'rules' | 'transactions';

const fmt = (n: number) => n.toLocaleString('es-MX');
const toDate = (s?: string) => {
  if (!s) return '—';
  const d = new Date(s.includes('Z') ? s : `${s}Z`);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

const EMPTY_RULE: Partial<RewardRule> = {
  ruleName: '', ruleType: 'purchase', pointsPerUnit: 1, minAmount: null, maxPointsPerTx: null, isActive: true,
};

const RewardsPage: React.FC = () => {
  const history = useHistory();
  const { companyId, userId, roleCode } = useUser();
  const isAdmin = canAccess(roleCode, 'users');

  const [tab, setTab]               = useState<Tab>('overview');
  const [loading, setLoading]       = useState(false);
  const [toast, setToast]           = useState('');
  const [toastColor, setToastColor] = useState<'success' | 'danger'>('success');

  const [rules, setRules]           = useState<RewardRule[]>([]);
  const [balances, setBalances]     = useState<RewardBalance[]>([]);
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);

  // Rule modal
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editRule, setEditRule]     = useState<Partial<RewardRule>>(EMPTY_RULE);

  // Earn/Redeem modal
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsMode, setPointsMode] = useState<'earn' | 'redeem'>('earn');
  const [ptClientId, setPtClientId] = useState('');
  const [ptPoints, setPtPoints]     = useState('');
  const [ptDesc, setPtDesc]         = useState('');
  const [ptRef, setPtRef]           = useState('');
  const [ptRuleId, setPtRuleId]     = useState('');

  // ── Data loading ─────────────────────────────────────────────────────────
  const load = async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [rulesRes, balRes, txRes] = await Promise.all([
        rewardsApi.listRules(companyId),
        rewardsApi.listBalances(companyId),
        rewardsApi.listTransactions(companyId),
      ]);
      setRules(Array.isArray(rulesRes) ? rulesRes : []);
      setBalances(Array.isArray(balRes) ? balRes : []);
      setTransactions(Array.isArray(txRes) ? txRes : []);
    } catch {
      showToast('Error al cargar datos', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [companyId]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const showToast = (msg: string, color: 'success' | 'danger' = 'success') => {
    setToast(msg); setToastColor(color);
  };

  const openNewRule = () => { setEditRule({ ...EMPTY_RULE, companyId }); setShowRuleModal(true); };
  const openEditRule = (r: RewardRule) => { setEditRule({ ...r }); setShowRuleModal(true); };

  const saveRule = async () => {
    if (!editRule.ruleName?.trim()) { showToast('Nombre de regla requerido', 'danger'); return; }
    setLoading(true);
    try {
      await rewardsApi.upsertRule({ ...editRule, companyId } as RewardRule);
      showToast('Regla guardada');
      setShowRuleModal(false);
      load();
    } catch { showToast('Error al guardar regla', 'danger'); }
    finally { setLoading(false); }
  };

  const deleteRule = async (ruleId: number) => {
    setLoading(true);
    try {
      await rewardsApi.deleteRule(companyId!, ruleId);
      showToast('Regla eliminada');
      load();
    } catch { showToast('Error al eliminar', 'danger'); }
    finally { setLoading(false); }
  };

  const handlePoints = async () => {
    const cid = parseInt(ptClientId);
    const pts = parseInt(ptPoints);
    if (!cid || !pts || pts <= 0) { showToast('Datos inválidos', 'danger'); return; }
    setLoading(true);
    try {
      const opts = { referenceId: ptRef || undefined, description: ptDesc || undefined, createdBy: userId };
      if (pointsMode === 'earn') {
        const rid = ptRuleId ? parseInt(ptRuleId) : undefined;
        await rewardsApi.earn(companyId!, cid, pts, { ...opts, ruleId: rid });
        showToast(`+${pts} puntos otorgados`);
      } else {
        const res = await rewardsApi.redeem(companyId!, cid, pts, opts);
        if (res.error === 'insufficient_points') {
          showToast(`Saldo insuficiente (balance: ${res.balance} pts)`, 'danger');
          return;
        }
        showToast(`${pts} puntos canjeados`);
      }
      setShowPointsModal(false);
      setPtClientId(''); setPtPoints(''); setPtDesc(''); setPtRef(''); setPtRuleId('');
      load();
    } catch { showToast('Error al procesar puntos', 'danger'); }
    finally { setLoading(false); }
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalBalance  = balances.reduce((s, b) => s + b.balance, 0);
  const totalEarned   = balances.reduce((s, b) => s + b.lifetimeEarned, 0);
  const totalRedeemed = balances.reduce((s, b) => s + b.lifetimeRedeemed, 0);
  const activeClients = balances.filter(b => b.balance > 0).length;

  // ── Renderers ─────────────────────────────────────────────────────────────
  const renderOverview = () => (
    <>
      {/* KPI cards */}
      <IonGrid className="rw-kpi-grid">
        <IonRow>
          {[
            { icon: trophyOutline,  label: 'Puntos en circulación', value: fmt(totalBalance),  color: '#d97706' },
            { icon: starOutline,    label: 'Total otorgados',        value: fmt(totalEarned),   color: '#2563eb' },
            { icon: giftOutline,    label: 'Total canjeados',        value: fmt(totalRedeemed), color: '#059669' },
            { icon: cashOutline,    label: 'Clientes activos',       value: fmt(activeClients), color: '#7c3aed' },
          ].map(k => (
            <IonCol size="6" key={k.label}>
              <IonCard className="rw-kpi-card">
                <IonCardContent>
                  <IonIcon icon={k.icon} style={{ color: k.color, fontSize: '1.6rem' }} />
                  <p className="rw-kpi-label">{k.label}</p>
                  <h2 className="rw-kpi-value" style={{ color: k.color }}>{k.value}</h2>
                </IonCardContent>
              </IonCard>
            </IonCol>
          ))}
        </IonRow>
      </IonGrid>

      {/* Leaderboard */}
      <IonCard className="rw-card">
        <IonCardHeader>
          <div className="rw-card-header-row">
            <IonCardTitle>Leaderboard de Clientes</IonCardTitle>
            <IonButton fill="clear" size="small" onClick={load}>
              <IonIcon icon={refreshOutline} slot="icon-only" />
            </IonButton>
          </div>
        </IonCardHeader>
        <IonCardContent>
          {balances.length === 0 ? (
            <div className="rw-empty">
              <IonIcon icon={trophyOutline} />
              <p>Sin puntos registrados aún.</p>
            </div>
          ) : (
            <IonList lines="none">
              {balances.slice(0, 20).map((b, i) => (
                <IonItem key={b.clientId} className="rw-leaderboard-item">
                  <span className="rw-rank" slot="start">{i + 1}</span>
                  <IonLabel>
                    <h3>Cliente #{b.clientId}</h3>
                    <p>Ganados: {fmt(b.lifetimeEarned)} · Canjeados: {fmt(b.lifetimeRedeemed)}</p>
                    <IonNote>{b.lastActivity ? `Última actividad: ${toDate(b.lastActivity)}` : 'Sin actividad'}</IonNote>
                  </IonLabel>
                  <IonBadge slot="end" className="rw-balance-badge">
                    {fmt(b.balance)} pts
                  </IonBadge>
                </IonItem>
              ))}
            </IonList>
          )}
        </IonCardContent>
      </IonCard>
    </>
  );

  const renderRules = () => (
    <IonCard className="rw-card">
      <IonCardHeader>
        <div className="rw-card-header-row">
          <IonCardTitle>Reglas de Puntos</IonCardTitle>
          {isAdmin && (
            <IonButton fill="clear" size="small" onClick={openNewRule}>
              <IonIcon icon={addOutline} slot="start" /> Nueva
            </IonButton>
          )}
        </div>
      </IonCardHeader>
      <IonCardContent>
        {rules.length === 0 ? (
          <div className="rw-empty">
            <IonIcon icon={starOutline} />
            <p>Sin reglas configuradas.</p>
            {isAdmin && <IonButton size="small" onClick={openNewRule}>Crear primera regla</IonButton>}
          </div>
        ) : (
          <IonList lines="none">
            {rules.map(r => (
              <IonItem key={r.ruleId} className="rw-rule-item">
                <IonLabel>
                  <h3>{r.ruleName}</h3>
                  <p>
                    <strong>{r.pointsPerUnit} pts</strong> por {r.ruleType === 'purchase' ? '$1 MXN' : r.ruleType === 'service' ? 'servicio' : 'unidad'}
                    {r.minAmount ? ` · Mín: $${r.minAmount}` : ''}
                    {r.maxPointsPerTx ? ` · Cap: ${r.maxPointsPerTx} pts` : ''}
                  </p>
                </IonLabel>
                <IonBadge slot="end" color={r.isActive ? 'success' : 'medium'}>
                  {r.isActive ? 'Activa' : 'Inactiva'}
                </IonBadge>
                {isAdmin && (
                  <div slot="end" className="rw-rule-actions">
                    <IonButton fill="clear" size="small" onClick={() => openEditRule(r)}>
                      <IonIcon icon={createOutline} />
                    </IonButton>
                    <IonButton fill="clear" size="small" color="danger" onClick={() => deleteRule(r.ruleId!)}>
                      <IonIcon icon={trashOutline} />
                    </IonButton>
                  </div>
                )}
              </IonItem>
            ))}
          </IonList>
        )}
      </IonCardContent>
    </IonCard>
  );

  const renderTransactions = () => (
    <IonCard className="rw-card">
      <IonCardHeader>
        <div className="rw-card-header-row">
          <IonCardTitle>Historial de Transacciones</IonCardTitle>
          <IonButton fill="clear" size="small" onClick={load}>
            <IonIcon icon={refreshOutline} slot="icon-only" />
          </IonButton>
        </div>
      </IonCardHeader>
      <IonCardContent>
        {transactions.length === 0 ? (
          <div className="rw-empty">
            <IonIcon icon={giftOutline} />
            <p>Sin transacciones aún.</p>
          </div>
        ) : (
          <IonList lines="none">
            {transactions.map(tx => (
              <IonItem key={tx.txId} className="rw-tx-item">
                <IonIcon
                  icon={tx.txType === 'earn' ? checkmarkCircleOutline : removeCircleOutline}
                  slot="start"
                  style={{ color: tx.txType === 'earn' ? '#059669' : '#dc2626', fontSize: '1.3rem' }}
                />
                <IonLabel>
                  <h3>
                    Cliente #{tx.clientId}
                    {tx.txType === 'earn'
                      ? <span className="rw-pts-earn"> +{fmt(tx.points)} pts</span>
                      : <span className="rw-pts-redeem"> {fmt(tx.points)} pts</span>}
                  </h3>
                  {tx.description && <p>{tx.description}</p>}
                  {tx.referenceId && <IonNote>Ref: {tx.referenceId}</IonNote>}
                  <IonNote>{toDate(tx.created_At)} · Balance: {fmt(tx.balanceAfter)} pts</IonNote>
                </IonLabel>
                <IonBadge slot="end" className={tx.txType === 'earn' ? 'rw-badge-earn' : 'rw-badge-redeem'}>
                  {tx.txType === 'earn' ? 'Ganado' : 'Canjeado'}
                </IonBadge>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonCardContent>
    </IonCard>
  );

  // ── Modals ─────────────────────────────────────────────────────────────────
  const renderRuleModal = () => (
    <IonModal isOpen={showRuleModal} onDidDismiss={() => setShowRuleModal(false)}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{editRule.ruleId ? 'Editar Regla' : 'Nueva Regla'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowRuleModal(false)}>
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="rw-form">
          <IonInput fill="outline" label="Nombre de la regla" labelPlacement="floating"
            value={editRule.ruleName}
            onIonInput={e => setEditRule(p => ({ ...p, ruleName: e.detail.value! }))} />

          <IonSelect fill="outline" label="Tipo de regla" labelPlacement="floating"
            value={editRule.ruleType}
            onIonChange={e => setEditRule(p => ({ ...p, ruleType: e.detail.value }))}>
            <IonSelectOption value="purchase">Por compra ($1 MXN)</IonSelectOption>
            <IonSelectOption value="service">Por servicio</IonSelectOption>
            <IonSelectOption value="manual">Manual</IonSelectOption>
          </IonSelect>

          <IonInput fill="outline" label="Puntos por unidad" labelPlacement="floating" type="number"
            value={editRule.pointsPerUnit}
            onIonInput={e => setEditRule(p => ({ ...p, pointsPerUnit: parseFloat(e.detail.value!) }))} />

          <IonInput fill="outline" label="Monto mínimo ($, opcional)" labelPlacement="floating" type="number"
            value={editRule.minAmount ?? ''}
            onIonInput={e => setEditRule(p => ({ ...p, minAmount: e.detail.value ? parseFloat(e.detail.value) : null }))} />

          <IonInput fill="outline" label="Máximo de puntos por transacción" labelPlacement="floating" type="number"
            value={editRule.maxPointsPerTx ?? ''}
            onIonInput={e => setEditRule(p => ({ ...p, maxPointsPerTx: e.detail.value ? parseInt(e.detail.value) : null }))} />

          <div className="rw-preview">
            <strong>Ejemplo:</strong> Compra de $500 MXN →{' '}
            {Math.min(
              editRule.maxPointsPerTx ?? 9999,
              Math.floor(500 * (editRule.pointsPerUnit ?? 1))
            )} puntos
          </div>

          <IonButton expand="block" shape="round" onClick={saveRule} className="rw-save-btn">
            <IonIcon icon={checkmarkCircleOutline} slot="start" />
            {editRule.ruleId ? 'Actualizar regla' : 'Crear regla'}
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );

  const renderPointsModal = () => (
    <IonModal isOpen={showPointsModal} onDidDismiss={() => setShowPointsModal(false)}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{pointsMode === 'earn' ? 'Otorgar Puntos' : 'Canjear Puntos'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => setShowPointsModal(false)}>
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <div className="rw-form">
          <IonSegment value={pointsMode} onIonChange={e => setPointsMode(e.detail.value as 'earn' | 'redeem')}>
            <IonSegmentButton value="earn">
              <IonIcon icon={starOutline} /> Otorgar
            </IonSegmentButton>
            <IonSegmentButton value="redeem">
              <IonIcon icon={giftOutline} /> Canjear
            </IonSegmentButton>
          </IonSegment>

          <IonInput fill="outline" label="ID del Cliente" labelPlacement="floating" type="number"
            value={ptClientId} onIonInput={e => setPtClientId(e.detail.value!)} />

          <IonInput fill="outline" label="Puntos" labelPlacement="floating" type="number"
            value={ptPoints} onIonInput={e => setPtPoints(e.detail.value!)} />

          {pointsMode === 'earn' && (
            <IonSelect fill="outline" label="Regla aplicada (opcional)" labelPlacement="floating"
              value={ptRuleId} onIonChange={e => setPtRuleId(e.detail.value)}>
              <IonSelectOption value="">Sin regla</IonSelectOption>
              {rules.map(r => (
                <IonSelectOption key={r.ruleId} value={String(r.ruleId)}>{r.ruleName}</IonSelectOption>
              ))}
            </IonSelect>
          )}

          <IonInput fill="outline" label="Referencia (ID de venta, etc.)" labelPlacement="floating"
            value={ptRef} onIonInput={e => setPtRef(e.detail.value!)} />

          <IonInput fill="outline" label="Descripción" labelPlacement="floating"
            value={ptDesc} onIonInput={e => setPtDesc(e.detail.value!)} />

          <IonButton expand="block" shape="round" onClick={handlePoints}
            className={`rw-save-btn ${pointsMode === 'redeem' ? 'rw-redeem-btn' : ''}`}>
            <IonIcon icon={pointsMode === 'earn' ? starOutline : giftOutline} slot="start" />
            {pointsMode === 'earn' ? 'Otorgar puntos' : 'Canjear puntos'}
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );

  // ── Main ──────────────────────────────────────────────────────────────────
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}>
              <IonIcon icon={arrowBack} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Puntos de Recompensa</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => { setPointsMode('earn'); setShowPointsModal(true); }}>
              <IonIcon icon={starOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as Tab)}>
            <IonSegmentButton value="overview">Resumen</IonSegmentButton>
            <IonSegmentButton value="rules">Reglas</IonSegmentButton>
            <IonSegmentButton value="transactions">Historial</IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding rw-page">
        <IonLoading isOpen={loading} message="Cargando..." />
        <IonToast isOpen={!!toast} message={toast} duration={2500}
          onDidDismiss={() => setToast('')} color={toastColor} position="top" />

        {tab === 'overview'      && renderOverview()}
        {tab === 'rules'         && renderRules()}
        {tab === 'transactions'  && renderTransactions()}

        {renderRuleModal()}
        {renderPointsModal()}
      </IonContent>

      {isAdmin && (
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => { setPointsMode('earn'); setShowPointsModal(true); }}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      )}
    </IonPage>
  );
};

export default RewardsPage;
