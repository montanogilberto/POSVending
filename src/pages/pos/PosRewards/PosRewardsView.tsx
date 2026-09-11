import React from 'react';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonNote, IonBadge,
  IonToast, IonLoading, IonFab, IonFabButton, IonSegment, IonSegmentButton,
  IonGrid, IonRow, IonCol,
} from '@ionic/react';
import {
  addOutline, arrowBack, trophyOutline, starOutline, giftOutline, cashOutline,
  createOutline, trashOutline, refreshOutline, checkmarkCircleOutline, removeCircleOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import { POS_REWARD_TX_TYPE } from '../../../components/ui/statusMaps';
import { fmtInt as fmt, mxDate as toDate } from '../../../utils/format';
import { PosRewardsVM } from './PosRewardsLogic';
import CatalogItemModal from './components/CatalogItemModal';
import '../PosRewardsPage.css';

interface Props {
  vm: PosRewardsVM;
}

const PosRewardsView: React.FC<Props> = ({ vm }) => {
  const history = useHistory();
  const {
    isAdmin, tab, setTab, loading, toastProps,
    summary, balances, catalog, ledger,
    openNewCatalogItem, openEditCatalogItem, deleteCatalogItem,
    reload,
  } = vm;

  const renderOverview = () => (
    <>
      <IonGrid className="pr-kpi-grid">
        <IonRow>
          {[
            { icon: starOutline,   label: 'Puntos otorgados', value: fmt(summary?.pointsIssued ?? 0),   color: '#2563eb' },
            { icon: giftOutline,   label: 'Puntos canjeados', value: fmt(summary?.pointsRedeemed ?? 0), color: '#059669' },
            { icon: trophyOutline, label: 'Recompensas canjeadas', value: fmt(summary?.redemptionsCount ?? 0), color: '#d97706' },
            { icon: cashOutline,   label: 'Clientes con saldo', value: fmt(balances.filter(b => b.balance > 0).length), color: '#7c3aed' },
          ].map(k => (
            <IonCol size="6" key={k.label}>
              <IonCard className="pr-kpi-card">
                <IonCardContent>
                  <IonIcon icon={k.icon} style={{ color: k.color, fontSize: '1.6rem' }} />
                  <p className="pr-kpi-label">{k.label}</p>
                  <h2 className="pr-kpi-value" style={{ color: k.color }}>{k.value}</h2>
                </IonCardContent>
              </IonCard>
            </IonCol>
          ))}
        </IonRow>
      </IonGrid>

      <IonCard className="pr-card">
        <IonCardHeader>
          <div className="pr-card-header-row">
            <IonCardTitle>Top Clientes</IonCardTitle>
            <IonButton fill="clear" size="small" onClick={reload}>
              <IonIcon icon={refreshOutline} slot="icon-only" />
            </IonButton>
          </div>
        </IonCardHeader>
        <IonCardContent>
          {balances.length === 0 ? (
            <EmptyState icon={trophyOutline} text="Sin puntos POS registrados aún." />
          ) : (
            <IonList lines="none">
              {balances.slice(0, 20).map((b, i) => (
                <IonItem key={b.clientId} className="pr-leaderboard-item">
                  <span className="pr-rank" slot="start">{i + 1}</span>
                  <IonLabel>
                    <h3>Cliente #{b.clientId}</h3>
                    <p>Ganados: {fmt(b.lifetimeEarned)} · Canjeados: {fmt(b.lifetimeRedeemed)}</p>
                    <IonNote>{b.lastActivity ? `Última actividad: ${toDate(b.lastActivity)}` : 'Sin actividad'}</IonNote>
                  </IonLabel>
                  <IonBadge slot="end" className="pr-balance-badge">{fmt(b.balance)} pts</IonBadge>
                </IonItem>
              ))}
            </IonList>
          )}
        </IonCardContent>
      </IonCard>
    </>
  );

  const renderCatalog = () => (
    <IonCard className="pr-card">
      <IonCardHeader>
        <div className="pr-card-header-row">
          <IonCardTitle>Catálogo de Recompensas</IonCardTitle>
          {isAdmin && (
            <IonButton fill="clear" size="small" onClick={openNewCatalogItem}>
              <IonIcon icon={addOutline} slot="start" /> Nueva
            </IonButton>
          )}
        </div>
      </IonCardHeader>
      <IonCardContent>
        {catalog.length === 0 ? (
          <EmptyState icon={giftOutline} text="Sin recompensas configuradas."
            action={isAdmin ? <IonButton size="small" onClick={openNewCatalogItem}>Crear primera recompensa</IonButton> : undefined} />
        ) : (
          <IonList lines="none">
            {catalog.map(item => (
              <IonItem key={item.catalogItemId} className="pr-catalog-item">
                <IonLabel>
                  <h3>{item.name}</h3>
                  <p><strong>{fmt(item.requiredPoints)} pts</strong>{item.description ? ` · ${item.description}` : ''}</p>
                </IonLabel>
                <IonBadge slot="end" color={item.isActive ? 'success' : 'medium'}>
                  {item.isActive ? 'Activa' : 'Inactiva'}
                </IonBadge>
                {isAdmin && (
                  <div slot="end" className="pr-catalog-actions">
                    <IonButton fill="clear" size="small" onClick={() => openEditCatalogItem(item)}>
                      <IonIcon icon={createOutline} />
                    </IonButton>
                    <IonButton fill="clear" size="small" color="danger"
                      onClick={() => item.catalogItemId && deleteCatalogItem(item.catalogItemId)}>
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

  const renderHistory = () => (
    <IonCard className="pr-card">
      <IonCardHeader>
        <div className="pr-card-header-row">
          <IonCardTitle>Historial de Puntos</IonCardTitle>
          <IonButton fill="clear" size="small" onClick={reload}>
            <IonIcon icon={refreshOutline} slot="icon-only" />
          </IonButton>
        </div>
      </IonCardHeader>
      <IonCardContent>
        {ledger.length === 0 ? (
          <EmptyState icon={giftOutline} text="Sin movimientos aún." />
        ) : (
          <IonList lines="none">
            {ledger.map(tx => (
              <IonItem key={tx.transactionId} className="pr-tx-item">
                <IonIcon
                  icon={tx.direction === 'C' ? checkmarkCircleOutline : removeCircleOutline}
                  slot="start"
                  style={{ color: tx.direction === 'C' ? '#059669' : '#dc2626', fontSize: '1.3rem' }}
                />
                <IonLabel>
                  <h3>
                    Cliente #{tx.clientId}
                    <span className={tx.direction === 'C' ? 'pr-pts-earn' : 'pr-pts-redeem'}>
                      {' '}{tx.direction === 'C' ? '+' : '-'}{fmt(tx.points)} pts
                    </span>
                  </h3>
                  {tx.description && <p>{tx.description}</p>}
                  {tx.referenceId && <IonNote>Ref: {tx.referenceType} #{tx.referenceId}</IonNote>}
                  <IonNote>{toDate(tx.created_At)} · Balance: {fmt(tx.balanceAfter)} pts</IonNote>
                </IonLabel>
                <div slot="end">
                  <StatusBadge status={tx.txType} map={POS_REWARD_TX_TYPE} />
                </div>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonCardContent>
    </IonCard>
  );

  return (
    <>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonButton onClick={() => history.goBack()}>
              <IonIcon icon={arrowBack} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Puntos POS</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSegment value={tab} onIonChange={e => setTab(e.detail.value as any)}>
            <IonSegmentButton value="overview">Resumen</IonSegmentButton>
            <IonSegmentButton value="catalog">Catálogo</IonSegmentButton>
            <IonSegmentButton value="history">Historial</IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding pr-page">
        <IonLoading isOpen={loading} message="Cargando..." />
        <IonToast {...toastProps} />

        {tab === 'overview' && renderOverview()}
        {tab === 'catalog'  && renderCatalog()}
        {tab === 'history'  && renderHistory()}

        <CatalogItemModal vm={vm} />
      </IonContent>

      {isAdmin && tab === 'catalog' && (
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={openNewCatalogItem}>
            <IonIcon icon={addOutline} />
          </IonFabButton>
        </IonFab>
      )}
    </>
  );
};

export default PosRewardsView;
