import React from 'react';
import { IonDatetime, IonDatetimeButton, IonLabel, IonModal, IonSegment, IonSegmentButton } from '@ionic/react';
import { PERIOD_LABELS, type CustomRange, type PeriodFilter } from '../../utils/period';
import './PeriodSegment.css';

interface PeriodSegmentProps {
  /** Unique per page: ids of the two date pickers. */
  idPrefix: string;
  value: PeriodFilter;
  onChange: (value: PeriodFilter) => void;
  custom: CustomRange;
  onCustomChange: (range: CustomRange) => void;
  options?: PeriodFilter[];
}

/** Hoy / 7 días / Este mes / Personalizado (desde–hasta), on the Hermosillo calendar (utils/period.ts). */
const PeriodSegment: React.FC<PeriodSegmentProps> = ({
  idPrefix, value, onChange, custom, onCustomChange, options = ['today', 'week', 'month', 'custom'],
}) => (
  <div className="period-segment">
    <IonSegment scrollable value={value} onIonChange={(e) => onChange(e.detail.value as PeriodFilter)}>
      {options.map(o => <IonSegmentButton key={o} value={o}><IonLabel>{PERIOD_LABELS[o]}</IonLabel></IonSegmentButton>)}
    </IonSegment>
    {value === 'custom' && (
      <div className="period-segment-range">
        <span>Desde</span>
        <IonDatetimeButton datetime={`${idPrefix}-from`} />
        <span>hasta</span>
        <IonDatetimeButton datetime={`${idPrefix}-to`} />
        <IonModal keepContentsMounted>
          <IonDatetime id={`${idPrefix}-from`} presentation="date" locale="es-MX" value={custom.from}
            onIonChange={(e) => onCustomChange({ ...custom, from: String(e.detail.value).slice(0, 10) })} />
        </IonModal>
        <IonModal keepContentsMounted>
          <IonDatetime id={`${idPrefix}-to`} presentation="date" locale="es-MX" value={custom.to}
            onIonChange={(e) => onCustomChange({ ...custom, to: String(e.detail.value).slice(0, 10) })} />
        </IonModal>
      </div>
    )}
  </div>
);

export default PeriodSegment;
