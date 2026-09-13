import React from 'react';
import { IonList, IonItem, IonLabel, IonIcon, IonButton, IonSpinner, IonAlert } from '@ionic/react';
import { giftOutline } from 'ionicons/icons';
import { fmtInt } from '../../../../utils/format';
import { RewardsDashboardVM } from '../RewardsDashboardLogic';

interface Props {
  vm: RewardsDashboardVM;
}

const RewardsCatalogList: React.FC<Props> = ({ vm }) => {
  const balance = vm.balance?.balance ?? 0;

  return (
    <>
      <h2 className="rewards-section-title">Catálogo de Recompensas</h2>
      <IonList inset>
        {vm.catalog.map((item) => {
          const isRedeemingThis = vm.redeeming && vm.redeemTarget?.catalogItemId === item.catalogItemId;
          const affordable = !!item.catalogItemId && item.requiredPoints <= balance;
          return (
            <IonItem key={item.catalogItemId}>
              <IonIcon icon={giftOutline} slot="start" className="rewards-activity-icon" />
              <IonLabel>
                <h3>{item.name}</h3>
                <p className="rewards-catalog-row-points">{fmtInt(item.requiredPoints)} puntos</p>
              </IonLabel>
              <IonButton
                slot="end"
                size="small"
                fill="outline"
                disabled={vm.redeeming || !affordable}
                onClick={() => vm.requestRedeem(item)}
              >
                {isRedeemingThis ? <IonSpinner name="dots" /> : 'Canjear'}
              </IonButton>
            </IonItem>
          );
        })}
        {vm.catalog.length === 0 && !vm.loading && (
          <IonItem><IonLabel color="medium">Sin recompensas disponibles todavía.</IonLabel></IonItem>
        )}
      </IonList>

      <IonAlert
        isOpen={!!vm.redeemTarget}
        onDidDismiss={vm.cancelRedeem}
        header="Confirmar canje"
        message={`¿Canjear "${vm.redeemTarget?.name}" por ${fmtInt(vm.redeemTarget?.requiredPoints ?? 0)} puntos?`}
        buttons={[
          { text: 'Cancelar', role: 'cancel', handler: vm.cancelRedeem },
          { text: 'Canjear', handler: vm.confirmRedeem },
        ]}
      />
    </>
  );
};

export default RewardsCatalogList;
