import React from 'react';
import { IonCard, IonCardContent, IonProgressBar } from '@ionic/react';
import { ClientDashboardPOSVM } from '../ClientDashboardPOSLogic';

const PosStampCards: React.FC<{ vm: ClientDashboardPOSVM }> = ({ vm }) => {
  if (vm.stampCards.length === 0) return null;
  return (
    <IonCard className="cpos-card">
      <IonCardContent className="cpos-card-content">
        <h2 className="cpos-section-title">Tarjetas de sellos</h2>
        <div className="cpos-stamp-list">
          {vm.stampCards.map((s) => (
            <div key={s.catalogItemId} className="cpos-stamp">
              <div className="cpos-stamp-head">
                <strong>{s.name}</strong>
                <span className={s.pct >= 100 ? 'cpos-stamp-ready' : 'cpos-stamp-count'}>
                  {s.pct >= 100 ? 'Lista para canjear' : `${s.unitsAvailable} / ${s.requiredUnits}`}
                </span>
              </div>
              <IonProgressBar value={s.pct / 100} color={s.pct >= 100 ? 'success' : 'primary'} className="cpos-stamp-bar" />
            </div>
          ))}
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default PosStampCards;
