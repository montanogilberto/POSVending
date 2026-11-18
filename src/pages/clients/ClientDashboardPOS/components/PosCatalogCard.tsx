import React from 'react';
import { IonBadge, IonCard, IonCardContent, IonIcon, IonItem, IonLabel, IonList } from '@ionic/react';
import { giftOutline } from 'ionicons/icons';
import EmptyState from '../../../../components/ui/EmptyState';
import { fmtInt } from '../../../../utils/format';
import { stampUnits } from '../../../../api/posRewardsApi';
import { ClientDashboardPOSVM } from '../ClientDashboardPOSLogic';

// Customer only. Rewards are redeemed at the register, with the sale (CartPage
// sends them and the backend applies the discount), so this list only shows them.
const PosCatalogCard: React.FC<{ vm: ClientDashboardPOSVM }> = ({ vm }) => (
  <IonCard className="cpos-card">
    <IonCardContent className="cpos-card-content">
      <h2 className="cpos-section-title">Catálogo de Recompensas</h2>
      {vm.catalog.length === 0 ? (
        <EmptyState icon={giftOutline} text="No hay recompensas disponibles." className="cpos-empty" />
      ) : (
        <IonList lines="full">
          {vm.catalog.map((item) => {
            const isStampCard = item.rewardType === 'free_product';
            const available = !isStampCard && (vm.balance?.balance ?? 0) >= item.requiredPoints;
            return (
              <IonItem key={item.catalogItemId ?? item.name}>
                <IonIcon slot="start" icon={giftOutline} className="cpos-catalog-icon" aria-hidden="true" />
                <IonLabel>
                  <h3>{item.name}</h3>
                  <p>
                    {isStampCard
                      ? `Tarjeta de sellos · ${fmtInt(stampUnits(item))} compras de ese producto`
                      : `${fmtInt(item.requiredPoints)} puntos`}
                    {' · se aplica en caja'}
                  </p>
                  {item.description && <p>{item.description}</p>}
                </IonLabel>
                {available && <IonBadge slot="end" color="success">Disponible</IonBadge>}
              </IonItem>
            );
          })}
        </IonList>
      )}
    </IonCardContent>
  </IonCard>
);

export default PosCatalogCard;
