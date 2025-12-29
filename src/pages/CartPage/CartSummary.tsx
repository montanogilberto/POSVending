import React from 'react';
import { IonItem, IonLabel, IonSelect, IonSelectOption, IonInput } from '@ionic/react';
import UnifiedReceipt from '../../components/UnifiedReceipt';
import { ReceiptService } from '../../services/ReceiptService';
import { LegacyCartData } from '../../types/receipt';

interface CartSummaryProps {
  total: number;
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia' | '';
  setPaymentMethod: (value: 'efectivo' | 'tarjeta' | 'transferencia' | '') => void;
  cashPaid: string;
  setCashPaid: (value: string) => void;
  isCheckoutEnabled: boolean;
  ticketData?: any; // Added optional ticketData prop
}

const CartSummary: React.FC<CartSummaryProps> = ({
  total,
  paymentMethod,
  setPaymentMethod,
  cashPaid,
  setCashPaid,
  isCheckoutEnabled,
  ticketData,
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
          <IonSelectOption value="transferencia">Transferencia</IonSelectOption>
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

      {/* Render UnifiedReceipt inline if ticketData is available */}
      {ticketData && (() => {
        const unifiedReceiptData = ReceiptService.transformCartData(ticketData as LegacyCartData);
        return (
          <UnifiedReceipt
            data={unifiedReceiptData}
            options={{ width: '58mm', thermal: true }}
          />
        );
      })()}
    </>
  );
};

export default CartSummary;
