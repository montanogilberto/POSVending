import React from 'react';
import { IonInput, IonItem, IonList, IonToggle } from '@ionic/react';
import { DAYS } from '../WhatsAppSetupConstants';
import type { WhatsAppSetupVM } from '../WhatsAppSetupLogic';

/** One row per weekday: open/closed + opening and closing time. */
const HoursStep: React.FC<{ vm: WhatsAppSetupVM }> = ({ vm }) => (
  <IonList lines="full" className="was-hours">
    {vm.days.map((d, i) => (
      <IonItem key={DAYS[i]} className="was-hour-row">
        <IonToggle
          checked={d.open} disabled={vm.savingStep} justify="start" labelPlacement="end"
          onIonChange={e => vm.setDay(i, { open: e.detail.checked })}
        >
          <span className="was-hour-day">{DAYS[i]}</span>
        </IonToggle>
        {d.open ? (
          <div className="was-hour-times" slot="end">
            <IonInput
              type="time" fill="outline" aria-label={`${DAYS[i]} abre`} value={d.openTime} disabled={vm.savingStep}
              onIonInput={e => vm.setDay(i, { openTime: e.detail.value ?? '' })}
            />
            <span className="was-muted">a</span>
            <IonInput
              type="time" fill="outline" aria-label={`${DAYS[i]} cierra`} value={d.closeTime} disabled={vm.savingStep}
              onIonInput={e => vm.setDay(i, { closeTime: e.detail.value ?? '' })}
            />
          </div>
        ) : (
          <span className="was-muted" slot="end">Cerrado</span>
        )}
      </IonItem>
    ))}
  </IonList>
);

export default HoursStep;
