import React from 'react';
import { IonAccordion, IonAccordionGroup, IonCard, IonCardContent, IonItem, IonLabel, IonProgressBar } from '@ionic/react';
import { ClientDashboardPOSVM } from '../ClientDashboardPOSLogic';
import { PosStampCard, PosStampCycle } from '../ClientDashboardPOSTypes';

/** One cycle row: name, "1 / 4" (or ready) and its bar. */
const CycleRow: React.FC<{ c: PosStampCycle }> = ({ c }) => (
  <div className="cpos-stamp">
    <div className="cpos-stamp-head">
      <strong className="cpos-stamp-label">{c.label}</strong>
      <span className={c.pct >= 100 ? 'cpos-stamp-ready' : 'cpos-stamp-count'}>
        {c.pct >= 100 ? 'Lista para canjear' : `${c.unitsAvailable} / ${c.requiredUnits}`}
      </span>
    </div>
    <IonProgressBar value={c.pct / 100} color={c.pct >= 100 ? 'success' : 'primary'} className="cpos-stamp-bar" />
  </div>
);

/** What the closed line says: ready cycles, else the cycle closest to a free unit. */
const summary = (s: PosStampCard) => (s.ready.length > 0
  ? <span className="cpos-stamp-ready">Lista: {s.ready.map((c) => c.label).join(', ')}</span>
  : <span className="cpos-stamp-count">{s.best.unitsAvailable > 0 ? `${s.best.label} ${s.best.unitsAvailable} / ${s.best.requiredUnits}` : `0 / ${s.best.requiredUnits}`}</span>);

/** Stamp cards per product; a product with cycles opens into one bar per cycle. */
const PosStampCards: React.FC<{ vm: ClientDashboardPOSVM }> = ({ vm }) => {
  if (vm.stampCards.length === 0) return null;
  return (
    <IonCard className="cpos-card">
      <IonCardContent className="cpos-card-content">
        <h2 className="cpos-section-title">Tarjetas de sellos</h2>
        <IonAccordionGroup multiple className="cpos-stamp-cards">
          {vm.stampCards.map((s) => (s.hasCycles ? (
            <IonAccordion key={s.catalogItemId} value={String(s.catalogItemId)} className="cpos-stamp-acc">
              <IonItem slot="header" lines="none" className="cpos-stamp-acc-head" title={s.name}>
                <IonLabel className="cpos-stamp-acc-label">
                  <strong>{s.productName}</strong>
                  {summary(s)}
                </IonLabel>
              </IonItem>
              <div slot="content" className="cpos-stamp-list cpos-stamp-cycles">
                {s.cycles.map((c) => <CycleRow key={c.key} c={c} />)}
              </div>
            </IonAccordion>
          ) : (
            <div key={s.catalogItemId} className="cpos-stamp-single" title={s.name}>
              <CycleRow c={{ ...s.cycles[0], label: s.productName }} />
            </div>
          )))}
        </IonAccordionGroup>
      </IonCardContent>
    </IonCard>
  );
};

export default PosStampCards;
