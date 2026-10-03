import React from 'react';
import { IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonIcon, IonInput, IonSelect, IonSelectOption } from '@ionic/react';
import { checkmarkCircleOutline, warningOutline } from 'ionicons/icons';
import { fmtMXN } from '../../../../utils/format';
import type { OperationDraft } from '../ExpenseOperationTypes';

interface Props {
  draft: OperationDraft;
  total: number;
  difference: number | null;
  agrees: boolean;
  submitAttempted: boolean;
  onMethod: (method: string) => void;
  onDate: (date: string) => void;
}

const TotalsSection: React.FC<Props> = ({ draft, total, difference, agrees, submitAttempted, onMethod, onDate }) => (
  <IonCard className="xo-card">
    <IonCardHeader>
      <IonCardTitle className="xo-card-title">Totales y pago</IonCardTitle>
    </IonCardHeader>
    <IonCardContent>
      <div className="xo-totals">
        <div className="xo-totals-row"><span>Suma de los productos</span><strong>{fmtMXN(total)}</strong></div>
        <div className="xo-totals-row"><span>Total del ticket</span><strong>{draft.ticketTotal > 0 ? fmtMXN(draft.ticketTotal) : 'No se leyó'}</strong></div>
        {difference !== null && (
          <div className={`xo-totals-check ${agrees ? 'xo-totals-check--ok' : 'xo-totals-check--warn'}`}>
            <IonIcon icon={agrees ? checkmarkCircleOutline : warningOutline} />
            <span>
              {agrees
                ? 'Los productos suman el total del ticket.'
                : `Los productos ${difference > 0 ? 'superan' : 'quedan por debajo de'} el ticket por ${fmtMXN(Math.abs(difference))}. Revisa cantidades, costos o líneas omitidas.`}
            </span>
          </div>
        )}
      </div>

      <IonSelect
        className={`xo-field ${submitAttempted && !draft.paymentMethod ? 'ion-invalid ion-touched' : ''}`}
        fill="outline" interface="popover" labelPlacement="stacked" placeholder="Seleccionar método" errorText="Selecciona cómo se pagó"
        value={draft.paymentMethod || undefined} onIonChange={e => onMethod(String(e.detail.value))}
      >
        <div slot="label">Método de pago <span className="expense-required">*</span></div>
        <IonSelectOption value="Efectivo">Efectivo</IonSelectOption>
        <IonSelectOption value="Tarjeta">Tarjeta</IonSelectOption>
        <IonSelectOption value="Transferencia">Transferencia</IonSelectOption>
      </IonSelect>
      <IonInput
        className={`xo-field ${submitAttempted && !draft.paymentDate ? 'ion-invalid ion-touched' : ''}`}
        fill="outline" label="Fecha de la compra" labelPlacement="stacked" type="date" errorText="Falta la fecha"
        value={draft.paymentDate} onIonInput={e => onDate(String(e.detail.value ?? ''))}
      />
    </IonCardContent>
  </IonCard>
);

export default TotalsSection;
