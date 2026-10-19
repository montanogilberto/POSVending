import React from 'react';
import { IonBadge, IonIcon, IonItem, IonLabel, IonList } from '@ionic/react';
import { giftOutline } from 'ionicons/icons';
import { fmtInt } from '../../../../utils/format';
import { RewardsDashboardVM } from '../RewardsDashboardLogic';
import { stampUnits } from '../../../../api/posRewardsApi';

interface Props { vm: RewardsDashboardVM; }

// Rewards are redeemed at the register, with the sale (CartPage sends them and
// the backend applies the discount). Redeeming here took the points or
// stamps without discounting any sale, so this list only shows them.
const RewardsCatalogList: React.FC<Props> = ({ vm }) => {
  return (
    <section className="rewards-section rewards-catalog-section">
      <h2 className="rewards-section-title">Catálogo de Recompensas</h2>
      <IonList inset>
        {vm.catalog.map((item) => {
          const isStampCard = item.rewardType === 'free_product';
          const canRedeem = !isStampCard && (vm.balance?.balance ?? 0) >= item.requiredPoints;
          return (
            <IonItem key={item.catalogItemId ?? item.name} lines="full">
              <IonIcon slot="start" icon={giftOutline} className="rewards-catalog-icon" aria-hidden="true" />
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
              {canRedeem && <IonBadge slot="end" color="success">Disponible</IonBadge>}
            </IonItem>
          );
        })}
        {vm.catalog.length === 0 && !vm.loading && (
          <IonItem><IonLabel color="medium">No hay recompensas disponibles.</IonLabel></IonItem>
        )}
      </IonList>
    </section>
  );
};

export default RewardsCatalogList;
