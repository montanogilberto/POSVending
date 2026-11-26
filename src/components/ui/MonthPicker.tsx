import React, { useState } from 'react';
import { IonButton, IonDatetime, IonIcon, IonModal } from '@ionic/react';
import { calendarOutline, chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import {
  MonthPeriod, currentPeriod, parsePeriodKey, periodKey, periodLabel, samePeriod, shiftPeriod,
} from '../../utils/monthPeriod';
import './MonthPicker.css';

const MIN_MONTH: MonthPeriod = { year: 2020, month: 1 };

interface MonthPickerProps {
  value: MonthPeriod;
  onChange: (period: MonthPeriod) => void;
  disabled?: boolean;
}

/** ‹ Noviembre de 2026 › — arrows plus a month/year calendar; future months can't be chosen. */
const MonthPicker: React.FC<MonthPickerProps> = ({ value, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const max = currentPeriod();

  const choose = (raw: unknown) => {
    const picked = parsePeriodKey(String(raw ?? '').slice(0, 7));
    if (picked && !samePeriod(picked, value)) onChange(picked);
  };

  return (
    <div className="month-picker">
      <IonButton fill="clear" size="small" aria-label="Mes anterior"
        disabled={disabled || samePeriod(value, MIN_MONTH)} onClick={() => onChange(shiftPeriod(value, -1))}>
        <IonIcon icon={chevronBackOutline} slot="icon-only" />
      </IonButton>
      <IonButton fill="clear" size="small" disabled={disabled} onClick={() => setOpen(true)}>
        <IonIcon icon={calendarOutline} slot="start" />
        {periodLabel(value)}
      </IonButton>
      <IonButton fill="clear" size="small" aria-label="Mes siguiente"
        disabled={disabled || samePeriod(value, max)} onClick={() => onChange(shiftPeriod(value, 1))}>
        <IonIcon icon={chevronForwardOutline} slot="icon-only" />
      </IonButton>

      <IonModal isOpen={open} onDidDismiss={() => setOpen(false)} className="month-picker-modal">
        <IonDatetime
          presentation="month-year"
          locale="es-MX"
          min={periodKey(MIN_MONTH)}
          max={periodKey(max)}
          value={periodKey(value)}
          showDefaultButtons
          doneText="Aceptar"
          cancelText="Cancelar"
          onIonChange={(e) => choose(e.detail.value)}
        />
      </IonModal>
    </div>
  );
};

export default MonthPicker;
