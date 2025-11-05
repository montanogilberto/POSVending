import React from 'react';
import {
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonText,
  IonRow,
  IonCol,
  IonGrid,
  IonIcon,
} from '@ionic/react';
import { qrCodeOutline } from 'ionicons/icons';

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
    <IonCard
      style={{
        maxWidth: '400px',
        margin: 'auto',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        fontFamily: 'Inter, Roboto, sans-serif',
      }}
    >
      <IonCardContent style={{ padding: '20px' }}>
        {/* Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}></div>
          <IonText style={{ fontSize: '18px', fontWeight: 'bold', color: '#0056D2' }}>Ticket de Venta</IonText>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
            Fecha: {transactionDate} | Hora: {transactionTime}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '20px 0' }} />

        {/* Información del cliente */}
        <div style={{ marginBottom: '20px' }}>
          <IonText style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>Información del Cliente</IonText>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
            <div>Nombre: {clientName}</div>
            <div>Teléfono: {clientPhone}</div>
            <div>Correo: {clientEmail}</div>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '20px 0' }} />

        {/* Información del usuario */}
        <div style={{ marginBottom: '20px' }}>
          <IonText style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>Usuario/Cajero</IonText>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
            {userName}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '20px 0' }} />

        {/* Lista de productos */}
        <div style={{ marginBottom: '20px' }}>
          <IonText style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>Productos/Servicios</IonText>
          {products.map((product, index) => (
            <div key={index} style={{ marginTop: '10px', fontSize: '14px' }}>
              <div style={{ fontWeight: 'bold' }}>{product.name}</div>
              {product.options && product.options.map((option, i) => (
                <div key={i} style={{ color: '#666', marginLeft: '10px' }}>{option}</div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cantidad: {product.quantity}</span>
                <span>Precio Unit.: ${product.unitPrice.toFixed(2)}</span>
                <span>Subtotal: ${product.subtotal.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '20px 0' }} />

        {/* Totales */}
        <div style={{ marginBottom: '20px' }}>
          <IonGrid>
            <IonRow>
              <IonCol size="6">
                <IonText style={{ fontSize: '14px', color: '#666' }}>Subtotal:</IonText>
              </IonCol>
              <IonCol size="6" style={{ textAlign: 'right' }}>
                <IonText style={{ fontSize: '14px', color: '#666' }}>${subtotal.toFixed(2)}</IonText>
              </IonCol>
            </IonRow>
            <IonRow>
              <IonCol size="6">
                <IonText style={{ fontSize: '14px', color: '#666' }}>IVA (16%):</IonText>
              </IonCol>
              <IonCol size="6" style={{ textAlign: 'right' }}>
                <IonText style={{ fontSize: '14px', color: '#666' }}>${iva.toFixed(2)}</IonText>
              </IonCol>
            </IonRow>
            <IonRow>
              <IonCol size="6">
                <IonText style={{ fontSize: '16px', fontWeight: 'bold', color: '#0056D2' }}>Total:</IonText>
              </IonCol>
              <IonCol size="6" style={{ textAlign: 'right' }}>
                <IonText style={{ fontSize: '16px', fontWeight: 'bold', color: '#0056D2' }}>${total.toFixed(2)}</IonText>
              </IonCol>
            </IonRow>
          </IonGrid>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #e0e0e0', margin: '20px 0' }} />

        {/* Método de pago */}
        <div style={{ marginBottom: '20px' }}>
          <IonText style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>Método de Pago</IonText>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
            {paymentMethod}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Monto Recibido: ${amountReceived.toFixed(2)}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            Cambio: ${change.toFixed(2)}
          </div>
        </div>

        {/* Confirmation Banner */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1E6FBF, #0056D2)',
            color: '#ffffff',
            padding: '10px',
            borderRadius: '8px',
            textAlign: 'center',
            marginBottom: '20px',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          ¡Pedido realizado! Método de pago: {paymentMethod}. Cambio a devolver: ${change.toFixed(2)}.
        </div>

        {/* Pie de página */}
        <div style={{ textAlign: 'center', fontSize: '12px', color: '#666' }}>
          <div>Gracias por su compra</div>
          <div style={{ marginTop: '10px' }}>
            Empresa: POS GMO<br />
            RFC: XXX123456XXX<br />
            Dirección: Calle Ficticia 123, Ciudad, País<br />
            Sitio Web: www.posgmo.com
          </div>
        </div>

        {/* QR Code Placeholder */}
        <div style={{ textAlign: 'right', marginTop: '20px' }}>
          <IonIcon icon={qrCodeOutline} size="large" style={{ color: '#666' }} />
          <div style={{ fontSize: '10px', color: '#666' }}>QR Placeholder</div>
        </div>
      </IonCardContent>
    </IonCard>
  );
};

export default Receipt;
