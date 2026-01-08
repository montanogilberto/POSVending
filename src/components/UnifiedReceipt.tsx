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
  IonHeader,
  IonContent
} from '@ionic/react';
import { printOutline, closeOutline, downloadOutline } from 'ionicons/icons';
import { UnifiedReceiptData, PrintOptions } from '../types/receipt';
import { ReceiptService } from '../services/ReceiptService';
import './UnifiedReceipt.css';

// Format client name for display - shows truncated form for "Desconocido"
const formatClientName = (name: string): string => {
  if (!name) return 'Desconocido -…';
  const lowerName = name.toLowerCase().trim();
  if (lowerName === 'desconocido' || 
      lowerName === 'mostrador' || 
      lowerName === 'mostrador / desconocido' ||
      lowerName.includes('desconocido')) {
    return 'Desconocido -…';
  }
  return name;
};

// Extract Ciclo value from product options
const extractCiclo = (options: any[]): string | null => {
  if (!options || !Array.isArray(options)) return null;
  
  for (const option of options) {
    // Check for "Ciclo" in option name
    if (option.name && option.name.toLowerCase().includes('ciclo')) {
      // Get the choice name
      if (option.choices && Array.isArray(option.choices) && option.choices.length > 0) {
        return option.choices[0].name;
      }
      if (option.choiceName) {
        return option.choiceName;
      }
    }
    // Also check in choices for ciclo
    if (option.choices) {
      for (const choice of option.choices) {
        if (choice.name && (choice.name.toLowerCase().includes('carga alta') || 
                           choice.name.toLowerCase().includes('basico') ||
                           choice.name.toLowerCase().includes('carga baja') ||
                           choice.name.toLowerCase().includes('medio'))) {
          return choice.name;
        }
      }
    }
  }
  return null;
};

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
              <strong>Cliente:</strong> {formatClientName(data.client.name)}
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
              {data.products.map((product, index) => {
                // Extract Ciclo from options
                const ciclo = product.options ? extractCiclo(product.options) : null;
                
                // Build options text (excluding Ciclo which is shown separately)
                const optionsText = product.options && product.options.length > 0 
                  ? product.options
                      .filter(opt => !opt.name?.toLowerCase().includes('ciclo'))
                      .map(opt => `${opt.name}: ${opt.choices.map(c => c.name).join(', ')}`)
                      .join('; ')
                  : '';
                
                return (
                  <IonRow key={index} className="product-row">
                    <IonCol size="12" className="col-product">
                      <div className="product-name">{product.name}</div>
                      <div className="product-quantity">
                        Cantidad: {product.quantity} × ${product.unitPrice.toFixed(2)} = ${product.subtotal.toFixed(2)}
                      </div>
                      {ciclo && (
                        <div className="product-ciclo">
                          <strong>Ciclo: {ciclo}</strong>
                        </div>
                      )}
                      {optionsText && (
                        <div className="product-options">
                          {optionsText}
                        </div>
                      )}
                      {product.pieces && (
                        <div className="product-pieces">
                          <div className="pieces-label">Piezas:</div>
                          <div className="pieces-values">
                            Pantalones: {product.pieces.pantalones}, Prendas: {product.pieces.prendas}, Otros: {product.pieces.otros}
                          </div>
                        </div>
                      )}
                    </IonCol>
                    <IonCol size="2" className="col-qty">{product.quantity}</IonCol>
                    <IonCol size="3" className="col-price">${product.unitPrice.toFixed(2)}</IonCol>
                    <IonCol size="3" className="col-total">${product.subtotal.toFixed(2)}</IonCol>
                  </IonRow>
                );
              })}
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
            <p className="receipt-field">¡Gracias por tu {data.type === 'income' ? 'compra' : 'pago'}!</p>
            <p className="receipt-field">{data.company.website}</p>
            <p className="receipt-field">
              <strong>{data.company.name}</strong> - RFC: {data.company.rfc}
            </p>
            <p className="receipt-field">{data.company.address}</p>
            <p className="receipt-field template-id">TEMPLATE_ID: GMO-46MM-FIT-v5</p>
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

