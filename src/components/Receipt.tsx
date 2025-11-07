import React from 'react';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonItem,
  IonLabel,
  IonText,
  IonRow,
  IonCol,
  IonGrid,
  IonIcon,
  IonButton,
  IonTitle,
} from '@ionic/react';
import { qrCodeOutline, printOutline } from 'ionicons/icons';
import './Receipt.css';

// ESC/POS Formatter for 58mm thermal printer (48mm effective, 203 DPI, 384 dots width)
// Supports Font B (42 chars/line) as primary, Font A (32 chars/line) as fallback
const generateEscPos = (receiptData: any) => {
  const commands = [];

  // Initialize printer
  commands.push('\x1b\x40'); // ESC @ - Initialize

  // Select Font B (default, 42 chars/line)
  commands.push('\x1b\x4d\x01'); // ESC M 1 - Font B

  // Center align
  commands.push('\x1b\x61\x01'); // ESC a 1 - Center

  // Header
  commands.push('POS GMO\n');
  commands.push(`${receiptData.transactionDate} ${receiptData.transactionTime}\n\n`);

  // Left align
  commands.push('\x1b\x61\x00'); // ESC a 0 - Left

  // Client Info
  commands.push('Cliente:\n');
  commands.push(`${receiptData.clientName}\n`);
  commands.push(`${receiptData.clientPhone}\n`);
  commands.push(`${receiptData.clientEmail}\n\n`);

  // User
  commands.push(`Cajero: ${receiptData.userName}\n\n`);

  // Products Header
  commands.push('Producto          Opc  Cant  Unit  Sub\n');
  commands.push('------------------------------------------\n'); // Approx 42 chars

  // Products
  receiptData.products.forEach((product: any) => {
    const name = product.name.substring(0, 16).padEnd(16); // Truncate/pad to 16 chars
    const options = (product.options?.join(', ') || '').substring(0, 4).padEnd(4); // 4 chars
    const qty = product.quantity.toString().padStart(4);
    const unit = `$${product.unitPrice.toFixed(2)}`.padStart(6);
    const sub = `$${product.subtotal.toFixed(2)}`.padStart(6);
    commands.push(`${name} ${options} ${qty} ${unit} ${sub}\n`);
  });

  commands.push('\n');

  // Totals
  const subtotal = `Subtotal: $${receiptData.subtotal.toFixed(2)}`.padStart(42);
  const iva = `IVA (16%): $${receiptData.iva.toFixed(2)}`.padStart(42);
  const total = `Total: $${receiptData.total.toFixed(2)}`.padStart(42);
  commands.push(`${subtotal}\n`);
  commands.push(`${iva}\n`);
  commands.push(`${total}\n\n`);

  // Payment
  commands.push(`Pago: ${receiptData.paymentMethod}\n`);
  commands.push(`Recibido: $${receiptData.amountReceived.toFixed(2)}\n`);
  commands.push(`Cambio: $${receiptData.change.toFixed(2)}\n\n`);

  // Footer
  commands.push('Gracias por su compra\n');
  commands.push('POS GMO\n');
  commands.push('RFC: XXX123456XXX\n');
  commands.push('www.posgmo.com\n\n');

  // QR Placeholder (simple text)
  commands.push('[QR Code Placeholder]\n\n');

  // Cut paper
  commands.push('\x1d\x56\x42\x00'); // GS V B 0 - Full cut

  return commands.join('');
};

interface Product {
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  options?: string[];
}

interface ReceiptProps {
  transactionDate: string;
  transactionTime: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  userName: string;
  products: Product[];
  subtotal: number;
  iva: number;
  total: number;
  paymentMethod: string;
  amountReceived: number;
  change: number;
}

const Receipt: React.FC<ReceiptProps> = ({
  transactionDate,
  transactionTime,
  clientName,
  clientPhone,
  clientEmail,
  userName,
  products,
  subtotal,
  iva,
  total,
  paymentMethod,
  amountReceived,
  change,
}) => {
  return (
    <IonCard className="receipt-container">
      <IonCardHeader>
        <IonTitle>Recibo de Compra</IonTitle>
      </IonCardHeader>
      <IonCardContent className="receipt-content" style={{ maxHeight: '80vh', overflowY: 'auto' }}>

        {/* Encabezado */}
        <IonItem className="receipt-header">
          <IonIcon icon={qrCodeOutline} slot="start" size="large" style={{ color: '#007bff' }} />
          <IonLabel>
            <h1 className="receipt-title">POS GMO</h1>
            <p className="receipt-date-time">Fecha: {transactionDate} | Hora: {transactionTime}</p>
          </IonLabel>
        </IonItem>

        <hr className="receipt-divider" />

        {/* Información del cliente */}
        <IonItem>
          <IonLabel>
            <IonText className="receipt-section-title">Información del Cliente</IonText>
            <p>Nombre: {clientName}</p>
            <p>Teléfono: {clientPhone}</p>
            <p>Correo: {clientEmail}</p>
          </IonLabel>
        </IonItem>

        {/* Información del usuario */}
        <IonItem>
          <IonLabel>
            <IonText className="receipt-section-title">Usuario/Cajero</IonText>
            <p>{userName}</p>
          </IonLabel>
        </IonItem>

        <hr className="receipt-divider" />

        {/* Lista de productos */}
        <IonItem>
          <IonLabel>
            <IonText className="receipt-section-title">Productos/Servicios</IonText>
          </IonLabel>
        </IonItem>
        <IonGrid className="receipt-products-table">
          {/* Header Row */}
          <IonRow className="receipt-products-header">
            <IonCol size="3" className="receipt-col">Producto</IonCol>
            <IonCol size="3" className="receipt-col">Opciones</IonCol>
            <IonCol size="3" className="receipt-col">Cantidad</IonCol>
            <IonCol size="3" className="receipt-col">Precio Unit.</IonCol>
            
          </IonRow>
          {/* Product Rows */}
          {products.map((product, index) => (
            <IonRow key={index} className="receipt-products-row">
              <IonCol size="3" className="receipt-col">{product.name}</IonCol>
              <IonCol size="3" className="receipt-col receipt-options">
                {product.options && product.options.length > 0 ? product.options.join(', ') : 'Ninguna'}
              </IonCol>
              <IonCol size="3" className="receipt-col">{product.quantity}</IonCol>
              <IonCol size="3" className="receipt-col">${product.subtotal.toFixed(2)}</IonCol>
            </IonRow>
          ))}
        </IonGrid>

        <hr className="receipt-divider" />

        {/* Totales */}
        <IonItem>
          <IonLabel>
            <IonText className="receipt-section-title">Totales</IonText>
            <p>Subtotal: ${subtotal.toFixed(2)}</p>
            <p>IVA (16%): ${iva.toFixed(2)}</p>
            <p className="receipt-totals-bold">Total: ${total.toFixed(2)}</p>
          </IonLabel>
        </IonItem>

        {/* Método de pago */}
        <IonItem>
          <IonLabel>
            <IonText className="receipt-section-title">Método de Pago</IonText>
            <p>{paymentMethod}</p>
            <p>Monto Recibido: ${amountReceived.toFixed(2)}</p>
            <p>Cambio: ${change.toFixed(2)}</p>
          </IonLabel>
        </IonItem>

        {/* Pie de página */}
        <IonItem>
          <IonLabel>
            <IonText className="receipt-section-title"></IonText>
            <p>Gracias por su compra</p>
            <p>Empresa: POS GMO</p>
            <p>RFC: XXX123456XXX</p>
            <p>Dirección: Calle Ficticia 123, Ciudad, País</p>
            <p>Sitio Web: www.posgmo.com</p>
          </IonLabel>
        </IonItem>

        {/* QR Code Placeholder */}
        <IonItem className="receipt-qr">
          <IonIcon icon={qrCodeOutline} slot="start" size="large" style={{ color: '#666' }} />
          <IonLabel>QR Placeholder</IonLabel>
        </IonItem>

        {/* Print Button */}
        <IonItem>
          <IonButton className="receipt-print-button" fill="outline" color="primary" expand="block" onClick={() => {
            const printContent = document.querySelector('.receipt-container') as HTMLElement;
            if (printContent) {
              const originalBody = document.body.innerHTML;
              document.body.innerHTML = printContent.outerHTML;
              window.print();
              document.body.innerHTML = originalBody;
            }
          }}>
            <IonIcon icon={printOutline} slot="start" />
            Imprimir
          </IonButton>
        </IonItem>
      </IonCardContent>
    </IonCard>
  );
};

export default Receipt;
