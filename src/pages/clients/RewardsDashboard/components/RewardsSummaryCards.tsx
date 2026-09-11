import React from 'react';
import { IonGrid, IonRow, IonCol, IonCard, IonCardContent } from '@ionic/react';
import { fmtInt } from '../../../../utils/format';
import { RewardsDashboardVM } from '../RewardsDashboardLogic';

interface Props {
  vm: RewardsDashboardVM;
}

const RewardsSummaryCards: React.FC<Props> = ({ vm }) => {
  const balance = vm.balance;

  return (
    <IonGrid className="rewards-summary-grid">
      <IonRow>
        <IonCol size="6" sizeMd="3">
          <IonCard className="rewards-kpi-card">
            <IonCardContent>
              <p className="rewards-kpi-label">Saldo actual</p>
              <h2 className="rewards-kpi-value">{fmtInt(balance?.balance ?? 0)}</h2>
              <p className="rewards-kpi-sub">puntos</p>
            </IonCardContent>
          </IonCard>
        </IonCol>
        <IonCol size="6" sizeMd="3">
          <IonCard className="rewards-kpi-card">
            <IonCardContent>
              <p className="rewards-kpi-label">Ganados en total</p>
              <h2 className="rewards-kpi-value">{fmtInt(balance?.lifetimeEarned ?? 0)}</h2>
              <p className="rewards-kpi-sub">puntos</p>
            </IonCardContent>
          </IonCard>
        </IonCol>
        <IonCol size="6" sizeMd="3">
          <IonCard className="rewards-kpi-card">
            <IonCardContent>
              <p className="rewards-kpi-label">Canjeados en total</p>
              <h2 className="rewards-kpi-value">{fmtInt(balance?.lifetimeRedeemed ?? 0)}</h2>
              <p className="rewards-kpi-sub">puntos</p>
            </IonCardContent>
          </IonCard>
        </IonCol>
        <IonCol size="6" sizeMd="3">
          <IonCard className="rewards-kpi-card">
            <IonCardContent>
              <p className="rewards-kpi-label">Última actividad</p>
              <h2 className="rewards-kpi-value rewards-kpi-value--small">
                {balance?.lastActivity ? new Date(balance.lastActivity).toLocaleDateString('es-MX') : '—'}
              </h2>
            </IonCardContent>
          </IonCard>
        </IonCol>
      </IonRow>
    </IonGrid>
  );
};

export default RewardsSummaryCards;
