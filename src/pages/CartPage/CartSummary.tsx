import React from 'react';
import { IonItem, IonLabel, IonSelect, IonSelectOption, IonInput } from '@ionic/react';

interface CartSummaryProps {
  total: number;
  paymentMethod: 'efectivo' | 'tarjeta' | '';
  setPaymentMethod: (value: 'efectivo' | 'tarjeta' | '') => void;
  cashPaid: string;
  setCashPaid: (value: string) => void;
  isCheckoutEnabled: boolean;
}

const CartSummary: React.FC<CartSummaryProps> = ({
  total,
  paymentMethod,
  setPaymentMethod,
  cashPaid,
  setCashPaid,
  isCheckoutEnabled,
}) => {
  return (
    <>
      <IonItem lines="none">
        <IonLabel>
          <h2>Total: ${total.toFixed(2)}</h2>
        </IonLabel>
      </IonItem>

      <IonItem>
        <IonLabel position="stacked">Método de pago</IonLabel>
        <IonSelect
          value={paymentMethod}
          onIonChange={(e) => {
            setPaymentMethod(e.detail.value);
            setCashPaid('');
          }}
          interface="popover"
        >
          <IonSelectOption value="efectivo">Efectivo</IonSelectOption>
          <IonSelectOption value="tarjeta">Tarjeta</IonSelectOption>
        </IonSelect>
      </IonItem>

      {paymentMethod === 'efectivo' && (
        <IonItem>
          <IonLabel position="stacked">Efectivo recibido</IonLabel>
          <IonInput
            type="number"
            value={cashPaid}
            onIonChange={e => setCashPaid(e.detail.value!)}
            placeholder="Ingrese el efectivo recibido"
            min={total}
          />
        </IonItem>
      )}
    </>
  );
};

export default CartSummary;
