import React from 'react';
import { IonButton, IonIcon, IonText } from '@ionic/react';
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons';
import { ExpensesVM } from '../ExpensesLogic';

/** ‹ Septiembre de 2026 › — same control as /ingresos. */
const ExpensesPeriodPicker: React.FC<{ vm: ExpensesVM; suffix?: string }> = ({ vm, suffix }) => (
  <div className="expenses-period">
    <IonButton fill="clear" size="small" aria-label="Mes anterior" disabled={vm.loading} onClick={vm.prevMonth}>
      <IonIcon icon={chevronBackOutline} slot="icon-only" />
    </IonButton>
    <IonText className="expenses-summary-subtitle">
      <span>{vm.periodLabel}{suffix ? ` • ${suffix}` : ''}</span>
    </IonText>
    <IonButton fill="clear" size="small" aria-label="Mes siguiente" disabled={vm.loading || vm.isCurrentPeriod} onClick={vm.nextMonth}>
      <IonIcon icon={chevronForwardOutline} slot="icon-only" />
    </IonButton>
  </div>
);

export default ExpensesPeriodPicker;
