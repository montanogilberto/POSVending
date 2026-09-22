import React from 'react';
import { IonCard, IonCardContent, IonIcon } from '@ionic/react';
import { starSharp } from 'ionicons/icons';
import { fmtInt } from '../../../../utils/format';
import { RewardsDashboardVM } from '../RewardsDashboardLogic';

interface Props {
  vm: RewardsDashboardVM;
  onViewDetails: () => void;
}

const RewardsHeroCard: React.FC<Props> = ({ vm, onViewDetails }) => (
  <IonCard className="rewards-hero-card" button onClick={onViewDetails}>
    <IonCardContent>
      <div className="rewards-hero-greeting">
        <h1>¡Hola, {vm.firstName}!</h1>
        <p>Aquí tienes un resumen de tu actividad y puntos.</p>
      </div>
      <div className="rewards-hero-points-badge">
        <IonIcon icon={starSharp} aria-hidden="true" />
        <div>
          <p className="rewards-hero-points-label">Mis Puntos</p>
          <p className="rewards-hero-points-value">{fmtInt(vm.balance?.balance ?? 0)}</p>
        </div>
        <span className="rewards-hero-points-link">Ver detalles →</span>
      </div>
    </IonCardContent>
  </IonCard>
);

export default RewardsHeroCard;
