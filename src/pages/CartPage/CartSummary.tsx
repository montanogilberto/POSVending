import React from 'react';
import { IonItem, IonLabel, IonSelect, IonSelectOption, IonInput } from '@ionic/react';
import Receipt from '../../components/Receipt';

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

      {/* Render Receipt inline if ticketData is available */}
      {ticketData && (
        <Receipt
          transactionDate={new Date(ticketData.paymentDate).toLocaleDateString('es-ES')}
          transactionTime={new Date(ticketData.paymentDate).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
          clientName={ticketData.client.name}
          clientPhone={ticketData.client.cellphone}
          clientEmail={ticketData.client.email}
          userName={ticketData.user.name}
          products={ticketData.products.map((prod: any) => ({
            name: prod.name,
            quantity: prod.quantity,
            unitPrice: prod.unitPrice,
            subtotal: prod.subtotal,
            options: prod.options.map((opt: any) => `${opt.optionName}: ${opt.choiceName}`),
          }))}
          subtotal={ticketData.totals.subtotal}
          iva={ticketData.totals.iva}
          total={ticketData.totals.total}
          paymentMethod={ticketData.paymentMethod === 'efectivo' ? 'Efectivo' : ticketData.paymentMethod === 'tarjeta' ? 'Tarjeta' : 'Transferencia'}
          amountReceived={
            paymentMethod === 'efectivo'
              ? parseFloat(cashPaid) || ticketData.totals.total
              : ticketData.totals.total
          }
          change={
            paymentMethod === 'efectivo'
              ? (parseFloat(cashPaid) || 0) - ticketData.totals.total
              : 0
          }
        />
      )}
    </>
  );
};

export default CartSummary;
