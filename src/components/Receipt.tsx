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
  onPrint?: () => void;
}

const Receipt: React.FC<ReceiptProps> = ({
  transactionDate = '',
  transactionTime = '',
  clientName = '',
  clientPhone = '',
  clientEmail = '',
  userName = '',
  products = [],
  subtotal = 0,
  iva = 0,
  total = 0,
  paymentMethod = '',
  amountReceived = 0,
  change = 0,
  onPrint,
}) => {
  console.log('Receipt component rendering with props:', { transactionDate, transactionTime, clientName, products, total });
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

        {/* Print Button - Moved to top for visibility */}
        {onPrint && (
          <IonItem>
            <IonButton className="receipt-print-button" fill="outline" color="primary" expand="block" onClick={onPrint}>
              <IonIcon icon={printOutline} slot="start" />
              Imprimir Recibo
            </IonButton>
          </IonItem>
        )}

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
          {products?.map((product, index) => (
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


      </IonCardContent>
    </IonCard>
  );
};

export default Receipt;
