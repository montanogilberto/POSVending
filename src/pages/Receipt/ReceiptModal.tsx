import React, { RefObject } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { printOutline } from 'ionicons/icons';
import Receipt from '../../components/Receipt';

interface ReceiptModalProps {
  showReceipt: boolean;
  ticketData: any;
  receiptRef: RefObject<HTMLDivElement | null>;
  paymentMethod: 'efectivo' | 'tarjeta' | '';
  cashPaid: string;
  clearCart: () => void;
  loadIncomes: () => Promise<void>;
  setShowReceipt: (show: boolean) => void;
  setTicketData: (data: any) => void;
  history: any;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({
  showReceipt,
  ticketData,
  receiptRef,
  paymentMethod,
  cashPaid,
  clearCart,
  loadIncomes,
  setShowReceipt,
  setTicketData,
  history,
}) => {
  if (!showReceipt || !ticketData) return null;

  const handlePrint = () => {
    if (!receiptRef.current) {
      console.log('Receipt content not found');
      return;
    }

    const receiptHtml = receiptRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=400,height=600');

    if (!printWindow) {
      console.error('Unable to open print window (popup blocked?)');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket</title>
          <style>
            @page {
              size: 58mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: monospace;
              font-size: 11px;
            }
            #ticket-root {
              width: 58mm;
              padding: 4px 2px;
            }
          </style>
        </head>
        <body>
          <div id="ticket-root">
            ${receiptHtml}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const transactionDate = (() => {
    const utcDate = new Date(ticketData.paymentDate + (ticketData.paymentDate.includes('Z') ? '' : 'Z'));
    const hermosilloDate = new Date(utcDate.getTime() - 7 * 60 * 60 * 1000);
    return hermosilloDate.toLocaleDateString('es-ES');
  })();

  const transactionTime = (() => {
    const utcDate = new Date(ticketData.paymentDate + (ticketData.paymentDate.includes('Z') ? '' : 'Z'));
    const hermosilloDate = new Date(utcDate.getTime() - 7 * 60 * 60 * 1000);
    return hermosilloDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  })();

  return (
    <div
      className="print-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        ref={receiptRef}
        id="receipt-content"
        style={{
          backgroundColor: '#fff',
          padding: '8px',
          width: '58mm',
          fontFamily: 'monospace',
          fontSize: '11px',
        }}
      >
        <Receipt
          transactionDate={transactionDate}
          transactionTime={transactionTime}
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
          paymentMethod={ticketData.paymentMethod === 'efectivo' ? 'Efectivo' : 'Tarjeta'}
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
      </div>

      <IonButton
        style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 10000 }}
        onClick={async () => {
          setShowReceipt(false);
          setTicketData(null);
          clearCart();
          await loadIncomes();
          history.push('/Laundry');
        }}
      >
        Cerrar
      </IonButton>
      <IonButton
        style={{ position: 'absolute', top: '20px', right: '120px', zIndex: 10000 }}
        onClick={handlePrint}
      >
        <IonIcon icon={printOutline} slot="start" />
        Imprimir
      </IonButton>
    </div>
  );
};

export default ReceiptModal;
