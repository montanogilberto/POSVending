import React from 'react';
import { IonButton } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import Receipt from '../../components/Receipt';

interface ReceiptDisplayProps {
  ticketData: any;
  paymentMethod: string;
  cashPaid: string;
  clearCart: () => void;
  setTicketData: (data: any) => void;
}

const RECEIPT_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <title>Recibo</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 58mm;
      font-family: Arial, sans-serif !important;
      font-size: 13px !important;
      color: #000 !important;
      -webkit-font-smoothing: none !important;
      background: white;
      line-height: 1.3;
    }

    * {
      color: #000 !important;
      -webkit-font-smoothing: none !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* CONTENT: a bit narrower than the paper and centered */
    .receipt-container {
      width: 48mm;
      max-width: 48mm;
      margin: 0 auto; /* center horizontally */
      background: white;
      padding: 2mm 0;
      box-sizing: border-box;
    }

    .receipt-title {
      font-size: 18px !important;
      font-weight: 900 !important;
      text-align: center;
      color: #000 !important;
      border-bottom: 1px dashed #000;
      padding-bottom: 5px;
      margin-bottom: 10px;
    }

    .receipt-section {
      margin-bottom: 8px;
    }

    .receipt-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      padding: 1px 0;
      font-size: 13px !important;
      font-weight: 700 !important;
      letter-spacing: 0.2px;
    }

    .receipt-label {
      font-weight: 900 !important;
      color: #000 !important;
    }

    .receipt-value {
      color: #000 !important;
      text-align: right;
      font-weight: 900 !important;
    }

    .receipt-total {
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 5px 0;
      font-size: 16px !important;
      font-weight: 900 !important;
      margin: 8px 0;
      letter-spacing: 0.2px;
    }

    .receipt-products {
      margin: 10px 0;
    }

    .product-item {
      border-bottom: 1px dotted #000;
      padding: 5px 0;
      margin-bottom: 5px;
    }

    .product-name {
      font-weight: 900 !important;
      font-size: 14px !important;
      margin-bottom: 2px;
      color: #000 !important;
    }

    .product-details {
      font-size: 12px !important;
      color: #000 !important;
      line-height: 1.2;
      font-weight: 700 !important;
    }

    .receipt-qr {
      text-align: center;
      margin: 10px 0;
      padding: 10px 0;
      border-top: 1px dashed #000;
      border-bottom: 1px dashed #000;
    }

    .qr-code {
      font-family: monospace;
      font-size: 8px;
      line-height: 0.8;
      white-space: pre;
      margin: 5px 0;
      color: #000 !important;
    }

    .receipt-footer {
      text-align: center;
      font-size: 12px !important;
      margin-top: 10px;
      padding-top: 5px;
      border-top: 1px dashed #000;
      font-weight: 700 !important;
      color: #000 !important;
    }

    @page {
      size: 58mm auto;
      margin: 0;
    }

    @media print {
      html, body {
        width: 58mm !important;
        height: auto;
        margin: 0;
        padding: 0;
      }

      .receipt-container {
        width: 48mm !important;
        max-width: 48mm !important;
        margin: 0 auto;
        padding: 2mm 0;
      }

      @page {
        size: 58mm auto;
        margin: 0;
      }

      * {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        -webkit-font-smoothing: none !important;
      }
    }

    @media screen {
      body {
        width: 58mm;
        margin: 0 auto;
        border: 1px solid #ddd;
      }
      .receipt-container {
        margin-top: 4px;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="receipt-title">RECIBO</div>

    <div class="receipt-section">
      <div class="receipt-row">
        <span class="receipt-label">Fecha:</span>
        <span class="receipt-value" id="receipt-date"></span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Hora:</span>
        <span class="receipt-value" id="receipt-time"></span>
      </div>
    </div>

    <div class="receipt-section">
      <div class="receipt-row">
        <span class="receipt-label">Cliente:</span>
        <span class="receipt-value" id="client-name"></span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">Usuario:</span>
        <span class="receipt-value" id="user-name"></span>
      </div>
    </div>

    <div class="receipt-products" id="products-list">
    </div>

    <div class="receipt-section">
      <div class="receipt-row">
        <span class="receipt-label">Subtotal:</span>
        <span class="receipt-value" id="receipt-subtotal"></span>
      </div>
      <div class="receipt-row">
        <span class="receipt-label">IVA:</span>
        <span class="receipt-value" id="receipt-iva"></span>
      </div>
      <div class="receipt-row receipt-total">
        <span class="receipt-label">TOTAL:</span>
        <span class="receipt-value" id="receipt-total"></span>
      </div>
    </div>

    <div class="receipt-section">
      <div class="receipt-row">
        <span class="receipt-label">Pago:</span>
        <span class="receipt-value" id="payment-method"></span>
      </div>
      <div id="cash-details"></div>
    </div>

    <div class="receipt-qr">
      <div class="qr-code" id="qr-code">
        █▀▀▀▀▀█ ▀ █▀▀▀▀▀█<br/>
        █ ███ █ █ █ ███ █<br/>
        █ ▀▀▀ █ ███ █ ▀▀▀ █<br/>
        ▀▀▀▀▀▀▀ █▄█ ▀▀▀▀▀▀▀<br/>
        █▀█▀▀▀█ █ ▀ █▀█▀▀▀█<br/>
        █ █ ▀ █ █▄█ █ █ ▀ █<br/>
        █ ▀▀▀ █ ▀ ▀ █ ▀▀▀ █<br/>
        ▀▀▀▀▀▀▀ ▀ ▀ ▀▀▀▀▀▀▀
      </div>
      <div style="font-size: 9px; margin-top: 5px;">Escanea para validar</div>
    </div>

    <div class="receipt-footer">
      ¡Gracias por tu compra!<br/>
      www.tuempresa.com
    </div>
  </div>
</body>
</html>
`;

const ReceiptDisplay: React.FC<ReceiptDisplayProps> = ({
  ticketData,
  paymentMethod,
  cashPaid,
  clearCart,
  setTicketData,
}) => {
  const history = useHistory();

  const generateReceiptHTML = () => {
    let html = RECEIPT_TEMPLATE;

    // Fecha y hora
    html = html.replace(
      'id="receipt-date"',
      `id="receipt-date">${new Date(ticketData.paymentDate).toLocaleDateString('es-ES')}`
    );
    html = html.replace(
      'id="receipt-time"',
      `id="receipt-time">${new Date(ticketData.paymentDate).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })}`
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
    const productsHTML = ticketData.products
      .map(
        (prod: any) => `
      <div class="product-item">
        <div class="product-name">${prod.name}</div>
        <div class="product-details">
          Cantidad: ${prod.quantity} × $${prod.unitPrice.toFixed(
            2
          )} = $${prod.subtotal.toFixed(2)}
          ${
            prod.options
              ? prod.options
                  .map(
                    (opt: any) => `<br/>${opt.optionName}: ${opt.choiceName}`
                  )
                  .join('')
              : ''
          }
        </div>
      </div>
    `
      )
      .join('');

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
    const paymentMethodText =
      ticketData.paymentMethod === 'efectivo'
        ? 'Efectivo'
        : ticketData.paymentMethod === 'tarjeta'
        ? 'Tarjeta'
        : 'Transferencia';

    html = html.replace(
      'id="payment-method"',
      `id="payment-method">${paymentMethodText}`
    );

    // Detalle de efectivo si aplica
    if (paymentMethod === 'efectivo') {
      const recibido = parseFloat(cashPaid) || ticketData.totals.total;
      const cambio = (parseFloat(cashPaid) || 0) - ticketData.totals.total;

      const cashDetailsHTML = `
        <div class="receipt-row">
          <span class="receipt-label">Recibido:</span>
          <span class="receipt-value">$${recibido.toFixed(2)}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Cambio:</span>
          <span class="receipt-value">$${cambio.toFixed(2)}</span>
        </div>
      `;

      html = html.replace(
        '<div id="cash-details"></div>',
        `<div id="cash-details">${cashDetailsHTML}</div>`
      );
    }

    return html;
  };

  const handlePrint = () => {
    try {
      const printWindow = window.open(
        '',
        '_blank',
        'width=600,height=800,scrollbars=yes,resizable=yes'
      );

      if (!printWindow) {
        alert(
          'Por favor, permita popups para imprimir el recibo. Desactive el bloqueador de popups para este sitio.'
        );
        return;
      }

      const receiptHTML = generateReceiptHTML();
      printWindow.document.open();
      printWindow.document.write(receiptHTML);
      printWindow.document.close();

      printWindow.onload = () => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (error) {
          console.error('Error printing:', error);
          alert('Error al imprimir. Intente nuevamente.');
        }
      };

      // Fallback por si onload no se dispara
      setTimeout(() => {
        if (!printWindow.closed) {
          try {
            printWindow.focus();
            printWindow.print();
          } catch (error) {
            console.error('Fallback print error:', error);
          }
        }
      }, 1000);
    } catch (error) {
      console.error('Error opening print window:', error);
      alert(
        'Error al abrir la ventana de impresión. Verifique su navegador.'
      );
    }
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
        transactionDate={new Date(ticketData.paymentDate).toLocaleDateString(
          'es-ES'
        )}
        transactionTime={new Date(ticketData.paymentDate).toLocaleTimeString(
          'es-ES',
          { hour: '2-digit', minute: '2-digit' }
        )}
        clientName={ticketData.client.name}
        clientPhone={ticketData.client.cellphone}
        clientEmail={ticketData.client.email}
        userName={ticketData.user.name}
        products={ticketData.products.map((prod: any) => ({
          name: prod.name,
          quantity: prod.quantity,
          unitPrice: prod.unitPrice,
          subtotal: prod.subtotal,
          options:
            prod.options?.map(
              (opt: any) => `${opt.optionName}: ${opt.choiceName}`
            ) || [],
        }))}
        subtotal={ticketData.totals.subtotal}
        iva={ticketData.totals.iva}
        total={ticketData.totals.total}
        paymentMethod={
          ticketData.paymentMethod === 'efectivo'
            ? 'Efectivo'
            : ticketData.paymentMethod === 'tarjeta'
            ? 'Tarjeta'
            : 'Transferencia'
        }
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
        onPrint={handlePrint}
      />
      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <IonButton
          expand="block"
          fill="clear"
          onClick={() => {
            setTicketData(null);
            clearCart();
            history.push('/Laundry');
          }}
        >
          Cerrar
        </IonButton>
      </div>
    </div>
  );
};

export default ReceiptDisplay;
