import React from 'react';
import {
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonText,
  IonRow,
  IonCol,
  IonGrid,
  IonIcon,
  IonButton,
  IonModal,
  IonButtons,
  IonToolbar,
  IonTitle,
  IonHeader
} from '@ionic/react';
import { printOutline, closeOutline, downloadOutline } from 'ionicons/icons';
import { UnifiedReceiptData, PrintOptions } from '../types/receipt';
import { ReceiptService } from '../services/ReceiptService';
import './UnifiedReceipt.css';

interface UnifiedReceiptProps {
  data: UnifiedReceiptData;
  onPrint?: () => void;
  showModal?: boolean;
  onClose?: () => void;
  options?: PrintOptions;
}

const UnifiedReceipt: React.FC<UnifiedReceiptProps> = ({
  data,
  onPrint,
  showModal = false,
  onClose,
  options = {}
}) => {
  const handlePrint = () => {
    ReceiptService.printReceipt(data, options);
    onPrint?.();
  };

  const handleDownload = () => {
    const blobUrl = ReceiptService.generateReceiptBlob(data, options);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `recibo_${data.type}_${data.id}.html`;
    link.click();
    URL.revokeObjectURL(blobUrl);
  };

  const formatPaymentMethod = (method: string): string => {
    switch (method) {
      case 'efectivo': return 'Efectivo';
      case 'tarjeta': return 'Tarjeta';
      case 'transferencia': return 'Transferencia';
      default: return method;
    }
  };

  const formatDateTime = (date: string, time: string) => {
    return `${date} ${time}`;
  };

  const renderContent = () => (
    <div className="unified-receipt-content">
      {/* Header */}
      <IonCardHeader className="receipt-header">
        <IonCardTitle className="receipt-title">
          {data.company.name}
        </IonCardTitle>
        <IonText className="receipt-subtitle">
          RECIBO - {data.type === 'income' ? 'INGRESO' : 'EGRESO'}
        </IonText>
      </IonCardHeader>

      <IonCardContent className="receipt-body">
        {/* Transaction Info */}
        <IonItem className="receipt-section">
          <IonLabel>
            <IonText className="section-title">Información de Transacción</IonText>
            <p className="receipt-field">
              <strong>Fecha y Hora:</strong> {formatDateTime(data.date, data.time)}
            </p>
            <p className="receipt-field">
              <strong>ID:</strong> {data.id}
            </p>
          </IonLabel>
        </IonItem>

        {/* Client & User Info */}
        <IonItem className="receipt-section">
          <IonLabel>
            <IonText className="section-title">Cliente y Usuario</IonText>
            <p className="receipt-field">
              <strong>Cliente:</strong> {data.client.name}
            </p>
            <p className="receipt-field">
              <strong>Teléfono:</strong> {data.client.phone}
            </p>
            <p className="receipt-field">
              <strong>Email:</strong> {data.client.email}
            </p>
            <p className="receipt-field">
              <strong>Usuario:</strong> {data.user.name}
            </p>
          </IonLabel>
        </IonItem>

        {/* Products */}
        <IonItem className="receipt-section">
          <IonLabel>
            <IonText className="section-title">Productos/Servicios</IonText>
            <IonGrid className="products-table">
              {/* Header */}
              <IonRow className="products-header">
                <IonCol size="4" className="col-product">Producto</IonCol>
                <IonCol size="2" className="col-qty">Cant</IonCol>
                <IonCol size="3" className="col-price">Precio Unit.</IonCol>
                <IonCol size="3" className="col-total">Total</IonCol>
              </IonRow>
              
              {/* Products */}
              {data.products.map((product, index) => (
                <IonRow key={index} className="product-row">
                  <IonCol size="4" className="col-product">
                    <div className="product-name">{product.name}</div>
                    {product.options && product.options.length > 0 && (
                      <div className="product-options">
                        {product.options.map((option, optIndex) => (
                          <div key={optIndex} className="option-text">
                            {option.name}: {option.choices.map(c => c.name).join(', ')}
                          </div>
                        ))}
                      </div>
                    )}
                  </IonCol>
                  <IonCol size="2" className="col-qty">{product.quantity}</IonCol>
                  <IonCol size="3" className="col-price">${product.unitPrice.toFixed(2)}</IonCol>
                  <IonCol size="3" className="col-total">${product.subtotal.toFixed(2)}</IonCol>
                </IonRow>
              ))}
            </IonGrid>
          </IonLabel>
        </IonItem>

        {/* Totals */}
        <IonItem className="receipt-section totals-section">
          <IonLabel>
            <IonText className="section-title">Totales</IonText>
            <p className="total-row">
              <span>Subtotal:</span>
              <span>${data.totals.subtotal.toFixed(2)}</span>
            </p>
            <p className="total-row">
              <span>IVA:</span>
              <span>${data.totals.iva.toFixed(2)}</span>
            </p>
            <p className="total-row grand-total">
              <span>Total:</span>
              <span>${data.totals.total.toFixed(2)}</span>
            </p>
          </IonLabel>
        </IonItem>

        {/* Payment Info */}
        <IonItem className="receipt-section">
          <IonLabel>
            <IonText className="section-title">Método de Pago</IonText>
            <p className="receipt-field">
              <strong>Método:</strong> {formatPaymentMethod(data.payment.method)}
            </p>
            {data.payment.method === 'efectivo' && (
              <>
                <p className="receipt-field">
                  <strong>Monto Recibido:</strong> ${data.payment.amountReceived.toFixed(2)}
                </p>
                <p className="receipt-field">
                  <strong>Cambio:</strong> ${data.payment.change.toFixed(2)}
                </p>
              </>
            )}
          </IonLabel>
        </IonItem>

        {/* Footer */}
        <IonItem className="receipt-section footer-section">
          <IonLabel>
            <IonText className="section-title">Información de la Empresa</IonText>
            <p className="receipt-field">¡Gracias por su {data.type === 'income' ? 'compra' : 'pago'}!</p>
            <p className="receipt-field">{data.company.website}</p>
            <p className="receipt-field">
              <strong>{data.company.name}</strong> - RFC: {data.company.rfc}
            </p>
            <p className="receipt-field">{data.company.address}</p>
          </IonLabel>
        </IonItem>

        {/* Action Buttons */}
        {(onPrint || onClose) && (
          <div className="receipt-actions">
            {onPrint && (
              <IonButton fill="outline" color="primary" onClick={handlePrint} className="receipt-button">
                <IonIcon icon={printOutline} slot="start" />
                Imprimir
              </IonButton>
            )}
            <IonButton fill="outline" color="secondary" onClick={handleDownload} className="receipt-button">
              <IonIcon icon={downloadOutline} slot="start" />
              Descargar
            </IonButton>
            {onClose && (
              <IonButton fill="solid" color="medium" onClick={onClose} className="receipt-button">
                <IonIcon icon={closeOutline} slot="start" />
                Cerrar
              </IonButton>
            )}
          </div>
        )}
      </IonCardContent>
    </div>
  );

  // If showModal is true, render as modal
  if (showModal) {
    return (
      <IonModal isOpen={showModal} onDidDismiss={onClose} className="receipt-modal">
        <IonHeader>
          <IonToolbar>
            <IonTitle>Recibo</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={onClose}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          {renderContent()}
        </IonContent>
      </IonModal>
    );
  }

  // Otherwise, render as regular card
  return (
    <IonCard className="unified-receipt-card">
      {renderContent()}
    </IonCard>
  );
};

export default UnifiedReceipt;

