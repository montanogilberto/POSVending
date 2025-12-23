import React, { useMemo } from 'react';
import { IonButton } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import Receipt from '../../components/Receipt';
import { RECEIPT_TEMPLATE } from './receiptTemplate';
import {
  ReceiptDisplayProps,
  formatDate,
  formatTime,
  getPaymentMethodText,
  generateProductsHTML,
  generateCashDetailsHTML,
  parseCashPaid,
} from './receiptUtils';
import { useReceiptPrint } from './useReceiptPrint';

const ReceiptDisplay: React.FC<ReceiptDisplayProps> = ({
  ticketData,
  paymentMethod,
  cashPaid,
  clearCart,
  setTicketData,
}) => {
  const history = useHistory();

  const receiptHTML = useMemo(() => {
    let html = RECEIPT_TEMPLATE;

    // Fecha y hora
    html = html.replace(
      'id="receipt-date"',
      `id="receipt-date">${formatDate(ticketData.paymentDate)}`
    );
    html = html.replace(
      'id="receipt-time"',
      `id="receipt-time">${formatTime(ticketData.paymentDate)}`
    );

    // Cliente / Usuario
    html = html.replace(
      'id="client-name"',
      `id="client-name">${ticketData.client.name}`
    );
    html = html.replace(
      'id="user-name"',
      `id="user-name">${ticketData.user.name}`
    );

    // Productos
    const productsHTML = generateProductsHTML(ticketData.products);
    html = html.replace(
      '<div class="receipt-products" id="products-list">',
      `<div class="receipt-products" id="products-list">${productsHTML}`
    );

    // Totales
    html = html.replace(
      'id="receipt-subtotal"',
      `id="receipt-subtotal">$${ticketData.totals.subtotal.toFixed(2)}`
    );
    html = html.replace(
      'id="receipt-iva"',
      `id="receipt-iva">$${ticketData.totals.iva.toFixed(2)}`
    );
    html = html.replace(
      'id="receipt-total"',
      `id="receipt-total">$${ticketData.totals.total.toFixed(2)}`
    );

    // Método de pago
    const paymentMethodText = getPaymentMethodText(ticketData.paymentMethod);
    html = html.replace(
      'id="payment-method"',
      `id="payment-method">${paymentMethodText}`
    );

    // Detalle de efectivo si aplica
    if (paymentMethod === 'efectivo') {
      const cashDetailsHTML = generateCashDetailsHTML(
        cashPaid,
        ticketData.totals.total
      );
      html = html.replace(
        '<div id="cash-details"></div>',
        `<div id="cash-details">${cashDetailsHTML}</div>`
      );
    }

    return html;
  }, [ticketData, paymentMethod, cashPaid]);

  const { handlePrint } = useReceiptPrint(receiptHTML);

  const handleClose = () => {
    setTicketData(null);
    clearCart();
    history.push('/Laundry');
  };

  return (
    <div
      id="receipt-container"
      style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <Receipt
        transactionDate={formatDate(ticketData.paymentDate)}
        transactionTime={formatTime(ticketData.paymentDate)}
        clientName={ticketData.client.name}
        clientPhone={ticketData.client.cellphone}
        clientEmail={ticketData.client.email}
        userName={ticketData.user.name}
        products={ticketData.products.map((prod) => ({
          name: prod.name,
          quantity: prod.quantity,
          unitPrice: prod.unitPrice,
          subtotal: prod.subtotal,
          options:
            prod.options?.map(
              (opt) => `${opt.optionName}: ${opt.choiceName}`
            ) || [],
        }))}
        subtotal={ticketData.totals.subtotal}
        iva={ticketData.totals.iva}
        total={ticketData.totals.total}
        paymentMethod={getPaymentMethodText(ticketData.paymentMethod)}
        amountReceived={
          paymentMethod === 'efectivo'
            ? parseCashPaid(cashPaid) || ticketData.totals.total
            : ticketData.totals.total
        }
        change={
          paymentMethod === 'efectivo'
            ? (parseCashPaid(cashPaid) || 0) - ticketData.totals.total
            : 0
        }
        onPrint={handlePrint}
      />
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <IonButton
          expand="block"
          fill="clear"
          onClick={handleClose}
        >
          Cerrar
        </IonButton>
      </div>
    </div>
  );
};

export default ReceiptDisplay;
