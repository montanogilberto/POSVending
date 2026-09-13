import React from 'react';
import { IonAlert, IonButton, IonIcon, IonItem, IonLabel, IonList } from '@ionic/react';
import { giftOutline } from 'ionicons/icons';
import { fmtInt } from '../../../../utils/format';
import { RewardsDashboardVM } from '../RewardsDashboardLogic';

interface Props { vm: RewardsDashboardVM; }

const RewardsCatalogList: React.FC<Props> = ({ vm }) => {
  const target = vm.redeemTarget;

  return (
    <section className="rewards-section rewards-catalog-section">
      <h2 className="rewards-section-title">Catálogo de Recompensas</h2>
      <IonList inset>
        {vm.catalog.map((item) => {
          const canRedeem = Boolean(item.catalogItemId) && (vm.balance?.balance ?? 0) >= item.requiredPoints;
          return (
            <IonItem key={item.catalogItemId ?? item.name} lines="full">
              <IonIcon slot="start" icon={giftOutline} className="rewards-catalog-icon" aria-hidden="true" />
              <IonLabel>
                <h3>{item.name}</h3>
                <p>{fmtInt(item.requiredPoints)} puntos</p>
                {item.description && <p>{item.description}</p>}
              </IonLabel>
              <IonButton
                slot="end"
                size="small"
                disabled={vm.redeeming || !item.catalogItemId || !canRedeem}
                onClick={() => vm.requestRedeem(item)}
                className="rewards-catalog-redeem"
              >
                Canjear
              </IonButton>
            </IonItem>
          );
        })}
        {vm.catalog.length === 0 && !vm.loading && (
          <IonItem><IonLabel color="medium">No hay recompensas disponibles.</IonLabel></IonItem>
        )}
      </IonList>

      <IonAlert
        isOpen={!!target}
        header="Confirmar canje"
        message={target ? `¿Canjear “${target.name}” por ${fmtInt(target.requiredPoints)} puntos?` : undefined}
        buttons={[
          { text: 'Cancelar', role: 'cancel', handler: vm.cancelRedeem },
          { text: 'Canjear', role: 'confirm', handler: () => { void vm.confirmRedeem(); } },
        ]}
        onDidDismiss={vm.cancelRedeem}
      />
    </section>
  );
};

export default RewardsCatalogList;
