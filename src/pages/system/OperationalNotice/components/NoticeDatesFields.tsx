import React from 'react';
import { IonInput, IonToggle } from '@ionic/react';

/** Date range + optional hours, shared by the wizard (step 2) and the edit modal. */
const NoticeDatesFields: React.FC<{
  startDate: string; endDate: string; minDate: string;
  useHours: boolean; startTime: string; endTime: string;
  onStartDate: (v: string) => void; onEndDate: (v: string) => void;
  onUseHours: (v: boolean) => void; onStartTime: (v: string) => void; onEndTime: (v: string) => void;
}> = p => (
  <div className="notice-dates">
    <div className="notice-row">
      <IonInput type="date" label="Desde" labelPlacement="stacked" fill="outline" value={p.startDate}
        onIonInput={e => p.onStartDate(String(e.detail.value ?? ''))} />
      <IonInput type="date" label="Hasta (incluido)" labelPlacement="stacked" fill="outline" value={p.endDate}
        min={p.startDate || p.minDate} onIonInput={e => p.onEndDate(String(e.detail.value ?? ''))}
        errorText="Debe ser igual o posterior a la fecha inicial y no puede haber pasado"
        className={p.endDate && (p.endDate < p.startDate || p.endDate < p.minDate) ? 'ion-invalid ion-touched' : ''} />
    </div>
    <IonToggle checked={p.useHours} labelPlacement="end" className="notice-toggle"
      onIonChange={e => p.onUseHours(e.detail.checked)}>
      Solo en un horario (si no, aplica todo el día)
    </IonToggle>
    {p.useHours && (
      <div className="notice-row">
        <IonInput type="time" label="Desde las" labelPlacement="stacked" fill="outline" value={p.startTime}
          onIonInput={e => p.onStartTime(String(e.detail.value ?? ''))} />
        <IonInput type="time" label="Hasta las" labelPlacement="stacked" fill="outline" value={p.endTime}
          onIonInput={e => p.onEndTime(String(e.detail.value ?? ''))} />
      </div>
    )}
  </div>
);

export default NoticeDatesFields;
