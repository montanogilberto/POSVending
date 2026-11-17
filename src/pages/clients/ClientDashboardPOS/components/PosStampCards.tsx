import React from 'react';
import { IonCard, IonCardContent, IonProgressBar } from '@ionic/react';
import { ClientDashboardPOSVM } from '../ClientDashboardPOSLogic';

/** Stamp cards grouped by category: one progress bar per product (subcategory). */
const PosStampCards: React.FC<{ vm: ClientDashboardPOSVM }> = ({ vm }) => {
  if (vm.stampGroups.length === 0) return null;
  return (
    <IonCard className="cpos-card">
      <IonCardContent className="cpos-card-content">
        <h2 className="cpos-section-title">Tarjetas de sellos</h2>
        <div className="cpos-stamp-groups">
          {vm.stampGroups.map((g) => (
            <section key={g.key} className="cpos-stamp-group" aria-label={g.title}>
              <h3 className="cpos-stamp-group-title">{g.title}</h3>
              <div className="cpos-stamp-list">
                {g.cards.map((s) => (
                  <div key={s.catalogItemId} className="cpos-stamp" title={`${s.name} · Aplica a: ${s.productName}`}>
                    <div className="cpos-stamp-head">
                      <strong className="cpos-stamp-label">{s.label}</strong>
                      <span className={s.pct >= 100 ? 'cpos-stamp-ready' : 'cpos-stamp-count'}>
                        {s.pct >= 100 ? 'Lista para canjear' : `${s.unitsAvailable} / ${s.requiredUnits}`}
                      </span>
                    </div>
                    <IonProgressBar value={s.pct / 100} color={s.pct >= 100 ? 'success' : 'primary'} className="cpos-stamp-bar" />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default PosStampCards;
