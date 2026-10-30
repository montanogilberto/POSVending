import React from 'react';
import {
  IonButton, IonButtons, IonChip, IonContent, IonHeader, IonInput, IonModal, IonSpinner,
  IonTitle, IonToolbar,
} from '@ionic/react';
import { fmtMXN } from '../../../../utils/format';
import { STRIPE_FEE_LABEL } from '../../../../utils/stripeFee';
import { TOP_UP_MIN_MXN, TOP_UP_QUICK_AMOUNTS } from '../MyQrConstants';
import type { MyQrVM } from '../MyQrLogic';

/** Paso 1 de la recarga: monto, comisión y neto que se abona. */
const TopUpAmountSheet: React.FC<{ vm: MyQrVM }> = ({ vm }) => (
  <IonModal isOpen={vm.showAmountSheet} onDidDismiss={vm.closeTopUp}
    initialBreakpoint={0.75} breakpoints={[0, 0.75, 1]}>
    <IonHeader>
      <IonToolbar>
        <IonTitle>Recargar saldo</IonTitle>
        <IonButtons slot="end">
          <IonButton onClick={vm.closeTopUp} disabled={vm.startingPayment}>Cerrar</IonButton>
        </IonButtons>
      </IonToolbar>
    </IonHeader>
    <IonContent className="ion-padding my-qr-topup">
      <p className="my-qr-topup-hint">¿Cuánto quieres recargar? Pagas con tarjeta u OXXO.</p>

      <div className="my-qr-topup-quick">
        {TOP_UP_QUICK_AMOUNTS.map(v => (
          <IonChip key={v} outline={vm.amount !== v} color="primary"
            onClick={() => vm.setAmountInput(String(v))} disabled={vm.startingPayment}>
            {fmtMXN(v)}
          </IonChip>
        ))}
      </div>

      <IonInput
        className="my-qr-topup-input"
        type="number"
        inputmode="decimal"
        label="Monto (MXN)"
        labelPlacement="stacked"
        fill="outline"
        min={TOP_UP_MIN_MXN}
        value={vm.amountInput}
        disabled={vm.startingPayment}
        onIonInput={e => vm.setAmountInput(String(e.detail.value ?? ''))}
      />

      {vm.amount > 0 && (
        <div className="my-qr-topup-breakdown">
          <div><span>Pagas</span><span>{fmtMXN(vm.amount)}</span></div>
          <div><span>{STRIPE_FEE_LABEL}</span><span>-{fmtMXN(vm.fee)}</span></div>
          <div className="my-qr-topup-net"><span>Se abona a tu saldo</span><strong>{fmtMXN(vm.net)}</strong></div>
        </div>
      )}
      {vm.amount > 0 && !vm.amountValid && (
        <p className="my-qr-topup-min">El monto mínimo es {fmtMXN(TOP_UP_MIN_MXN)}.</p>
      )}

      <IonButton expand="block" className="my-qr-topup-continue"
        disabled={!vm.amountValid || vm.startingPayment} onClick={vm.startPayment}>
        {vm.startingPayment ? <IonSpinner name="dots" /> : 'Continuar al pago'}
      </IonButton>
    </IonContent>
  </IonModal>
);

export default TopUpAmountSheet;
