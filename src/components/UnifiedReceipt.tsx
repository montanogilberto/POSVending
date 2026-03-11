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

import { printOutline, closeOutline, downloadOutline, pricetagOutline } from 'ionicons/icons';
import { UnifiedReceiptData, PrintOptions } from '../types/receipt';
import { ReceiptService } from '../services/ReceiptService';
import './UnifiedReceipt.css';

const formatClientName = (name: string): string => {
  if (!name) return 'Desconocido -…';

  const lowerName = name.toLowerCase().trim();

  if (
    lowerName === 'desconocido' ||
    lowerName === 'mostrador' ||
    lowerName === 'mostrador / desconocido' ||
    lowerName.includes('desconocido')
  ) {
    return 'Desconocido -…';
  }

  return name;
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
  // ✅ FORCE IVA = 0 LOCALLY
  const iva = 0;
  const subtotal = Number(data.totals.subtotal ?? 0);
  const discount = Number(data.totals.discount ?? 0);
  const originalTotal = data.totals.originalTotal ? Number(data.totals.originalTotal) : subtotal;
  const total = originalTotal - discount;

  // Promotion info from data
  const promotion = data.promotion;
  const hasPromotion = !!promotion && promotion.discount > 0;

  const handlePrint = () => {
    const updatedData = {
      ...data,
      totals: {
        ...data.totals,
        iva,
        total,
        discount,
        originalTotal
      }
    };

    ReceiptService.printReceipt(updatedData, options);
    onPrint?.();
  };

  const handleDownload = () => {
    const updatedData = {
      ...data,
      totals: {
        ...data.totals,
        iva,
        total,
        discount,
        originalTotal
      }
    };

    const blobUrl = ReceiptService.generateReceiptBlob(updatedData, options);

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `recibo_${data.type}_${data.id}.html`;
    link.click();

    URL.revokeObjectURL(blobUrl);
  };

  const formatPaymentMethod = (method: string): string => {
    switch (method) {
      case 'efectivo':
        return 'Efectivo';
      case 'tarjeta':
        return 'Tarjeta';
      case 'transferencia':
        return 'Transferencia';
      default:
        return method;
    }
  };

  const formatDateTime = (date: string, time: string) => `${date} ${time}`;

  const renderContent = () => (
    <div className="unified-receipt-content">
      {/* HEADER */}
      <IonCardHeader className="receipt-header">
        <IonCardTitle className="receipt-title">{data.company.name}</IonCardTitle>

        <IonText className="receipt-subtitle">
          RECIBO - {data.type === 'income' ? 'INGRESO' : 'EGRESO'}
        </IonText>
      </IonCardHeader>

      <IonCardContent className="receipt-body">
        {/* TRANSACTION INFO */}
        <IonItem className="receipt-section">
          <IonLabel>
            <IonText className="section-title">Información de Transacción</IonText>
            <p>
              <strong>Fecha y Hora:</strong> {formatDateTime(data.date, data.time)}
            </p>
            <p>
              <strong>ID:</strong> {data.id}
            </p>
          </IonLabel>
        </IonItem>

        {/* CLIENT INFO */}
        <IonItem className="receipt-section">
          <IonLabel>
            <IonText className="section-title">Cliente</IonText>
            <p>
              <strong>Nombre:</strong> {formatClientName(data.client.name)}
            </p>
            <p>
              <strong>Teléfono:</strong> {data.client.phone}
            </p>
            <p>
              <strong>Email:</strong> {data.client.email}
            </p>
          </IonLabel>
        </IonItem>

        {/* USER INFO */}
        <IonItem className="receipt-section">
          <IonLabel>
            <IonText className="section-title">Usuario</IonText>
            <p>
              <strong>Nombre:</strong> {data.user.name}
            </p>
          </IonLabel>
        </IonItem>

        {/* PROMOTION SECTION */}
        {hasPromotion && (
          <IonItem className="receipt-section promotion-section">
            <IonLabel>
              <IonText className="section-title">
                <IonIcon icon={pricetagOutline} style={{ marginRight: '6px' }} />
                Promoción Aplicada
              </IonText>
              <p>
                <strong>Código:</strong> {promotion.code}
              </p>
              <p>
                <strong>Tipo:</strong> {promotion.type === 'B2G1' ? '2x1 (Buy 2 Get 1)' : promotion.type}
              </p>
              <p className="promo-discount">
                <strong>Descuento:</strong> ${promotion.discount.toFixed(2)}
              </p>
            </IonLabel>
          </IonItem>
        )}

        {/* PRODUCTS / SERVICIOS & TOTALS */}
        <div className="products-totals-section">
          
          {/* PRODUCTS / SERVICIOS */}
          <div className="products-servicios-section">
            <IonText className="section-title productos-title">
              Productos / Servicios
            </IonText>

            {data.products.map((product, index) => {
              const serviceSubtotal = Number(product.subtotal ?? 0);
              const opts = product.options ?? [];
              
              // Generate pieces text for "Servicio Completo" products
              const piecesText = product.pieces 
                ? `Piezas:\nPantalones: ${product.pieces.pantalones}\nPrendas: ${product.pieces.prendas}\nOtros: ${product.pieces.otros}`
                : null;

              return (
                <div key={index} className="service-card">
                  {/* PRIMARY HEADER - DARK */}
                  <div className="service-primary-header">
                    <span className="service-label">Servicio</span>
                    <span className="service-name">{product.name}</span>
                  </div>

                  {/* SECONDARY HEADER - LIGHTER */}
                  <div className="service-secondary-header">
                    <span className="col-product-header">Producto</span>
                    <span className="col-cant-header">Cant</span>
                    <span className="col-precio-header">Precio</span>
                  </div>

                  {/* PRODUCT ROWS */}
                  {opts.length > 0 ? (
                    opts.map((option, optIndex) => {
                      const qty = Number(option.quantity ?? 0);
                      const displayPrice =
                        opts.length === 1 ? serviceSubtotal : Number(option.price ?? 0);

                      return (
                        <div key={optIndex} className="product-option-row">
                          <span className="col-product-row">
                            {option.optionName}: {option.choiceName}
                          </span>
                          <span className="col-cant-row">{qty}</span>
                          <span className="col-precio-row">
                            ${displayPrice.toFixed(2)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="product-option-row">
                      <span className="col-product-row">{product.name}</span>
                      <span className="col-cant-row">
                        {Number(product.quantity ?? 0)}
                      </span>
                      <span className="col-precio-row">
                        ${serviceSubtotal.toFixed(2)}
                      </span>
                    </div>
                  )}
                  
                  {/* PIECES ROW - For Servicio Completo */}
                  {piecesText && (
                    <div className="product-option-row" style={{ background: '#f1f3f5', borderLeft: '3px solid #667eea' }}>
                      <span className="col-product-row" style={{ fontStyle: 'italic', color: '#667eea' }}>
                        {piecesText}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* TOTALS */}
          <div className="totals-section">
            <IonText className="section-title">Totales</IonText>

            <div className="total-row">
              <span>Subtotal:</span>
              <span>${originalTotal.toFixed(2)}</span>
            </div>

            {/* Show discount if promo applied */}
            {hasPromotion && (
              <div className="total-row discount-row">
                <span>
                  <IonIcon icon={pricetagOutline} style={{ marginRight: '4px' }} />
                  Descuento ({promotion.code}):
                </span>
                <span>-${discount.toFixed(2)}</span>
              </div>
            )}

            <div className="total-row">
              <span>IVA:</span>
              <span>$0.00</span>
            </div>

            <div className="total-row grand-total">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

        </div>

        {/* PAYMENT */}
        <IonItem className="receipt-section">
          <IonLabel>
            <IonText className="section-title">Método de Pago</IonText>

            <p>
              <strong>Método:</strong> {formatPaymentMethod(data.payment.method)}
            </p>

            {data.payment.method === 'efectivo' && (
              <>
                

                

                {data.payment.amountReceived !== undefined && (
                  <p>
                    <strong>Monto Recibido:</strong> $
                    {Number(data.payment.amountReceived ?? 0).toFixed(2)}
                  </p>
                )}

                {data.payment.change !== undefined && data.payment.change > 0 && (
                  <p>
                    <strong>Cambio:</strong> $
                    {Number(data.payment.change ?? 0).toFixed(2)}
                  </p>
                )}
              </>
            )}
          </IonLabel>
        </IonItem>

        {/* FOOTER */}
        <IonItem className="receipt-section footer-section">
          <IonLabel>
            <IonText className="section-title">Información de la Empresa</IonText>
            <p>¡Gracias por tu compra!</p>
            <p>{data.company.website}</p>
            <p>
              <strong>{data.company.name}</strong> - RFC: {data.company.rfc}
            </p>
            <p>{data.company.address}</p>
          </IonLabel>
        </IonItem>

        {/* ACTION BUTTONS */}
        {(onPrint || onClose) && (
          <div className="receipt-actions">
            {onPrint && (
              <IonButton onClick={handlePrint}>
                <IonIcon icon={printOutline} slot="start" />
                Imprimir
              </IonButton>
            )}

            <IonButton onClick={handleDownload}>
              <IonIcon icon={downloadOutline} slot="start" />
              Descargar
            </IonButton>

            {onClose && (
              <IonButton onClick={onClose}>
                <IonIcon icon={closeOutline} slot="start" />
                Cerrar
              </IonButton>
            )}
          </div>
        )}
      </IonCardContent>
    </div>
  );

  if (showModal) {
    return (
      <IonModal isOpen={showModal} onDidDismiss={onClose}>
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

        <IonContent>{renderContent()}</IonContent>
      </IonModal>
    );
  }

  return <IonCard>{renderContent()}</IonCard>;
};

export default UnifiedReceipt;

