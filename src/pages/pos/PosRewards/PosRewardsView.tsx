import React from 'react';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonList, IonItem, IonLabel, IonNote, IonBadge,
  IonToast, IonLoading, IonFab, IonFabButton, IonSegment, IonSegmentButton,
} from '@ionic/react';
import { useExitConfirm } from '../../../contexts/ExitConfirmContext';
import {
  addOutline, arrowBack, giftOutline,
  createOutline, trashOutline, refreshOutline, checkmarkCircleOutline, removeCircleOutline,
} from 'ionicons/icons';
import { useHistory } from 'react-router-dom';
import EmptyState from '../../../components/ui/EmptyState';
import StatusBadge from '../../../components/ui/StatusBadge';
import { POS_REWARD_TX_TYPE } from '../../../components/ui/statusMaps';
import { fmtInt as fmt, mxDate as toDate } from '../../../utils/format';
import { stampUnits } from '../../../api/posRewardsApi';
import { PosRewardsVM } from './PosRewardsLogic';
import CatalogItemModal from './components/CatalogItemModal';
import RewardsOverview from './components/RewardsOverview';
import '../PosRewardsPage.css';

interface Props {
  vm: PosRewardsVM;
}

const PosRewardsView: React.FC<Props> = ({ vm }) => {
  const history = useHistory();
  const { confirmBack } = useExitConfirm();
  const {
    isAdmin, tab, setTab, loading, toastProps,
    catalog, ledger,
    openNewCatalogItem, openEditCatalogItem, deleteCatalogItem,
    reload,
  } = vm;

  const renderOverview = () => <RewardsOverview vm={vm} />;

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
                  <p>
                    <strong>
                      {item.rewardType === 'coupon_b2g1'
                        ? `Cupón ${item.code}${item.firstPurchaseOnly ? ' · solo primera compra' : ''}`
                        : item.rewardType === 'free_product'
                          ? `Tarjeta de sellos · ${fmt(stampUnits(item))} compras`
                          : `${fmt(item.requiredPoints)} pts`}
                    </strong>
                    {item.description ? ` · ${item.description}` : ''}
                  </p>
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
            <IonButton onClick={() => confirmBack()}>
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
